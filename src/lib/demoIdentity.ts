import { DEMO_PROFILE_ID, demoProfile } from '@/data/sampleData';
import { sha256Hex } from './hash';

/**
 * Stable local demo identity: the same email always maps to the same local
 * vault in this browser, so records survive logout and re-entry. No password
 * is stored anywhere.
 */
export async function localProfileIdForEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (normalized === demoProfile.email.toLowerCase()) return DEMO_PROFILE_ID;
  const digest = await sha256Hex(normalized);
  return `local-${digest.slice(0, 16)}`;
}
