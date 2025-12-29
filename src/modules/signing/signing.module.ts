import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SigningService } from "./signing.service";
import { SigningController } from "./signing.controller";
import { Transaction } from "../transactions/transaction.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [SigningController],
  providers: [SigningService],
  exports: [SigningService],
})
export class SigningModule {}
