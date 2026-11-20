import { DEMO_PROFILE_ID, sampleRecords } from './sampleData';
import { META_STORE, RECORDS_STORE, openDatabase, requestResult, transactionDone } from './db';
import { toRepositoryError } from './errors';

const SEED_VERSION = 'demo-seed-v1';

function seedKey(userId: string): string {
  return `${SEED_VERSION}:${userId}`;
}

/**
 * Insert the bundled demonstration records the first time the demo account
 * opens this browser. A marker in the meta store prevents duplicates on every
 * subsequent load, including after the user deletes the samples.
 */
export async function ensureDemoSeed(userId: string): Promise<void> {
  if (userId !== DEMO_PROFILE_ID) return;

  try {
    const db = await openDatabase();
    const transaction = db.transaction([RECORDS_STORE, META_STORE], 'readwrite');
    const done = transactionDone(transaction);
    const meta = transaction.objectStore(META_STORE);
    const marker = await requestResult<unknown>(meta.get(seedKey(userId)));

    if (marker) {
      await done;
      return;
    }

    const records = transaction.objectStore(RECORDS_STORE);
    for (const sample of sampleRecords) {
      const existing = await requestResult<unknown>(records.get(sample.id));
      if (!existing) {
        await requestResult(records.add({ ...sample, userId }));
      }
    }

    await requestResult(meta.put({ key: seedKey(userId), value: new Date().toISOString() }));
    await done;
  } catch (error) {
    throw toRepositoryError(error, 'Could not prepare the demonstration records in this browser.');
  }
}
