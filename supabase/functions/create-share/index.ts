import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import { randomToken, sha256Hex } from '../_shared/token.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const MAX_RECORDS = 50;
const MAX_EXPIRY_DAYS = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized.' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401);
    const user = userData.user;

    const body = await request.json().catch(() => null);
    const rawIds: unknown = body?.recordIds;
    const rawExpiresAt: unknown = body?.expiresAt;
    const recordIds = Array.isArray(rawIds)
      ? [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && UUID_PATTERN.test(id)))]
      : [];
    const expiresAt = typeof rawExpiresAt === 'string' ? new Date(rawExpiresAt) : null;

    if (recordIds.length === 0 || recordIds.length > MAX_RECORDS) {
      return json({ error: 'Select between 1 and 50 documents.' }, 400);
    }
    if (
      !expiresAt ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now() ||
      expiresAt.getTime() > Date.now() + MAX_EXPIRY_DAYS * 86_400_000
    ) {
      return json({ error: 'Choose an expiry between now and 30 days.' }, 400);
    }

    // Ownership is enforced by RLS as well as this explicit count check.
    const { data: owned, error: ownershipError } = await userClient
      .from('medical_records')
      .select('id')
      .eq('user_id', user.id)
      .in('id', recordIds);
    if (ownershipError) return json({ error: 'Could not verify record ownership.' }, 500);
    if (!owned || owned.length !== recordIds.length) {
      return json({ error: 'One or more documents do not belong to you.' }, 403);
    }

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: share, error: shareError } = await admin
      .from('shared_records')
      .insert({
        user_id: user.id,
        share_token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (shareError || !share) return json({ error: 'Could not create the share.' }, 500);

    const { error: itemsError } = await admin.from('shared_record_items').insert(
      recordIds.map((recordId) => ({ share_id: share.id, record_id: recordId })),
    );
    if (itemsError) {
      await admin.from('shared_records').delete().eq('id', share.id);
      return json({ error: 'Could not attach the selected documents.' }, 500);
    }

    return json({
      id: share.id,
      token,
      expiresAt: expiresAt.toISOString(),
      recordIds,
    });
  } catch {
    return json({ error: 'Unexpected server error.' }, 500);
  }
});
