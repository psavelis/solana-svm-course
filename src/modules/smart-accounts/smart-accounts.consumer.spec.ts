import { Test, TestingModule } from '@nestjs/testing';
import { SmartAccountsConsumer } from './smart-accounts.consumer';
import { SmartAccountsService } from './smart-accounts.service';

describe('SmartAccountsConsumer', () => {
  let consumer: SmartAccountsConsumer;
  let serviceMock: any;
  let kafkaClientMock: any;

  beforeEach(async () => {
    serviceMock = {
      validateTransaction: jest.fn(),
      recordTransaction: jest.fn(),
    };

    kafkaClientMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartAccountsConsumer,
        {
          provide: SmartAccountsService,
          useValue: serviceMock,
        },
        {
          provide: 'KAFKA_SERVICE',
          useValue: kafkaClientMock,
        },
      ],
    }).compile();

    consumer = module.get<SmartAccountsConsumer>(SmartAccountsConsumer);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleAuthorizationRequest', () => {
    const mockMessage = {
      transactionId: 'tx-123',
      smartAccountAddress: 'smart-123',
      amount: 100,
      programId: 'prog-1',
    };

    it('should validate and authorize transaction', async () => {
      serviceMock.validateTransaction.mockResolvedValue({ valid: true });

      await consumer.handleAuthorizationRequest(mockMessage, {} as any);

      expect(serviceMock.validateTransaction).toHaveBeenCalledWith('smart-123', 100, 'prog-1');
      expect(serviceMock.recordTransaction).toHaveBeenCalledWith('smart-123', 100);
      expect(kafkaClientMock.emit).toHaveBeenCalledWith('transaction.authorized', expect.objectContaining({
        transactionId: 'tx-123',
        smartAccountAddress: 'smart-123',
      }));
    });

    it('should validate and reject transaction', async () => {
      serviceMock.validateTransaction.mockResolvedValue({ valid: false, reason: 'limit exceeded' });

      await consumer.handleAuthorizationRequest(mockMessage, {} as any);

      expect(serviceMock.validateTransaction).toHaveBeenCalled();
      expect(serviceMock.recordTransaction).not.toHaveBeenCalled();
      expect(kafkaClientMock.emit).toHaveBeenCalledWith('transaction.rejected', expect.objectContaining({
        transactionId: 'tx-123',
        reason: 'limit exceeded',
      }));
    });
    
    it('should ignore invalid messages', async () => {
        await consumer.handleAuthorizationRequest({}, {} as any);
        expect(serviceMock.validateTransaction).not.toHaveBeenCalled();
    });
  });
});
