import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    const body = await request.json().catch(() => null);
    const shareId: unknown = body?.shareId;
    if (typeof shareId !== 'string' || !shareId) {
      return json({ error: 'A share id is required.' }, 400);
    }

    // RLS scopes this update to shares owned by the authenticated user.
    const { data, error } = await userClient
      .from('shared_records')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('user_id', userData.user.id)
      .select('id');

    if (error) return json({ error: 'Could not revoke the share.' }, 500);
    if (!data || data.length === 0) return json({ error: 'Share not found.' }, 404);

    return json({ revoked: true });
  } catch {
    return json({ error: 'Unexpected server error.' }, 500);
  }
});
