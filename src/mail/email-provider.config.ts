
export type EmailProviderMode = 'resend' | 'smtp';

function resolveEmailProvider(): EmailProviderMode {
  const v = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (v === 'smtp' || v === 'mailtrap') {
    return 'smtp';
  }
  return 'resend';
}

export function loadEmailProviderEnv() {
  const portRaw = process.env.SMTP_PORT?.trim();
  const smtpPort = portRaw ? Number.parseInt(portRaw, 10) : undefined;

  return {
    provider: resolveEmailProvider(),
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    appName: process.env.EMAIL_APP_NAME,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpPort: smtpPort !== undefined && Number.isFinite(smtpPort) ? smtpPort : undefined,
    smtpSecure: process.env.SMTP_SECURE?.trim().toLowerCase() === 'true',
  };
}

export type EmailProviderEnv = ReturnType<typeof loadEmailProviderEnv>;
