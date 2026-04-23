import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { loadEmailProviderEnv } from './email-provider.config';
import type { EmailProviderEnv } from './email-provider.config';
import { signupEmailContent, signupOtpEmailContent } from './templates/signup-otp.template';
import { passwordResetLinkEmailContent } from './templates/password-reset-link.template';

const RESEND_API_URL = 'https://api.resend.com/emails';

// Sends transactional email via Resend or SMTP (e.g. Mailtrap in development). 
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // Delivers the signup verification code using the shared HTML template and app branding.
  async sendSignupOtp(to: string, otp: string, name: string): Promise<void> {
    const env = loadEmailProviderEnv();
    const { subject, html } = signupOtpEmailContent(
      env.appName ?? 'AV Wings',
      otp,
      name
    );
    await this.deliver(to, subject, html, env);
  }

    async sendSignupMail(to: string, name: string): Promise<void> {
    const env = loadEmailProviderEnv();
    const { subject, html } = signupEmailContent(
      env.appName ?? 'AV Wings',
      name
    );
    await this.deliver(to, subject, html, env);
  }

// Delivers the password reset link using the shared HTML template and app branding. 
  async sendPasswordResetLink(to: string, resetLink: string): Promise<void> {
    const env = loadEmailProviderEnv();
    const { subject, html } = passwordResetLinkEmailContent(
      env.appName ?? 'AV Wings',
      resetLink,
    );
    await this.deliver(to, subject, html, env);
  }

  private async deliver(
    to: string,
    subject: string,
    html: string,
    env: EmailProviderEnv,
  ): Promise<void> {
    if (!env.emailFrom?.trim()) {
      throw new ServiceUnavailableException(
        'Email sender is not configured. Set EMAIL_FROM.',
      );
    }
    const from = env.emailFrom.trim();
    if (env.provider === 'smtp') {
      await this.sendSmtp(to, from, subject, html, env);
      return;
    }
    await this.sendResend(to, from, subject, html, env);
  }

  private async sendResend(
    to: string,
    from: string,
    subject: string,
    html: string,
    env: EmailProviderEnv,
  ): Promise<void> {
    if (!env.resendApiKey?.trim()) {
      this.logger.error(
        'RESEND_API_KEY is not set; cannot send email. Configure Resend or switch to SMTP (e.g. Mailtrap).',
      );
      throw new ServiceUnavailableException(
        'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM, or SMTP_* for development.',
      );
    }

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
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

  private async sendSmtp(
    to: string,
    from: string,
    subject: string,
    html: string,
    env: EmailProviderEnv,
  ): Promise<void> {
    if (!env.smtpHost?.trim() || !env.smtpUser?.trim() || !env.smtpPass?.trim()) {
      this.logger.error(
        'SMTP is selected but SMTP_HOST, SMTP_USER, or SMTP_PASS is missing.',
      );
      throw new ServiceUnavailableException(
        'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.',
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: env.smtpHost.trim(),
      port: env.smtpPort ?? 587,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser.trim(),
        pass: env.smtpPass.trim(),
      },
    });


    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP send failed: ${message}`);
      throw new ServiceUnavailableException('Failed to send email.');
    }
  }
}
