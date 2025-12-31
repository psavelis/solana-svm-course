import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmartAccountsService } from "./smart-accounts.service";
import { SmartAccountsController } from "./smart-accounts.controller";
import { SmartAccount } from "./smart-account.entity";
import { SessionKey } from "./session-key.entity";
import { SmartAccountsConsumer } from "./smart-accounts.consumer";
import { RedisModule } from "../../common/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([SmartAccount, SessionKey]), RedisModule],
  controllers: [SmartAccountsController],
  providers: [SmartAccountsService, SmartAccountsConsumer],
  exports: [SmartAccountsService],
})
export class SmartAccountsModule {}
