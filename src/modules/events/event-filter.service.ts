import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventFilter, FilterStatus, FilterType } from './event-filter.entity';
import { CreateEventFilterDto, UpdateEventFilterDto } from './dto/event-filter.dto';

@Injectable()
export class EventFilterService {
  private readonly logger = new Logger(EventFilterService.name);

  constructor(
    @InjectRepository(EventFilter)
    private readonly filterRepository: Repository<EventFilter>,
  ) {}

  /**
   * Create a new event filter
   */
  async createFilter(dto: CreateEventFilterDto): Promise<EventFilter> {
    this.logger.log(`Creating filter for owner ${dto.ownerId}: ${dto.filterType}`);

    const filter = this.filterRepository.create({
      ...dto,
      status: FilterStatus.ACTIVE,
    });

    return await this.filterRepository.save(filter);
  }

  /**
   * Update a filter
   */
  async updateFilter(id: string, dto: UpdateEventFilterDto): Promise<EventFilter> {
    await this.filterRepository.update(id, dto);
    return await this.filterRepository.findOne({ where: { id } });
  }

  /**
   * Get filters for an owner
   */
  async getFiltersByOwner(ownerId: string): Promise<EventFilter[]> {
    return await this.filterRepository.find({
      where: { ownerId, status: FilterStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get public filters
   */
  async getPublicFilters(): Promise<EventFilter[]> {
    return await this.filterRepository.find({
      where: { isPublic: true, status: FilterStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get filters by type
   */
  async getFiltersByType(filterType: FilterType): Promise<EventFilter[]> {
    return await this.filterRepository.find({
      where: { filterType, status: FilterStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a filter
   */
  async deleteFilter(id: string): Promise<void> {
    await this.filterRepository.delete(id);
  }

  /**
   * Apply filters to event data
   */
  matchesFilter(eventData: any, filter: EventFilter): boolean {
    try {
      const criteria = filter.criteria;

      switch (filter.filterType) {
        case 'account':
          if (filter.accountId && eventData.accountId !== filter.accountId) {
            return false;
          }
          break;

        case 'program':
          if (filter.programId && eventData.programId !== filter.programId) {
            return false;
          }
          break;

        case 'transaction':
          // Apply transaction-specific filters
          if (criteria.minAmount && eventData.amount < criteria.minAmount) {
            return false;
          }
          if (criteria.maxAmount && eventData.amount > criteria.maxAmount) {
            return false;
          }
          if (criteria.tokenMint && eventData.tokenMint !== criteria.tokenMint) {
            return false;
          }
          break;

        case 'slot':
          if (criteria.minSlot && eventData.slot < criteria.minSlot) {
            return false;
          }
          if (criteria.maxSlot && eventData.slot > criteria.maxSlot) {
            return false;
          }
          break;

        default:
          return true;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error applying filter ${filter.id}:`, error);
      return false;
    }
  }

  /**
   * Find matching filters for event data
   */
  async findMatchingFilters(eventData: any, filterType: FilterType): Promise<EventFilter[]> {
    const filters = await this.getFiltersByType(filterType);
    return filters.filter((filter) => this.matchesFilter(eventData, filter));
  }

  /**
   * Get filter statistics
   */
  async getFilterStats(): Promise<any> {
    const totalFilters = await this.filterRepository.count();
    const activeFilters = await this.filterRepository.count({
      where: { status: FilterStatus.ACTIVE },
    });
    const publicFilters = await this.filterRepository.count({
      where: { isPublic: true, status: FilterStatus.ACTIVE },
    });

    const filtersByType = await this.filterRepository
      .createQueryBuilder('filter')
      .select('filter.filterType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('filter.status = :status', { status: FilterStatus.ACTIVE })
      .groupBy('filter.filterType')
      .getRawMany();

    return {
      totalFilters,
      activeFilters,
      publicFilters,
      filtersByType,
    };
  }
}
