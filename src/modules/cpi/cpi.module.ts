import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CpiService } from "./cpi.service";
import { CpiController } from "./cpi.controller";
import { CpiInstruction } from "./cpi-instruction.entity";
import { CpiPermission } from "./cpi-permission.entity";
import { CpiInvocation } from "./cpi-invocation.entity";
import { DexPool } from "./dex-pool.entity";
import { DexSwap } from "./dex-swap.entity";
import { DexLiquidityPosition } from "./dex-liquidity-position.entity";
import { LendingPool } from "./lending-pool.entity";
import { LendingPosition } from "./lending-position.entity";
import { SvmModule } from "../svm/svm.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { DexService } from "./dex.service";
import { LendingService } from "./lending.service";
import { NFTMarketplaceCpiService } from "./nft-marketplace-cpi.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CpiInstruction,
      CpiPermission,
      CpiInvocation,
      DexPool,
      DexSwap,
      DexLiquidityPosition,
      LendingPool,
      LendingPosition,
    ]),
    SvmModule,
    TransactionsModule,
  ],
  controllers: [CpiController],
  providers: [CpiService, DexService, LendingService, NFTMarketplaceCpiService],
  exports: [CpiService, DexService, LendingService, NFTMarketplaceCpiService],
})
export class CpiModule {}
