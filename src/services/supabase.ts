import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client. Only public client credentials belong here.
 * `VITE_SUPABASE_PUBLISHABLE_KEY` is the current name; `VITE_SUPABASE_ANON_KEY`
 * is kept as a fallback for older environments. The service-role key must
 * never appear in a VITE_ variable.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && publicKey);

export const googleAuthEnabled =
  String(import.meta.env.VITE_ENABLE_GOOGLE_AUTH ?? '').toLowerCase() === 'true';

export const supabase: SupabaseClient | null =
  url && publicKey
    ? createClient(url, publicKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}

export const TABLES = {
  profiles: 'profiles',
  medicalRecords: 'medical_records',
  extractedData: 'extracted_data',
  sharedRecords: 'shared_records',
  sharedRecordItems: 'shared_record_items',
} as const;

/** Private bucket for medical documents. Never make this public. */
export const STORAGE_BUCKET = 'medical-documents';

/** Profile photos only — never medical documents. */
export const AVATARS_BUCKET = 'avatars';
