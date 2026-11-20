import type { ShareLink } from '@/types';
import { resolveShareStatus } from '@/lib/shareToken';
import { SHARES_STORE, newId, newToken, openDatabase, requestResult, transactionDone } from '../db';
import { RepositoryError, toRepositoryError } from '../errors';
import type { ShareRepository } from './shareRepository';

interface StoredShare {
  id: string;
  userId: string;
  token: string;
  recordIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

function isStoredShare(value: unknown): value is StoredShare {
  if (!value || typeof value !== 'object') return false;
  const share = value as Record<string, unknown>;
  return (
    typeof share.id === 'string' &&
    typeof share.userId === 'string' &&
    typeof share.token === 'string' &&
    Array.isArray(share.recordIds) &&
    share.recordIds.every((id) => typeof id === 'string') &&
    typeof share.expiresAt === 'string' &&
    (share.revokedAt === null || typeof share.revokedAt === 'string') &&
    typeof share.createdAt === 'string'
  );
}

function withComputedStatus(share: StoredShare): ShareLink {
  return { ...share, status: resolveShareStatus(share.expiresAt, share.revokedAt) };
}

class LocalShareRepository implements ShareRepository {
  async list(userId: string): Promise<ShareLink[]> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(SHARES_STORE, 'readonly');
      const index = transaction.objectStore(SHARES_STORE).index('userId');
      const rows = await requestResult<unknown[]>(index.getAll(userId));
      await transactionDone(transaction);

      return rows
        .filter(isStoredShare)
        .filter((share) => share.userId === userId)
        .map(withComputedStatus)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      throw toRepositoryError(error, 'Could not load your local demo shares.');
    }
  }

  async create(userId: string, recordIds: string[], expiresAt: string): Promise<ShareLink> {
    try {
      if (recordIds.length === 0) {
        throw new RepositoryError('Select at least one document to share.');
      }
      const stored: StoredShare = {
        id: newId(),
        userId,
        token: newToken(),
        recordIds: [...new Set(recordIds)],
        expiresAt,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      };

      const db = await openDatabase();
      const transaction = db.transaction(SHARES_STORE, 'readwrite');
      await requestResult(transaction.objectStore(SHARES_STORE).add(stored));
      await transactionDone(transaction);

      return withComputedStatus(stored);
    } catch (error) {
      throw toRepositoryError(error, 'Could not create the local demo share.');
    }
  }

  async revoke(userId: string, id: string): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(SHARES_STORE, 'readwrite');
      const store = transaction.objectStore(SHARES_STORE);
      const existing = await requestResult<unknown>(store.get(id));

      if (!isStoredShare(existing) || existing.userId !== userId) {
        throw new RepositoryError('That local demo share no longer exists.');
      }
      if (existing.revokedAt) {
        await transactionDone(transaction);
        return;
      }

      await requestResult(store.put({ ...existing, revokedAt: new Date().toISOString() }));
      await transactionDone(transaction);
    } catch (error) {
      throw toRepositoryError(error, 'Could not remove that local demo share.');
    }
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    try {
      if (!token) return null;
      const db = await openDatabase();
      const transaction = db.transaction(SHARES_STORE, 'readonly');
      const index = transaction.objectStore(SHARES_STORE).index('token');
      const row = await requestResult<unknown>(index.get(token));
      await transactionDone(transaction);

      if (!isStoredShare(row)) return null;
      return withComputedStatus(row);
    } catch (error) {
      throw toRepositoryError(error, 'Could not open that local demo share.');
    }
  }
}

export const localShareRepository: ShareRepository = new LocalShareRepository();
