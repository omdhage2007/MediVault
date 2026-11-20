import { isSupabaseConfigured } from '@/services/supabase';
import { indexedDbRecordRepository } from './indexedDbRecordRepository';
import { localShareRepository } from './localShareRepository';
import type { RecordRepository } from './recordRepository';
import type { ShareRepository } from './shareRepository';
import { supabaseRecordRepository } from './supabaseRecordRepository';
import { supabaseShareRepository } from './supabaseShareRepository';

/**
 * One switch point for the whole data layer:
 * - Supabase credentials present → authenticated cloud records and shares.
 * - No credentials → clearly labelled browser-local IndexedDB demo mode.
 *
 * The two stores are never mixed: records are partitioned by the active user
 * in IndexedDB and by RLS in Supabase.
 */
export function getRecordRepository(): RecordRepository {
  return isSupabaseConfigured ? supabaseRecordRepository : indexedDbRecordRepository;
}

export function getShareRepository(): ShareRepository {
  return isSupabaseConfigured ? supabaseShareRepository : localShareRepository;
}
