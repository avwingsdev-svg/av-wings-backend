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
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>You requested to reset your password for ${escapeHtml(appName)}.</p>
  <p><a href="${safeLink}" style="color: #2563eb;">Reset your password</a></p>
  <p style="word-break: break-all; font-size: 12px; color: #555;">If the button does not work, copy this link into your browser:<br />${safeLink}</p>
  <p>This link expires after a limited time. If you did not request this, you can ignore this email.</p>
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
