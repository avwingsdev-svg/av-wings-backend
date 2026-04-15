import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { OnboardingDocumentUploadDto } from './dto/onboarding-document-upload.dto';
import {
  EngineerCrewProfilePostDto,
  HbuPartnerProfilePostDto,
  OperatorProfilePostDto,
  PilotProfilePostDto,
  PrivateClientProfilePostDto,
} from './dto/onboarding-profile-post.dto';

/** Authenticated onboarding steps: profiles, document uploads, and verification submit. */
@Controller('auth/onboarding')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser('userId') userId: string) {
    return this.onboardingService.getStatus(userId);
  }

  @Patch('terms')
  @UseGuards(JwtAuthGuard)
  acceptTerms(
    @CurrentUser('userId') userId: string,
    @Body() dto: AcceptTermsDto,
  ) {
    return this.onboardingService.acceptTerms(userId, dto);
  }

  @Post('profile/private-client')
  updatePrivateClient(@Body() dto: PrivateClientProfilePostDto) {
    return this.onboardingService.updatePrivateClientProfile(dto);
  }

  @Post('profile/operator')
  updateOperator(@Body() dto: OperatorProfilePostDto) {
    return this.onboardingService.updateOperatorProfile(dto);
  }

  @Post('profile/pilot')
  updatePilot(@Body() dto: PilotProfilePostDto) {
    return this.onboardingService.updatePilotProfile(dto);
  }

  @Post('profile/engineer-crew')
  updateEngineerCrew(@Body() dto: EngineerCrewProfilePostDto) {
    return this.onboardingService.updateEngineerCrewProfile(dto);
  }

  @Post('profile/hbu-partner')
  updateHbuPartner(@Body() dto: HbuPartnerProfilePostDto) {
    return this.onboardingService.updateHbuPartnerProfile(dto);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.onboardingService.uploadAvatar(userId, file);
  }

  @Post('documents/private-client')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'passport', maxCount: 1 },
        { name: 'governmentId', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadPrivateClientDocs(
    @Body() body: OnboardingDocumentUploadDto,
    @UploadedFiles()
    files: {
      passport?: Express.Multer.File[];
      governmentId?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadPrivateClientDocuments(
      body.email,
      files,
    );
  }

  @Post('documents/operator')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aocCertificate', maxCount: 1 },
        { name: 'insurancePolicy', maxCount: 1 },
        { name: 'businessLicense', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadOperatorDocs(
    @Body() body: OnboardingDocumentUploadDto,
    @UploadedFiles()
    files: {
      aocCertificate?: Express.Multer.File[];
      insurancePolicy?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadOperatorDocuments(body.email, files);
  }

  @Post('documents/pilot')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'pilotLicenseFront', maxCount: 1 },
        { name: 'pilotLicenseBack', maxCount: 1 },
        { name: 'medicalCertificate', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadPilotDocs(
    @Body() body: OnboardingDocumentUploadDto,
    @UploadedFiles()
    files: {
      pilotLicenseFront?: Express.Multer.File[];
      pilotLicenseBack?: Express.Multer.File[];
      medicalCertificate?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadPilotDocuments(body.email, files);
  }

  @Post('documents/engineer-crew')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'professionalLicense', maxCount: 1 },
        { name: 'backgroundCheck', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadEngineerCrewDocs(
    @Body() body: OnboardingDocumentUploadDto,
    @UploadedFiles()
    files: {
      professionalLicense?: Express.Multer.File[];
      backgroundCheck?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadEngineerCrewDocuments(
      body.email,
      files,
    );
  }

  @Post('documents/hbu-partner')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'businessRegistration', maxCount: 1 },
        { name: 'facilityOrServiceCertificate', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadHbuPartnerDocs(
    @Body() body: OnboardingDocumentUploadDto,
    @UploadedFiles()
    files: {
      businessRegistration?: Express.Multer.File[];
      facilityOrServiceCertificate?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadHbuPartnerDocuments(
      body.email,
      files,
    );
  }

  @Post('documents/skip')
  @UseGuards(JwtAuthGuard)
  skipDocuments(@CurrentUser('userId') userId: string) {
    return this.onboardingService.skipDocuments(userId);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser('userId') userId: string) {
    return this.onboardingService.submitForVerification(userId);
  }
}
