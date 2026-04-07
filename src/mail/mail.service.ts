import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { loadEmailProviderEnv } from './email-provider.config';
import { signupOtpEmailContent } from './templates/signup-otp.template';
import { passwordResetLinkEmailContent } from './templates/password-reset-link.template';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendSignupOtp(to: string, otp: string): Promise<void> {
    const env = loadEmailProviderEnv();
    const { subject, html } = signupOtpEmailContent(env.appName, otp);
    await this.sendResend(to, subject, html, env);
  }



  async sendPasswordResetLink(to: string, resetLink: string): Promise<void> {
    const env = loadEmailProviderEnv();
    const { subject, html } = passwordResetLinkEmailContent(env.appName, resetLink);
    await this.sendResend(to, subject, html, env);
  }

  private async sendResend(
    to: string,
    subject: string,
    html: string,
    env = loadEmailProviderEnv(),
  ): Promise<void> {
    if (!env.resendApiKey?.trim()) {
      this.logger.error(
        'RESEND_API_KEY is not set; cannot send email. Configure Resend in your environment.',
      );
      throw new ServiceUnavailableException(
        'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.',
      );
    }
    if (!env.emailFrom?.trim()) {
      throw new ServiceUnavailableException(
        'Email sender is not configured. Set EMAIL_FROM.',
      );
    }

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom.trim(),
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Resend API error ${res.status}: ${text}`);
      throw new ServiceUnavailableException('Failed to send email.');
    }
  }
}
