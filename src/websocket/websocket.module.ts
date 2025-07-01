import { Module } from '@nestjs/common';
import { SeatStatusGateway } from './seat-status.gateway';
import { MqttModule } from '../mqtt/mqtt.module';
import { LayoutModule } from '../layout/layout.module';

@Module({
  imports: [MqttModule, LayoutModule],
  providers: [SeatStatusGateway],
})
export class WebsocketModule {}
