import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MqttService } from './mqtt.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProtobufService } from '../protobuf/protobuf.service';

describe('MqttService', () => {
  let service: MqttService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        MQTT_REGION: 'KR',
        DEFAULT_RESERVATION_MINUTES: '2',
        MQTT_BROKER_URL: 'mqtt://localhost:1883',
        MQTT_USERNAME: 'test',
        MQTT_PASSWORD: 'test',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockPrismaService = {
    seatModule: {
      upsert: jest.fn(),
    },
    seatModuleStatus: {
      upsert: jest.fn(),
    },
  };

  const mockProtobufService = {
    decodeMeshPacket: jest.fn(),
    decodeSeatStatus: jest.fn(),
    decodeDeviceMetrics: jest.fn(),
    encodeSeatStatus: jest.fn(),
    encodeMeshPacket: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProtobufService,
          useValue: mockProtobufService,
        },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct configuration', () => {
    expect(service['region']).toBe('KR');
    expect(service['defaultReservationMinutes']).toBe(2);
  });
});
