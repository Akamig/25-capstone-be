import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { Subject, BehaviorSubject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  MeshPacket,
  SeatStatus,
  DeviceMetrics,
} from '../interfaces/protobuf.types';

export interface SeatStatusUpdate {
  moduleId: string;
  occupied: boolean;
  timestamp: Date;
  seatId?: string;
}

export interface ModuleStatusUpdate {
  moduleId: string;
  batteryLevel?: number;
  voltage?: number;
  uptimeSec?: number;
  lastSeen: Date;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly seatStatusSubject = new Subject<SeatStatusUpdate>();
  private readonly moduleStatusSubject = new Subject<ModuleStatusUpdate>();
  private readonly connectionStatus = new BehaviorSubject<boolean>(false);
  private readonly region: string;
  private readonly defaultReservationMinutes: number;

  readonly seatStatusUpdates$ = this.seatStatusSubject.asObservable();
  readonly moduleStatusUpdates$ = this.moduleStatusSubject.asObservable();
  readonly connectionStatus$ = this.connectionStatus.asObservable();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly protobuf: ProtobufService,
  ) {
    this.region = this.configService.get('MQTT_REGION', 'KR');
    this.defaultReservationMinutes = parseInt(
      this.configService.get('DEFAULT_RESERVATION_MINUTES', '2'),
    );
  }

  async onModuleInit() {
    await this.connect();
    this.setupEventListeners();
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
      console.log('🔌 MQTT client disconnected');
    }
  }

  private async connect() {
    const brokerUrl = this.configService.get('MQTT_BROKER_URL');
    const username = this.configService.get('MQTT_USERNAME');
    const password = this.configService.get('MQTT_PASSWORD');

    console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl, {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      this.connectionStatus.next(true);
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error);
      this.connectionStatus.next(false);
    });

    this.client.on('offline', () => {
      console.log('⚠️ MQTT client offline');
      this.connectionStatus.next(false);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting...');
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  private subscribeToTopics() {
    const mainTopic = `msh/${this.region}/2/e/Main/#`;
    const seatStateTopic = `msh/${this.region}/2/e/SeatState/#`;

    this.client.subscribe([mainTopic, seatStateTopic], (error) => {
      if (error) {
        console.error('❌ MQTT subscription error:', error);
      } else {
        console.log(`📡 Subscribed to topics: ${mainTopic}, ${seatStateTopic}`);
      }
    });
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      console.log(`📨 Received message on topic: ${topic}`);

      const meshPacket = this.protobuf.decodeMeshPacket(message);
      if (!meshPacket) {
        console.warn('⚠️ Failed to decode MeshPacket');
        return;
      }

      const moduleId = meshPacket.from.toString();
      console.log(`🔧 Processing message from module: ${moduleId}`);

      // Handle SeatState channel
      if (topic.includes('/SeatState/')) {
        await this.handleSeatStatusMessage(moduleId, meshPacket);
      }

      // Handle Main channel (DeviceMetrics)
      if (topic.includes('/Main/')) {
        await this.handleDeviceMetricsMessage(moduleId, meshPacket);
      }
    } catch (error) {
      console.error('❌ Error handling MQTT message:', error);
    }
  }

  private async handleSeatStatusMessage(
    moduleId: string,
    meshPacket: MeshPacket,
  ) {
    if (!meshPacket.decoded?.payload) {
      console.warn('⚠️ No payload in seat status message');
      return;
    }

    const seatStatus = this.protobuf.decodeSeatStatus(
      meshPacket.decoded.payload,
    );
    if (!seatStatus) {
      console.warn('⚠️ Failed to decode seat status');
      return;
    }

    const occupied = seatStatus.isOccupied ?? false;
    const timestamp = new Date();

    console.log(
      `🪑 Seat status update - Module: ${moduleId}, Occupied: ${occupied}`,
    );

    // Update or create seat module
    const seatModule = await this.prisma.seatModule.upsert({
      where: { id: moduleId },
      update: {
        occupied,
        lastUpdated: timestamp,
      },
      create: {
        id: moduleId,
        occupied,
        lastUpdated: timestamp,
      },
      include: {
        seat: true,
      },
    });

    // Emit seat status update
    this.seatStatusSubject.next({
      moduleId,
      occupied,
      timestamp,
      seatId: seatModule.seat?.id,
    });
  }

  private async handleDeviceMetricsMessage(
    moduleId: string,
    meshPacket: MeshPacket,
  ) {
    if (!meshPacket.decoded?.payload) {
      console.warn('⚠️ No payload in device metrics message');
      return;
    }

    const deviceMetrics = this.protobuf.decodeDeviceMetrics(
      meshPacket.decoded.payload,
    );
    if (!deviceMetrics) {
      console.warn('⚠️ Failed to decode device metrics');
      return;
    }

    const timestamp = new Date();

    console.log(`📊 Device metrics update - Module: ${moduleId}`);

    // Update or create seat module status
    if (
      deviceMetrics.battery_level !== undefined ||
      deviceMetrics.voltage !== undefined ||
      deviceMetrics.uptime_seconds !== undefined
    ) {
      await this.prisma.seatModuleStatus.upsert({
        where: { id: moduleId },
        update: {
          batteryLevel: deviceMetrics.battery_level ?? 0,
          voltage: deviceMetrics.voltage ?? 0,
          uptimeSec: deviceMetrics.uptime_seconds ?? 0,
          lastSeen: timestamp,
        },
        create: {
          id: moduleId,
          batteryLevel: deviceMetrics.battery_level ?? 0,
          voltage: deviceMetrics.voltage ?? 0,
          uptimeSec: deviceMetrics.uptime_seconds ?? 0,
          lastSeen: timestamp,
        },
      });

      // Emit module status update
      this.moduleStatusSubject.next({
        moduleId,
        batteryLevel: deviceMetrics.battery_level,
        voltage: deviceMetrics.voltage,
        uptimeSec: deviceMetrics.uptime_seconds,
        lastSeen: timestamp,
      });
    }
  }

  private setupEventListeners() {
    // Listen for seat status updates and handle database operations
    this.seatStatusUpdates$.subscribe(async (update) => {
      console.log(`🪑 Processing seat status update:`, update);
      // Additional processing can be added here
    });

    this.moduleStatusUpdates$.subscribe(async (update) => {
      console.log(`📊 Processing module status update:`, update);
      // Additional processing can be added here
    });
  }

  async sendTemporaryReservation(
    moduleId: string,
    minutes?: number,
  ): Promise<boolean> {
    try {
      const reservationMinutes = minutes ?? this.defaultReservationMinutes;

      console.log(
        `🔒 Sending temporary reservation to module ${moduleId} for ${reservationMinutes} minutes`,
      );

      // Create seat status message for temporary reservation
      const seatStatus: SeatStatus = {
        isOccupied: true,
      };

      const seatStatusBuffer = this.protobuf.encodeSeatStatus(seatStatus);

      // Create mesh packet
      const meshPacket: Partial<MeshPacket> = {
        from: 0, // Gateway node
        to: parseInt(moduleId),
        channel: 0,
        decoded: {
          portnum: 1, // Custom port for seat commands
          payload: seatStatusBuffer,
          want_response: false,
          dest: parseInt(moduleId),
          source: 0,
          request_id: 0,
          reply_id: 0,
          emoji: 0,
        },
        want_ack: true,
        priority: 70, // RELIABLE
        hop_limit: 3,
        hop_start: 3,
        via_mqtt: true,
        pki_encrypted: false,
      };

      const meshPacketBuffer = this.protobuf.encodeMeshPacket(meshPacket);
      const topic = `msh/${this.region}/2/e/SeatState/!gateway`;

      return new Promise((resolve) => {
        this.client.publish(topic, meshPacketBuffer, (error) => {
          if (error) {
            console.error('❌ Failed to send temporary reservation:', error);
            resolve(false);
          } else {
            console.log('✅ Temporary reservation sent successfully');
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error sending temporary reservation:', error);
      return false;
    }
  }

  async requestStatusRefresh(moduleId: string): Promise<boolean> {
    try {
      console.log(`🔄 Requesting status refresh from module ${moduleId}`);

      // Create refresh command (empty seat status to trigger refresh)
      const seatStatus: SeatStatus = {};
      const seatStatusBuffer = this.protobuf.encodeSeatStatus(seatStatus);

      const meshPacket: Partial<MeshPacket> = {
        from: 0,
        to: parseInt(moduleId),
        channel: 0,
        decoded: {
          portnum: 2, // Custom port for refresh commands
          payload: seatStatusBuffer,
          want_response: true,
          dest: parseInt(moduleId),
          source: 0,
          request_id: Date.now(),
          reply_id: 0,
          emoji: 0,
        },
        want_ack: true,
        priority: 70,
        hop_limit: 3,
        hop_start: 3,
        via_mqtt: true,
        pki_encrypted: false,
      };

      const meshPacketBuffer = this.protobuf.encodeMeshPacket(meshPacket);
      const topic = `msh/${this.region}/2/e/SeatState/!gateway`;

      return new Promise((resolve) => {
        this.client.publish(topic, meshPacketBuffer, (error) => {
          if (error) {
            console.error('❌ Failed to request status refresh:', error);
            resolve(false);
          } else {
            console.log('✅ Status refresh request sent successfully');
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error requesting status refresh:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connectionStatus.value;
  }
}
