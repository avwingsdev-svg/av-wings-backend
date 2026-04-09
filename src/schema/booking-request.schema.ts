import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum BookingType {
  PRIVATE_JET = 'PRIVATE_JET',
  HELICOPTER = 'HELICOPTER',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class BookingRequest extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: BookingType, index: true })
  bookingType: BookingType;

  @Prop({ required: true })
  fromLocation: string;

  @Prop({ required: true })
  toLocation: string;

  @Prop({ required: true })
  travelDateTime: Date;

  @Prop({ required: true, min: 1, max: 50 })
  pax: number;

  @Prop({ default: false })
  showEmptyLegOnly?: boolean;

  @Prop({ enum: BookingStatus, default: BookingStatus.PENDING, index: true })
  status: BookingStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const BookingRequestSchema =
  SchemaFactory.createForClass(BookingRequest);

BookingRequestSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
    if (typeof ret.showEmptyLegOnly !== 'undefined') {
      ret.showEmptyLegOnly = Boolean(ret.showEmptyLegOnly);
    }
    return ret;
  },
});
