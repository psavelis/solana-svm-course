import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './transaction.entity';
import { MessagePublisherService } from './message-publisher.service';
import { TransactionEventConsumer } from './transaction-event.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionsController],
  providers: [TransactionsService, MessagePublisherService, TransactionEventConsumer],
  exports: [TransactionsService, MessagePublisherService],
})
export class TransactionsModule {}