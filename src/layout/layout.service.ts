import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutDto, CreateSeatDto } from './dto/layout.dto';

@Injectable()
export class LayoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLayouts() {
    console.log('📋 Fetching all layouts');
    return this.prisma.seatLayout.findMany({
      include: {
        seats: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async getLayoutSeats(layoutId: string) {
    console.log(`📋 Fetching seats for layout: ${layoutId}`);

    const layout = await this.prisma.seatLayout.findUnique({
      where: { id: layoutId },
      include: {
        seats: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!layout) {
      throw new NotFoundException(`Layout with ID ${layoutId} not found`);
    }

    return layout.seats;
  }

  async getLayoutSeatStatus(layoutId: string) {
    console.log(`📊 Fetching seat status for layout: ${layoutId}`);

    const layout = await this.prisma.seatLayout.findUnique({
      where: { id: layoutId },
      include: {
        seats: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!layout) {
      throw new NotFoundException(`Layout with ID ${layoutId} not found`);
    }

    return layout.seats.map((seat) => ({
      seatId: seat.id,
      seatName: seat.seatName,
      moduleId: seat.moduleId,
      occupied: seat.module.occupied,
      lastUpdated: seat.module.lastUpdated,
    }));
  }

  async createLayout(createLayoutDto: CreateLayoutDto) {
    console.log('🆕 Creating new layout:', createLayoutDto);

    return this.prisma.seatLayout.create({
      data: createLayoutDto,
    });
  }

  async createSeat(createSeatDto: CreateSeatDto) {
    console.log('🆕 Creating new seat:', createSeatDto);

    // Check if layout exists
    const layout = await this.prisma.seatLayout.findUnique({
      where: { id: createSeatDto.layoutId },
    });

    if (!layout) {
      throw new NotFoundException(
        `Layout with ID ${createSeatDto.layoutId} not found`,
      );
    }

    // Check if seat name is unique
    const existingSeat = await this.prisma.seat.findUnique({
      where: { seatName: createSeatDto.seatName },
    });

    if (existingSeat) {
      throw new BadRequestException(
        `Seat with name ${createSeatDto.seatName} already exists`,
      );
    }

    // Create or get the module
    const module = await this.prisma.seatModule.upsert({
      where: { id: createSeatDto.moduleId },
      update: {},
      create: {
        id: createSeatDto.moduleId,
      },
    });

    return this.prisma.seat.create({
      data: createSeatDto,
      include: {
        module: true,
        layout: true,
      },
    });
  }

  async assignModuleToSeat(seatId: string, moduleId: number) {
    console.log(`🔗 Assigning module ${moduleId} to seat ${seatId}`);

    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!seat) {
      throw new NotFoundException(`Seat with ID ${seatId} not found`);
    }

    // Create or get the module
    const module = await this.prisma.seatModule.upsert({
      where: { id: moduleId },
      update: {},
      create: {
        id: moduleId,
      },
    });

    return this.prisma.seat.update({
      where: { id: seatId },
      data: { moduleId },
      include: {
        module: true,
        layout: true,
      },
    });
  }

  async getUnassignedModules() {
    console.log('📋 Fetching unassigned modules');

    return this.prisma.seatModule.findMany({
      where: {
        seat: null,
      },
    });
  }
}
