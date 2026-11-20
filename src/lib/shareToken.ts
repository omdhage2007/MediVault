import type { ShareLink } from '@/types';

/**
 * Share tokens are URL-safe random strings. Local demo tokens are 48 hex
 * characters; Edge Function tokens are 43 base64url characters.
 */
export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(token);
}

/** Revocation takes priority over expiry; anything past its expiry is expired. */
export function resolveShareStatus(
  expiresAt: string,
  revokedAt: string | null,
  now = Date.now(),
): ShareLink['status'] {
  if (revokedAt) return 'revoked';
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) return 'expired';
  return 'active';
}
