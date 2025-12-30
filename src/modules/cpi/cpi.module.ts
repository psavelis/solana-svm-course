import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CpiService } from "./cpi.service";
import { CpiController } from "./cpi.controller";
import { CpiInstruction } from "./cpi-instruction.entity";
import { CpiPermission } from "./cpi-permission.entity";
import { CpiInvocation } from "./cpi-invocation.entity";
import { SvmModule } from "../svm/svm.module";
import { DexService } from "./dex.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([CpiInstruction, CpiPermission, CpiInvocation]),
    SvmModule,
  ],
  controllers: [CpiController],
  providers: [CpiService, DexService],
  exports: [CpiService, DexService],
})
export class CpiModule {}
