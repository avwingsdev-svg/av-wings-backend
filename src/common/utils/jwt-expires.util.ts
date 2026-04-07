/**
 * Parses JWT_ACCESS_EXPIRES values like "15m", "1h", "900", or "900s" into seconds.
 */
export function parseJwtExpiresToSeconds(
  value: string | undefined,
): number | null {
  const raw = (value ?? '15m').trim();
  const num = parseInt(raw, 10);
  if (/^\d+$/.test(raw)) {
    return num;
  }
  const m = raw.match(/^(\d+)([smhd])$/i);
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return null;
  }
}

export function getJwtAccessExpiresSeconds(): number {
  const parsed = parseJwtExpiresToSeconds(process.env.JWT_ACCESS_EXPIRES);
  return parsed ?? 900;
}
