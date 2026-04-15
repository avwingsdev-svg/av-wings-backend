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
import {
  buildOnboardingStatus,
  computeDocumentsComplete,
  computeProfileDetailsComplete,
  getMissingDocumentKeys,
  getMissingProfileFields,
} from './onboarding-validation';
import {
  EngineerCrewProfilePostDto,
  HbuPartnerProfilePostDto,
  OperatorProfilePostDto,
  PilotProfilePostDto,
  PrivateClientProfilePostDto,
} from './dto/onboarding-profile-post.dto';


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
    const synced = await this.syncOnboardingCompletionFlags(user);
    return buildOnboardingStatus(synced);
  }

  /** Keeps `profileDetailsComplete` / `documentsComplete` on User in sync (e.g. after account type changes in auth). */
  async syncOnboardingCompletionFlagsForUserId(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return;
    }
    await this.syncOnboardingCompletionFlags(user);
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

  // Writes private-client/broker profile slice; lookup by email in body; findOneAndUpdate on User.
  async updatePrivateClientProfile(dto: PrivateClientProfilePostDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email,
          accountType: UserAccountType.PRIVATE_CLIENT_BROKER,
        },
        {
          $set: {
            privateClientProfile: {
              homeAddress: dto.homeAddress.trim(),
              dateOfBirth: new Date(dto.dateOfBirth),
              passportNumber: dto.passportNumber.trim(),
              preferredAirport: dto.preferredAirport.trim(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user) {
      await this.throwIfProfileUpdateBlocked(email);
    }
    const synced = await this.syncOnboardingCompletionFlags(user!);
    return { message: 'Profile saved.', ...buildOnboardingStatus(synced) };
  }

  async updateOperatorProfile(dto: OperatorProfilePostDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email,
          accountType: UserAccountType.OPERATOR,
        },
        {
          $set: {
            operatorProfile: {
              companyName: dto.companyName.trim(),
              businessAddress: dto.businessAddress.trim(),
              aocNumber: dto.aocNumber.trim(),
              primaryBaseIcao: dto.primaryBaseIcao.trim(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user) {
      await this.throwIfProfileUpdateBlocked(email);
    }
    const synced = await this.syncOnboardingCompletionFlags(user!);
    return { message: 'Profile saved.', ...buildOnboardingStatus(synced) };
  }

  async updatePilotProfile(dto: PilotProfilePostDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email,
          accountType: UserAccountType.PILOT,
        },
        {
          $set: {
            pilotProfile: {
              licenseNumber: dto.licenseNumber.trim(),
              totalFlightHours: dto.totalFlightHours,
              medicalClass: dto.medicalClass.trim(),
              typeRatings: dto.typeRatings.trim(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user) {
      await this.throwIfProfileUpdateBlocked(email);
    }
    const synced = await this.syncOnboardingCompletionFlags(user!);
    return { message: 'Profile saved.', ...buildOnboardingStatus(synced) };
  }

  async updateEngineerCrewProfile(dto: EngineerCrewProfilePostDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email,
          accountType: UserAccountType.ENGINEER_CREW,
        },
        {
          $set: {
            engineerCrewProfile: {
              specialty: dto.specialty.trim(),
              yearsOfExperience: dto.yearsOfExperience,
              licenseCertificationId: dto.licenseCertificationId.trim(),
              languagesSpoken: dto.languagesSpoken.trim(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user) {
      await this.throwIfProfileUpdateBlocked(email);
    }
    const synced = await this.syncOnboardingCompletionFlags(user!);
    return { message: 'Profile saved.', ...buildOnboardingStatus(synced) };
  }

  async updateHbuPartnerProfile(dto: HbuPartnerProfilePostDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email,
          accountType: UserAccountType.HBU_PARTNER,
        },
        {
          $set: {
            hbuPartnerProfile: {
              businessName: dto.businessName.trim(),
              airportIcaoOrIata: dto.airportIcaoOrIata.trim(),
              servicesDescription: dto.servicesDescription.trim(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user) {
      await this.throwIfProfileUpdateBlocked(email);
    }
    const synced = await this.syncOnboardingCompletionFlags(user!);
    return { message: 'Profile saved.', ...buildOnboardingStatus(synced) };
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
    email: string,
    files: {
      passport?: Express.Multer.File[];
      governmentId?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUserByEmail(email);
    this.assertAccountType(user, UserAccountType.PRIVATE_CLIENT_BROKER);
    const storageId = user._id.toString();
    this.clearDocumentsSkip(user);
    user.privateClientDocuments = user.privateClientDocuments ?? {};
    if (files.passport?.[0]) {
      user.privateClientDocuments.passportKey = await this.storeDocument(
        storageId,
        'passport',
        files.passport[0],
      );
    }
    if (files.governmentId?.[0]) {
      user.privateClientDocuments.governmentIdKey = await this.storeDocument(
        storageId,
        'governmentId',
        files.governmentId[0],
      );
    }
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return { message: 'Documents updated.', ...buildOnboardingStatus(synced) };
  }

  // Operator AOC, insurance, and business license evidence.
  async uploadOperatorDocuments(
    email: string,
    files: {
      aocCertificate?: Express.Multer.File[];
      insurancePolicy?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUserByEmail(email);
    this.assertAccountType(user, UserAccountType.OPERATOR);
    const storageId = user._id.toString();
    this.clearDocumentsSkip(user);
    user.operatorDocuments = user.operatorDocuments ?? {};
    if (files.aocCertificate?.[0]) {
      user.operatorDocuments.aocCertificateKey = await this.storeDocument(
        storageId,
        'aocCertificate',
        files.aocCertificate[0],
      );
    }
    if (files.insurancePolicy?.[0]) {
      user.operatorDocuments.insurancePolicyKey = await this.storeDocument(
        storageId,
        'insurancePolicy',
        files.insurancePolicy[0],
      );
    }
    if (files.businessLicense?.[0]) {
      user.operatorDocuments.businessLicenseKey = await this.storeDocument(
        storageId,
        'businessLicense',
        files.businessLicense[0],
      );
    }
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return { message: 'Documents updated.', ...buildOnboardingStatus(synced) };
  }

  // Pilot license (front/back) and medical certificate.
  async uploadPilotDocuments(
    email: string,
    files: {
      pilotLicenseFront?: Express.Multer.File[];
      pilotLicenseBack?: Express.Multer.File[];
      medicalCertificate?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUserByEmail(email);
    this.assertAccountType(user, UserAccountType.PILOT);
    const storageId = user._id.toString();
    this.clearDocumentsSkip(user);
    user.pilotDocuments = user.pilotDocuments ?? {};
    if (files.pilotLicenseFront?.[0]) {
      user.pilotDocuments.pilotLicenseFrontKey = await this.storeDocument(
        storageId,
        'pilotLicenseFront',
        files.pilotLicenseFront[0],
      );
    }
    if (files.pilotLicenseBack?.[0]) {
      user.pilotDocuments.pilotLicenseBackKey = await this.storeDocument(
        storageId,
        'pilotLicenseBack',
        files.pilotLicenseBack[0],
      );
    }
    if (files.medicalCertificate?.[0]) {
      user.pilotDocuments.medicalCertificateKey = await this.storeDocument(
        storageId,
        'medicalCertificate',
        files.medicalCertificate[0],
      );
    }
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return { message: 'Documents updated.', ...buildOnboardingStatus(synced) };
  }

  // Engineer/crew professional license and background check.
  async uploadEngineerCrewDocuments(
    email: string,
    files: {
      professionalLicense?: Express.Multer.File[];
      backgroundCheck?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUserByEmail(email);
    this.assertAccountType(user, UserAccountType.ENGINEER_CREW);
    const storageId = user._id.toString();
    this.clearDocumentsSkip(user);
    user.engineerCrewDocuments = user.engineerCrewDocuments ?? {};
    if (files.professionalLicense?.[0]) {
      user.engineerCrewDocuments.professionalLicenseKey =
        await this.storeDocument(
          storageId,
          'professionalLicense',
          files.professionalLicense[0],
        );
    }
    if (files.backgroundCheck?.[0]) {
      user.engineerCrewDocuments.backgroundCheckKey = await this.storeDocument(
        storageId,
        'backgroundCheck',
        files.backgroundCheck[0],
      );
    }
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return { message: 'Documents updated.', ...buildOnboardingStatus(synced) };
  }

  // HBU partner registration and facility/service certificates.
  async uploadHbuPartnerDocuments(
    email: string,
    files: {
      businessRegistration?: Express.Multer.File[];
      facilityOrServiceCertificate?: Express.Multer.File[];
    },
  ) {
    const user = await this.requireUserByEmail(email);
    this.assertAccountType(user, UserAccountType.HBU_PARTNER);
    const storageId = user._id.toString();
    this.clearDocumentsSkip(user);
    user.hbuPartnerDocuments = user.hbuPartnerDocuments ?? {};
    if (files.businessRegistration?.[0]) {
      user.hbuPartnerDocuments.businessRegistrationKey =
        await this.storeDocument(
          storageId,
          'businessRegistration',
          files.businessRegistration[0],
        );
    }
    if (files.facilityOrServiceCertificate?.[0]) {
      user.hbuPartnerDocuments.facilityOrServiceCertificateKey =
        await this.storeDocument(
          storageId,
          'facilityOrServiceCertificate',
          files.facilityOrServiceCertificate[0],
        );
    }
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return { message: 'Documents updated.', ...buildOnboardingStatus(synced) };
  }

// New evidence invalidates an earlier “skip documents” decision.
  async skipDocuments(userId: string) {
    const user = await this.requireUser(userId);
    if (!user.accountType) {
      throw new BadRequestException('Select an account type first.');
    }
    user.onboardingDocumentsSkippedAt = new Date();
    await user.save();
    const synced = await this.syncOnboardingCompletionFlags(user);
    return {
      message: 'Document step skipped.',
      ...buildOnboardingStatus(synced),
    };
  }


  // Final submission endpoint checks all requirements and moves status to SUBMITTED if valid.
  async submitForVerification(userId: string) {
    const user = await this.requireUser(userId);
    const synced = await this.syncOnboardingCompletionFlags(user);
    const status = buildOnboardingStatus(synced);
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
        missingProfileFields: getMissingProfileFields(synced),
      });
    }
    if (!status.documentsComplete) {
      throw new BadRequestException({
        message: 'Upload all required documents or skip this step.',
        missingDocumentKeys: getMissingDocumentKeys(synced),
      });
    }
    const v = synced.verificationStatus ?? VerificationStatus.PENDING;
    if (v !== VerificationStatus.PENDING) {
      throw new BadRequestException('Verification already submitted or decided.');
    }
    synced.verificationStatus = VerificationStatus.SUBMITTED;
    await synced.save();
    return {
      message: 'Submitted for verification.',
      verificationStatus: synced.verificationStatus,
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

  private async requireUserByEmail(rawEmail: string): Promise<User> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  /** Persists `profileDetailsComplete` and `documentsComplete` from the same rules as the onboarding API. */
  private async syncOnboardingCompletionFlags(user: User): Promise<User> {
    const profileDetailsComplete = computeProfileDetailsComplete(user);
    const documentsComplete = computeDocumentsComplete(user);
    if (
      user.profileDetailsComplete === profileDetailsComplete &&
      user.documentsComplete === documentsComplete
    ) {
      return user;
    }
    const updated = await this.userModel
      .findByIdAndUpdate(
        user._id,
        { $set: { profileDetailsComplete, documentsComplete } },
        { new: true },
      )
      .exec();
    return updated ?? user;
  }

  /** When findOneAndUpdate matches no document: wrong email, missing account type, or type mismatch. */
  private async throwIfProfileUpdateBlocked(email: string): Promise<never> {
    const found = await this.userModel.findOne({ email }).exec();
    if (!found) {
      throw new NotFoundException('User not found.');
    }
    if (!found.accountType) {
      throw new BadRequestException('Select an account type first.');
    }
    throw new BadRequestException(
      'This action does not match your account type.',
    );
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
