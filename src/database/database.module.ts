import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { DatabaseConnectionService } from './database-connection.service';
import { DatabaseConnectionController } from './database-connection.controller';
import { DatabasePerformanceService } from './database-performance.service';
import { DatabasePerformanceController } from './database-performance.controller';

@Module({
  imports: [TypeOrmModule.forRoot()],
  controllers: [MigrationController, DatabaseConnectionController, DatabasePerformanceController],
  providers: [MigrationService, DatabaseConnectionService, DatabasePerformanceService],
  exports: [MigrationService, DatabaseConnectionService, DatabasePerformanceService],
})
export class DatabaseModule {}
