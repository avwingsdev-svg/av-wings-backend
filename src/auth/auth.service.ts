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

/// Core authentication logic for registration, sessions, password reset, and onboarding account types.
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}


  // Registers a new user by creating the account with unverified email, issuing an OTP, and emailing that OTP for verification before login is allowed.
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

// Verifies the OTP and marks the email as verified so the user can log in; OTP must be valid and unused.
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

    return { message: 'Email verified' };
  }

 // Resends a new OTP for email verification if the account exists and is not yet verified; always returns the same generic message to avoid enumeration.
  async resendSignupOtp(dto: EmailBodyDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    console.log("user data", user);
    const generic = {
      message: 'If an unverified account exists with this email, a new verification code was sent.',
    };

    if (!user || user.isEmailVerified) {
      console.log("print generic", generic);
      return generic;
    }


    const otp = await this.otpService.issueOtp(user.email);
    await this.mailService.sendSignupOtp(user.email, otp);
    return generic;
  }

// Logins by verifying email and password, then issues JWT access and opaque refresh tokens (the latter stored hashed in the DB for later verification).
  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    email: string;
    accountType: UserAccountType | undefined;
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
      throw new UnauthorizedException('Invalid email or password.')
    }


    return {
      email: user.email,
      accountType: user.accountType,
      ...(await this.issueTokens(user)),
    };
  }

// Rotates session by verifying the presented refresh token against the bcrypt hash stored on the user; email in the body ties the opaque token to the correct account.
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

  // Clears the stored refresh token hash so the presented token can no longer be used, effectively logging out all sessions for the user.
  async logout(userId: string): Promise<{ message: string }> {
    await this.userModel
      .findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } })
      .exec();
    return { message: 'Logged out.' };
  }

  // Returns the available account types for onboarding; currently static but could be dynamic in the future.
  getAccountTypes() {
    return { accountTypes: ACCOUNT_TYPE_OPTIONS };
  }

// Updates the user’s account type selection for onboarding; no validation beyond existence since frontend controls options.
  async chooseAccountType(
    userId: string,
    dto: ChooseAccountTypeDto,
  ): Promise<{ message: string; accountType: UserAccountType }> {
    const user = await this.userModel.findById(userId).exec();
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

// Initiates the forgot password flow by generating a password reset token, saving its hash and expiry on the user, and emailing a link with the plaintext token as a query param.
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
    console.log("Generated password reset token", token); // Log the token for debugging; remove in production
    user.passwordResetTokenHash = await bcrypt.hash(secret, 10);
    user.passwordResetExpires = new Date(Date.now() + getPasswordResetTtlMs());
    await user.save();

    resetUrl.searchParams.set('token', token);
    await this.mailService.sendPasswordResetLink(email, resetUrl.toString());

    return generic;
  }

// Completes the password reset by verifying the token, then updating the password and clearing reset-related fields so the link cannot be reused.
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

// Helper to issue a new access token and refresh token pair for a user; refresh token is stored hashed on the user for later verification, while the plaintext is returned for client use.
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
    return user;
  }
  }
