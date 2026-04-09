import { randomBytes } from 'crypto';

const SECRET_BYTES = 32;

/** High-entropy secret later bcrypt-hashed on the user; only the plaintext travels in the email link. */
export function createPasswordResetSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

/** Opaque mail token: base64url(userId:secret) so the client needs only one query param. */
export function encodePasswordResetToken(
  userId: string,
  secret: string,
): string {
  return Buffer.from(`${userId}:${secret}`, 'utf8').toString('base64url');
}

/** Env override in ms; defaults to one hour when unset or invalid. */
export function getPasswordResetTtlMs(): number {
  const raw = process.env.PASSWORD_RESET_TTL_MS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }
  return 60 * 60 * 1000;
}

/** Returns null on malformed base64 or missing delimiter so auth can respond with a single error. */
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
