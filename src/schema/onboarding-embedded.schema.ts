import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class PrivateClientProfileData {
  @Prop() homeAddress?: string;
  @Prop() dateOfBirth?: Date;
  @Prop() passportNumber?: string;
  @Prop() preferredAirport?: string;
}

export const PrivateClientProfileSchema = SchemaFactory.createForClass(
  PrivateClientProfileData,
);

@Schema({ _id: false })
export class PrivateClientDocumentData {
  @Prop() passportKey?: string;
  @Prop() governmentIdKey?: string;
}

export const PrivateClientDocumentSchema = SchemaFactory.createForClass(
  PrivateClientDocumentData,
);

@Schema({ _id: false })
export class OperatorProfileData {
  @Prop() companyName?: string;
  @Prop() businessAddress?: string;
  @Prop() aocNumber?: string;
  @Prop() primaryBaseIcao?: string;
}

export const OperatorProfileSchema =
  SchemaFactory.createForClass(OperatorProfileData);

@Schema({ _id: false })
export class OperatorDocumentData {
  @Prop() aocCertificateKey?: string;
  @Prop() insurancePolicyKey?: string;
  @Prop() businessLicenseKey?: string;
}

export const OperatorDocumentSchema =
  SchemaFactory.createForClass(OperatorDocumentData);

@Schema({ _id: false })
export class PilotProfileData {
  @Prop() licenseNumber?: string;
  @Prop() totalFlightHours?: number;
  @Prop() medicalClass?: string;
  @Prop() typeRatings?: string;
}

export const PilotProfileSchema = SchemaFactory.createForClass(PilotProfileData);

@Schema({ _id: false })
export class PilotDocumentData {
  @Prop() pilotLicenseFrontKey?: string;
  @Prop() pilotLicenseBackKey?: string;
  @Prop() medicalCertificateKey?: string;
}

export const PilotDocumentSchema =
  SchemaFactory.createForClass(PilotDocumentData);

@Schema({ _id: false })
export class EngineerCrewProfileData {
  @Prop() specialty?: string;
  @Prop() yearsOfExperience?: number;
  @Prop() licenseCertificationId?: string;
  @Prop() languagesSpoken?: string;
}

export const EngineerCrewProfileSchema = SchemaFactory.createForClass(
  EngineerCrewProfileData,
);

@Schema({ _id: false })
export class EngineerCrewDocumentData {
  @Prop() professionalLicenseKey?: string;
  @Prop() backgroundCheckKey?: string;
}

export const EngineerCrewDocumentSchema = SchemaFactory.createForClass(
  EngineerCrewDocumentData,
);

@Schema({ _id: false })
export class HbuPartnerProfileData {
  @Prop() businessName?: string;
  @Prop() airportIcaoOrIata?: string;
  @Prop() servicesDescription?: string;
}

export const HbuPartnerProfileSchema = SchemaFactory.createForClass(
  HbuPartnerProfileData,
);

@Schema({ _id: false })
export class HbuPartnerDocumentData {
  @Prop() businessLicenseKey?: string;
  @Prop() insurancePolicyKey?: string;
}

export const HbuPartnerDocumentSchema = SchemaFactory.createForClass(
  HbuPartnerDocumentData,
);
