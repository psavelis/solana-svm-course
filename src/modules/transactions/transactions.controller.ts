import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction record' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: Transaction })
  create(@Body() createTransactionDto: Partial<Transaction>) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ status: 200, description: 'List of transactions', type: [Transaction] })
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details', type: Transaction })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Get('signature/:signature')
  @ApiOperation({ summary: 'Get transaction by signature' })
  @ApiResponse({ status: 200, description: 'Transaction details', type: Transaction })
  findBySignature(@Param('signature') signature: string) {
    return this.transactionsService.findBySignature(signature);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully', type: Transaction })
  update(@Param('id') id: string, @Body() updateTransactionDto: Partial<Transaction>) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }

  @Get('details/:signature')
  @ApiOperation({ summary: 'Get transaction details from Solana' })
  @ApiResponse({ status: 200, description: 'Transaction details from Solana' })
  getTransaction(@Param('signature') signature: string) {
    return this.transactionsService.getTransaction(signature);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Send SOL transfer transaction' })
  @ApiResponse({ status: 201, description: 'Transfer transaction sent successfully' })
  sendTransfer(@Body() transferDto: { fromPrivateKey: string; toAddress: string; amount: number }) {
    return this.transactionsService.sendTransfer(
      transferDto.fromPrivateKey,
      transferDto.toAddress,
      transferDto.amount,
    );
  }

  @Get('recent/list')
  @ApiOperation({ summary: 'Get recent transactions' })
  @ApiResponse({ status: 200, description: 'List of recent transactions' })
  getRecentTransactions(@Query('limit') limit?: number) {
    return this.transactionsService.getRecentTransactions(limit);
  }

  @Get('fee/estimate')
  @ApiOperation({ summary: 'Get fee estimate' })
  @ApiResponse({ status: 200, description: 'Fee estimate' })
  getFeeEstimate() {
    return this.transactionsService.getFeeEstimate();
  }
}