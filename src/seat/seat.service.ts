import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import {
  SeatMetadata,
  SeatLayout,
  SeatPosition,
} from './interfaces/seat-metadata.interface';
import { SeatStatus } from './interfaces/seat-status.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Seat } from '@prisma/client';

@Injectable()
export class SeatService implements OnModuleInit {
  private statusUpdates$ = new Subject<SeatStatus>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Check if we need to seed initial data
    const roomCount = await this.prisma.seatRoom.count();

    if (roomCount === 0) {
      await this.seedInitialData();
    }
  }

  private async seedInitialData() {
    const defaultRoom = await this.prisma.seatRoom.create({
      data: {
        name: '1F Study',
        currentLayout: 'default_layout',
        layouts: {
          create: [
            {
              name: 'Default Layout',
              positions: {
                create: [
                  { seatId: '000', x: 0, y: 0 },
                  { seatId: '001', x: 1, y: 0 },
                  { seatId: '002', x: 2, y: 0 },
                  { seatId: '003', x: 3, y: 0 },
                ],
              },
            },
          ],
        },
        seats: {
          create: [
            { id: '000', occupied: false },
            { id: '001', occupied: false },
            { id: '002', occupied: false },
            { id: '003', occupied: false },
          ],
        },
      },
    });

    console.log(`Seeded initial room: ${defaultRoom.id}`);
  }

  async getSeatMetadata(): Promise<SeatMetadata> {
    const room = await this.prisma.seatRoom.findFirst({
      include: {
        layouts: {
          include: {
            positions: true,
          },
        },
      },
    });

    if (!room) {
      throw new Error('No seat room found');
    }

    // Transform to the expected interface format
    const layouts: { [layoutName: string]: SeatLayout } = {};

    for (const layout of room.layouts) {
      layouts[layout.name.toLowerCase().replace(' ', '_')] = {
        name: layout.name,
        seat: layout.positions.map((pos) => ({
          seatId: pos.seatId,
          x: pos.x,
          y: pos.y,
        })),
      };
    }

    return {
      id: room.id,
      name: room.name,
      currentLayout: room.currentLayout,
      layouts,
    };
  }

  async getInitialStatus(): Promise<SeatStatus[]> {
    const seats = await this.prisma.seat.findMany();

    return seats.map((seat) => ({
      seatId: seat.id,
      occupied: seat.occupied,
      lastUpdated: seat.lastUpdated,
    }));
  }

  getStatusUpdates(): Observable<SeatStatus> {
    return this.statusUpdates$.asObservable();
  }

  async updateSeatStatus(
    seatId: string,
    occupied: boolean,
  ): Promise<SeatStatus> {
    const now = new Date();

    await this.prisma.seat.update({
      where: { id: seatId },
      data: {
        occupied,
        lastUpdated: now,
      },
    });

    const status: SeatStatus = {
      seatId,
      occupied,
      lastUpdated: now,
    };

    this.statusUpdates$.next(status); // Emit the update
    return status;
  }

  // Additional methods for managing seats
  async createSeat(roomId: string, seatId: string): Promise<Seat> {
    return this.prisma.seat.create({
      data: {
        id: seatId,
        roomId,
        occupied: false,
      },
    });
  }

  async deleteSeat(seatId: string): Promise<Seat> {
    return this.prisma.seat.delete({
      where: { id: seatId },
    });
  }
}
