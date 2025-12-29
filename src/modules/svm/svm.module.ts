import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SvmController } from "./svm.controller";
import { SvmService } from "./svm.service";
import { Program } from "./program.entity";
import { RuntimeExecution } from "./runtime-execution.entity";
import { GasMeter } from "./gas-meter.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Program, RuntimeExecution, GasMeter])],
  controllers: [SvmController],
  providers: [SvmService],
  exports: [SvmService],
})
export class SvmModule {}
