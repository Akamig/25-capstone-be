import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SeatsService } from './seats.service';
import { SeatStatus } from './interfaces/seat-status.interface';

@WebSocketGateway()
export class SeatStatusGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private readonly seatsService: SeatsService) {}

  handleConnection(client: Socket) {
    // Send initial status to newly connected client
    const initialStatus = this.seatsService.getInitialStatus();
    client.emit('initial-status', initialStatus);
  }

  @SubscribeMessage('request-updates')
  handleRequestUpdates(client: Socket) {
    // Client can subscribe to receive updates
    client.join('seat-updates');
  }

  // Method to broadcast updates (called from service)
  broadcastStatusUpdate(status: SeatStatus) {
    this.server.to('seat-updates').emit('seat-update', status);
  }
}
