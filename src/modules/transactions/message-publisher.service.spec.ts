import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";
import {
  MessagePublisherService,
  TransactionEventType,
} from "./message-publisher.service";
import { ClientKafka } from "@nestjs/microservices";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "./transaction.entity";

describe("MessagePublisherService", () => {
  let service: MessagePublisherService;
  let kafkaClientMock: jest.Mocked<ClientKafka>;

  const mockTransaction: Transaction = {
    id: "test-id",
    signature: "test-signature",
    type: TransactionType.TRANSFER,
    status: TransactionStatus.PENDING,
    fromAddress: "11111111111111111111111111111112",
    toAddress: "11111111111111111111111111111113",
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
        MessagePublisherService,
        {
          provide: "KAFKA_SERVICE",
          useValue: kafkaClientMock,
        },
      ],
    }).compile();

    service = module.get<MessagePublisherService>(MessagePublisherService);
  });

  afterEach(async () => {
    // Skip onModuleDestroy for error handling test to avoid flush errors
    const isErrorTest = expect
      .getState()
      .currentTestName?.includes("error handling");
    if (!isErrorTest) {
      await service.onModuleDestroy();
    }
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("publishTransactionCreated", () => {
    it("should publish transaction created event", async () => {
      await service.publishTransactionCreated(mockTransaction);
      await service.forceFlush(); // Force flush to test immediate publishing

      expect(kafkaClientMock.emit).toHaveBeenCalledWith("transactions", {
        key: mockTransaction.signature,
        value: expect.objectContaining({
          eventType: TransactionEventType.CREATED,
          transactionId: mockTransaction.id,
          signature: mockTransaction.signature,
          amount: Number(mockTransaction.amount),
          status: mockTransaction.status,
          type: mockTransaction.type,
          metadata: mockTransaction.metadata,
        }),
        headers: expect.objectContaining({
          "event-type": TransactionEventType.CREATED,
          "transaction-id": mockTransaction.id,
        }),
      });
    });
  });

  describe("publishTransactionStatusUpdated", () => {
    it("should publish transaction status update event", async () => {
      const previousStatus = TransactionStatus.PENDING;
      const updatedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED,
      };

      await service.publishTransactionStatusUpdated(
        updatedTransaction,
        previousStatus,
      );
      await service.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledWith("transactions", {
        key: updatedTransaction.signature,
        value: expect.objectContaining({
          eventType: TransactionEventType.STATUS_UPDATED,
          transactionId: updatedTransaction.id,
          status: TransactionStatus.CONFIRMED,
          metadata: expect.objectContaining({
            previousStatus,
          }),
        }),
        headers: expect.objectContaining({
          "event-type": TransactionEventType.STATUS_UPDATED,
        }),
      });
    });
  });

  describe("publishTransactionConfirmed", () => {
    it("should publish transaction confirmed event", async () => {
      const confirmedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED,
        slot: 12345,
        blockTime: new Date(),
      };

      await service.publishTransactionConfirmed(confirmedTransaction);
      await service.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledWith("transactions", {
        key: confirmedTransaction.signature,
        value: expect.objectContaining({
          eventType: TransactionEventType.CONFIRMED,
          transactionId: confirmedTransaction.id,
          status: TransactionStatus.CONFIRMED,
          metadata: expect.objectContaining({
            slot: confirmedTransaction.slot,
            blockTime: confirmedTransaction.blockTime,
          }),
        }),
        headers: expect.objectContaining({
          "event-type": TransactionEventType.CONFIRMED,
        }),
      });
    });
  });

  describe("publishTransactionFailed", () => {
    it("should publish transaction failed event", async () => {
      const failedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.FAILED,
      };
      const error = "Transaction failed due to insufficient funds";

      await service.publishTransactionFailed(failedTransaction, error);
      await service.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledWith("transactions", {
        key: failedTransaction.signature,
        value: expect.objectContaining({
          eventType: TransactionEventType.FAILED,
          transactionId: failedTransaction.id,
          status: TransactionStatus.FAILED,
          metadata: expect.objectContaining({
            error,
          }),
        }),
        headers: expect.objectContaining({
          "event-type": TransactionEventType.FAILED,
        }),
      });
    });
  });

  describe("publishBlockchainEvent", () => {
    it("should publish generic blockchain event", async () => {
      const eventType = "block.mined";
      const eventData = { blockHeight: 12345, hash: "abc123" };

      await service.publishBlockchainEvent(eventType, eventData, "block-12345");

      expect(kafkaClientMock.emit).toHaveBeenCalledWith("blockchain-events", {
        key: "block-12345",
        value: expect.objectContaining({
          eventType,
          data: eventData,
        }),
        headers: expect.objectContaining({
          "event-type": eventType,
        }),
      });
    });
  });

  describe("event buffering", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should buffer events and flush periodically", async () => {
      // Mock setInterval to control flushing
      const originalSetInterval = global.setInterval;
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;

      // Create a new service instance to test buffering
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MessagePublisherService,
          {
            provide: "KAFKA_SERVICE",
            useValue: kafkaClientMock,
          },
        ],
      }).compile();

      const bufferedService = module.get<MessagePublisherService>(
        MessagePublisherService,
      );

      // Publish multiple events
      await bufferedService.publishTransactionCreated(mockTransaction);
      await bufferedService.publishTransactionCreated({
        ...mockTransaction,
        id: "test-id-2",
      });

      // Manually trigger flush
      await bufferedService.forceFlush();

      expect(kafkaClientMock.emit).toHaveBeenCalledTimes(2);

      await bufferedService.onModuleDestroy();
    });

    it("should return buffer status", () => {
      const status = service.getBufferStatus();

      expect(status).toHaveProperty("bufferedEvents");
      expect(status).toHaveProperty("maxBufferSize");
      expect(status).toHaveProperty("isBufferFull");
    });
  });

  describe("error handling", () => {
    it("should handle kafka publish errors gracefully", async () => {
      // Clear any buffered events from previous tests
      (service as any).eventBuffer.length = 0;

      // Mock the service to throw an error
      const originalEmit = kafkaClientMock.emit;
      kafkaClientMock.emit.mockImplementation(() => {
        throw new Error("Kafka connection failed");
      });

      // Publish event (should succeed as it's buffered)
      await service.publishTransactionCreated(mockTransaction);

      // Force flush should throw the error
      await expect(service.forceFlush()).rejects.toThrow(
        "Kafka connection failed",
      );

      // Restore original mock
      kafkaClientMock.emit = originalEmit;
    });
  });
});
