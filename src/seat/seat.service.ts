import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SeatMetadata } from './interfaces/seat-metadata.interface';
import { SeatStatus } from './interfaces/seat-status.interface';

@Injectable()
export class SeatService {
  private seatMetadata: SeatMetadata = {
    id: '1f',
    name: '1F Study',
    currentLayout: 'default_layout',
    layouts: {
      default_layout: {
        name: 'Default Layout',
        seat: [
          { seatId: '000', x: 0, y: 0 },
          { seatId: '001', x: 1, y: 0 },
          { seatId: '002', x: 2, y: 0 },
          { seatId: '003', x: 3, y: 0 },
        ],
      },
    },
  };

  private seatStatuses: Map<string, SeatStatus> = new Map();
  private statusUpdates$ = new Subject<SeatStatus>();
  private updateInterval: NodeJS.Timeout;

  constructor() {
    this.initializeSeatStatuses();
    this.startSimulation();
  }

  private initializeSeatStatuses() {
    const defaultLayout =
      this.seatMetadata.layouts[this.seatMetadata.currentLayout];
    defaultLayout.seat.forEach((seat) => {
      this.seatStatuses.set(seat.seatId, {
        seatId: seat.seatId,
        occupied: false,
        lastUpdated: new Date(),
      });
    });
  }

  private startSimulation() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    const getRandomInterval = () => Math.floor(Math.random() * 2000) + 2000; // 2-4 seconds

    const updateRandomSeat = () => {
      const allStatuses = this.getInitialStatus();

      const randomIndex = Math.floor(Math.random() * allStatuses.length);
      const randomSeat = allStatuses[randomIndex];

      this.updateSeatStatus(randomSeat.seatId, !randomSeat.occupied);

      this.updateInterval = setTimeout(updateRandomSeat, getRandomInterval());
    };

    this.updateInterval = setTimeout(updateRandomSeat, getRandomInterval());
  }

  getSeatMetadata(): SeatMetadata {
    return this.seatMetadata;
  }

  getInitialStatus(): SeatStatus[] {
    return Array.from(this.seatStatuses.values());
  }

  getStatusUpdates(): Observable<SeatStatus> {
    return this.statusUpdates$.asObservable();
  }

  updateSeatStatus(seatId: string, occupied: boolean): SeatStatus {
    const status: SeatStatus = {
      seatId,
      occupied,
      lastUpdated: new Date(),
    };
    this.seatStatuses.set(seatId, status);
    this.statusUpdates$.next(status); // Emit the update
    return status;
  }
}
