import { randomBytes } from 'crypto';

const SECRET_BYTES = 32;

export function createPasswordResetSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

export function encodePasswordResetToken(
  userId: string,
  secret: string,
): string {
  return Buffer.from(`${userId}:${secret}`, 'utf8').toString('base64url');
}

export function getPasswordResetTtlMs(): number {
  const raw = process.env.PASSWORD_RESET_TTL_MS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }
  return 60 * 60 * 1000;
}

export function decodePasswordResetToken(
  token: string,
): { userId: string; secret: string } | null {
  try {
    const raw = Buffer.from(token.trim(), 'base64url').toString('utf8');
    const idx = raw.indexOf(':');
    if (idx === -1) {
      return null;
    }
    const userId = raw.slice(0, idx);
    const secret = raw.slice(idx + 1);
    if (!userId || !secret) {
      return null;
    }
    return { userId, secret };
  } catch {
    return null;
  }
}
