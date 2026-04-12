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


const REFRESH_TOKEN_BYTES = 48;


@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}


  async signup(dto: SignupDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
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
    await this.mailService.sendSignupOtp(email, otp);

    return { message: 'Verification code sent to your email.' };
  }


  async verifySignup(dto: SignupVerifyDto): Promise<{ message: string }> {
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

    return { message: 'Email verified. You can set your password when ready.' };
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
    await this.mailService.sendSignupOtp(email, otp);
    return generic;
  }


  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user?.isPasswordSet || !user.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified.');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueTokens(user);
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
    dto: ChooseAccountTypeDto,
  ): Promise<{ message: string; accountType: UserAccountType }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    user.accountType = dto.accountType;
    await user.save();
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
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return {
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountType: user.accountType,
    };  
  }

 
  // Google OAuth flow: if email exists with non-Google auth, reject; if email exists with Google auth but different Google ID, reject; otherwise create or update user with Google details and issue tokens. This allows seamless linking of Google accounts to existing users who may have signed up with email/password but haven't set a password yet (e.g. signed up with Google but didn't verify email, so they have no password).
  async googleAuth(dto: GoogleAuthDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
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
      return this.issueTokens(existingByEmail);
    }

    const existingByGoogleId = await this.userModel.findOne({ googleId }).exec();
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

    return this.issueTokens(created);
  }
}
