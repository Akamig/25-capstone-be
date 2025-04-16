import { Test, TestingModule } from '@nestjs/testing';
import { SeatStatusGateway } from './seat-status.gateway';

describe('SeatStatusGateway', () => {
  let gateway: SeatStatusGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeatStatusGateway],
    }).compile();

    gateway = module.get<SeatStatusGateway>(SeatStatusGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
