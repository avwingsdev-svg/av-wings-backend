import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';



@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true })
  codeHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  consumed: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ email: 1, purpose: 1, consumed: 1 });
