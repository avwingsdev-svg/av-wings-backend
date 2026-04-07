import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserAccountType {
  PRIVATE_CLIENT_BROKER = 'PRIVATE_CLIENT_BROKER',
  OPERATOR = 'OPERATOR',
  PILOT = 'PILOT',
  ENGINEER_CREW = 'ENGINEER_CREW',
  HBU_PARTNER = 'HBU_PARTNER',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ enum: UserAccountType })
  accountType?: UserAccountType;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPasswordSet: boolean;

  @Prop({ unique: true, sparse: true })
  refreshToken?: string;

  @Prop()
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
