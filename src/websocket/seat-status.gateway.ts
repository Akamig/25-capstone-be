import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import {
  MqttService,
  SeatStatusUpdate,
  ModuleStatusUpdate,
} from '../mqtt/mqtt.service';
import { LayoutService } from '../layout/layout.service';

interface LayoutSubscription {
  layoutId: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class SeatStatusGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private layoutSubscriptions: Map<string, Set<string>> = new Map(); // layoutId -> Set of socketIds
  private socketLayouts: Map<string, string> = new Map(); // socketId -> layoutId

  constructor(
    private readonly mqttService: MqttService,
    private readonly layoutService: LayoutService,
  ) {
    this.setupMqttListeners();
  }

  handleConnection(client: Socket) {
    console.log(`🔌 WebSocket client connected: ${client.id}`);

    // Send connection status
    client.emit('connection-status', {
      connected: true,
      mqttConnected: this.mqttService.isConnected(),
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 WebSocket client disconnected: ${client.id}`);

    // Clean up subscriptions
    const layoutId = this.socketLayouts.get(client.id);
    if (layoutId) {
      const subscribers = this.layoutSubscriptions.get(layoutId);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.layoutSubscriptions.delete(layoutId);
        }
      }
      this.socketLayouts.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe-layout')
  async handleLayoutSubscription(
    @MessageBody() data: { layoutId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { layoutId } = data;

    console.log(`📡 Client ${client.id} subscribing to layout: ${layoutId}`);

    try {
      // Verify layout exists
      await this.layoutService.getLayoutSeats(layoutId);

      // Remove from previous layout if exists
      const previousLayoutId = this.socketLayouts.get(client.id);
      if (previousLayoutId) {
        const previousSubscribers =
          this.layoutSubscriptions.get(previousLayoutId);
        if (previousSubscribers) {
          previousSubscribers.delete(client.id);
          if (previousSubscribers.size === 0) {
            this.layoutSubscriptions.delete(previousLayoutId);
          }
        }
      }

      // Add to new layout
      if (!this.layoutSubscriptions.has(layoutId)) {
        this.layoutSubscriptions.set(layoutId, new Set());
      }
      this.layoutSubscriptions.get(layoutId)!.add(client.id);
      this.socketLayouts.set(client.id, layoutId);

      // Send current status
      const currentStatus =
        await this.layoutService.getLayoutSeatStatus(layoutId);
      client.emit('layout-status', {
        layoutId,
        seats: currentStatus,
        timestamp: new Date(),
      });

      client.emit('subscription-confirmed', {
        layoutId,
        message: `Successfully subscribed to layout ${layoutId}`,
      });
    } catch (error) {
      console.error(`❌ Error subscribing to layout ${layoutId}:`, error);
      client.emit('subscription-error', {
        layoutId,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('unsubscribe-layout')
  handleLayoutUnsubscription(
    @MessageBody() data: { layoutId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { layoutId } = data;

    console.log(
      `📡 Client ${client.id} unsubscribing from layout: ${layoutId}`,
    );

    const subscribers = this.layoutSubscriptions.get(layoutId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.layoutSubscriptions.delete(layoutId);
      }
    }

    if (this.socketLayouts.get(client.id) === layoutId) {
      this.socketLayouts.delete(client.id);
    }

    client.emit('unsubscription-confirmed', {
      layoutId,
      message: `Successfully unsubscribed from layout ${layoutId}`,
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date(),
      mqttConnected: this.mqttService.isConnected(),
    });
  }

  private setupMqttListeners() {
    // Listen for seat status updates
    this.mqttService.seatStatusUpdates$.subscribe(
      async (update: SeatStatusUpdate) => {
        if (update.seatId) {
          await this.broadcastSeatUpdate(update);
        }
      },
    );

    // Listen for module status updates
    this.mqttService.moduleStatusUpdates$.subscribe(
      async (update: ModuleStatusUpdate) => {
        await this.broadcastModuleUpdate(update);
      },
    );

    // Listen for MQTT connection status changes
    this.mqttService.connectionStatus$.subscribe((connected: boolean) => {
      /*this.server.emit('mqtt-status', {
        connected,
        timestamp: new Date(),
      });*/
    });
  }

  private async broadcastSeatUpdate(update: SeatStatusUpdate) {
    if (!update.seatId) return;
    if (!update.layoutId) return;

    try {
      const targetLayoutId = update.layoutId;
      console.log();

      const subscribers = this.layoutSubscriptions.get(targetLayoutId);
      if (!subscribers || subscribers.size === 0) return;

      const seatUpdateData = {
        seatId: update.seatId,
        moduleId: update.moduleId,
        occupied: update.occupied,
        timestamp: update.timestamp,
      };

      console.log(
        `📡 Broadcasting seat update to ${subscribers.size} subscribers:`,
        seatUpdateData,
      );

      // Send to all subscribers of this layout
      subscribers.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('seat-update', seatUpdateData);
        }
      });
    } catch (error) {
      console.error('❌ Error broadcasting seat update:', error);
    }
  }

  private async broadcastModuleUpdate(update: ModuleStatusUpdate) {
    // Broadcast module status updates to all connected clients
    this.server.emit('module-status-update', {
      moduleId: update.moduleId,
      batteryLevel: update.batteryLevel,
      voltage: update.voltage,
      uptimeSec: update.uptimeSec,
      lastSeen: update.lastSeen,
    });
  }

  // Method to get subscription statistics (useful for debugging)
  getSubscriptionStats() {
    const stats = {
      totalLayouts: this.layoutSubscriptions.size,
      totalConnections: this.socketLayouts.size,
      layoutSubscriptions: {} as Record<string, number>,
    };

    this.layoutSubscriptions.forEach((subscribers, layoutId) => {
      stats.layoutSubscriptions[layoutId] = subscribers.size;
    });

    return stats;
  }
}
