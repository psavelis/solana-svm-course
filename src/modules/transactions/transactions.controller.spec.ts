import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { MessagePublisherService } from './message-publisher.service';
import { Transaction } from './transaction.entity';
import { ClientKafka } from '@nestjs/microservices';
import { of } from 'rxjs';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let mockRepository: Partial<Repository<Transaction>>;
  let kafkaClientMock: jest.Mocked<ClientKafka>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    kafkaClientMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        TransactionsService,
        MessagePublisherService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
        {
          provide: 'KAFKA_SERVICE',
          useValue: kafkaClientMock,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});