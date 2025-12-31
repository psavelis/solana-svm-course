import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokensService } from "./tokens.service";
import { TokensController } from "./tokens.controller";
import { Token } from "./token.entity";
import { NFTListing } from "./nft-listing.entity";
import { NFTBid } from "./nft-bid.entity";
import { NFTSale } from "./nft-sale.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Token, NFTListing, NFTBid, NFTSale])],
  controllers: [TokensController],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
