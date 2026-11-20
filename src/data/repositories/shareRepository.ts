import type { ShareLink } from '@/types';

/**
 * Browser-local demo sharing. These records never leave IndexedDB and the
 * token grants no access on another device.
 * Phase 6 will replace this with server-validated, hash-stored tokens.
 */
export interface ShareRepository {
  list(userId: string): Promise<ShareLink[]>;
  create(userId: string, recordIds: string[], expiresAt: string): Promise<ShareLink>;
  revoke(userId: string, id: string): Promise<void>;
  findByToken(token: string): Promise<ShareLink | null>;
}
