import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SeatService } from './seat.service';
import { SeatMetadata } from './interfaces/seat-metadata.interface';
import { SeatStatus } from './interfaces/seat-status.interface';
import { UpdateSeatStatusDto } from './dtos/update-seat-status.dto';

@Controller('seat')
export class SeatController {
  constructor(private readonly seatService: SeatService) {}

  @Get('metadata')
  async getSeatMetadata(): Promise<SeatMetadata> {
    try {
      return await this.seatService.getSeatMetadata();
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve seat metadata: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async getAllStatuses(): Promise<SeatStatus[]> {
    try {
      return await this.seatService.getInitialStatus();
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve seat statuses: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('status/:seatId')
  async updateSeatStatus(
    @Param('seatId') seatId: string,
    @Body() updateDto: UpdateSeatStatusDto,
  ): Promise<SeatStatus> {
    try {
      // Ensure the seatId in the path matches the seatId in the body
      if (updateDto.seatId && updateDto.seatId !== seatId) {
        throw new HttpException(
          'SeatId in path does not match seatId in body',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.seatService.updateSeatStatus(
        seatId,
        updateDto.occupied,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to update seat status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
