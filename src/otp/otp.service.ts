import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Otp } from '../schema/Otp.schema';
import { generateOtp } from '../common/utils/otp.util';

const OTP_SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private readonly otpModel: Model<Otp>) {}

  /**
   * Creates a new OTP for the given email and purpose, invalidates previous active OTPs, returns the plain code (for mailing only).
   */
  async issueOtp(email: string ): Promise<string> {
    const normalized = email.trim().toLowerCase();
    const plain = generateOtp();
    const codeHash = await bcrypt.hash(plain, OTP_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.otpModel.updateMany(
      { email: normalized, consumed: false },
      { $set: { consumed: true } },
    );

    await this.otpModel.create({
      email: normalized,
      codeHash,
      expiresAt,
      consumed: false,
    });

    return plain;
  }

  async verifyOtp(
    email: string,
    plainCode: string,
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const code = plainCode.trim();
    if (!/^\d{4}$/.test(code)) {
      throw new BadRequestException('Invalid verification code.');
    }

    const record = await this.otpModel
      .findOne({
        email: normalized,
        consumed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!record) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    record.consumed = true;
    await record.save();
  }
}
