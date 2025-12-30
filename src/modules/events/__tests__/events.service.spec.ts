import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '../events.service';
import { EventSubscriptionService } from '../event-subscription.service';
import { EventFilterService } from '../event-filter.service';
import { Event, EventType, EventStatus } from '../event.entity';
import { EventSubscription } from '../event-subscription.entity';
import { EventFilter } from '../event-filter.entity';
import { EventsGateway } from '../gateway/events.gateway';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: Repository<Event>;
  let eventsGateway: EventsGateway;

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { type: 'TRANSACTION_CONFIRMED', count: '50' },
        { type: 'ACCOUNT_UPDATED', count: '30' },
      ]),
    })),
  };

  const mockEventsGateway = {
    emitEvent: jest.fn(),
    getConnectedClientsCount: jest.fn().mockReturnValue(5),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: EventSubscriptionService,
          useValue: {},
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    eventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create and emit an event', async () => {
      const dto = {
        eventType: EventType.TRANSACTION_CONFIRMED,
        source: 'test-source',
        data: { amount: 1000 },
      };

      const mockEvent = { id: '1', ...dto, status: EventStatus.PROCESSED };
      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.createEvent(dto);

      expect(mockEventRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: EventStatus.PROCESSED,
      });
      expect(mockEventRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(mockEventsGateway.emitEvent).toHaveBeenCalledWith(
        EventType.TRANSACTION_CONFIRMED,
        { amount: 1000 },
        'test-source',
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getEvents', () => {
    it('should return events with filters', async () => {
      const mockEvents = [
        { id: '1', eventType: EventType.TRANSACTION_CONFIRMED, source: 'test' },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getEvents(EventType.TRANSACTION_CONFIRMED, 'test', 10, 0);

      expect(mockEventRepository.find).toHaveBeenCalledWith({
        where: { eventType: EventType.TRANSACTION_CONFIRMED, source: 'test' },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      // Mock simple counts
      mockEventRepository.count
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(10); // recentEvents

      const result = await service.getEventStats();

      expect(result.totalEvents).toBe(100);
      expect(result.eventsByType).toEqual([
        { type: 'TRANSACTION_CONFIRMED', count: '50' },
        { type: 'ACCOUNT_UPDATED', count: '30' },
      ]);
      expect(result.recentEvents).toBe(10);
      expect(result.connectedClients).toBe(5);
    });
  });
});