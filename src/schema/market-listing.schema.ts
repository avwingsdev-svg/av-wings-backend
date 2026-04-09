import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Top tabs on the marketplace screen: Buy, Lease, Swap, Parts. 
export enum MarketListingCategory {
  BUY = 'BUY',
  LEASE = 'LEASE',
  SWAP = 'SWAP',
  PARTS = 'PARTS',
}

// Card tags such as Aircraft, Avionics, Real Estate.
export enum MarketListingSubCategory {
  AIRCRAFT = 'AIRCRAFT',
  AVIONICS = 'AVIONICS',
  REAL_ESTATE = 'REAL_ESTATE',
  PARTS = 'PARTS',
}

export enum MarketListingCondition {
  NEW = 'NEW',
  USED = 'USED',
}

// How the price should be interpreted (e.g. one-time sale vs monthly lease).
export enum MarketPriceBillingPeriod {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
}

export enum MarketListingStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SOLD = 'SOLD',
}

@Schema({ timestamps: true })
export class MarketListing extends Document {
  @Prop({ required: true, index: true })
  sellerId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, enum: MarketListingCategory, index: true })
  category: MarketListingCategory;

  @Prop({ required: true, enum: MarketListingSubCategory, index: true })
  subCategory: MarketListingSubCategory;

  @Prop({ required: true, enum: MarketListingCondition })
  condition: MarketListingCondition;

  // Major units (e.g. USD dollars, not cents).
  @Prop({ required: true, min: 0 })
  priceAmount: number;

  @Prop({ required: true, default: 'USD', trim: true })
  priceCurrency: string;

  @Prop({ required: true, enum: MarketPriceBillingPeriod })
  billingPeriod: MarketPriceBillingPeriod;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ type: [String], default: [] })
  imageKeys: string[];

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ enum: MarketListingStatus, default: MarketListingStatus.ACTIVE, index: true })
  status: MarketListingStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const MarketListingSchema = SchemaFactory.createForClass(MarketListing);

MarketListingSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
    if (Array.isArray(ret.imageKeys)) {
      ret.images = ret.imageKeys;
      delete ret.imageKeys;
    }
    return ret;
  },
});
