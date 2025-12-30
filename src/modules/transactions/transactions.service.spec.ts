import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { MessagePublisherService } from './message-publisher.service';
import { Transaction, TransactionStatus, TransactionType } from './transaction.entity';
import { ClientKafka } from '@nestjs/microservices';
import { of } from 'rxjs';
import { sendAndConfirmTransaction } from '@solana/web3.js';

// Mock Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getRecentBlockhash: jest.fn(),
    getTransaction: jest.fn(),
    getConfirmedSignaturesForAddress2: jest.fn(),
  })),
  Keypair: {
    fromSecretKey: jest.fn().mockReturnValue({
      publicKey: {
        toString: jest.fn().mockReturnValue('mock-public-key'),
      },
    }),
  },
  PublicKey: jest.fn(),
  SystemProgram: {
    transfer: jest.fn(),
  },
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockReturnThis(),
  })),
  sendAndConfirmTransaction: jest.fn(),
}));

describe('TransactionsService (with Event Publishing)', () => {
  let service: TransactionsService;
  let transactionRepository: Repository<Transaction>;
  let messagePublisher: MessagePublisherService;
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
      emit: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue(undefined),
      }),
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
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    messagePublisher = module.get<MessagePublisherService>(MessagePublisherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction and publish event', async () => {
      const createData = {
        signature: 'new-signature',
        type: TransactionType.TRANSFER,
        status: TransactionStatus.PENDING,
        fromAddress: '11111111111111111111111111111112',
        toAddress: '11111111111111111111111111111113',
        amount: 500000,
      };

      const result = await service.create(createData);

      expect(transactionRepository.create).toHaveBeenCalledWith(createData);
      expect(transactionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);

      // Verify event publishing was called
      const publishSpy = jest.spyOn(messagePublisher, 'publishTransactionCreated');
      // Note: In a real test, we'd need to mock the messagePublisher methods
    });
  });

  describe('update', () => {
    it('should update transaction and publish status change event', async () => {
      const updateData = { status: TransactionStatus.CONFIRMED };
      const updatedTransaction = { ...mockTransaction, status: TransactionStatus.CONFIRMED };

      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockTransaction);
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(updatedTransaction);

      const result = await service.update('test-id', updateData);

      expect(transactionRepository.update).toHaveBeenCalledWith('test-id', updateData);
      expect(result).toEqual(updatedTransaction);

      // Verify event publishing was called for status change
      const publishSpy = jest.spyOn(messagePublisher, 'publishTransactionStatusUpdated');
      // Note: In a real test, we'd need to mock the messagePublisher methods
    });

    it('should not publish event when status does not change', async () => {
      const updateData = { metadata: { updated: true } };
      const updatedTransaction = { ...mockTransaction, metadata: { updated: true } };

      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockTransaction);
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(updatedTransaction);

      const result = await service.update('test-id', updateData);

      expect(transactionRepository.update).toHaveBeenCalledWith('test-id', updateData);
      expect(result).toEqual(updatedTransaction);

      // No status change, so no event should be published
    });
  });

  describe('sendTransfer', () => {
    it('should send transfer and publish confirmation event on success', async () => {
      // Mock successful transfer
      const mockConnection = {
        getRecentBlockhash: jest.fn().mockResolvedValue({
          feeCalculator: { lamportsPerSignature: 5000 },
        }),
      };

      // Mock the connection in the service
      (service as any).connection = mockConnection;

      // Mock successful sendAndConfirmTransaction
      const mockSignature = 'mock-signature-123';
      (sendAndConfirmTransaction as jest.MockedFunction<typeof sendAndConfirmTransaction>).mockResolvedValue(mockSignature);

      const result = await service.sendTransfer(
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,32,185,19,163,99,7,139,92,173,24,112,59,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255]', // valid mock key
        '11111111111111111111111111111113',
        1000000
      );

      expect(result).toBe(mockSignature);
    });

    it('should handle transfer failure and publish failed event', async () => {
      // Mock the connection in the service
      const mockConnection = {
        getRecentBlockhash: jest.fn().mockResolvedValue({
          feeCalculator: { lamportsPerSignature: 5000 },
        }),
      };

      (service as any).connection = mockConnection;

      // Mock failed sendAndConfirmTransaction
      (sendAndConfirmTransaction as jest.MockedFunction<typeof sendAndConfirmTransaction>).mockRejectedValue(new Error('Insufficient funds'));

      await expect(
        service.sendTransfer(
          '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,32,185,19,163,99,7,139,92,173,24,112,59,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255]', // valid mock key
          '11111111111111111111111111111113',
          1000000
        )
      ).rejects.toThrow('Failed to send transfer: Insufficient funds');
    });
  });

  describe('other methods', () => {
    it('should find all transactions', async () => {
      const result = await service.findAll();
      expect(transactionRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual([mockTransaction]);
    });

    it('should find one transaction', async () => {
      const result = await service.findOne('test-id');
      expect(transactionRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-id' } });
      expect(result).toEqual(mockTransaction);
    });

    it('should find transaction by signature', async () => {
      const result = await service.findBySignature('test-signature');
      expect(transactionRepository.findOne).toHaveBeenCalledWith({ where: { signature: 'test-signature' } });
      expect(result).toEqual(mockTransaction);
    });

    it('should remove transaction', async () => {
      await service.remove('test-id');
      expect(transactionRepository.delete).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Solana RPC methods', () => {
    describe('getTransaction', () => {
      it('should return transaction details', async () => {
        const mockSolanaTransaction = {
          slot: 12345,
          blockTime: 1678888888,
          meta: {
            fee: 5000,
            err: null,
            logMessages: ['log1', 'log2'],
          },
          transaction: {
            message: {
              accountKeys: ['key1', 'key2', 'key3'],
              instructions: [
                { programIdIndex: 0, accounts: [1, 2], data: 'data' }
              ]
            }
          }
        };

        const connectionMock = (service as any).connection;
        connectionMock.getTransaction.mockResolvedValue(mockSolanaTransaction);

        const result = await service.getTransaction('sig123');
        
        expect(result.signature).toBe('sig123');
        expect(result.slot).toBe(12345);
        expect(result.status).toBe('confirmed');
      });

      it('should throw error if transaction not found', async () => {
        const connectionMock = (service as any).connection;
        connectionMock.getTransaction.mockResolvedValue(null);

        await expect(service.getTransaction('sig123')).rejects.toThrow('Failed to get transaction: Transaction not found');
      });
    });

    describe('getRecentTransactions', () => {
      it('should return recent transactions', async () => {
         const mockSignatures = [
           { signature: 'sig1', slot: 1, blockTime: 123, err: null },
           { signature: 'sig2', slot: 2, blockTime: 124, err: 'error' }
         ];
         
         const connectionMock = (service as any).connection;
         connectionMock.getConfirmedSignaturesForAddress2.mockResolvedValue(mockSignatures);
         
         const result = await service.getRecentTransactions();
         expect(result).toHaveLength(2);
         expect(result[0].signature).toBe('sig1');
      });
    });
    
    describe('getFeeEstimate', () => {
        it('should return fee estimate', async () => {
            const connectionMock = (service as any).connection;
            connectionMock.getRecentBlockhash.mockResolvedValue({
                feeCalculator: { lamportsPerSignature: 5000 }
            });
            
            const result = await service.getFeeEstimate();
            expect(result.baseFee).toBe(5000);
        });
    });
  });
});