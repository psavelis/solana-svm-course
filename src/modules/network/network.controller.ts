import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { NetworkService, SolanaNetwork } from './network.service';
import { SwitchNetworkDto } from './dto/switch-network.dto';

/**
 * # Network Controller
 *
 * REST API for managing Solana network connections and health monitoring.
 *
 * ## Solana Networks
 *
 * | Network | Purpose | RPC Endpoint |
 * |---------|---------|--------------|
 * | Mainnet-Beta | Production | https://api.mainnet-beta.solana.com |
 * | Devnet | Development | https://api.devnet.solana.com |
 * | Testnet | Testing | https://api.testnet.solana.com |
 * | Localnet | Local dev | http://localhost:8899 |
 *
 * ## Network Selection
 *
 * The API can switch between networks dynamically:
 *
 * ```
 * POST /network/switch { "network": "devnet" }
 *          ↓
 * [Update RPC connection]
 *          ↓
 * [All subsequent calls use new network]
 * ```
 *
 * ## RPC Endpoints
 *
 * Each network can have multiple RPC providers:
 * - Public RPC (rate limited)
 * - Private RPC (paid, higher limits)
 * - Validator RPC (self-hosted)
 *
 * ## Network Health
 *
 * Health checks verify:
 * - RPC connectivity
 * - Current slot/block height
 * - Transaction confirmation speed
 * - Validator availability
 *
 * @example
 * ```typescript
 * // Get current network
 * GET /network/current
 * // Response: { "network": "devnet", "config": { "rpcUrl": "..." } }
 *
 * // Switch to mainnet
 * POST /network/switch
 * { "network": "mainnet-beta" }
 *
 * // Check network health
 * GET /network/health
 * // Response: { "healthy": true, "slot": 12345678, "latency": 45 }
 * ```
 *
 * @see https://docs.solana.com/cluster/rpc-endpoints - RPC Endpoints
 * @see [docs/diagrams/14-network-architecture.md](docs/diagrams/14-network-architecture.md) - Architecture
 */
@ApiTags("Network")
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('current')
  getCurrentNetwork() {
    return {
      network: this.networkService.getCurrentNetwork(),
      config: this.networkService.getNetworkConfig(),
    };
  }

  @Post('switch')
  switchNetwork(@Body() switchNetworkDto: SwitchNetworkDto) {
    this.networkService.setCurrentNetwork(switchNetworkDto.network);
    return {
      message: `Switched to ${switchNetworkDto.network}`,
      network: this.networkService.getCurrentNetwork(),
      config: this.networkService.getNetworkConfig(),
    };
  }

  @Get('available')
  getAvailableNetworks() {
    return {
      networks: this.networkService.getAllNetworks(),
    };
  }

  @Get('health')
  async getNetworkHealth() {
    return await this.networkService.getNetworkHealth();
  }

  @Get('health/:network')
  async getSpecificNetworkHealth(@Param('network') network: SolanaNetwork) {
    return await this.networkService.getNetworkHealth(network);
  }

  @Get('health/all')
  async getAllNetworkHealth() {
    return await this.networkService.getAllNetworkHealth();
  }

  @Get('config/:network')
  getNetworkConfig(@Param('network') network: SolanaNetwork) {
    return this.networkService.getNetworkConfig(network);
  }

  @Get('endpoints')
  getRpcEndpoints() {
    return {
      network: this.networkService.getCurrentNetwork(),
      endpoints: this.networkService.getRpcEndpoints(),
    };
  }

  @Get('endpoints/:network')
  getNetworkRpcEndpoints(@Param('network') network: SolanaNetwork) {
    return {
      network,
      endpoints: this.networkService.getRpcEndpoints(network),
    };
  }
}