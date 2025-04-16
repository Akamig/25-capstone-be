import { Module } from '@nestjs/common';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';
import { SeatStatusGateway } from './seat-status/seat-status.gateway';

@Module({
  controllers: [SeatsController],
  providers: [SeatsService, SeatStatusGateway]
})
export class SeatsModule {}
