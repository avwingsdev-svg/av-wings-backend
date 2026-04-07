import { Prop, Schema } from "@nestjs/mongoose";

@Schema({timestamps: true})
export class Profile extends Document {
  @Prop({ required: true })
  userId: string;  
  
    @Prop()
    speciatly?: string;

    @Prop()
    yearOfExperience?: number;

    @Prop()
    licenseOrCertification?: string;

    @Prop()
    languagesSpoken?: string[];

    @Prop()
    profileLicenseImg?: string;

    @Prop()
    backgroundCheckImg?: string;

    @Prop()
    licenseNumber?: string;

    @Prop()
    totalFlightHours?: number;

    @Prop()
    medicalClass?: string;

    @Prop()
    typeRatings?: string[];

    @Prop()
    pilotFrontEndImg?: string;

    @Prop()
    pilotBackEndImg?: string;

    @Prop()
    medicalCertificateImg?: string;

    @Prop()
    companyName?: string;

    @Prop()
    businessAddress?: string;

    @Prop()
    AocNumber?: string;

    @Prop()
    primaryBase?: string;

    @Prop()
    AocCertificateImg?: string;

    @Prop()
    insurancePolicyImg?: string;

    @Prop()
    businessLicenseImg?: string;

    @Prop()
    homeAddress?: string;

    @Prop()
    dateOfBirth?: Date;

    @Prop()
    passportNumber?: string;

    @Prop()
    preferredAirport?: string;

    @Prop()
    passsportScanImg?: string;

    @Prop()
    governmentId?: string
}