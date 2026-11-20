import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/token.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BUCKET = 'medical-documents';
// Keep the exposure window short. Revocation blocks new resolutions immediately;
// an already-issued URL remains valid until this short expiry.
const SIGNED_URL_SECONDS = 60;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await request.json().catch(() => null);
    const token: unknown = body?.token;
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
      return json({ status: 'invalid', expiresAt: null, records: [] });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const tokenHash = await sha256Hex(token);
    const { data: share, error: shareError } = await admin
      .from('shared_records')
      .select('id, expires_at, revoked_at')
      .eq('share_token_hash', tokenHash)
      .maybeSingle();

    if (shareError) return json({ error: 'Could not check this link.' }, 500);
    if (!share) return json({ status: 'invalid', expiresAt: null, records: [] });

    if (share.revoked_at) {
      return json({ status: 'revoked', expiresAt: share.expires_at, records: [] });
    }
    if (new Date(share.expires_at).getTime() <= Date.now()) {
      return json({ status: 'expired', expiresAt: share.expires_at, records: [] });
    }

    const { data: items, error: itemsError } = await admin
      .from('shared_record_items')
      .select('record_id')
      .eq('share_id', share.id);
    if (itemsError) return json({ error: 'Could not load the shared documents.' }, 500);

    const recordIds = (items ?? [])
      .map((item) => item.record_id)
      .filter((id): id is string => typeof id === 'string');
    if (recordIds.length === 0) {
      return json({ status: 'active', expiresAt: share.expires_at, records: [] });
    }

    const { data: records, error: recordsError } = await admin
      .from('medical_records')
      .select('id, title, document_type, doctor_name, hospital_name, record_date, file_name, file_type, file_path')
      .in('id', recordIds);
    if (recordsError) return json({ error: 'Could not load the shared documents.' }, 500);

    const paths = (records ?? [])
      .map((record) => record.file_path)
      .filter((path): path is string => typeof path === 'string' && path.length > 0);

    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed, error: signedError } = await admin.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      if (signedError) return json({ error: 'Could not prepare document previews.' }, 500);
      for (const entry of signed ?? []) {
        if (entry.signedUrl && entry.path) signedByPath.set(entry.path, entry.signedUrl);
      }
    }

    const payload = (records ?? []).map((record) => ({
      id: record.id,
      title: record.title,
      category: record.document_type,
      doctorName: record.doctor_name ?? '',
      hospital: record.hospital_name ?? '',
      visitDate: record.record_date ?? '',
      fileName: record.file_name ?? '',
      mimeType: record.file_type ?? '',
      fileUrl: signedByPath.get(record.file_path ?? '') ?? null,
    }));

    return json({ status: 'active', expiresAt: share.expires_at, records: payload });
  } catch {
    return json({ error: 'Unexpected server error.' }, 500);
  }
});
