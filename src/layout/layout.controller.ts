import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LayoutService } from './layout.service';
import { MqttService } from '../mqtt/mqtt.service';
import {
  CreateLayoutDto,
  CreateSeatDto,
  ReserveSeatDto,
} from './dto/layout.dto';

@Controller('layout')
export class LayoutController {
  constructor(
    private readonly layoutService: LayoutService,
    private readonly mqttService: MqttService,
  ) {}

  @Get('init')
  async getInitialLayouts() {
    console.log('🌐 GET /layout/init - Fetching initial layouts');
    return this.layoutService.getAllLayouts();
  }

  @Get('seats')
  async getLayoutSeats(@Query('layoutid') layoutId: string) {
    console.log(`🌐 GET /layout/seats?layoutid=${layoutId}`);

    if (!layoutId) {
      throw new BadRequestException('layoutid query parameter is required');
    }

    return this.layoutService.getLayoutSeats(layoutId);
  }

  @Get('seat-status')
  async getLayoutSeatStatus(@Query('layoutid') layoutId: string) {
    console.log(`🌐 GET /layout/seat-status?layoutid=${layoutId}`);

    if (!layoutId) {
      throw new BadRequestException('layoutid query parameter is required');
    }

    return this.layoutService.getLayoutSeatStatus(layoutId);
  }

  @Post('seat-status')
  @HttpCode(HttpStatus.OK)
  async reserveSeat(
    @Query('layoutId') layoutId: string,
    @Query('seatId') seatId: string,
    @Body() reserveSeatDto: ReserveSeatDto,
  ) {
    console.log(
      `🌐 POST /layout/seat-status?layoutId=${layoutId}&seatId=${seatId}`,
    );

    if (!layoutId || !seatId) {
      throw new BadRequestException(
        'layoutId and seatId query parameters are required',
      );
    }

    // Get seat information
    const seats = await this.layoutService.getLayoutSeats(layoutId);
    const seat = seats.find((s) => s.id === seatId);

    if (!seat) {
      throw new BadRequestException(
        `Seat with ID ${seatId} not found in layout ${layoutId}`,
      );
    }

    // Send temporary reservation to module
    const success = await this.mqttService.sendTemporaryReservation(
      seat.moduleId,
      reserveSeatDto.minutes,
    );

    if (!success) {
      throw new BadRequestException(
        'Failed to send reservation command to module',
      );
    }

    return {
      success: true,
      message: `Temporary reservation sent to seat ${seat.seatName}`,
      reservationMinutes: reserveSeatDto.minutes || 2,
    };
  }

  @Post('layouts')
  async createLayout(@Body() createLayoutDto: CreateLayoutDto) {
    console.log('🌐 POST /layout/layouts - Creating new layout');
    return this.layoutService.createLayout(createLayoutDto);
  }

  @Post('seats')
  async createSeat(@Body() createSeatDto: CreateSeatDto) {
    console.log('🌐 POST /layout/seats - Creating new seat');
    return this.layoutService.createSeat(createSeatDto);
  }

  @Get('modules/unassigned')
  async getUnassignedModules() {
    console.log(
      '🌐 GET /layout/modules/unassigned - Fetching unassigned modules',
    );
    return this.layoutService.getUnassignedModules();
  }

  @Post('seats/:seatId/assign-module/:moduleId')
  @HttpCode(HttpStatus.OK)
  async assignModuleToSeat(
    @Param('seatId') seatId: string,
    @Param('moduleId') moduleId: number,
  ) {
    console.log(`🌐 POST /layout/seats/${seatId}/assign-module/${moduleId}`);
    return this.layoutService.assignModuleToSeat(seatId, moduleId);
  }

  @Post('modules/:moduleId/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshModuleStatus(@Param('moduleId') moduleId: string) {
    console.log(`🌐 POST /layout/modules/${moduleId}/refresh`);

    const success = await this.mqttService.requestStatusRefresh(moduleId);

    if (!success) {
      throw new BadRequestException('Failed to send refresh command to module');
    }

    return {
      success: true,
      message: `Status refresh request sent to module ${moduleId}`,
    };
  }
}
