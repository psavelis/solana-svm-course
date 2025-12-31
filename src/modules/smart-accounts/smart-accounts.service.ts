import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Redis from "ioredis";
import { SmartAccount, SmartAccountStatus } from "./smart-account.entity";
import { SessionKey, SessionKeyStatus } from "./session-key.entity";
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
    @InjectRepository(SessionKey)
    private readonly sessionKeyRepository: Repository<SessionKey>,
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

  async createSessionKey(
    smartAccountAddress: string,
    sessionKeyAddress: string,
    permissions: {
      maxAmount?: number;
      allowedPrograms?: string[];
      allowedOperations?: string[];
      timeLimit?: number;
    },
  ): Promise<SessionKey> {
    // Verify smart account exists and is active
    const smartAccount = await this.smartAccountRepository.findOne({
      where: { smartAccountAddress },
    });

    if (!smartAccount || smartAccount.status !== SmartAccountStatus.ACTIVE) {
      throw new Error("Smart account not found or not active");
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (permissions.timeLimit || 3600)); // Default 1 hour

    const sessionKey = this.sessionKeyRepository.create({
      smartAccountAddress,
      sessionKeyAddress,
      permissions,
      status: SessionKeyStatus.ACTIVE,
      expiresAt,
    });

    const saved = await this.sessionKeyRepository.save(sessionKey);

    // Cache session key permissions in Redis
    await this.redisClient.set(
      `session-key:${sessionKeyAddress}:permissions`,
      JSON.stringify(permissions),
      "EX",
      permissions.timeLimit || 3600,
    );

    // Publish event
    this.kafkaClient.emit("session-key.created", {
      sessionKeyId: saved.id,
      smartAccountAddress,
      sessionKeyAddress,
      expiresAt: saved.expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  async validateSessionKey(
    sessionKeyAddress: string,
    amount?: number,
    programId?: string,
    operation?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Try to get permissions from Redis first
    const permissionsStr = await this.redisClient.get(
      `session-key:${sessionKeyAddress}:permissions`,
    );

    let sessionKey: SessionKey;
    let permissions: any;

    if (!permissionsStr) {
      sessionKey = await this.sessionKeyRepository.findOne({
        where: { sessionKeyAddress },
        relations: ["smartAccount"],
      });

      if (!sessionKey) {
        return { valid: false, reason: "Session key not found" };
      }

      if (sessionKey.status !== SessionKeyStatus.ACTIVE) {
        return { valid: false, reason: `Session key ${sessionKey.status}` };
      }

      if (new Date() > sessionKey.expiresAt) {
        // Mark as expired
        await this.sessionKeyRepository.update(sessionKey.id, {
          status: SessionKeyStatus.EXPIRED,
        });
        return { valid: false, reason: "Session key expired" };
      }

      permissions = sessionKey.permissions;

      // Cache permissions
      const ttl = Math.floor(
        (sessionKey.expiresAt.getTime() - Date.now()) / 1000,
      );
      await this.redisClient.set(
        `session-key:${sessionKeyAddress}:permissions`,
        JSON.stringify(permissions),
        "EX",
        ttl,
      );
    } else {
      permissions = JSON.parse(permissionsStr);
    }

    // Validate amount limit
    if (permissions.maxAmount && amount && amount > permissions.maxAmount) {
      return {
        valid: false,
        reason: `Amount ${amount} exceeds session key limit ${permissions.maxAmount}`,
      };
    }

    // Validate allowed programs
    if (
      permissions.allowedPrograms &&
      programId &&
      !permissions.allowedPrograms.includes(programId)
    ) {
      return {
        valid: false,
        reason: `Program ${programId} not allowed by session key`,
      };
    }

    // Validate allowed operations
    if (
      permissions.allowedOperations &&
      operation &&
      !permissions.allowedOperations.includes(operation)
    ) {
      return {
        valid: false,
        reason: `Operation ${operation} not allowed by session key`,
      };
    }

    return { valid: true };
  }

  async revokeSessionKey(sessionKeyAddress: string): Promise<void> {
    const sessionKey = await this.sessionKeyRepository.findOne({
      where: { sessionKeyAddress },
    });

    if (!sessionKey) {
      throw new Error("Session key not found");
    }

    await this.sessionKeyRepository.update(sessionKey.id, {
      status: SessionKeyStatus.REVOKED,
    });

    // Remove from Redis cache
    await this.redisClient.del(`session-key:${sessionKeyAddress}:permissions`);

    // Publish event
    this.kafkaClient.emit("session-key.revoked", {
      sessionKeyId: sessionKey.id,
      sessionKeyAddress,
      timestamp: new Date().toISOString(),
    });
  }

  async getActiveSessionKeys(smartAccountAddress: string): Promise<SessionKey[]> {
    return this.sessionKeyRepository.find({
      where: {
        smartAccountAddress,
        status: SessionKeyStatus.ACTIVE,
      },
      order: { createdAt: "DESC" },
    });
  }
}
