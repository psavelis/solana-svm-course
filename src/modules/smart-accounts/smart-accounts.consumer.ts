import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  ClientKafka,
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from "@nestjs/microservices";
import { SmartAccountsService } from "./smart-accounts.service";

@Injectable()
export class SmartAccountsConsumer {
  private readonly logger = new Logger(SmartAccountsConsumer.name);

  constructor(
    private readonly smartAccountsService: SmartAccountsService,
    @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka,
  ) {}

  @EventPattern("transaction.authorization.requested")
  async handleAuthorizationRequest(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    const { transactionId, smartAccountAddress, amount, programId } = message;

    // Check if we have required fields
    if (!transactionId || !smartAccountAddress) {
      this.logger.error("invalid authorization request message");
      return;
    }

    this.logger.log(`processing auth request for ${transactionId}`);

    const result = await this.smartAccountsService.validateTransaction(
      smartAccountAddress,
      amount,
      programId,
    );

    if (result.valid) {
      // Record usage if authorized
      await this.smartAccountsService.recordTransaction(
        smartAccountAddress,
        amount,
      );

      // Emit authorized event
      this.kafkaClient.emit("transaction.authorized", {
        transactionId,
        smartAccountAddress,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`transaction ${transactionId} authorized`);
    } else {
      // emit rejected event
      this.kafkaClient.emit("transaction.rejected", {
        transactionId,
        smartAccountAddress,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`transaction ${transactionId} rejected: ${result.reason}`);
    }
  }
}
