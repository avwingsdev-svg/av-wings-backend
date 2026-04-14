import {
  Body,
  Controller,
  Get,
  Param,
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
import { PrivateClientProfileDto } from './dto/private-client-profile.dto';
import { OperatorProfileDto } from './dto/operator-profile.dto';
import { PilotProfileDto } from './dto/pilot-profile.dto';
import { EngineerCrewProfileDto } from './dto/engineer-crew-profile.dto';
import { HbuPartnerProfileDto } from './dto/hbu-partner-profile.dto';

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

  @Patch('profile/private-client/:userId')
  updatePrivateClient(
    @Param('userId') userId: string,
    @Body() dto: PrivateClientProfileDto,
  ) {
    return this.onboardingService.updatePrivateClientProfile(userId, dto);
  }

  @Patch('profile/operator')
  @UseGuards(JwtAuthGuard)
  updateOperator(
    @CurrentUser('userId') userId: string,
    @Body() dto: OperatorProfileDto,
  ) {
    return this.onboardingService.updateOperatorProfile(userId, dto);
  }

  @Patch('profile/pilot')
  @UseGuards(JwtAuthGuard)
  updatePilot(
    @CurrentUser('userId') userId: string,
    @Body() dto: PilotProfileDto,
  ) {
    return this.onboardingService.updatePilotProfile(userId, dto);
  }

  @Patch('profile/engineer-crew')
  @UseGuards(JwtAuthGuard)
  updateEngineerCrew(
    @CurrentUser('userId') userId: string,
    @Body() dto: EngineerCrewProfileDto,
  ) {
    return this.onboardingService.updateEngineerCrewProfile(userId, dto);
  }

  @Patch('profile/hbu-partner')
  @UseGuards(JwtAuthGuard)
  updateHbuPartner(
    @CurrentUser('userId') userId: string,
    @Body() dto: HbuPartnerProfileDto,
  ) {
    return this.onboardingService.updateHbuPartnerProfile(userId, dto);
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

  @Post('documents/private-client/:userId')
  // @UseGuards(JwtAuthGuard)
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
    // @CurrentUser('userId') userId: string,
    @Param('userId') userId: string,
    @UploadedFiles()
    files: {
      passport?: Express.Multer.File[];
      governmentId?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadPrivateClientDocuments(userId, files);
  }

  @Post('documents/operator')
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser('userId') userId: string,
    @UploadedFiles()
    files: {
      aocCertificate?: Express.Multer.File[];
      insurancePolicy?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadOperatorDocuments(userId, files);
  }

  @Post('documents/pilot')
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser('userId') userId: string,
    @UploadedFiles()
    files: {
      pilotLicenseFront?: Express.Multer.File[];
      pilotLicenseBack?: Express.Multer.File[];
      medicalCertificate?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadPilotDocuments(userId, files);
  }

  @Post('documents/engineer-crew')
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser('userId') userId: string,
    @UploadedFiles()
    files: {
      professionalLicense?: Express.Multer.File[];
      backgroundCheck?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadEngineerCrewDocuments(userId, files);
  }

  @Post('documents/hbu-partner')
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser('userId') userId: string,
    @UploadedFiles()
    files: {
      businessRegistration?: Express.Multer.File[];
      facilityOrServiceCertificate?: Express.Multer.File[];
    },
  ) {
    return this.onboardingService.uploadHbuPartnerDocuments(userId, files);
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
