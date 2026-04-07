import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';
import { EmailBodyDto } from './dto/email-body.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
