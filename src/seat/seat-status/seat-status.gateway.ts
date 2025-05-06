import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SeatService } from '../seat.service';
import { Logger } from '@nestjs/common';
import { Subscription } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SeatStatusGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger(SeatStatusGateway.name);
  private statusSubscription: Subscription;

  constructor(private readonly seatService: SeatService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    this.statusSubscription = this.seatService
      .getStatusUpdates()
      .subscribe((status) => {
        this.logger.debug(
          `Broadcasting seat update: ${status.seatId} - ${status.occupied}`,
        );
        server.to('seat-updates').emit('seat-update', status);
      });
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      // Send initial status to newly connected client
      const initialStatus = await this.seatService.getInitialStatus();
      client.emit('initial-status', initialStatus);
    } catch (error) {
      this.logger.error('Error sending initial status', error);
      client.emit('error', { message: 'Failed to load initial seat status' });
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    client.leave('seat-updates');
  }

  @SubscribeMessage('request-updates')
  handleRequestUpdates(client: Socket) {
    this.logger.log(`Client ${client.id} subscribed to seat updates`);
    // Client subscribes to receive updates
    client.join('seat-updates');
    client.emit('subscription-success', {
      message: 'Subscribed to seat updates',
    });
  }

  @SubscribeMessage('update-seat')
  async handleUpdateSeat(
    client: Socket,
    payload: { seatId: string; occupied: boolean },
  ) {
    this.logger.log(`Received seat update request: ${JSON.stringify(payload)}`);
    try {
      const { seatId, occupied } = payload;
      const updatedStatus = await this.seatService.updateSeatStatus(
        seatId,
        occupied,
      );
      return { success: true, data: updatedStatus };
    } catch (error) {
      this.logger.error(`Error updating seat status`, error);
      return { success: false, error: 'Failed to update seat status' };
    }
  }
}
