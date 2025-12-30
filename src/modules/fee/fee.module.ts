import { Module } from '@nestjs/common';
import { FeeService } from './fee.service';
import { FeeController } from './fee.controller';
import { FeeOptimizationService } from './fee-optimization.service';

@Module({
  controllers: [FeeController],
  providers: [FeeService, FeeOptimizationService],
  exports: [FeeService, FeeOptimizationService],
})
export class FeeModule {}