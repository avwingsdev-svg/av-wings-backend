import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MarketListingCategory,
  MarketListingCondition,
  MarketListingSubCategory,
  MarketPriceBillingPeriod,
} from '../../schema/market-listing.schema';

export class CreateMarketListingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsEnum(MarketListingCategory)
  category: MarketListingCategory;

  @IsEnum(MarketListingSubCategory)
  subCategory: MarketListingSubCategory;

  @IsEnum(MarketListingCondition)
  condition: MarketListingCondition;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceAmount: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  priceCurrency?: string;

  @IsEnum(MarketPriceBillingPeriod)
  billingPeriod: MarketPriceBillingPeriod;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  location: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description: string;
}
