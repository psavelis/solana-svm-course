import { Injectable } from '@nestjs/common';
import { Connection, clusterApiUrl, Cluster } from '@solana/web3.js';

export enum SolanaNetwork {
  MAINNET = 'mainnet-beta',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
}

export interface NetworkConfig {
  name: SolanaNetwork;
  rpcUrl: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  timeout: number;
}

@Injectable()
export class NetworkService {
  private currentNetwork: SolanaNetwork = SolanaNetwork.DEVNET;
  private connections: Map<SolanaNetwork, Connection> = new Map();

  private readonly networkConfigs: Record<SolanaNetwork, NetworkConfig> = {
    [SolanaNetwork.MAINNET]: {
      name: SolanaNetwork.MAINNET,
      rpcUrl: clusterApiUrl('mainnet-beta'),
      commitment: 'confirmed',
      timeout: 30000,
    },
    [SolanaNetwork.DEVNET]: {
      name: SolanaNetwork.DEVNET,
      rpcUrl: clusterApiUrl('devnet'),
      commitment: 'confirmed',
      timeout: 30000,
    },
    [SolanaNetwork.TESTNET]: {
      name: SolanaNetwork.TESTNET,
      rpcUrl: clusterApiUrl('testnet'),
      commitment: 'confirmed',
      timeout: 30000,
    },
  };

  constructor() {
    // Initialize connections for all networks
    Object.values(SolanaNetwork).forEach(network => {
      this.createConnection(network);
    });
  }

  private createConnection(network: SolanaNetwork): Connection {
    const config = this.networkConfigs[network];
    const connection = new Connection(config.rpcUrl, {
      commitment: config.commitment,
    });

    this.connections.set(network, connection);
    return connection;
  }

  getConnection(network?: SolanaNetwork): Connection {
    const targetNetwork = network || this.currentNetwork;
    const connection = this.connections.get(targetNetwork);

    if (!connection) {
      throw new Error(`No connection available for network: ${targetNetwork}`);
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

  async getNetworkHealth(network?: SolanaNetwork): Promise<{
    network: SolanaNetwork;
    isHealthy: boolean;
    slot?: number;
    ping?: number;
  }> {
    const targetNetwork = network || this.currentNetwork;
    const connection = this.getConnection(targetNetwork);

    try {
      const startTime = Date.now();
      const slot = await connection.getSlot();
      const ping = Date.now() - startTime;

      return {
        network: targetNetwork,
        isHealthy: true,
        slot,
        ping,
      };
    } catch (error) {
      return {
        network: targetNetwork,
        isHealthy: false,
      };
    }
  }

  async getAllNetworkHealth(): Promise<Array<{
    network: SolanaNetwork;
    isHealthy: boolean;
    slot?: number;
    ping?: number;
  }>> {
    const healthChecks = Object.values(SolanaNetwork).map(network =>
      this.getNetworkHealth(network)
    );

    return Promise.all(healthChecks);
  }
}