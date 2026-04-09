import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MarketListing,
  MarketListingSchema,
} from '../schema/market-listing.schema';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketListing.name, schema: MarketListingSchema },
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}
