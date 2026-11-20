import type { ExtractedData, MedicalRecord, RecordCategory } from '@/types';

export interface NewRecordInput {
  title: string;
  category: RecordCategory;
  doctorName: string;
  hospital: string;
  visitDate: string;
  notes: string;
  fileName: string;
  fileSizeKb: number;
  mimeType: string;
  fileHash: string;
  hasFile: boolean;
  isSample: boolean;
  extracted: ExtractedData;
}

export type RecordPatch = Partial<
  Pick<
    MedicalRecord,
    'title' | 'category' | 'doctorName' | 'hospital' | 'visitDate' | 'notes' | 'extracted'
  >
>;

export interface StoredDocument {
  recordId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  blob: Blob;
}

/**
 * All record metadata and original-file access goes through this contract.
 * Phase 3 uses the IndexedDB implementation; Phase 4 will select the
 * Supabase adapter without changing any UI code.
 */
export interface RecordRepository {
  list(userId: string): Promise<MedicalRecord[]>;
  get(userId: string, id: string): Promise<MedicalRecord | null>;
  create(userId: string, input: NewRecordInput): Promise<MedicalRecord>;
  update(userId: string, id: string, patch: RecordPatch): Promise<MedicalRecord>;
  remove(userId: string, id: string): Promise<void>;
  findByHash(userId: string, hash: string): Promise<MedicalRecord[]>;
  saveFile(userId: string, recordId: string, file: File, hash: string): Promise<void>;
  getFile(userId: string, recordId: string): Promise<StoredDocument | null>;
  removeFile(userId: string, recordId: string): Promise<void>;
}
