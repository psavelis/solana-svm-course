import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventSubscriptionService } from './event-subscription.service';
import { EventFilterService } from './event-filter.service';
import { EventsController } from './events.controller';
import { EventsGateway } from './gateway/events.gateway';
import { Event } from './event.entity';
import { EventSubscription } from './event-subscription.entity';
import { EventFilter } from './event-filter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventSubscription, EventFilter]),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventSubscriptionService,
    EventFilterService,
    EventsGateway,
  ],
  exports: [
    EventsService,
    EventSubscriptionService,
    EventFilterService,
    EventsGateway,
  ],
})
export class EventsModule {}