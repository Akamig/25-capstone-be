import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SeatService } from '../seat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SeatStatusGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(private readonly seatService: SeatService) {}

  afterInit(server: Server) {
    this.seatService.getStatusUpdates().subscribe((status) => {
      server.to('seat-updates').emit('seat-update', status);
    });
  }

  handleConnection(client: Socket) {
    // Send initial status to newly connected client
    const initialStatus = this.seatService.getInitialStatus();
    client.emit('initial-status', initialStatus);
  }

  @SubscribeMessage('request-updates')
  handleRequestUpdates(client: Socket) {
    // Client can subscribe to receive updates
    client.join('seat-updates');
  }
}
