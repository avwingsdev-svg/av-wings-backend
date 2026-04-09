import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMarketListingDto } from './dto/create-market-listing.dto';
import { ListMarketListingsQueryDto } from './dto/list-market-listings-query.dto';
import { MarketService } from './market.service';

// Marketplace browse (open) plus authenticated listing creation and seller inventory.
@Controller('market')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('listings')
  listListings(@Query() query: ListMarketListingsQueryDto) {
    return this.marketService.listActive(query);
  }

  @Get('listings/:id')
  getListing(@Param('id') id: string) {
    return this.marketService.getById(id);
  }

  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  myListings(@CurrentUser('userId') sellerId: string) {
    return this.marketService.listMine(sellerId);
  }

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('photos', 10))
  createListing(
    @CurrentUser('userId') sellerId: string,
    @Body() dto: CreateMarketListingDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.marketService.create(sellerId, dto, photos ?? []);
  }
}
