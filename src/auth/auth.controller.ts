import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';
import { EmailBodyDto } from './dto/email-body.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChooseAccountTypeDto } from './dto/choose-account-type.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

/** HTTP surface for registration, sessions, password reset, and static onboarding account-type options. */
@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('account-types')
  getAccountTypes() {
    return this.authService.getAccountTypes();
  }

  @Patch('onboarding/account-type')
  chooseAccountType(@Body() dto: ChooseAccountTypeDto) {
    return this.authService.chooseAccountType(dto);
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('signup/verify')
  verifySignup(@Body() dto: SignupVerifyDto) {
    return this.authService.verifySignup(dto);
  }

  @Post('signup/resend')
  resendSignupOtp(@Body() dto: EmailBodyDto) {
    return this.authService.resendSignupOtp(dto);
  }



  // @Post('password/setup/resend')
  // resendPasswordSetupOtp(@Body() dto: EmailBodyDto) {
  //   return this.authService.resendPasswordSetupOtp(dto);
  // }

  // @Post('password/setup')
  // setupPassword(@Body() dto: PasswordSetupDto) {
  //   return this.authService.setupPassword(dto);
  // }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refreshToken')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: EmailBodyDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('current-user')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser('userId') userId: string) {
    return this.authService.getCurrentUser(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authService.updateProfile(userId, dto, avatar);
  }

  @Post('google')
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }
}
