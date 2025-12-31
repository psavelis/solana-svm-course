import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountsService } from "./accounts.service";
import { AccountsController } from "./accounts.controller";
import { PdaService } from "./pda.service";
import { Account } from "./account.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AccountsController],
  providers: [AccountsService, PdaService],
  exports: [AccountsService, PdaService],
})
export class AccountsModule {}
