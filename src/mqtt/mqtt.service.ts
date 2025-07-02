import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { Subject, BehaviorSubject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
export interface SeatStatePayload {
  channel: number;
  from: number;
  // The 'payload' can be DeviceMetrics, NodeInfo, etc., based on the 'type'.
  payload: SeatState;
  sender: string; // The unique ID of the module (e.g., "!7efeee00")
  timestamp: number;
  to: number;
  type: string; // e.g., 'devicemetrics', 'nodeinfo'
}

// For incoming messages on the msh/../json/Main/# topic
export interface MqttMainPayload {
  channel: number;
  from: number;
  // The 'payload' can be DeviceMetrics, NodeInfo, etc., based on the 'type'.
  payload: DeviceMetrics | any;
  sender: string; // The unique ID of the module (e.g., "!7efeee00")
  timestamp: number;
  to: number;
  type: string; // e.g., 'devicemetrics', 'nodeinfo'
}

// Defines the structure of the device metrics data
export interface DeviceMetrics {
  battery_level?: number;
  voltage?: number;
  uptime_seconds?: number;
}

export interface SeatState {
  occupied: boolean;
}

export interface SeatStatusUpdate {
  moduleId: number;
  occupied: boolean;
  timestamp: Date;
  seatId?: string;
  layoutId?: string;
}

export interface ModuleStatusUpdate {
  moduleId: number;
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
    // Switched from 'e' (protobuf) to 'json'
    const mainTopic = `msh/${this.region}/2/json/Main/#`;
    const seatStateTopic = `msh/${this.region}/2/json/SeatState/#`;

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
      const data = JSON.parse(message.toString());

      // Handle SeatState channel
      if (topic.includes('/json/SeatState/')) {
        await this.handleSeatStatusMessage(data);
      }

      // Handle Main channel (DeviceMetrics, NodeInfo, etc.)
      if (topic.includes('/json/Main/')) {
        await this.handleMainChannelMessage(data);
      }
    } catch (error) {
      console.error('❌ Error handling JSON MQTT message:', error);
    }
  }

  private async handleSeatStatusMessage(payload: SeatStatePayload) {
    const moduleId = payload.from;
    const occupied = payload.payload.occupied ?? false;
    const timestamp = new Date();

    console.log(
      `🪑 Seat status update - Module: ${moduleId}, Occupied: ${occupied}`,
    );

    // Update or create seat module in the database
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

    // Emit seat status update to other services
    this.seatStatusSubject.next({
      moduleId,
      occupied,
      timestamp,
      seatId: seatModule.seat?.id,
      layoutId: seatModule.seat?.layoutId,
    });
  }

  private async handleMainChannelMessage(data: MqttMainPayload) {
    const moduleId = data.from;
    if (!moduleId) {
      console.warn('⚠️ No sender (moduleId) in Main channel message');
      return;
    }

    console.log(
      `📊 Main channel message from module: ${moduleId}, Type: ${data.type}`,
    );

    // We only care about device metrics for status updates, based on original logic
    // This could be expanded to handle 'nodeinfo' or other types
    if (data.payload) {
      const deviceMetrics: DeviceMetrics = data.payload;
      const timestamp = new Date();

      await this.prisma.seatModuleStatus.upsert({
        where: { id: moduleId.toString() },
        update: {
          batteryLevel: deviceMetrics.battery_level,
          voltage: deviceMetrics.voltage,
          uptimeSec: deviceMetrics.uptime_seconds,
          lastSeen: timestamp,
        },
        create: {
          id: moduleId.toString(),
          batteryLevel: deviceMetrics.battery_level ?? 0,
          voltage: deviceMetrics.voltage ?? 0,
          uptimeSec: deviceMetrics.uptime_seconds ?? 0,
          lastSeen: timestamp,
        },
      });

      // Emit module status update to other services
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
    moduleId: number,
    minutes?: number,
  ): Promise<boolean> {
    try {
      const reservationMinutes = minutes ?? this.defaultReservationMinutes;
      console.log(
        `🔒 Sending temporary reservation to module ${moduleId} for ${reservationMinutes} minutes`,
      );

      // Construct the JSON command payload
      const command = {
        to: moduleId, // Target the specific module
        payload: {
          occupied: true, // Command to set the seat as occupied
        },
      };

      const topic = `msh/${this.region}/2/json/SeatState/!gateway`;
      const payload = JSON.stringify(command);

      return new Promise((resolve) => {
        this.client.publish(topic, payload, (error) => {
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

      // Construct the JSON command payload to request a status update
      const command = {
        to: parseInt(moduleId),
        want_response: true,
        // The payload could be empty or contain a specific request flag
        payload: {
          request_status: true,
        },
      };

      const topic = `msh/${this.region}/2/json/Main/!gateway`; // Refresh is usually a main channel function
      const payload = JSON.stringify(command);

      return new Promise((resolve) => {
        this.client.publish(topic, payload, (error) => {
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
