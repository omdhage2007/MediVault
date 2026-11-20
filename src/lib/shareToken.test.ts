import { describe, expect, it } from 'vitest';
import { isValidShareToken, resolveShareStatus } from './shareToken';

const DAY = 86_400_000;
const now = Date.parse('2026-11-20T12:00:00.000Z');

describe('isValidShareToken', () => {
  it('accepts 48-character hex and 43-character base64url tokens', () => {
    expect(isValidShareToken('a'.repeat(48))).toBe(true);
    expect(isValidShareToken('A_b-C9'.repeat(7) + 'abc')).toBe(true);
  });

  it('rejects empty, short, spaced and non-string tokens', () => {
    expect(isValidShareToken('')).toBe(false);
    expect(isValidShareToken('short')).toBe(false);
    expect(isValidShareToken('a'.repeat(40) + ' ')).toBe(false);
    expect(isValidShareToken(null)).toBe(false);
    expect(isValidShareToken(42)).toBe(false);
  });
});

describe('resolveShareStatus', () => {
  it('is active before expiry', () => {
    expect(resolveShareStatus(new Date(now + DAY).toISOString(), null, now)).toBe('active');
  });

  it('is expired at or after expiry', () => {
    expect(resolveShareStatus(new Date(now).toISOString(), null, now)).toBe('expired');
    expect(resolveShareStatus(new Date(now - DAY).toISOString(), null, now)).toBe('expired');
  });

  it('treats revocation as final even before expiry', () => {
    expect(
      resolveShareStatus(new Date(now + DAY).toISOString(), new Date(now).toISOString(), now),
    ).toBe('revoked');
  });

  it('treats an unparseable expiry as expired', () => {
    expect(resolveShareStatus('not-a-date', null, now)).toBe('expired');
  });
});
