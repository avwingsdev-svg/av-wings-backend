/**
 * Email is sent via Resend (https://resend.com). Set these in your environment (do not commit secrets).
 *
 * - RESEND_API_KEY: API key (e.g. re_...)
 * - EMAIL_FROM: Verified sender, e.g. "AV Wings <onboarding@yourdomain.com>"
 * - EMAIL_APP_NAME: Optional display name in templates (defaults to "AV Wings")
 * - PASSWORD_RESET_REDIRECT_URL: Frontend URL for reset (e.g. https://app.example.com/reset-password); a `token` query param is appended
 * - PASSWORD_RESET_TTL_MS: Optional link lifetime in ms (default 3600000 = 1 hour)
 */

export function loadEmailProviderEnv() {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    appName: process.env.EMAIL_APP_NAME ?? 'AV Wings',
  };
}
