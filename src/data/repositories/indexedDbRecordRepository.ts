import type { MedicalRecord } from '@/types';
import {
  FILES_STORE,
  RECORDS_STORE,
  newId,
  openDatabase,
  requestResult,
  transactionDone,
} from '../db';
import { RepositoryError, toRepositoryError } from '../errors';
import { isMedicalRecord, isStoredDocument } from './recordValidation';
import type {
  NewRecordInput,
  RecordPatch,
  RecordRepository,
  StoredDocument,
} from './recordRepository';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Browser-local implementation. Records are partitioned by userId through
 * indexes, and original files live in a separate object store so metadata
 * reads stay small.
 */
class IndexedDbRecordRepository implements RecordRepository {
  async list(userId: string): Promise<MedicalRecord[]> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(RECORDS_STORE, 'readonly');
      const index = transaction.objectStore(RECORDS_STORE).index('userId');
      const rows = await requestResult<unknown[]>(index.getAll(userId));
      await transactionDone(transaction);

      return rows
        .filter(isMedicalRecord)
        .filter((record) => record.userId === userId)
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    } catch (error) {
      throw toRepositoryError(error, 'Could not load your records from this browser.');
    }
  }

  async get(userId: string, id: string): Promise<MedicalRecord | null> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(RECORDS_STORE, 'readonly');
      const row = await requestResult<unknown>(transaction.objectStore(RECORDS_STORE).get(id));
      await transactionDone(transaction);

      if (!isMedicalRecord(row) || row.userId !== userId) return null;
      return row;
    } catch (error) {
      throw toRepositoryError(error, 'Could not read that record from this browser.');
    }
  }

  async create(userId: string, input: NewRecordInput): Promise<MedicalRecord> {
    try {
      const record: MedicalRecord = {
        ...input,
        id: newId(),
        userId,
        uploadDate: todayIsoDate(),
      };

      const db = await openDatabase();
      const transaction = db.transaction(RECORDS_STORE, 'readwrite');
      await requestResult(transaction.objectStore(RECORDS_STORE).add(record));
      await transactionDone(transaction);

      return record;
    } catch (error) {
      throw toRepositoryError(error, 'Could not save the record in this browser.');
    }
  }

  async update(userId: string, id: string, patch: RecordPatch): Promise<MedicalRecord> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(RECORDS_STORE, 'readwrite');
      const store = transaction.objectStore(RECORDS_STORE);
      const existing = await requestResult<unknown>(store.get(id));

      if (!isMedicalRecord(existing) || existing.userId !== userId) {
        throw new RepositoryError('That record no longer exists in this browser.');
      }

      const updated: MedicalRecord = {
        ...existing,
        title: patch.title ?? existing.title,
        category: patch.category ?? existing.category,
        doctorName: patch.doctorName ?? existing.doctorName,
        hospital: patch.hospital ?? existing.hospital,
        visitDate: patch.visitDate ?? existing.visitDate,
        notes: patch.notes ?? existing.notes,
        extracted: patch.extracted ?? existing.extracted,
      };

      await requestResult(store.put(updated));
      await transactionDone(transaction);
      return updated;
    } catch (error) {
      throw toRepositoryError(error, 'Could not update that record.');
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([RECORDS_STORE, FILES_STORE], 'readwrite');
      const records = transaction.objectStore(RECORDS_STORE);
      const existing = await requestResult<unknown>(records.get(id));

      if (!isMedicalRecord(existing) || existing.userId !== userId) {
        throw new RepositoryError('That record no longer exists in this browser.');
      }

      await requestResult(records.delete(id));
      await requestResult(transaction.objectStore(FILES_STORE).delete(id));
      await transactionDone(transaction);
    } catch (error) {
      throw toRepositoryError(error, 'Could not delete that record.');
    }
  }

  async findByHash(userId: string, hash: string): Promise<MedicalRecord[]> {
    if (!hash) return [];
    try {
      const db = await openDatabase();
      const transaction = db.transaction(RECORDS_STORE, 'readonly');
      const index = transaction.objectStore(RECORDS_STORE).index('userId_hash');
      const rows = await requestResult<unknown[]>(
        index.getAll(IDBKeyRange.only([userId, hash])),
      );
      await transactionDone(transaction);

      return rows
        .filter(isMedicalRecord)
        .filter((record) => record.userId === userId && record.fileHash === hash);
    } catch (error) {
      throw toRepositoryError(error, 'Could not check for duplicate documents.');
    }
  }

  async saveFile(userId: string, recordId: string, file: File, hash: string): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([RECORDS_STORE, FILES_STORE], 'readwrite');
      const record = await requestResult<unknown>(
        transaction.objectStore(RECORDS_STORE).get(recordId),
      );

      if (!isMedicalRecord(record) || record.userId !== userId) {
        throw new RepositoryError('The record was not found, so its file could not be stored.');
      }

      const stored: StoredDocument = {
        recordId,
        userId,
        fileName: file.name,
        mimeType: file.type || record.mimeType,
        size: file.size,
        hash,
        blob: file,
      };

      await requestResult(transaction.objectStore(FILES_STORE).put(stored));
      await transactionDone(transaction);
    } catch (error) {
      throw toRepositoryError(error, 'Could not store the original file in this browser.');
    }
  }

  async getFile(userId: string, recordId: string): Promise<StoredDocument | null> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(FILES_STORE, 'readonly');
      const row = await requestResult<unknown>(
        transaction.objectStore(FILES_STORE).get(recordId),
      );
      await transactionDone(transaction);

      if (!isStoredDocument(row) || row.userId !== userId) return null;
      return row;
    } catch (error) {
      throw toRepositoryError(error, 'Could not read the original file from this browser.');
    }
  }

  async removeFile(userId: string, recordId: string): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(FILES_STORE, 'readwrite');
      const store = transaction.objectStore(FILES_STORE);
      const existing = await requestResult<unknown>(store.get(recordId));

      if (isStoredDocument(existing) && existing.userId === userId) {
        await requestResult(store.delete(recordId));
      }
      await transactionDone(transaction);
    } catch (error) {
      throw toRepositoryError(error, 'Could not remove the stored file.');
    }
  }
}

export const indexedDbRecordRepository: RecordRepository = new IndexedDbRecordRepository();
