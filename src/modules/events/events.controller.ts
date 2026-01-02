import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { EventSubscriptionService } from "./event-subscription.service";
import { EventFilterService } from "./event-filter.service";
import { CreateEventDto, UpdateEventDto } from "./dto/event.dto";
import {
  CreateEventSubscriptionDto,
  UpdateEventSubscriptionDto,
} from "./dto/event-subscription.dto";
import {
  CreateEventFilterDto,
  UpdateEventFilterDto,
} from "./dto/event-filter.dto";

/**
 * # Events Controller
 *
 * REST API for real-time event streaming, subscriptions, and filtering.
 *
 * ## Solana Event Model
 *
 * Solana programs emit events through the logging system:
 *
 * - **Program Logs**: Text messages from `msg!()` macro
 * - **CPI Logs**: Nested logs from cross-program invocations
 * - **Return Data**: Structured data returned by programs
 *
 * Unlike Ethereum events (indexed, queryable), Solana logs are:
 * - Stored only for recent slots (not permanently indexed)
 * - Must be parsed from transaction data
 * - Require custom indexing solutions for historical queries
 *
 * ## Real-Time Subscriptions
 *
 * This API supports WebSocket subscriptions via Solana RPC:
 *
 * - **Account Subscriptions**: Watch for balance/data changes
 * - **Program Subscriptions**: Monitor all accounts owned by a program
 * - **Logs Subscriptions**: Stream program logs in real-time
 *
 * ## Event Processing Flow
 *
 * ```
 * [Solana RPC WebSocket]
 *          ↓
 * [EventsService.subscribeToAccount()]
 *          ↓
 * [Parse and normalize event]
 *          ↓
 * [Apply filters from EventFilterService]
 *          ↓
 * [Check subscriptions from EventSubscriptionService]
 *          ↓
 * [Deliver via configured callback URL / webhook]
 * ```
 *
 * ## Subscription Types
 *
 * | Type | Description | Use Case |
 * |------|-------------|----------|
 * | `account_change` | Account data/balance changes | Wallet monitoring |
 * | `program_change` | Any account owned by program | DeFi protocols |
 * | `logs` | Program log messages | Debug/analytics |
 * | `slot` | New slot notifications | Block watchers |
 *
 * @example
 * ```typescript
 * // Create event subscription
 * POST /events/subscriptions
 * {
 *   "clientId": "my-service-123",
 *   "subscriptionType": "account_change",
 *   "targetAddresses": ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"],
 *   "callbackUrl": "https://myservice.com/webhooks/solana"
 * }
 *
 * // Create filter for high-value transfers
 * POST /events/filters
 * {
 *   "name": "whale-alerts",
 *   "ownerId": "my-service-123",
 *   "conditions": {
 *     "eventType": "transfer",
 *     "minAmount": 1000000000000
 *   }
 * }
 * ```
 *
 * @see https://docs.solana.com/developing/clients/jsonrpc-api#subscription-websocket - WebSocket API
 * @see https://docs.solana.com/developing/programming-model/transactions#log-messages - Program Logs
 * @see [docs/diagrams/11-events-logging.md](docs/diagrams/11-events-logging.md) - Architecture
 */
@ApiTags("Events (Real-time Event Streaming)")
@Controller("events")
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly subscriptionService: EventSubscriptionService,
    private readonly filterService: EventFilterService,
  ) {}

  // Event Management
  @Post()
  @ApiOperation({ summary: "Create a new event" })
  @ApiResponse({ status: 201, description: "Event created successfully" })
  async createEvent(@Body() dto: CreateEventDto) {
    return await this.eventsService.createEvent(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get events with optional filtering" })
  @ApiResponse({ status: 200, description: "Events retrieved successfully" })
  async getEvents(
    @Query("eventType") eventType?: string,
    @Query("source") source?: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ) {
    return await this.eventsService.getEvents(
      eventType as any,
      source,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an event" })
  @ApiResponse({ status: 200, description: "Event updated successfully" })
  async updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return await this.eventsService.updateEvent(id, dto);
  }

  // Subscription Management
  @Post("subscriptions")
  @ApiOperation({ summary: "Create an event subscription" })
  @ApiResponse({
    status: 201,
    description: "Subscription created successfully",
  })
  async createSubscription(@Body() dto: CreateEventSubscriptionDto) {
    return await this.subscriptionService.createSubscription(dto);
  }

  @Get("subscriptions/:clientId")
  @ApiOperation({ summary: "Get subscriptions for a client" })
  @ApiResponse({
    status: 200,
    description: "Subscriptions retrieved successfully",
  })
  async getSubscriptionsByClient(@Param("clientId") clientId: string) {
    return await this.subscriptionService.getSubscriptionsByClient(clientId);
  }

  @Put("subscriptions/:id")
  @ApiOperation({ summary: "Update a subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription updated successfully",
  })
  async updateSubscription(
    @Param("id") id: string,
    @Body() dto: UpdateEventSubscriptionDto,
  ) {
    return await this.subscriptionService.updateSubscription(id, dto);
  }

  @Delete("subscriptions/:id")
  @ApiOperation({ summary: "Delete a subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription deleted successfully",
  })
  async deleteSubscription(@Param("id") id: string) {
    await this.subscriptionService.deleteSubscription(id);
    return { success: true };
  }

  // Filter Management
  @Post("filters")
  @ApiOperation({ summary: "Create an event filter" })
  @ApiResponse({ status: 201, description: "Filter created successfully" })
  async createFilter(@Body() dto: CreateEventFilterDto) {
    return await this.filterService.createFilter(dto);
  }

  @Get("filters/:ownerId")
  @ApiOperation({ summary: "Get filters for an owner" })
  @ApiResponse({ status: 200, description: "Filters retrieved successfully" })
  async getFiltersByOwner(@Param("ownerId") ownerId: string) {
    return await this.filterService.getFiltersByOwner(ownerId);
  }

  @Get("filters/public/all")
  @ApiOperation({ summary: "Get all public filters" })
  @ApiResponse({
    status: 200,
    description: "Public filters retrieved successfully",
  })
  async getPublicFilters() {
    return await this.filterService.getPublicFilters();
  }

  @Put("filters/:id")
  @ApiOperation({ summary: "Update a filter" })
  @ApiResponse({ status: 200, description: "Filter updated successfully" })
  async updateFilter(
    @Param("id") id: string,
    @Body() dto: UpdateEventFilterDto,
  ) {
    return await this.filterService.updateFilter(id, dto);
  }

  @Delete("filters/:id")
  @ApiOperation({ summary: "Delete a filter" })
  @ApiResponse({ status: 200, description: "Filter deleted successfully" })
  async deleteFilter(@Param("id") id: string) {
    await this.filterService.deleteFilter(id);
    return { success: true };
  }

  // Monitoring and Account Subscriptions
  @Post("monitor/account/:accountId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Subscribe to account changes" })
  @ApiResponse({ status: 200, description: "Account monitoring started" })
  async subscribeToAccount(@Param("accountId") accountId: string) {
    await this.eventsService.subscribeToAccount(accountId);
    return { success: true, accountId };
  }

  @Delete("monitor/account/:accountId")
  @ApiOperation({ summary: "Unsubscribe from account changes" })
  @ApiResponse({ status: 200, description: "Account monitoring stopped" })
  async unsubscribeFromAccount(@Param("accountId") accountId: string) {
    await this.eventsService.unsubscribeFromAccount(accountId);
    return { success: true, accountId };
  }

  @Post("monitor/program/:programId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Subscribe to program account changes" })
  @ApiResponse({ status: 200, description: "Program monitoring started" })
  async subscribeToProgramAccounts(
    @Param("programId") programId: string,
    @Body() filters?: any,
  ) {
    await this.eventsService.subscribeToProgramAccounts(programId, filters);
    return { success: true, programId };
  }

  // Statistics and Analytics
  @Get("stats")
  @ApiOperation({ summary: "Get event system statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  async getEventStats() {
    const eventStats = await this.eventsService.getEventStats();
    const subscriptionStats =
      await this.subscriptionService.getSubscriptionStats();
    const filterStats = await this.filterService.getFilterStats();

    return {
      events: eventStats,
      subscriptions: subscriptionStats,
      filters: filterStats,
    };
  }

  // Event Replay
  @Get("replay")
  @ApiOperation({ summary: "Get events since a specific time for replay" })
  @ApiResponse({
    status: 200,
    description: "Events for replay retrieved successfully",
  })
  async getEventsForReplay(
    @Query("since") since: string,
    @Query("eventType") eventType?: string,
  ) {
    const sinceDate = new Date(since);
    return await this.eventsService.getEventsSince(sinceDate, eventType as any);
  }
}
