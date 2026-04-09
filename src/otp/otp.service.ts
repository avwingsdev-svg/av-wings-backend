import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Otp } from '../schema/Otp.schema';
import { generateOtp } from '../common/utils/otp.util';

const OTP_SALT_ROUNDS = 10;
/** Signup / password-setup codes remain valid for 10 minutes. */
const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Stores only bcrypt hashes of 4-digit codes; issuing a new code invalidates prior unused rows
 * for the same email so replay of an old OTP fails.
 */
@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private readonly otpModel: Model<Otp>) {}

  /**
   * Creates a new OTP for the given email, marks any previous unused OTPs as consumed, and
   * returns the plaintext code once for sending by email (never stored in plain form).
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

  /**
   * Accepts exactly four digits, compares against the newest non-expired unconsumed record,
   * then marks that record consumed so the same code cannot succeed twice.
   */
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
