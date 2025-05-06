import { Test, TestingModule } from '@nestjs/testing';
import { SeatService } from './seat.service';
import { PrismaService } from '../prisma/prisma.service';
import { Seat } from '@prisma/client';

// Create a mock of the PrismaService
const mockPrismaService = {
  seatRoom: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  seat: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SeatService', () => {
  let service: SeatService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SeatService>(SeatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInitialStatus', () => {
    it('should return seat statuses from the database', async () => {
      // Setup mock data
      const mockSeats: Seat[] = [
        { id: '000', roomId: '1', occupied: false, lastUpdated: new Date() },
        { id: '001', roomId: '1', occupied: true, lastUpdated: new Date() },
      ];

      mockPrismaService.seat.findMany.mockResolvedValue(mockSeats);

      // Call the method
      const result = await service.getInitialStatus();

      // Verify results
      expect(prismaService.seat.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].seatId).toBe('000');
      expect(result[0].occupied).toBe(false);
      expect(result[1].seatId).toBe('001');
      expect(result[1].occupied).toBe(true);
    });
  });

  describe('updateSeatStatus', () => {
    it('should update a seat status and emit an event', async () => {
      // Setup mock data
      const seatId = '000';
      const occupied = true;
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementationOnce(() => now as any);

      const mockUpdatedSeat: Seat = {
        id: seatId,
        roomId: '1',
        occupied,
        lastUpdated: now,
      };

      mockPrismaService.seat.update.mockResolvedValue(mockUpdatedSeat);

      // Setup spy on the subject
      const subjectSpy = jest.spyOn(service as any, 'statusUpdates$');

      // Call the method
      const result = await service.updateSeatStatus(seatId, occupied);

      // Verify results
      expect(prismaService.seat.update).toHaveBeenCalledWith({
        where: { id: seatId },
        data: {
          occupied,
          lastUpdated: now,
        },
      });

      expect(result).toEqual({
        seatId,
        occupied,
        lastUpdated: now,
      });

      // Check that the event was emitted
      expect(subjectSpy.next).toHaveBeenCalledWith({
        seatId,
        occupied,
        lastUpdated: now,
      });
    });
  });
});
