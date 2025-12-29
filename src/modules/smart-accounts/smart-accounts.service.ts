import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Redis from "ioredis";
import { SmartAccount, SmartAccountStatus } from "./smart-account.entity";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
/**
 * Service for managing smart accounts (Account Abstraction).
 * @see docs/diagrams/04-account-abstraction.md
 */
export class SmartAccountsService {
  constructor(
    @InjectRepository(SmartAccount)
    private readonly smartAccountRepository: Repository<SmartAccount>,
    @Inject("REDIS_CLIENT") private readonly redisClient: Redis,
    @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka,
  ) {}

  async createSmartAccount(
    ownerAddress: string,
    rules: any,
  ): Promise<SmartAccount> {
    // Logic to derive a PDA would go here (mocked for now)
    // In a real Solana app, we'd use PublicKey.findProgramAddress
    const smartAccountAddress = `smart-${ownerAddress.slice(0, 8)}-${Date.now().toString().slice(-4)}`;

    const account = this.smartAccountRepository.create({
      ownerAddress,
      smartAccountAddress,
      rules,
      status: SmartAccountStatus.ACTIVE,
    });

    const saved = await this.smartAccountRepository.save(account);

    // Cache rules in Redis for fast access during auth
    await this.redisClient.set(
      `smart-account:${saved.smartAccountAddress}:rules`,
      JSON.stringify(rules),
      "EX",
      3600, // 1 hour TTL
    );

    // Publish event
    this.kafkaClient.emit("smart-account.created", {
      smartAccountAddress: saved.smartAccountAddress,
      ownerAddress,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  async validateTransaction(
    smartAccountAddress: string,
    amount: number,
    programId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Try to get rules from Redis first
    const rulesStr = await this.redisClient.get(
      `smart-account:${smartAccountAddress}:rules`,
    );
    let rules;

    if (!rulesStr) {
      const account = await this.smartAccountRepository.findOne({
        where: { smartAccountAddress },
      });
      if (!account) return { valid: false, reason: "Account not found" };
      if (account.status !== SmartAccountStatus.ACTIVE)
        return { valid: false, reason: "Account not active" };

      rules = account.rules;
      // Cache it
      await this.redisClient.set(
        `smart-account:${smartAccountAddress}:rules`,
        JSON.stringify(rules),
        "EX",
        3600,
      );
    } else {
      rules = JSON.parse(rulesStr);
    }

    // Check Max Daily Spend
    if (rules.maxDailySpend) {
      const today = new Date().toISOString().split("T")[0];
      const spentKey = `smart-account:${smartAccountAddress}:spent:${today}`;
      const currentSpent = await this.redisClient.get(spentKey);
      const newTotal = parseInt(currentSpent || "0", 10) + amount;

      if (newTotal > rules.maxDailySpend) {
        return {
          valid: false,
          reason: `Daily spend limit exceeded. Limit: ${rules.maxDailySpend}, Current: ${currentSpent}, Attempted: ${amount}`,
        };
      }
    }

    // Check Allowed Programs
    if (rules.allowedPrograms && !rules.allowedPrograms.includes(programId)) {
      return { valid: false, reason: `Program ${programId} not allowed` };
    }

    return { valid: true };
  }

  async recordTransaction(smartAccountAddress: string, amount: number) {
    const today = new Date().toISOString().split("T")[0];
    const spentKey = `smart-account:${smartAccountAddress}:spent:${today}`;
    await this.redisClient.incrby(spentKey, amount);
    await this.redisClient.expire(spentKey, 86400); // 24h
  }

  async findByAddress(smartAccountAddress: string): Promise<SmartAccount> {
    return this.smartAccountRepository.findOne({
      where: { smartAccountAddress },
    });
  }
}
