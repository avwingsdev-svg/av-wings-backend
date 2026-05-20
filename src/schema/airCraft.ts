import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Aircraft {
  @Prop({
    required: true,
    trim: true,
  })
  model: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  tailNumber: string;

  @Prop({
    required: true,
    min: 1,
  })
  seats: number;

  @Prop({
    required: true,
    min: 1,
  })
  rangeNm: number;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
  })
  baseAirport: string;

  @Prop({
    required: true,
    min: 0,
  })
  hourlyRate: number;

  @Prop({
    type: String,
    default: null,
  })
  photo: string;
}

export const AircraftSchema = SchemaFactory.createForClass(Aircraft);
