import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '@/data/errors';
import { getShareRepository } from '@/data/repositories';
import type { ShareLink } from '@/types';

export function useShares(userId: string | null) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setShares([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const rows = await getShareRepository().list(userId);
      setShares(rows);
      setError(null);
    } catch (caught) {
      setShares([]);
      setError(errorMessage(caught, 'Could not load your share history.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createShare = useCallback(
    async (recordIds: string[], expiryDays: number): Promise<ShareLink> => {
      if (!userId) throw new Error('Sign in first.');
      const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();
      const share = await getShareRepository().create(userId, recordIds, expiresAt);
      setShares((previous) => [share, ...previous]);
      return share;
    },
    [userId],
  );

  const revokeShare = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) throw new Error('Sign in first.');
      await getShareRepository().revoke(userId, id);
      setShares((previous) =>
        previous.map((share) =>
          share.id === id
            ? { ...share, revokedAt: new Date().toISOString(), status: 'revoked' }
            : share,
        ),
      );
    },
    [userId],
  );

  const activeCount = useMemo(
    () => shares.filter((share) => share.status === 'active').length,
    [shares],
  );

  return { shares, loading, error, activeCount, refresh: load, createShare, revokeShare };
}
