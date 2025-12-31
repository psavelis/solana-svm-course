import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { NetworkService, SolanaNetwork } from './network.service';
import { SwitchNetworkDto } from './dto/switch-network.dto';

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
}