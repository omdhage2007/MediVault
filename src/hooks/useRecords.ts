import { useCallback, useEffect, useState } from 'react';
import { ensureDemoSeed } from '@/data/demoSeed';
import { DEMO_PROFILE_ID } from '@/data/sampleData';
import { errorMessage } from '@/data/errors';
import { getRecordRepository } from '@/data/repositories';
import type { RecordPatch } from '@/data/repositories/recordRepository';
import type { ExtractedData, MedicalRecord, RecordCategory } from '@/types';

export interface NewRecordDetails {
  title: string;
  category: RecordCategory;
  doctorName: string;
  hospital: string;
  visitDate: string;
  notes: string;
  extracted: ExtractedData;
}

/**
 * Single entry point for record data. Pages never touch IndexedDB directly.
 * Load errors are surfaced in `error`; operation errors are thrown so the
 * caller can show a toast and keep the form open.
 */
export function useRecords(userId: string | null) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      // Demonstration samples belong only to the browser-local demo identity.
      if (userId === DEMO_PROFILE_ID) await ensureDemoSeed(userId);
      const rows = await getRecordRepository().list(userId);
      setRecords(rows);
      setError(null);
    } catch (caught) {
      // Never fall back to sample data here: an error must be visible.
      setRecords([]);
      setError(errorMessage(caught, 'Could not load your records from this browser.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createRecord = useCallback(
    async (details: NewRecordDetails, file: File, hash: string): Promise<MedicalRecord> => {
      if (!userId) throw new Error('Sign in before uploading a document.');
      const repository = getRecordRepository();

      const record = await repository.create(userId, {
        ...details,
        fileName: file.name,
        fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
        mimeType: file.type,
        fileHash: hash,
        hasFile: true,
        isSample: false,
      });

      try {
        await repository.saveFile(userId, record.id, file, hash);
      } catch (caught) {
        // Roll back the metadata row so a half-saved record cannot linger.
        await repository.remove(userId, record.id).catch(() => undefined);
        throw caught;
      }

      // Re-read so cloud rows include the stored file path/hash.
      const stored = (await repository.get(userId, record.id)) ?? record;
      setRecords((previous) =>
        [stored, ...previous].sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
      );
      return stored;
    },
    [userId],
  );

  const updateRecord = useCallback(
    async (id: string, patch: RecordPatch): Promise<MedicalRecord> => {
      if (!userId) throw new Error('Sign in first.');
      const updated = await getRecordRepository().update(userId, id, patch);
      setRecords((previous) => previous.map((record) => (record.id === id ? updated : record)));
      return updated;
    },
    [userId],
  );

  const deleteRecord = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) throw new Error('Sign in first.');
      await getRecordRepository().remove(userId, id);
      setRecords((previous) => previous.filter((record) => record.id !== id));
    },
    [userId],
  );

  const findByHash = useCallback(
    async (hash: string): Promise<MedicalRecord[]> => {
      if (!userId) return [];
      return getRecordRepository().findByHash(userId, hash);
    },
    [userId],
  );

  return {
    records,
    loading,
    error,
    refresh: load,
    createRecord,
    updateRecord,
    deleteRecord,
    findByHash,
  };
}
