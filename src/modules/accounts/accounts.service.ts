import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { Connection, PublicKey } from '@solana/web3.js';

@Injectable()
/**
 * Service for managing Solana accounts.
 * @see docs/diagrams/01-accounts-programs.md
 */
export class AccountsService {
  private connection: Connection;

  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  async create(accountData: Partial<Account>): Promise<Account> {
    const account = this.accountsRepository.create(accountData);
    return this.accountsRepository.save(account);
  }

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find();
  }

  async findOne(id: string): Promise<Account> {
    return this.accountsRepository.findOne({ where: { id } });
  }

  async findByAddress(address: string): Promise<Account> {
    return this.accountsRepository.findOne({ where: { address } });
  }

  async update(id: string, updateData: Partial<Account>): Promise<Account> {
    await this.accountsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.accountsRepository.delete(id);
  }

  async getAccountInfo(address: string) {
    try {
      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return {
        address,
        exists: !!accountInfo,
        lamports: accountInfo?.lamports || 0,
        owner: accountInfo?.owner?.toString(),
        executable: accountInfo?.executable || false,
        data: accountInfo?.data?.toString('base64'),
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}