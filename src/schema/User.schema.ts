import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  EngineerCrewDocumentData,
  EngineerCrewDocumentSchema,
  EngineerCrewProfileData,
  EngineerCrewProfileSchema,
  HbuPartnerDocumentData,
  HbuPartnerDocumentSchema,
  HbuPartnerProfileData,
  HbuPartnerProfileSchema,
  OperatorDocumentData,
  OperatorDocumentSchema,
  OperatorProfileData,
  OperatorProfileSchema,
  PilotDocumentData,
  PilotDocumentSchema,
  PilotProfileData,
  PilotProfileSchema,
  PrivateClientDocumentData,
  PrivateClientDocumentSchema,
  PrivateClientProfileData,
  PrivateClientProfileSchema,
} from './onboarding-embedded.schema';

export enum UserAccountType {
  PRIVATE_CLIENT_BROKER = 'PRIVATE_CLIENT_BROKER',
  OPERATOR = 'OPERATOR',
  PILOT = 'PILOT',
  ENGINEER_CREW = 'ENGINEER_CREW',
  HBU_PARTNER = 'HBU_PARTNER',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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

  // Terms & privacy acceptance.
  @Prop()
  termsAcceptedAt?: Date;

  @Prop({ enum: VerificationStatus, default: VerificationStatus.PENDING })
  verificationStatus: VerificationStatus;

  // Profile picture / avatar storage key.
  @Prop()
  profileAvatarKey?: string;

  // User skipped document upload step.
  @Prop()
  onboardingDocumentsSkippedAt?: Date;

  @Prop({ type: PrivateClientProfileSchema })
  privateClientProfile?: PrivateClientProfileData;

  @Prop({ type: PrivateClientDocumentSchema })
  privateClientDocuments?: PrivateClientDocumentData;

  @Prop({ type: OperatorProfileSchema })
  operatorProfile?: OperatorProfileData;

  @Prop({ type: OperatorDocumentSchema })
  operatorDocuments?: OperatorDocumentData;

  @Prop({ type: PilotProfileSchema })
  pilotProfile?: PilotProfileData;

  @Prop({ type: PilotDocumentSchema })
  pilotDocuments?: PilotDocumentData;

  @Prop({ type: EngineerCrewProfileSchema })
  engineerCrewProfile?: EngineerCrewProfileData;

  @Prop({ type: EngineerCrewDocumentSchema })
  engineerCrewDocuments?: EngineerCrewDocumentData;

  @Prop({ type: HbuPartnerProfileSchema })
  hbuPartnerProfile?: HbuPartnerProfileData;

  @Prop({ type: HbuPartnerDocumentSchema })
  hbuPartnerDocuments?: HbuPartnerDocumentData;
}

export const UserSchema = SchemaFactory.createForClass(User);
