import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';
import { Token } from './token.entity';
import { NFTListing } from './nft-listing.entity';
import { NFTBid } from './nft-bid.entity';
import { NFTSale } from './nft-sale.entity';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Token, NFTListing, NFTBid, NFTSale]), CacheModule],
  controllers: [TokensController],
  providers: [TokensService, CacheInterceptor],
  exports: [TokensService],
})
export class TokensModule {}
