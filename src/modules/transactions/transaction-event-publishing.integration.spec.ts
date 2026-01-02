import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { MessagePublisherService } from './message-publisher.service';
import { Transaction, TransactionStatus, TransactionType } from './transaction.entity';
import { ClientKafka } from '@nestjs/microservices';
import { of } from 'rxjs';

describe('Transaction Event Publishing Integration', () => {
  let service: TransactionsService;
  let messagePublisher: MessagePublisherService;
  let transactionRepository: Repository<Transaction>;
  let kafkaClientMock: jest.Mocked<ClientKafka>;

  const mockTransaction: Transaction = {
    id: 'test-id',
    signature: 'test-signature',
    type: TransactionType.TRANSFER,
    status: TransactionStatus.PENDING,
    fromAddress: '11111111111111111111111111111112',
    toAddress: '11111111111111111111111111111113',
    amount: 1000000,
    fee: 5000,
    slot: null,
    blockTime: null,
    instructions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { test: true },
  };

  beforeEach(async () => {
    kafkaClientMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        MessagePublisherService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn().mockReturnValue(mockTransaction),
            save: jest.fn().mockResolvedValue(mockTransaction),
            find: jest.fn().mockResolvedValue([mockTransaction]),
            findOne: jest.fn().mockResolvedValue(mockTransaction),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: 'KAFKA_SERVICE',
          useValue: kafkaClientMock,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    messagePublisher = module.get<MessagePublisherService>(MessagePublisherService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  afterEach(async () => {
    await messagePublisher.onModuleDestroy();
  });

  describe('Event Publishing Integration', () => {
    it('should publish transaction created event when creating transaction', async () => {
      const createData = {
        signature: 'new-signature',
        type: TransactionType.TRANSFER,
        status: TransactionStatus.PENDING,
        fromAddress: '11111111111111111111111111111112',
        toAddress: '11111111111111111111111111111113',
        amount: 500000,
      };

      await service.create(createData);

      // Force flush to ensure events are published
      await messagePublisher.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          key: mockTransaction.signature, // The saved transaction's signature
          value: expect.objectContaining({
            eventType: 'transaction.created',
            transactionId: mockTransaction.id,
            signature: mockTransaction.signature,
            status: 'pending',
            type: 'transfer',
          }),
        }),
      );
    });

    it('should publish status update event when transaction status changes', async () => {
      // Mock finding existing transaction
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockTransaction);
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED,
      });

      await service.update('test-id', { status: TransactionStatus.CONFIRMED });

      // Force flush to ensure events are published
      await messagePublisher.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          value: expect.objectContaining({
            eventType: 'transaction.status_updated',
            transactionId: 'test-id',
            status: 'confirmed',
            metadata: expect.objectContaining({
              previousStatus: 'pending',
            }),
          }),
        }),
      );
    });

    it('should not publish event when status does not change', async () => {
      const updateData = { metadata: { updated: true } };

      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockTransaction);
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({
        ...mockTransaction,
        metadata: { updated: true },
      });

      await service.update('test-id', updateData);

      // Force flush
      await messagePublisher.forceFlush();

      // Should not have called emit for status update
      const calls = kafkaClientMock.emit.mock.calls.filter(
        (call: any) => call[1]?.value?.eventType === 'transaction.status_updated',
      );
      expect(calls).toHaveLength(0);
    });

    it('should provide buffer status information', () => {
      const status = messagePublisher.getBufferStatus();

      expect(status).toHaveProperty('bufferedEvents');
      expect(status).toHaveProperty('maxBufferSize');
      expect(status).toHaveProperty('isBufferFull');
      expect(typeof status.bufferedEvents).toBe('number');
      expect(typeof status.maxBufferSize).toBe('number');
      expect(typeof status.isBufferFull).toBe('boolean');
    });
  });
});
