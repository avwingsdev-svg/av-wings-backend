export function passwordSetupOtpEmailContent(
  appName: string,
  otp: string,
): { subject: string; html: string } {
  const subject = `Your ${appName} password setup code`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial; padding:20px;">
  <p>You requested a code to set your password for ${escapeHtml(appName)}.</p>
  <p>Your verification code is:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${escapeHtml(otp)}</p>
  <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
</body>
</html>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


