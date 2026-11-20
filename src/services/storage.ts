import { requireSupabase, STORAGE_BUCKET } from './supabase';

/**
 * Private Supabase Storage for medical documents.
 * Bucket `medical-documents` must be private; files are only reachable
 * through signed URLs generated here (1 hour expiry).
 */

export async function uploadDocument(userId: string, file: File): Promise<string> {
  const client = requireSupabase();
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(path: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

/** Accept only the document types MediVault supports. */
export function isSupportedFile(file: File): boolean {
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
}
