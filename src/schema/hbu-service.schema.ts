import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Matches the “Service Type” grid on Add Service.
export enum HbuServiceType {
  LOUNGE = 'LOUNGE',
  FUEL = 'FUEL',
  CATERING = 'CATERING',
  CHARTER = 'CHARTER',
}

// Shown as a badge on the service card.
export enum HbuServiceStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class HbuService extends Document {
  @Prop({ required: true, index: true })
  ownerId: string;

  // Selected home base / airport label.
  @Prop({ required: true, trim: true })
  homeBaseLabel: string;

  @Prop({ required: true, enum: HbuServiceType, index: true })
  serviceType: HbuServiceType;

  @Prop({ required: true, trim: true })
  name: string;

  /// “Terminal / Location” field, e.g. “Terminal 3, Gate B3”.
  @Prop({ required: true, trim: true })
  terminalLocation: string;

  // Short line under the title for compact cards.
  @Prop({ trim: true })
  tagline?: string;

  // Feature chips with checkmarks on lounge-style cards.
  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: [String], default: [] })
  imageKeys: string[];

  @Prop({
    required: true,
    enum: HbuServiceStatus,
    default: HbuServiceStatus.OPEN,
    index: true,
  })
  status: HbuServiceStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const HbuServiceSchema = SchemaFactory.createForClass(HbuService);

HbuServiceSchema.set('toJSON', {
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
