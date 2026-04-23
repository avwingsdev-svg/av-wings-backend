import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserAccountType } from '../schema/User.schema';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';
import { EmailBodyDto } from './dto/email-body.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChooseAccountTypeDto } from './dto/choose-account-type.dto';
import {
  createPasswordResetSecret,
  decodePasswordResetToken,
  encodePasswordResetToken,
  getPasswordResetTtlMs,
} from '../common/utils/password-reset-token.util';
import { ACCOUNT_TYPE_OPTIONS } from '../account-types/account-type-options';
import { OnboardingService } from '../onboarding/onboarding.service';
import {
  computeDocumentsComplete,
  computeProfileDetailsComplete,
} from '../onboarding/onboarding-validation';

const REFRESH_TOKEN_BYTES = 48;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async signup(dto: SignupDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.fullName.trim();
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const password = await bcrypt.hash(dto.password, 10);

    await this.userModel.create({
      fullName: dto.fullName.trim(),
      email,
      password,
      phoneNumber: dto.phoneNumber.trim(),
      isEmailVerified: false,
      isPasswordSet: true,
    });

    const otp = await this.otpService.issueOtp(email);
    await this.mailService.sendSignupOtp(email, otp, name);

    return { message: 'Verification code sent to your email.' };
  }

  async verifySignup(dto: SignupVerifyDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    email: string;
    accountType?: UserAccountType;
    isEmailVerified: boolean;
    profileDetailsComplete: boolean;
    documentsComplete: boolean;
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new BadRequestException('Invalid request.');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified.');
    }

    await this.otpService.verifyOtp(email, dto.otp);
    user.isEmailVerified = true;
    await user.save();

    // return { message: 'Email verified. You can set your password when ready.' };
    return {
      ...(await this.issueTokens(user)),
      email: user.email,
      accountType: user.accountType,
      isEmailVerified: user.isEmailVerified,
      profileDetailsComplete: computeProfileDetailsComplete(user),
      documentsComplete: computeDocumentsComplete(user),
    };
  }

  async resendSignupOtp(dto: EmailBodyDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    const generic = {
      message: 'If an account exists and needs verification, a code was sent.',
    };

    if (!user || user.isEmailVerified) {
      return generic;
    }

    const otp = await this.otpService.issueOtp(email);
    await this.mailService.sendSignupOtp(email, otp, user.fullName);
    return generic;
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    email: string;
    accountType?: UserAccountType;
    isEmailVerified: boolean;
    profileDetailsComplete: boolean;
    documentsComplete: boolean;
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user?.isPasswordSet || !user.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.isEmailVerified) {
      const otp = await this.otpService.issueOtp(email);
      throw new UnauthorizedException(
        'Email not verified. Please check your email to verify with code.',
      );
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.onboardingService.syncOnboardingCompletionFlagsForUserId(
      user._id.toString(),
    );

    return {
      ...(await this.issueTokens(user)),
      email: user.email,
      accountType: user.accountType,
      isEmailVerified: user.isEmailVerified,
      profileDetailsComplete: computeProfileDetailsComplete(user),
      documentsComplete: computeDocumentsComplete(user),
    };
  }

  async refresh(dto: RefreshDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const match = await bcrypt.compare(dto.refreshToken, user.refreshToken);
    if (!match) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.userModel
      .findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } })
      .exec();
    return { message: 'Logged out.' };
  }

  getAccountTypes() {
    return { accountTypes: ACCOUNT_TYPE_OPTIONS };
  }

  async chooseAccountType(
    userId: string,
    dto: ChooseAccountTypeDto,
  ): Promise<{ message: string; accountType: UserAccountType }> {
    const user = await this.userModel.findById(userId).exec();
    console.log('chooseAccountType', { userId, dto, user });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    user.accountType = dto.accountType;
    await user.save();
    await this.onboardingService.syncOnboardingCompletionFlagsForUserId(
      user._id.toString(),
    );
    return {
      message: 'Account type saved.',
      accountType: user.accountType,
    };
  }

  async forgotPassword(dto: EmailBodyDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    const generic = {
      message: 'If an account exists with this email, a message was sent.',
    };

    // No password yet → nothing to reset; still respond generically.
    if (!user?.isPasswordSet) {
      return generic;
    }

    const baseUrl = process.env.PASSWORD_RESET_REDIRECT_URL?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'PASSWORD_RESET_REDIRECT_URL is not configured.',
      );
    }

    let resetUrl: URL;
    try {
      resetUrl = new URL(baseUrl);
    } catch {
      throw new ServiceUnavailableException(
        'PASSWORD_RESET_REDIRECT_URL must be a valid absolute URL.',
      );
    }

    const secret = createPasswordResetSecret();
    const token = encodePasswordResetToken(user._id.toString(), secret);
    user.passwordResetTokenHash = await bcrypt.hash(secret, 10);
    user.passwordResetExpires = new Date(Date.now() + getPasswordResetTtlMs());
    await user.save();

    resetUrl.searchParams.set('token', token);
    await this.mailService.sendPasswordResetLink(email, resetUrl.toString());

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const parsed = decodePasswordResetToken(dto.token);
    if (!parsed) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const user = await this.userModel.findById(parsed.userId).exec();

    if (
      !user?.isPasswordSet ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpires
    ) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const match = await bcrypt.compare(
      parsed.secret,
      user.passwordResetTokenHash,
    );
    if (!match) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.refreshToken = undefined;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password updated. Please sign in again.' };
  }

  private async issueTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }> {
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshPlain = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const refreshHash = await bcrypt.hash(refreshPlain, 10);
    user.refreshToken = refreshHash;
    await user.save();

    const expiresIn = process.env.JWT_ACCESS_EXPIRES ?? '15m';

    return {
      accessToken,
      refreshToken: refreshPlain,
      expiresIn,
    };
  }

  async getCurrentUser(userId: string): Promise<Partial<User>> {
    const user = await this.userModel
      .findById(userId)
      .select('-password -refreshToken')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  // Google OAuth flow: if email exists with non-Google auth, reject; if email exists with Google auth but different Google ID, reject; otherwise create or update user with Google details and issue tokens. This allows seamless linking of Google accounts to existing users who may have signed up with email/password but haven't set a password yet (e.g. signed up with Google but didn't verify email, so they have no password).
  async googleAuth(dto: GoogleAuthDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    email: string;
    accountType?: UserAccountType;
    isEmailVerified: Boolean;
  }> {
    const email = dto.email.trim().toLowerCase();
    const googleId = dto.googleId.trim();

    const existingByEmail = await this.userModel.findOne({ email }).exec();

    if (existingByEmail) {
      const sameGoogleIdentity =
        existingByEmail.googleId != null &&
        existingByEmail.googleId === googleId;
      const registeredWithGoogle =
        existingByEmail.authProvider === 'google' || sameGoogleIdentity;

      if (!registeredWithGoogle) {
        throw new ConflictException(
          'This email is already registered without Google. Sign in with your email and password.',
        );
      }
      if (
        existingByEmail.googleId != null &&
        existingByEmail.googleId !== googleId
      ) {
        throw new ConflictException(
          'This email is linked to a different Google account.',
        );
      }
      existingByEmail.googleId = googleId;
      existingByEmail.authProvider = 'google';
      existingByEmail.fullName = dto.fullName.trim();
      existingByEmail.phoneNumber = dto.phoneNumber.trim();
      existingByEmail.isEmailVerified = true;
      if (dto.avatarImage !== undefined) {
        existingByEmail.avatarImage =
          dto.avatarImage.trim() || 'default-avatar.png';
      }
      if (dto.accountType !== undefined) {
        existingByEmail.accountType = dto.accountType;
      }
      await existingByEmail.save();
      await this.onboardingService.syncOnboardingCompletionFlagsForUserId(
        existingByEmail._id.toString(),
      );
      return {
        ...(await this.issueTokens(existingByEmail)),
        email: existingByEmail.email,
        accountType: existingByEmail.accountType,
        isEmailVerified: existingByEmail.isEmailVerified,
      };
    }

    const existingByGoogleId = await this.userModel
      .findOne({ googleId })
      .exec();
    if (existingByGoogleId) {
      throw new ConflictException(
        'This Google account is already linked to another email address.',
      );
    }

    const created = await this.userModel.create({
      fullName: dto.fullName.trim(),
      email,
      phoneNumber: dto.phoneNumber.trim(),
      googleId,
      authProvider: 'google',
      avatarImage: dto.avatarImage?.trim() || 'default-avatar.png',
      isEmailVerified: true,
      isPasswordSet: false,
      accountType: dto.accountType,
    });

    await this.onboardingService.syncOnboardingCompletionFlagsForUserId(
      created._id.toString(),
    );

    return {
      ...(await this.issueTokens(created)),
      email: created.email,
      accountType: created.accountType,
      isEmailVerified: created.isEmailVerified,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatar?: Express.Multer.File,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let updated = false;

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
      updated = true;
    }

    if (dto.phoneNumber !== undefined) {
      user.phoneNumber = dto.phoneNumber.trim();
      updated = true;
    }

    if (dto.avatarImage !== undefined) {
      user.avatarImage = dto.avatarImage?.trim() || 'default-avatar.png';
      updated = true;
    }

    if (avatar) {
      const uploaded = await this.onboardingService.uploadAvatar(
        userId,
        avatar,
      );
      user.avatarImage = uploaded.profileAvatarUrl;
      updated = true;
    }

    if (user.accountType === UserAccountType.PRIVATE_CLIENT_BROKER) {
      const profile: Record<string, any> = user.privateClientProfile || {};

      if (dto.homeAddress !== undefined) {
        profile.homeAddress = dto.homeAddress.trim();
        updated = true;
      }

      if (dto.passportNumber !== undefined) {
        profile.passportNumber = dto.passportNumber.trim();
        updated = true;
      }

      if (dto.preferredAirport !== undefined) {
        profile.preferredAirport = dto.preferredAirport.trim();
        updated = true;
      }

      if (dto.dateOfBirth !== undefined) {
        profile.dateOfBirth = new Date(dto.dateOfBirth);
        updated = true;
      }

      user.privateClientProfile = profile;
    }

    if (
      (dto.homeAddress ||
        dto.passportNumber ||
        dto.preferredAirport ||
        dto.dateOfBirth) &&
      user.accountType !== UserAccountType.PRIVATE_CLIENT_BROKER
    ) {
      throw new BadRequestException(
        'Private client profile data is not allowed for this account type',
      );
    }

    if (user.accountType === UserAccountType.OPERATOR) {
      const profile: Record<string, any> = user.operatorProfile || {};

      if (dto.companyName !== undefined) {
        profile.companyName = dto.companyName.trim();
        updated = true;
      }

      if (dto.businessAddress !== undefined) {
        profile.businessAddress = dto.businessAddress.trim();
        updated = true;
      }

      if (dto.aocNumber !== undefined) {
        profile.aocNumber = dto.aocNumber.trim();
        updated = true;
      }

      if (dto.primaryBaseIcao !== undefined) {
        profile.primaryBaseIcao = dto.primaryBaseIcao.trim();
        updated = true;
      }

      user.operatorProfile = profile;
    }

    if (
      (dto.companyName ||
        dto.businessAddress ||
        dto.aocNumber ||
        dto.primaryBaseIcao) &&
      user.accountType !== UserAccountType.OPERATOR
    ) {
      throw new BadRequestException(
        'Operator profile data is not allowed for this account type',
      );
    }

    if (user.accountType === UserAccountType.ENGINEER_CREW) {
      const profile: Record<string, any> = user.engineerCrewProfile || {};

      if (dto.specialty !== undefined) {
        profile.specialty = dto.specialty.trim();
        updated = true;
      }

      if (dto.yearsOfExperience !== undefined) {
        profile.yearsOfExperience = dto.yearsOfExperience;
        updated = true;
      }

      if (dto.licenseCertificationId !== undefined) {
        profile.licenseCertificationId = dto.licenseCertificationId.trim();
        updated = true;
      }

      if (dto.languagesSpoken !== undefined) {
        profile.languagesSpoken = dto.languagesSpoken.trim();
        updated = true;
      }

      user.engineerCrewProfile = profile;
    }

    if (
      (dto.specialty ||
        dto.yearsOfExperience !== undefined ||
        dto.licenseCertificationId ||
        dto.languagesSpoken) &&
      user.accountType !== UserAccountType.ENGINEER_CREW
    ) {
      throw new BadRequestException(
        'Engineer crew profile data is not allowed for this account type',
      );
    }

    if (user.accountType === UserAccountType.HBU_PARTNER) {
      const profile: Record<string, any> = user.hbuPartnerProfile || {};

      if (dto.hbuCompanyName !== undefined) {
        profile.companyName = dto.hbuCompanyName.trim();
        updated = true;
      }

      if (dto.HBU !== undefined) {
        profile.HBU = dto.HBU.trim();
        updated = true;
      }

      user.hbuPartnerProfile = profile;
    }

    if (
      (dto.hbuCompanyName || dto.HBU) &&
      user.accountType !== UserAccountType.HBU_PARTNER
    ) {
      throw new BadRequestException(
        'HBU partner profile data is not allowed for this account type',
      );
    }

    if (!updated) {
      throw new BadRequestException('No valid fields provided for update.');
    }

    await user.save();

    await this.onboardingService.syncOnboardingCompletionFlagsForUserId(
      user._id.toString(),
    );

    return { message: 'Profile updated successfully.' };
  }
}
