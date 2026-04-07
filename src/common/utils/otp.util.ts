import { randomInt } from 'crypto';

/**
 * Generates a cryptographically suitable 4-digit OTP (1000–9999).
 */
export function generateOtp(): string {
  return String(randomInt(1000, 10000));
}
