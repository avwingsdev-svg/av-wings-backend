import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserAccountType, VerificationStatus } from '../schema/User.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateUploadFile } from '../common/storage/upload-validation';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { OperatorProfileDto } from './dto/operator-profile.dto';
import { PilotProfileDto } from './dto/pilot-profile.dto';
import { EngineerCrewProfileDto } from './dto/engineer-crew-profile.dto';
import { HbuPartnerProfileDto } from './dto/hbu-partner-profile.dto';
import {
  buildOnboardingStatus,
  getMissingDocumentKeys,
  getMissingProfileFields,
} from './onboarding-validation';
import { PrivateClientProfileDto } from './dto/private-client-profile.dto';


@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // Computes next mobile screen and missing fields from the embedded profile/document state.
  async getStatus(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return buildOnboardingStatus(user);
  }

  // Legal gate: without acceptance timestamp, later steps should not proceed in the client.
  async acceptTerms(userId: string, dto: AcceptTermsDto) {
    if (!dto.accepted) {
      throw new BadRequestException('You must accept the terms to continue.');
    }
    const user = await this.requireUser(userId);
    user.termsAcceptedAt = new Date();
    await user.save();
    return { message: 'Terms accepted.', ...buildOnboardingStatus(user) };
  }

  // Writes private-client/broker profile slice; rejected if account type does not match.
  async updatePrivateClientProfile(
    userId: string,
    dto: PrivateClientProfileDto,
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.PRIVATE_CLIENT_BROKER);
    user.privateClientProfile = {
      homeAddress: dto.homeAddress.trim(),
      dateOfBirth: new Date(dto.dateOfBirth),
      passportNumber: dto.passportNumber.trim(),
      preferredAirport: dto.preferredAirport.trim(),
    };
    await user.save();
    return { message: 'Profile saved.', ...buildOnboardingStatus(user) };
  }

  // Operator fleet/AOC profile fields embedded on the user document.
  async updateOperatorProfile(userId: string, dto: OperatorProfileDto) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.OPERATOR);
    user.operatorProfile = {
      companyName: dto.companyName.trim(),
      businessAddress: dto.businessAddress.trim(),
      aocNumber: dto.aocNumber.trim(),
      primaryBaseIcao: dto.primaryBaseIcao.trim(),
    };
    await user.save();
    return { message: 'Profile saved.', ...buildOnboardingStatus(user) };
  }

  // Pilot licensing and hours captured for verification.
  async updatePilotProfile(userId: string, dto: PilotProfileDto) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.PILOT);
    user.pilotProfile = {
      licenseNumber: dto.licenseNumber.trim(),
      totalFlightHours: dto.totalFlightHours,
      medicalClass: dto.medicalClass.trim(),
      typeRatings: dto.typeRatings.trim(),
    };
    await user.save();
    return { message: 'Profile saved.', ...buildOnboardingStatus(user) };
  }

  async updateEngineerCrewProfile(
    userId: string,
    dto: EngineerCrewProfileDto,
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.ENGINEER_CREW);
    user.engineerCrewProfile = {
      specialty: dto.specialty.trim(),
      yearsOfExperience: dto.yearsOfExperience,
      licenseCertificationId: dto.licenseCertificationId.trim(),
      languagesSpoken: dto.languagesSpoken.trim(),
    };
    await user.save();
    return { message: 'Profile saved.', ...buildOnboardingStatus(user) };
  }

  // Airport services partner business profile.
  async updateHbuPartnerProfile(userId: string, dto: HbuPartnerProfileDto) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.HBU_PARTNER);
    user.hbuPartnerProfile = {
      businessName: dto.businessName.trim(),
      airportIcaoOrIata: dto.airportIcaoOrIata.trim(),
      servicesDescription: dto.servicesDescription.trim(),
    };
    await user.save();
    return { message: 'Profile saved.', ...buildOnboardingStatus(user) };
  }

  // Persists profile photo URL/key required before final verification submit.
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.requireUser(userId);
    const url = await this.storeAvatar(userId, file);
    user.profileAvatarKey = url;
    await user.save();
    return {
      message: 'Profile photo saved.',
      profileAvatarUrl: url,
      profileAvatarKey: url,
    };
  }

// Document uploads for each account type; later evidence clears any earlier “skip” decision.
  async uploadPrivateClientDocuments(
    userId: string,
    files: {
      passport?: Express.Multer.File[];
      governmentId?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.PRIVATE_CLIENT_BROKER);
    this.clearDocumentsSkip(user);
    user.privateClientDocuments = user.privateClientDocuments ?? {};
    if (files.passport?.[0]) {
      user.privateClientDocuments.passportKey = await this.storeDocument(
        userId,
        'passport',
        files.passport[0],
      );
    }
    if (files.governmentId?.[0]) {
      user.privateClientDocuments.governmentIdKey = await this.storeDocument(
        userId,
        'governmentId',
        files.governmentId[0],
      );
    }
    await user.save();
    return { message: 'Documents updated.', ...buildOnboardingStatus(user) };
  }

  // Operator AOC, insurance, and business license evidence.
  async uploadOperatorDocuments(
    userId: string,
    files: {
      aocCertificate?: Express.Multer.File[];
      insurancePolicy?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.OPERATOR);
    this.clearDocumentsSkip(user);
    user.operatorDocuments = user.operatorDocuments ?? {};
    if (files.aocCertificate?.[0]) {
      user.operatorDocuments.aocCertificateKey = await this.storeDocument(
        userId,
        'aocCertificate',
        files.aocCertificate[0],
      );
    }
    if (files.insurancePolicy?.[0]) {
      user.operatorDocuments.insurancePolicyKey = await this.storeDocument(
        userId,
        'insurancePolicy',
        files.insurancePolicy[0],
      );
    }
    if (files.businessLicense?.[0]) {
      user.operatorDocuments.businessLicenseKey = await this.storeDocument(
        userId,
        'businessLicense',
        files.businessLicense[0],
      );
    }
    await user.save();
    return { message: 'Documents updated.', ...buildOnboardingStatus(user) };
  }

  // Pilot license (front/back) and medical certificate.
  async uploadPilotDocuments(
    userId: string,
    files: {
      pilotLicenseFront?: Express.Multer.File[];
      pilotLicenseBack?: Express.Multer.File[];
      medicalCertificate?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.PILOT);
    this.clearDocumentsSkip(user);
    user.pilotDocuments = user.pilotDocuments ?? {};
    if (files.pilotLicenseFront?.[0]) {
      user.pilotDocuments.pilotLicenseFrontKey = await this.storeDocument(
        userId,
        'pilotLicenseFront',
        files.pilotLicenseFront[0],
      );
    }
    if (files.pilotLicenseBack?.[0]) {
      user.pilotDocuments.pilotLicenseBackKey = await this.storeDocument(
        userId,
        'pilotLicenseBack',
        files.pilotLicenseBack[0],
      );
    }
    if (files.medicalCertificate?.[0]) {
      user.pilotDocuments.medicalCertificateKey = await this.storeDocument(
        userId,
        'medicalCertificate',
        files.medicalCertificate[0],
      );
    }
    await user.save();
    return { message: 'Documents updated.', ...buildOnboardingStatus(user) };
  }

  // Engineer/crew professional license and background check.
  async uploadEngineerCrewDocuments(
    userId: string,
    files: {
      professionalLicense?: Express.Multer.File[];
      backgroundCheck?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.ENGINEER_CREW);
    this.clearDocumentsSkip(user);
    user.engineerCrewDocuments = user.engineerCrewDocuments ?? {};
    if (files.professionalLicense?.[0]) {
      user.engineerCrewDocuments.professionalLicenseKey =
        await this.storeDocument(
          userId,
          'professionalLicense',
          files.professionalLicense[0],
        );
    }
    if (files.backgroundCheck?.[0]) {
      user.engineerCrewDocuments.backgroundCheckKey = await this.storeDocument(
        userId,
        'backgroundCheck',
        files.backgroundCheck[0],
      );
    }
    await user.save();
    return { message: 'Documents updated.', ...buildOnboardingStatus(user) };
  }

  // HBU partner registration and facility/service certificates.
  async uploadHbuPartnerDocuments(
    userId: string,
    files: {
      businessRegistration?: Express.Multer.File[];
      facilityOrServiceCertificate?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUser(userId);
    this.assertAccountType(user, UserAccountType.HBU_PARTNER);
    this.clearDocumentsSkip(user);
    user.hbuPartnerDocuments = user.hbuPartnerDocuments ?? {};
    if (files.businessRegistration?.[0]) {
      user.hbuPartnerDocuments.businessRegistrationKey =
        await this.storeDocument(
          userId,
          'businessRegistration',
          files.businessRegistration[0],
        );
    }
    if (files.facilityOrServiceCertificate?.[0]) {
      user.hbuPartnerDocuments.facilityOrServiceCertificateKey =
        await this.storeDocument(
          userId,
          'facilityOrServiceCertificate',
          files.facilityOrServiceCertificate[0],
        );
    }
    await user.save();
    return { message: 'Documents updated.', ...buildOnboardingStatus(user) };
  }

// New evidence invalidates an earlier “skip documents” decision.
  async skipDocuments(userId: string) {
    const user = await this.requireUser(userId);
    if (!user.accountType) {
      throw new BadRequestException('Select an account type first.');
    }
    user.onboardingDocumentsSkippedAt = new Date();
    await user.save();
    return { message: 'Document step skipped.', ...buildOnboardingStatus(user) };
  }


  // Final submission endpoint checks all requirements and moves status to SUBMITTED if valid.
  async submitForVerification(userId: string) {
    const user = await this.requireUser(userId);
    const status = buildOnboardingStatus(user);
    if (!status.termsAccepted) {
      throw new BadRequestException('Accept the terms before submitting.');
    }
    if (!status.avatarComplete) {
      throw new BadRequestException(
        'Upload a profile photo before submitting (see onboarding nextStep: avatar).',
      );
    }
    if (!status.profileDetailsComplete) {
      throw new BadRequestException({
        message: 'Profile details are incomplete.',
        missingProfileFields: getMissingProfileFields(user),
      });
    }
    if (!status.documentsComplete) {
      throw new BadRequestException({
        message: 'Upload all required documents or skip this step.',
        missingDocumentKeys: getMissingDocumentKeys(user),
      });
    }
    const v = user.verificationStatus ?? VerificationStatus.PENDING;
    if (v !== VerificationStatus.PENDING) {
      throw new BadRequestException('Verification already submitted or decided.');
    }
    user.verificationStatus = VerificationStatus.SUBMITTED;
    await user.save();
    return {
      message: 'Submitted for verification.',
      verificationStatus: user.verificationStatus,
    };
  }

  private async storeAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateUploadFile(file, 'avatar');
    const r = await this.cloudinary.uploadImage(
      file.buffer,
      `onboarding/${userId}/avatar`,
      'avatar',
    );
    return r.secureUrl;
  }

  private async storeDocument(
    userId: string,
    field: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateUploadFile(file, 'document');
    const r = await this.cloudinary.uploadFile(
      file.buffer,
      `onboarding/${userId}/documents`,
      field,
    );
    return r.secureUrl;
  }

  // Loads the user row for any onboarding mutation; 404 if JWT subject is stale.
  private async requireUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  // New evidence invalidates an earlier “skip documents” decision.
  private clearDocumentsSkip(user: User) {
    user.onboardingDocumentsSkippedAt = undefined;
  }

  // Role-specific endpoints must not mutate another account type’s embedded subdocuments.
  private assertAccountType(user: User, expected: UserAccountType) {
    if (!user.accountType) {
      throw new BadRequestException('Select an account type first.');
    }
    if (user.accountType !== expected) {
      throw new BadRequestException(
        'This action does not match your account type.',
      );
    }
  }
}
