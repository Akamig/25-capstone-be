import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { SeatService } from './seat.service';
import { SeatMetadata } from './interfaces/seat-metadata.interface';
import { SeatStatus } from './interfaces/seat-status.interface';

@Controller('seat')
export class SeatController {
  constructor(private readonly seatService: SeatService) {}

  @Get('metadata')
  getSeatMetadata(): SeatMetadata {
    return this.seatService.getSeatMetadata();
  }

  @Get('status')
  getAllStatuses(): SeatStatus[] {
    return this.seatService.getInitialStatus();
  }

  @Post('status/:seatId')
  updateSeatStatus(
    @Param('seatId') seatId: string,
    @Body('occupied') occupied: boolean,
  ): SeatStatus {
    return this.seatService.updateSeatStatus(seatId, occupied);
  }
}
