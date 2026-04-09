import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  MarketListingCategory,
  MarketListingSubCategory,
} from '../../schema/market-listing.schema';

export class ListMarketListingsQueryDto {
  @IsOptional()
  @IsEnum(MarketListingCategory)
  category?: MarketListingCategory;

  @IsOptional()
  @IsEnum(MarketListingSubCategory)
  subCategory?: MarketListingSubCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
