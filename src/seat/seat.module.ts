import { Module } from '@nestjs/common';
import { SeatController } from './seat.controller';
import { SeatService } from './seat.service';
import { SeatStatusGateway } from './seat-status/seat-status.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeatController],
  providers: [SeatService, SeatStatusGateway],
})
export class SeatModule {}
