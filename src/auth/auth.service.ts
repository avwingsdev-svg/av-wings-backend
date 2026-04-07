import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { getJwtAccessExpiresSeconds } from '../common/utils/jwt-expires.util';
import { createPasswordResetSecret, decodePasswordResetToken, encodePasswordResetToken, getPasswordResetTtlMs } from 'src/common/utils/password-reset-token.util';


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
    expiresIn: number;
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
    expiresIn: number;
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

  async forgotPassword(dto: EmailBodyDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();
    const generic = {
      message: 'If an account exists with this email, a message was sent.',
    };

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
    expiresIn: number;
  }> {
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshPlain = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const refreshHash = await bcrypt.hash(refreshPlain, 10);
    user.refreshToken = refreshHash;
    await user.save();

    const expiresIn = getJwtAccessExpiresSeconds();

    return {
      accessToken,
      refreshToken: refreshPlain,
      expiresIn, 
    };
  }
}
