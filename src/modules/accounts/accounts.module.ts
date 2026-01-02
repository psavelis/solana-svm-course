import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { PdaService } from './pda.service';
import { Account } from './account.entity';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), CacheModule],
  controllers: [AccountsController],
  providers: [AccountsService, PdaService, CacheInterceptor],
  exports: [AccountsService, PdaService],
})
export class AccountsModule {}
