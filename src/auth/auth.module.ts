import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schema/User.schema';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OnboardingController } from '../onboarding/onboarding.controller';
import { OnboardingService } from '../onboarding/onboarding.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    OtpModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'development-only-set-JWT_SECRET',
        signOptions: {
          expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
        } as SignOptions,
      }),
    }),
  ],
  controllers: [AuthController, OnboardingController],
  providers: [AuthService, JwtStrategy, OnboardingService],
  exports: [AuthService],
})
export class AuthModule {}
