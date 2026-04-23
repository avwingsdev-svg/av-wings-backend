export function passwordResetLinkEmailContent(
  appName: string,
  resetLink: string,
): { subject: string; html: string } {
  const subject = `Reset your ${appName} password`;
  const safeLink = escapeHtml(resetLink);
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial; padding:20px;">
  <p>You requested to reset your password for ${escapeHtml(appName)}.</p>
  <p><a href="${safeLink}" style="color: #2563eb;">Reset your password</a></p>
  <p>This link expires after a limited time. If you did not request this, you can ignore this email.</p>
  <p>We received a request to reset your password.</p>
  <p>If you did not request this, ignore this message.</p>
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



`
<!DOCTYPE html>
<html>
<body style="font-family: Arial; padding:20px;">
  <h2>Password Reset Request</h2>

  <p>Hello {name},</p>
  <p>We received a request to reset your password.</p>

  <p>If you did not request this, ignore this message.</p>
</body>
</html>
`
