import { useEffect, useState } from 'react';
import { errorMessage } from '@/data/errors';
import { getRecordRepository } from '@/data/repositories';
import type { MedicalRecord } from '@/types';

export type RecordFileState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      url: string;
      fileName: string;
      mimeType: string;
      size: number;
    }
  | { status: 'missing' }
  | { status: 'error'; message: string };

/**
 * Fetch the stored blob for a record and expose a temporary object URL.
 * The URL is revoked when the record changes or the component unmounts.
 */
export function useRecordFile(
  userId: string | null,
  record: MedicalRecord | null,
): RecordFileState {
  const [state, setState] = useState<RecordFileState>({ status: 'idle' });
  const recordId = record?.id ?? null;
  const hasFile = record?.hasFile ?? false;

  useEffect(() => {
    if (!userId || !recordId || !hasFile) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const stored = await getRecordRepository().getFile(userId, recordId);
        if (cancelled) return;
        if (!stored) {
          setState({ status: 'missing' });
          return;
        }
        objectUrl = URL.createObjectURL(stored.blob);
        setState({
          status: 'ready',
          url: objectUrl,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          size: stored.size,
        });
      } catch (caught) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: errorMessage(caught, 'Could not open the original file.'),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, recordId, hasFile]);

  return state;
}
