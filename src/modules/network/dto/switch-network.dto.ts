import { IsEnum } from 'class-validator';
import { SolanaNetwork } from '../network.service';

export class SwitchNetworkDto {
  @IsEnum(SolanaNetwork)
  network: SolanaNetwork;
}