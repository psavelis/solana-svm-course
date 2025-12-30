import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MpcService } from './mpc.service';
import { MpcController } from './mpc.controller';
import { MpcWallet } from './mpc-wallet.entity';
import { KeyShare } from './key-share.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MpcWallet, KeyShare])],
  controllers: [MpcController],
  providers: [MpcService],
  exports: [MpcService],
})
export class MpcModule {}