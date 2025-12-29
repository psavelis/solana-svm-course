import { Test, TestingModule } from "@nestjs/testing";
import { TransactionEventConsumer } from "./transaction-event.consumer";
import { ClientKafka } from "@nestjs/microservices";
import {
  TransactionEvent,
  TransactionEventType,
} from "./message-publisher.service";
import { of } from "rxjs";

describe("TransactionEventConsumer", () => {
  let consumer: TransactionEventConsumer;
  let kafkaClientMock: jest.Mocked<ClientKafka>;

  const mockEvent: TransactionEvent = {
    eventType: TransactionEventType.CREATED,
    transactionId: "test-id",
    signature: "test-signature",
    fromAddress: "11111111111111111111111111111112",
    toAddress: "11111111111111111111111111111113",
    amount: 1000000,
    status: "pending",
    type: "transfer",
    timestamp: new Date(),
    metadata: { test: true },
  };

  const mockMessage = {
    key: "test-signature",
    value: mockEvent,
    headers: {
      "event-type": TransactionEventType.CREATED,
      "transaction-id": "test-id",
    },
  };

  const mockContext = {
    getConsumer: jest.fn().mockReturnValue({
      commitOffsets: jest.fn(),
    }),
    getTopic: jest.fn().mockReturnValue("transactions"),
    getPartition: jest.fn().mockReturnValue(0),
    getMessage: jest.fn().mockReturnValue({
      offset: "0",
    }),
  };

  beforeEach(async () => {
    kafkaClientMock = {
      subscribeToResponseOf: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue(of(undefined)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionEventConsumer,
        {
          provide: "KAFKA_SERVICE",
          useValue: kafkaClientMock,
        },
      ],
    }).compile();

    consumer = module.get<TransactionEventConsumer>(TransactionEventConsumer);
  });

  it("should be defined", () => {
    expect(consumer).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should subscribe to transactions and dlq topics and connect", async () => {
      await consumer.onModuleInit();

      expect(kafkaClientMock.subscribeToResponseOf).toHaveBeenCalledWith(
        "transactions",
      );
      expect(kafkaClientMock.subscribeToResponseOf).toHaveBeenCalledWith(
        "transaction-events-dlq",
      );
      expect(kafkaClientMock.connect).toHaveBeenCalled();
    });
  });

  describe("handleTransactionEvent", () => {
    it("should handle transaction created event", async () => {
      const createdEvent = {
        ...mockEvent,
        eventType: TransactionEventType.CREATED,
      };

      await consumer.handleTransactionEvent(
        { ...mockMessage, value: createdEvent },
        mockContext as any,
      );

      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();
    });

    it("should handle transaction status updated event", async () => {
      const statusEvent = {
        ...mockEvent,
        eventType: TransactionEventType.STATUS_UPDATED,
        metadata: { previousStatus: "pending" },
      };

      await consumer.handleTransactionEvent(
        { ...mockMessage, value: statusEvent },
        mockContext as any,
      );

      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();
    });

    it("should handle transaction confirmed event", async () => {
      const confirmedEvent = {
        ...mockEvent,
        eventType: TransactionEventType.CONFIRMED,
      };

      await consumer.handleTransactionEvent(
        { ...mockMessage, value: confirmedEvent },
        mockContext as any,
      );

      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();
    });

    it("should handle transaction failed event", async () => {
      const failedEvent = {
        ...mockEvent,
        eventType: TransactionEventType.FAILED,
        metadata: { error: "Insufficient funds" },
      };

      await consumer.handleTransactionEvent(
        { ...mockMessage, value: failedEvent },
        mockContext as any,
      );

      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();
    });

    it("should handle unknown event types", async () => {
      const unknownEvent = { ...mockEvent, eventType: "unknown.event" as any };

      await consumer.handleTransactionEvent(
        { ...mockMessage, value: unknownEvent },
        mockContext as any,
      );

      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();
    });

    it("should retry processing errors if retry count < MAX", async () => {
      // Mock a processing error
      const errorEvent = {
        ...mockEvent,
        eventType: TransactionEventType.CREATED,
      };
      const errorMessage = { ...mockMessage, value: errorEvent, headers: {} };

      // Make the consumer throw an error during processing
      const originalHandleCreated = consumer["handleTransactionCreated"];
      consumer["handleTransactionCreated"] = jest
        .fn()
        .mockRejectedValue(new Error("Processing failed"));

      await consumer.handleTransactionEvent(errorMessage, mockContext as any);

      // Should emit to 'transactions' with incremented retry count
      expect(kafkaClientMock.emit).toHaveBeenCalledWith(
        "transactions",
        expect.objectContaining({
          headers: expect.objectContaining({ "retry-count": "1" }),
        }),
      );

      // Should commit offsets
      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();

      // Restore original method
      consumer["handleTransactionCreated"] = originalHandleCreated;
    });

    it("should send to DLQ if retry count >= MAX", async () => {
      // Mock a processing error with max retries reached
      const errorEvent = {
        ...mockEvent,
        eventType: TransactionEventType.CREATED,
      };
      const errorMessage = {
        ...mockMessage,
        value: errorEvent,
        headers: { "retry-count": "3" },
      };

      // Make the consumer throw an error during processing
      const originalHandleCreated = consumer["handleTransactionCreated"];
      consumer["handleTransactionCreated"] = jest
        .fn()
        .mockRejectedValue(new Error("Processing failed"));

      await consumer.handleTransactionEvent(errorMessage, mockContext as any);

      // Should emit to 'transaction-events-dlq'
      expect(kafkaClientMock.emit).toHaveBeenCalledWith(
        "transaction-events-dlq",
        expect.any(Object),
      );

      // Should commit offsets
      expect(mockContext.getConsumer().commitOffsets).toHaveBeenCalled();

      // Restore original method
      consumer["handleTransactionCreated"] = originalHandleCreated;
    });
  });

  describe("getHealthStatus", () => {
    it("should return health status", () => {
      const status = consumer.getHealthStatus();

      expect(status).toEqual({
        consumer: "transaction-events",
        status: "healthy",
        topics: ["transactions"],
        lastProcessed: expect.any(String),
      });
    });
  });
});
