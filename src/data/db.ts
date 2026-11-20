import { RepositoryError, toRepositoryError } from './errors';

export const DB_NAME = 'medivault-local';
export const DB_VERSION = 1;

export const RECORDS_STORE = 'records';
export const FILES_STORE = 'files';
export const SHARES_STORE = 'shares';
export const META_STORE = 'meta';

let databasePromise: Promise<IDBDatabase> | null = null;

function createSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(RECORDS_STORE)) {
    const records = db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
    records.createIndex('userId', 'userId');
    records.createIndex('userId_hash', ['userId', 'fileHash']);
    records.createIndex('userId_visitDate', ['userId', 'visitDate']);
  }

  if (!db.objectStoreNames.contains(FILES_STORE)) {
    const files = db.createObjectStore(FILES_STORE, { keyPath: 'recordId' });
    files.createIndex('userId', 'userId');
  }

  if (!db.objectStoreNames.contains(SHARES_STORE)) {
    const shares = db.createObjectStore(SHARES_STORE, { keyPath: 'id' });
    shares.createIndex('userId', 'userId');
    shares.createIndex('token', 'token', { unique: true });
  }

  if (!db.objectStoreNames.contains(META_STORE)) {
    db.createObjectStore(META_STORE, { keyPath: 'key' });
  }
}

/** Open (and if needed create) the local database. Cached for the session. */
export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(
        new RepositoryError(
          'This browser does not support IndexedDB, so MediVault cannot store records locally.',
        ),
      );
      return;
    }

    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      databasePromise = null;
      reject(toRepositoryError(error, 'Could not open the local MediVault database.'));
    };

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      fail(error);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        createSchema(request.result);
      } catch (error) {
        fail(error);
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () =>
      fail(request.error ?? new Error('The local database could not be opened.'));
    request.onblocked = () =>
      fail(
        new Error(
          'The local database is blocked by another MediVault tab. Close other tabs and try again.',
        ),
      );
  });

  return databasePromise;
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('A local database request failed.'));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('A local database transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('A local database transaction was aborted.'));
  });
}

export function newId(): string {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
