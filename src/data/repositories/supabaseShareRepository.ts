import type { ShareLink } from '@/types';
import { resolveShareStatus } from '@/lib/shareToken';
import { resolveCloudShare } from '@/services/cloudSharing';
import { requireSupabase, TABLES } from '@/services/supabase';
import { RepositoryError, toRepositoryError } from '../errors';
import type { ShareRepository } from './shareRepository';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapShareRow(value: unknown, userId: string): ShareLink | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const expiresAt = text(row.expires_at);
  const createdAt = text(row.created_at);
  if (!id || !expiresAt) return null;

  const revokedAt = text(row.revoked_at) || null;
  const items = Array.isArray(row.shared_record_items) ? row.shared_record_items : [];
  const recordIds = items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const recordId = text((item as Record<string, unknown>).record_id);
    return recordId ? [recordId] : [];
  });

  return {
    id,
    userId,
    // Raw tokens are never stored, so historical shares cannot rebuild a link.
    token: '',
    recordIds,
    expiresAt,
    revokedAt,
    status: resolveShareStatus(expiresAt, revokedAt),
    createdAt,
  };
}

class SupabaseShareRepository implements ShareRepository {
  list(userId: string): Promise<ShareLink[]> {
    return (async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from(TABLES.sharedRecords)
          .select('id, expires_at, revoked_at, created_at, shared_record_items(record_id)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw new RepositoryError('Could not load your share history.');

        if (!Array.isArray(data)) return [];
        return data
          .map((row) => mapShareRow(row, userId))
          .filter((share): share is ShareLink => Boolean(share));
      } catch (error) {
        throw toRepositoryError(error, 'Could not load your share history.');
      }
    })();
  }

  async create(userId: string, recordIds: string[], expiresAt: string): Promise<ShareLink> {
    try {
      const client = requireSupabase();
      const { data, error } = await client.functions.invoke('create-share', {
        body: { recordIds, expiresAt },
      });
      if (error) {
        throw new RepositoryError(
          'Could not create the share link. Check that the sharing function is deployed.',
        );
      }
      if (!data || typeof data !== 'object') {
        throw new RepositoryError('The sharing function returned an unexpected response.');
      }
      const payload = data as Record<string, unknown>;
      const id = text(payload.id);
      const token = text(payload.token);
      if (!id || !token) {
        throw new RepositoryError('The sharing function did not return a usable link.');
      }

      return {
        id,
        userId,
        token,
        recordIds: [...recordIds],
        expiresAt: text(payload.expiresAt) || expiresAt,
        revokedAt: null,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw toRepositoryError(error, 'Could not create the share link.');
    }
  }

  async revoke(_userId: string, id: string): Promise<void> {
    try {
      const client = requireSupabase();
      const { error } = await client.functions.invoke('revoke-share', {
        body: { shareId: id },
      });
      if (error) {
        throw new RepositoryError('Could not revoke the share. Try again.');
      }
    } catch (error) {
      throw toRepositoryError(error, 'Could not revoke the share.');
    }
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const view = await resolveCloudShare(token);
    if (view.status === 'invalid') return null;
    return {
      id: 'resolved',
      userId: '',
      token,
      recordIds: view.records.map((record) => record.id),
      expiresAt: view.expiresAt ?? '',
      revokedAt: view.status === 'revoked' ? new Date().toISOString() : null,
      status: view.status,
      createdAt: '',
    };
  }
}

export const supabaseShareRepository: ShareRepository = new SupabaseShareRepository();
