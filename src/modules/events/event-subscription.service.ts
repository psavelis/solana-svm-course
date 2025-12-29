import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EventSubscription,
  SubscriptionStatus,
} from "./event-subscription.entity";
import {
  CreateEventSubscriptionDto,
  UpdateEventSubscriptionDto,
} from "./dto/event-subscription.dto";

@Injectable()
export class EventSubscriptionService {
  private readonly logger = new Logger(EventSubscriptionService.name);

  constructor(
    @InjectRepository(EventSubscription)
    private readonly subscriptionRepository: Repository<EventSubscription>,
  ) {}

  /**
   * Create a new event subscription
   */
  async createSubscription(
    dto: CreateEventSubscriptionDto,
  ): Promise<EventSubscription> {
    this.logger.log(
      `Creating subscription for client ${dto.clientId}: ${dto.eventType}`,
    );

    // Check if subscription already exists
    const existing = await this.subscriptionRepository.findOne({
      where: {
        clientId: dto.clientId,
        eventType: dto.eventType,
        subscriptionType: dto.subscriptionType,
      },
    });

    if (existing) {
      // Update existing subscription
      Object.assign(existing, dto, { status: SubscriptionStatus.ACTIVE });
      return await this.subscriptionRepository.save(existing);
    }

    const subscription = this.subscriptionRepository.create({
      ...dto,
      status: SubscriptionStatus.ACTIVE,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    id: string,
    dto: UpdateEventSubscriptionDto,
  ): Promise<EventSubscription> {
    const updateData: Partial<EventSubscription> = {};
    if (dto.eventType) updateData.eventType = dto.eventType;
    if (dto.filters) updateData.filters = dto.filters;
    if (dto.endpoint) updateData.endpoint = dto.endpoint;
    if (dto.status) updateData.status = dto.status as SubscriptionStatus;
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);
    if (dto.metadata) updateData.metadata = dto.metadata;

    await this.subscriptionRepository.update(id, updateData);
    return await this.subscriptionRepository.findOne({ where: { id } });
  }

  /**
   * Update subscription by client and event type
   */
  async updateSubscriptionByClientAndType(
    clientId: string,
    eventType: string,
    dto: UpdateEventSubscriptionDto,
  ): Promise<EventSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { clientId, eventType },
    });

    if (!subscription) {
      throw new Error(
        `Subscription not found for client ${clientId} and event type ${eventType}`,
      );
    }

    Object.assign(subscription, dto);
    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Get subscriptions for a client
   */
  async getSubscriptionsByClient(
    clientId: string,
  ): Promise<EventSubscription[]> {
    return await this.subscriptionRepository.find({
      where: { clientId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get active subscriptions for an event type
   */
  async getActiveSubscriptionsByEventType(
    eventType: string,
  ): Promise<EventSubscription[]> {
    return await this.subscriptionRepository.find({
      where: { eventType, status: SubscriptionStatus.ACTIVE },
    });
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    await this.subscriptionRepository.delete(id);
  }

  /**
   * Clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    const result = await this.subscriptionRepository
      .createQueryBuilder()
      .delete()
      .where("expires_at IS NOT NULL AND expires_at < NOW()")
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired subscriptions`);
    return result.affected;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<any> {
    const totalSubscriptions = await this.subscriptionRepository.count();
    const activeSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const subscriptionsByType = await this.subscriptionRepository
      .createQueryBuilder("subscription")
      .select("subscription.subscriptionType", "type")
      .addSelect("COUNT(*)", "count")
      .where("subscription.status = :status", {
        status: SubscriptionStatus.ACTIVE,
      })
      .groupBy("subscription.subscriptionType")
      .getRawMany();

    const subscriptionsByEventType = await this.subscriptionRepository
      .createQueryBuilder("subscription")
      .select("subscription.eventType", "eventType")
      .addSelect("COUNT(*)", "count")
      .where("subscription.status = :status", {
        status: SubscriptionStatus.ACTIVE,
      })
      .groupBy("subscription.eventType")
      .getRawMany();

    return {
      totalSubscriptions,
      activeSubscriptions,
      subscriptionsByType,
      subscriptionsByEventType,
    };
  }
}
