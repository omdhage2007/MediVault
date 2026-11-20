import type { ExtractedData, MedicalRecord, RecordCategory } from '@/types';
import type { StoredDocument } from './recordRepository';

const CATEGORIES: readonly RecordCategory[] = [
  'Prescriptions',
  'Blood Reports',
  'X-Ray Reports',
  'Scans',
  'Consultation Records',
  'Other Documents',
];

const OCR_STATUSES = ['simulated', 'completed', 'processing', 'failed'] as const;

export function isRecordCategory(value: unknown): value is RecordCategory {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export function isExtractedData(value: unknown): value is ExtractedData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (typeof data.doctorName !== 'string' || typeof data.hospital !== 'string') return false;
  if (typeof data.prescriptionDate !== 'string') return false;
  if (!isRecordCategory(data.category)) return false;
  if (typeof data.ocrStatus !== 'string') return false;
  if (!(OCR_STATUSES as readonly string[]).includes(data.ocrStatus)) return false;
  if (!Array.isArray(data.medicines)) return false;
  return data.medicines.every((medicine) => {
    if (!medicine || typeof medicine !== 'object') return false;
    const entry = medicine as Record<string, unknown>;
    return typeof entry.name === 'string' && typeof entry.dosage === 'string';
  });
}

export function isMedicalRecord(value: unknown): value is MedicalRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.title === 'string' &&
    isRecordCategory(record.category) &&
    typeof record.doctorName === 'string' &&
    typeof record.hospital === 'string' &&
    typeof record.visitDate === 'string' &&
    typeof record.uploadDate === 'string' &&
    typeof record.fileName === 'string' &&
    typeof record.fileSizeKb === 'number' &&
    typeof record.mimeType === 'string' &&
    typeof record.notes === 'string' &&
    typeof record.fileHash === 'string' &&
    typeof record.hasFile === 'boolean' &&
    typeof record.isSample === 'boolean' &&
    isExtractedData(record.extracted)
  );
}

export function isStoredDocument(value: unknown): value is StoredDocument {
  if (!value || typeof value !== 'object') return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.recordId === 'string' &&
    typeof file.userId === 'string' &&
    typeof file.fileName === 'string' &&
    typeof file.mimeType === 'string' &&
    typeof file.size === 'number' &&
    typeof file.hash === 'string' &&
    file.blob instanceof Blob
  );
}
