import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import {
  Connection,
  PublicKey,
  Logs,
  AccountChangeCallback,
  ProgramAccountChangeCallback,
} from "@solana/web3.js";
import { Event, EventType, EventStatus } from "./event.entity";
import { CreateEventDto, UpdateEventDto } from "./dto/event.dto";
import { EventsGateway } from "./gateway/events.gateway";
import { EventSubscriptionService } from "./event-subscription.service";

@Injectable()
/**
 * Service for managing Events and Logging.
 * @see docs/diagrams/11-events-logging.md
 */
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private connection: Connection;
  private logSubscriptions = new Map<string, number>();
  private accountSubscriptions = new Map<string, number>();

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventsGateway: EventsGateway,
    private readonly subscriptionService: EventSubscriptionService,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed",
    );
  }

  async onModuleInit() {
    // Start monitoring blockchain events
    await this.startBlockchainMonitoring();
  }

  /**
   * Create a new event
   */
  async createEvent(dto: CreateEventDto): Promise<Event> {
    this.logger.log(`Creating event: ${dto.eventType} from ${dto.source}`);

    const event = this.eventRepository.create({
      ...dto,
      slot: dto.slot ? parseInt(dto.slot) : undefined,
      status: EventStatus.PROCESSED,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Emit event to WebSocket subscribers
    await this.eventsGateway.emitEvent(dto.eventType, dto.data, dto.source);

    return savedEvent;
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const updateData: Partial<Event> = {};
    if (dto.data) updateData.data = dto.data;
    if (dto.status) updateData.status = dto.status as EventStatus;

    await this.eventRepository.update(id, updateData);
    return await this.eventRepository.findOne({ where: { id } });
  }

  /**
   * Get events with filtering
   */
  async getEvents(
    eventType?: EventType,
    source?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Event[]> {
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (source) where.source = source;

    return await this.eventRepository.find({
      where,
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get events since a specific time
   */
  async getEventsSince(since: Date, eventType?: EventType): Promise<Event[]> {
    const where: any = { createdAt: MoreThan(since) };
    if (eventType) where.eventType = eventType;

    return await this.eventRepository.find({
      where,
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Start blockchain event monitoring
   */
  private async startBlockchainMonitoring() {
    try {
      // Monitor transaction confirmations
      this.connection.onLogs("all", this.handleProgramLogs.bind(this));

      // Monitor slot updates
      this.connection.onSlotUpdate(this.handleSlotUpdate.bind(this));

      this.logger.log("Blockchain event monitoring started");
    } catch (error) {
      this.logger.error("Failed to start blockchain monitoring:", error);
    }
  }

  /**
   * Handle program logs (transaction confirmations)
   */
  private async handleProgramLogs(logs: Logs) {
    try {
      const event: CreateEventDto = {
        eventType: EventType.PROGRAM_LOG,
        source: logs.logs[0]?.split(" ")[1] || "unknown", // Extract program ID from logs
        data: {
          signature: logs.signature,
          logs: logs.logs,
          err: logs.err,
        },
        signature: logs.signature,
      };

      await this.createEvent(event);

      // Also create transaction confirmation event
      if (!logs.err) {
        const txEvent: CreateEventDto = {
          eventType: EventType.TRANSACTION_CONFIRMED,
          source: logs.signature,
          data: {
            signature: logs.signature,
            logs: logs.logs,
          },
          signature: logs.signature,
        };

        await this.createEvent(txEvent);
      }
    } catch (error) {
      this.logger.error("Error handling program logs:", error);
    }
  }

  /**
   * Handle slot updates
   */
  private async handleSlotUpdate(slotUpdate: any) {
    try {
      const event: CreateEventDto = {
        eventType: EventType.SLOT_UPDATED,
        source: "network",
        data: slotUpdate,
        slot: slotUpdate.slot.toString(),
      };

      await this.createEvent(event);
    } catch (error) {
      this.logger.error("Error handling slot update:", error);
    }
  }

  /**
   * Subscribe to account changes
   */
  async subscribeToAccount(accountId: string): Promise<void> {
    if (this.accountSubscriptions.has(accountId)) {
      return; // Already subscribed
    }

    try {
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(accountId),
        this.handleAccountChange.bind(this, accountId),
        "confirmed",
      );

      this.accountSubscriptions.set(accountId, subscriptionId);
      this.logger.log(`Subscribed to account changes: ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to account ${accountId}:`, error);
    }
  }

  /**
   * Unsubscribe from account changes
   */
  async unsubscribeFromAccount(accountId: string): Promise<void> {
    const subscriptionId = this.accountSubscriptions.get(accountId);
    if (subscriptionId) {
      try {
        await this.connection.removeAccountChangeListener(subscriptionId);
        this.accountSubscriptions.delete(accountId);
        this.logger.log(`Unsubscribed from account changes: ${accountId}`);
      } catch (error) {
        this.logger.error(
          `Failed to unsubscribe from account ${accountId}:`,
          error,
        );
      }
    }
  }

  /**
   * Handle account changes
   */
  private async handleAccountChange(accountId: string, accountInfo: any) {
    try {
      const event: CreateEventDto = {
        eventType: EventType.ACCOUNT_CHANGED,
        source: accountId,
        data: {
          accountId,
          lamports: accountInfo.lamports,
          data: accountInfo.data,
          owner: accountInfo.owner.toString(),
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
        },
      };

      await this.createEvent(event);
    } catch (error) {
      this.logger.error(
        `Error handling account change for ${accountId}:`,
        error,
      );
    }
  }

  /**
   * Subscribe to program account changes
   */
  async subscribeToProgramAccounts(
    programId: string,
    filters?: any,
  ): Promise<void> {
    const key = `program:${programId}`;
    if (this.accountSubscriptions.has(key)) {
      return; // Already subscribed
    }

    try {
      const subscriptionId = this.connection.onProgramAccountChange(
        new PublicKey(programId),
        this.handleProgramAccountChange.bind(this, programId),
        "confirmed",
        filters,
      );

      this.accountSubscriptions.set(key, subscriptionId);
      this.logger.log(`Subscribed to program account changes: ${programId}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to program accounts ${programId}:`,
        error,
      );
    }
  }

  /**
   * Handle program account changes
   */
  private async handleProgramAccountChange(
    programId: string,
    accountInfo: any,
  ) {
    try {
      const event: CreateEventDto = {
        eventType: EventType.ACCOUNT_CHANGED,
        source: accountInfo.accountId.toString(),
        data: {
          programId,
          accountId: accountInfo.accountId.toString(),
          accountInfo: accountInfo.accountInfo,
        },
      };

      await this.createEvent(event);
    } catch (error) {
      this.logger.error(
        `Error handling program account change for ${programId}:`,
        error,
      );
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<any> {
    const totalEvents = await this.eventRepository.count();
    const eventsByType = await this.eventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("event.eventType")
      .getRawMany();

    const recentEvents = await this.eventRepository.count({
      where: {
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
      },
    });

    return {
      totalEvents,
      eventsByType,
      recentEvents,
      connectedClients: this.eventsGateway.getConnectedClientsCount(),
    };
  }
}
