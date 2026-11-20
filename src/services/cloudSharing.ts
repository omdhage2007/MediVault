import type { RecordCategory } from '@/types';
import type { PublicShareRecord, PublicShareView } from './shareResolver';
import { supabase } from './supabase';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readCategory(value: unknown): RecordCategory {
  switch (value) {
    case 'Prescriptions':
      return 'Prescriptions';
    case 'Blood Reports':
      return 'Blood Reports';
    case 'X-Ray Reports':
      return 'X-Ray Reports';
    case 'Scans':
      return 'Scans';
    case 'Consultation Records':
      return 'Consultation Records';
    default:
      return 'Other Documents';
  }
}

function readStatus(value: unknown): PublicShareView['status'] {
  switch (value) {
    case 'active':
      return 'active';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    default:
      return 'invalid';
  }
}

function parseRecords(value: unknown): PublicShareRecord[] {
  if (!Array.isArray(value)) return [];
  const records: PublicShareRecord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const id = text(row.id);
    const title = text(row.title);
    if (!id || !title) continue;
    records.push({
      id,
      title,
      category: readCategory(row.category),
      doctorName: text(row.doctorName),
      hospital: text(row.hospital),
      visitDate: text(row.visitDate),
      fileName: text(row.fileName),
      mimeType: text(row.mimeType),
      previewUrl: text(row.fileUrl) || null,
    });
  }
  return records;
}

export async function resolveCloudShare(token: string): Promise<PublicShareView> {
  if (!supabase) throw new Error('Supabase is not configured for this build.');

  const { data, error } = await supabase.functions.invoke('resolve-share', {
    body: { token },
  });

  if (error) {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'The share link could not be checked.';
    throw new Error(message);
  }

  if (!data || typeof data !== 'object') {
    return { status: 'invalid', expiresAt: null, records: [], mode: 'cloud' };
  }

  const payload = data as Record<string, unknown>;
  return {
    status: readStatus(payload.status),
    expiresAt: text(payload.expiresAt) || null,
    records: parseRecords(payload.records),
    mode: 'cloud',
  };
}
