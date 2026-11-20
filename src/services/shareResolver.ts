import { getRecordRepository, getShareRepository } from '@/data/repositories';
import { isValidShareToken } from '@/lib/shareToken';
import { isSupabaseConfigured } from './supabase';
import type { RecordCategory } from '@/types';

export interface PublicShareRecord {
  id: string;
  title: string;
  category: RecordCategory;
  doctorName: string;
  hospital: string;
  visitDate: string;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
}

export interface PublicShareView {
  status: 'active' | 'expired' | 'revoked' | 'invalid';
  expiresAt: string | null;
  records: PublicShareRecord[];
  mode: 'local' | 'cloud';
}

const INVALID: PublicShareView = {
  status: 'invalid',
  expiresAt: null,
  records: [],
  mode: 'local',
};

/**
 * Local demo shares can only be resolved in the browser that created them.
 * When Supabase is configured, the Edge Function performs server-side token
 * validation and returns short-lived signed URLs instead.
 */
export async function resolvePublicShare(token: string): Promise<PublicShareView> {
  if (!isValidShareToken(token)) return INVALID;

  if (isSupabaseConfigured) {
    const { resolveCloudShare } = await import('./cloudSharing');
    return resolveCloudShare(token);
  }

  const share = await getShareRepository().findByToken(token);
  if (!share) return INVALID;
  if (share.status === 'revoked') {
    return { status: 'revoked', expiresAt: share.expiresAt, records: [], mode: 'local' };
  }
  if (share.status === 'expired') {
    return { status: 'expired', expiresAt: share.expiresAt, records: [], mode: 'local' };
  }

  const repository = getRecordRepository();
  const records: PublicShareRecord[] = [];
  for (const id of share.recordIds) {
    const record = await repository.get(share.userId, id);
    if (!record) continue;
    records.push({
      id: record.id,
      title: record.title,
      category: record.category,
      doctorName: record.doctorName,
      hospital: record.hospital,
      visitDate: record.visitDate,
      fileName: record.fileName,
      mimeType: record.mimeType,
      previewUrl: null,
    });
  }

  return { status: 'active', expiresAt: share.expiresAt, records, mode: 'local' };
}
