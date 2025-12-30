import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards } from "@nestjs/common";
import { EventsService } from "../events.service";
import { EventSubscriptionService } from "../event-subscription.service";
import { SubscriptionType } from "../event-subscription.entity";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<
    string,
    { clientId: string; subscriptions: string[] }
  >();

  constructor(
    private readonly eventsService: EventsService,
    private readonly subscriptionService: EventSubscriptionService,
  ) {}

  async handleConnection(client: Socket) {
    const clientId = client.handshake.query.clientId as string;
    if (!clientId) {
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${clientId} (${client.id})`);
    this.connectedClients.set(client.id, { clientId, subscriptions: [] });

    // Join client-specific room
    client.join(`client:${clientId}`);
  }

  async handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      this.logger.log(
        `Client disconnected: ${clientData.clientId} (${client.id})`,
      );
      this.connectedClients.delete(client.id);
    }
  }

  @SubscribeMessage("subscribe")
  async handleSubscribe(
    @MessageBody() data: { eventTypes: string[]; filters?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) {
      return { success: false, error: "Client not authenticated" };
    }

    try {
      // Create or update subscription
      for (const eventType of data.eventTypes) {
        await this.subscriptionService.createSubscription({
          clientId: clientData.clientId,
          eventType,
          subscriptionType: SubscriptionType.WEBSOCKET,
          filters: data.filters,
        });

        // Join event-specific room
        client.join(`event:${eventType}`);
        clientData.subscriptions.push(eventType);
      }

      this.logger.log(
        `Client ${clientData.clientId} subscribed to: ${data.eventTypes.join(", ")}`,
      );
      return { success: true, subscribed: data.eventTypes };
    } catch (error) {
      this.logger.error(
        `Subscription error for client ${clientData.clientId}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("unsubscribe")
  async handleUnsubscribe(
    @MessageBody() data: { eventTypes: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) {
      return { success: false, error: "Client not authenticated" };
    }

    try {
      // Remove subscriptions
      for (const eventType of data.eventTypes) {
        await this.subscriptionService.updateSubscriptionByClientAndType(
          clientData.clientId,
          eventType,
          { status: "inactive" },
        );

        // Leave event-specific room
        client.leave(`event:${eventType}`);
        const index = clientData.subscriptions.indexOf(eventType);
        if (index > -1) {
          clientData.subscriptions.splice(index, 1);
        }
      }

      this.logger.log(
        `Client ${clientData.clientId} unsubscribed from: ${data.eventTypes.join(", ")}`,
      );
      return { success: true, unsubscribed: data.eventTypes };
    } catch (error) {
      this.logger.error(
        `Unsubscription error for client ${clientData.clientId}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  // Method to emit events to subscribed clients
  async emitEvent(eventType: string, data: any, source?: string) {
    // Emit to all clients subscribed to this event type
    this.server.to(`event:${eventType}`).emit("event", {
      eventType,
      data,
      source,
      timestamp: new Date().toISOString(),
    });

    // Also emit to specific client rooms if needed
    if (source) {
      this.server.to(`client:${source}`).emit("event", {
        eventType,
        data,
        source,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get active subscriptions for a client
  getClientSubscriptions(clientId: string): string[] {
    for (const [socketId, clientData] of this.connectedClients) {
      if (clientData.clientId === clientId) {
        return clientData.subscriptions;
      }
    }
    return [];
  }
}
