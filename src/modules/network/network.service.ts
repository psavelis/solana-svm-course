import { Injectable, Logger } from '@nestjs/common';
import { Connection, clusterApiUrl, Cluster } from '@solana/web3.js';

export enum SolanaNetwork {
  MAINNET = 'mainnet-beta',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
}

export interface RpcEndpoint {
  url: string;
  name: string;
  priority: number; // Lower number = higher priority
  isHealthy: boolean;
  lastHealthCheck: Date;
  consecutiveFailures: number;
}

export interface NetworkConfig {
  name: SolanaNetwork;
  rpcEndpoints: RpcEndpoint[];
  commitment: 'processed' | 'confirmed' | 'finalized';
  timeout: number;
  healthCheckInterval: number; // milliseconds
  maxConsecutiveFailures: number;
}

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);
  private currentNetwork: SolanaNetwork = SolanaNetwork.DEVNET;
  private connections: Map<string, Connection> = new Map();
  private healthCheckIntervals: Map<SolanaNetwork, NodeJS.Timeout> = new Map();

  private readonly networkConfigs: Record<SolanaNetwork, NetworkConfig> = {
    [SolanaNetwork.MAINNET]: {
      name: SolanaNetwork.MAINNET,
      rpcEndpoints: [
        {
          url: 'https://api.mainnet-beta.solana.com',
          name: 'Official Mainnet',
          priority: 1,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
        {
          url: 'https://solana-api.projectserum.com',
          name: 'Project Serum',
          priority: 2,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
        {
          url: 'https://rpc.ankr.com/solana',
          name: 'Ankr',
          priority: 3,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
        {
          url: 'https://ssc-dao.genesysgo.net',
          name: 'GenesysGo',
          priority: 4,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
      ],
      commitment: 'confirmed',
      timeout: 30000,
      healthCheckInterval: 30000, // 30 seconds
      maxConsecutiveFailures: 3,
    },
    [SolanaNetwork.DEVNET]: {
      name: SolanaNetwork.DEVNET,
      rpcEndpoints: [
        {
          url: clusterApiUrl('devnet'),
          name: 'Official Devnet',
          priority: 1,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
        {
          url: 'https://devnet.solana.com',
          name: 'Devnet Fallback',
          priority: 2,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
      ],
      commitment: 'confirmed',
      timeout: 30000,
      healthCheckInterval: 30000,
      maxConsecutiveFailures: 3,
    },
    [SolanaNetwork.TESTNET]: {
      name: SolanaNetwork.TESTNET,
      rpcEndpoints: [
        {
          url: clusterApiUrl('testnet'),
          name: 'Official Testnet',
          priority: 1,
          isHealthy: true,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
        },
      ],
      commitment: 'confirmed',
      timeout: 30000,
      healthCheckInterval: 30000,
      maxConsecutiveFailures: 3,
    },
  };

  constructor() {
    // Initialize connections and health checks for all networks
    Object.values(SolanaNetwork).forEach((network) => {
      this.initializeNetwork(network);
    });
  }

  private initializeNetwork(network: SolanaNetwork): void {
    const config = this.networkConfigs[network];

    // Create connections for all endpoints
    config.rpcEndpoints.forEach((endpoint) => {
      this.createConnection(network, endpoint);
    });

    // Start health check interval
    const interval = setInterval(() => {
      this.performHealthChecks(network);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(network, interval);
  }

  private createConnection(network: SolanaNetwork, endpoint: RpcEndpoint): Connection {
    const config = this.networkConfigs[network];
    const connectionKey = `${network}-${endpoint.name}`;

    const connection = new Connection(endpoint.url, {
      commitment: config.commitment,
    });

    this.connections.set(connectionKey, connection);
    this.logger.log(`Created connection for ${network} using ${endpoint.name} (${endpoint.url})`);

    return connection;
  }

  private async performHealthChecks(network: SolanaNetwork): Promise<void> {
    const config = this.networkConfigs[network];

    for (const endpoint of config.rpcEndpoints) {
      try {
        const connectionKey = `${network}-${endpoint.name}`;
        const connection = this.connections.get(connectionKey);

        if (!connection) continue;

        const startTime = Date.now();
        await connection.getVersion();
        const responseTime = Date.now() - startTime;

        // Mark as healthy
        endpoint.isHealthy = true;
        endpoint.lastHealthCheck = new Date();
        endpoint.consecutiveFailures = 0;

        this.logger.debug(`Health check passed for ${endpoint.name}: ${responseTime}ms`);
      } catch (error) {
        endpoint.consecutiveFailures++;
        endpoint.lastHealthCheck = new Date();

        if (endpoint.consecutiveFailures >= config.maxConsecutiveFailures) {
          endpoint.isHealthy = false;
          this.logger.warn(
            `Endpoint ${endpoint.name} marked as unhealthy after ${endpoint.consecutiveFailures} failures`,
          );
        }

        this.logger.debug(`Health check failed for ${endpoint.name}: ${error.message}`);
      }
    }
  }

  private getHealthyEndpoint(network: SolanaNetwork): RpcEndpoint | null {
    const config = this.networkConfigs[network];
    if (!config) {
      return null;
    }

    const healthyEndpoints = config.rpcEndpoints
      .filter((endpoint) => endpoint.isHealthy)
      .sort((a, b) => a.priority - b.priority);

    return healthyEndpoints[0] || null;
  }

  getConnection(network?: SolanaNetwork): Connection {
    const targetNetwork = network || this.currentNetwork;
    const healthyEndpoint = this.getHealthyEndpoint(targetNetwork);

    if (!healthyEndpoint) {
      throw new Error(`No healthy RPC endpoints available for network: ${targetNetwork}`);
    }

    const connectionKey = `${targetNetwork}-${healthyEndpoint.name}`;
    const connection = this.connections.get(connectionKey);

    if (!connection) {
      throw new Error(
        `No connection available for network: ${targetNetwork}, endpoint: ${healthyEndpoint.name}`,
      );
    }

    return connection;
  }

  getCurrentNetwork(): SolanaNetwork {
    return this.currentNetwork;
  }

  setCurrentNetwork(network: SolanaNetwork): void {
    if (!this.networkConfigs[network]) {
      throw new Error(`Unsupported network: ${network}`);
    }

    this.currentNetwork = network;
  }

  getNetworkConfig(network?: SolanaNetwork): NetworkConfig {
    const targetNetwork = network || this.currentNetwork;
    const config = this.networkConfigs[targetNetwork];

    if (!config) {
      throw new Error(`No configuration available for network: ${targetNetwork}`);
    }

    return config;
  }

  getAllNetworks(): SolanaNetwork[] {
    return Object.values(SolanaNetwork);
  }

  getRpcEndpoints(network?: SolanaNetwork): RpcEndpoint[] {
    const targetNetwork = network || this.currentNetwork;
    return [...this.networkConfigs[targetNetwork].rpcEndpoints];
  }

  async getNetworkHealth(network?: SolanaNetwork): Promise<{
    network: SolanaNetwork;
    isHealthy: boolean;
    activeEndpoint?: string;
    slot?: number;
    ping?: number;
    endpoints: Array<{
      name: string;
      url: string;
      isHealthy: boolean;
      consecutiveFailures: number;
      lastHealthCheck: Date;
    }>;
  }> {
    const targetNetwork = network || this.currentNetwork;
    const config = this.networkConfigs[targetNetwork];
    const healthyEndpoint = this.getHealthyEndpoint(targetNetwork);

    if (!healthyEndpoint) {
      return {
        network: targetNetwork,
        isHealthy: false,
        endpoints: config.rpcEndpoints.map((endpoint) => ({
          name: endpoint.name,
          url: endpoint.url,
          isHealthy: endpoint.isHealthy,
          consecutiveFailures: endpoint.consecutiveFailures,
          lastHealthCheck: endpoint.lastHealthCheck,
        })),
      };
    }

    const connection = this.getConnection(targetNetwork);

    try {
      const startTime = Date.now();
      const slot = await connection.getSlot();
      const ping = Date.now() - startTime;

      return {
        network: targetNetwork,
        isHealthy: true,
        activeEndpoint: healthyEndpoint.name,
        slot,
        ping,
        endpoints: config.rpcEndpoints.map((endpoint) => ({
          name: endpoint.name,
          url: endpoint.url,
          isHealthy: endpoint.isHealthy,
          consecutiveFailures: endpoint.consecutiveFailures,
          lastHealthCheck: endpoint.lastHealthCheck,
        })),
      };
    } catch (error) {
      return {
        network: targetNetwork,
        isHealthy: false,
        endpoints: config.rpcEndpoints.map((endpoint) => ({
          name: endpoint.name,
          url: endpoint.url,
          isHealthy: endpoint.isHealthy,
          consecutiveFailures: endpoint.consecutiveFailures,
          lastHealthCheck: endpoint.lastHealthCheck,
        })),
      };
    }
  }

  async getAllNetworkHealth(): Promise<
    Array<{
      network: SolanaNetwork;
      isHealthy: boolean;
      activeEndpoint?: string;
      slot?: number;
      ping?: number;
      endpoints: Array<{
        name: string;
        url: string;
        isHealthy: boolean;
        consecutiveFailures: number;
        lastHealthCheck: Date;
      }>;
    }>
  > {
    const healthChecks = Object.values(SolanaNetwork).map((network) =>
      this.getNetworkHealth(network),
    );

    return Promise.all(healthChecks);
  }

  // Gracefully shut down health check intervals
  onModuleDestroy() {
    this.healthCheckIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.healthCheckIntervals.clear();
  }
}
