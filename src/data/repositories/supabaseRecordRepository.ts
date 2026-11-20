import type { ExtractedData, MedicalRecord, RecordCategory } from '@/types';
import { requireSupabase, STORAGE_BUCKET, TABLES } from '@/services/supabase';
import { RepositoryError, toRepositoryError } from '../errors';
import type {
  NewRecordInput,
  RecordPatch,
  RecordRepository,
  StoredDocument,
} from './recordRepository';

/**
 * Production Supabase adapter.
 *
 * Rows are `unknown` and are mapped field by field into the UI model. Nothing
 * is cast into `MedicalRecord` without validation, and RLS scopes every query
 * to the authenticated user (the explicit `.eq('user_id', ...)` is defence in
 * depth, not the security boundary).
 */

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readCategory(value: unknown): RecordCategory {
  switch (value) {
    case 'Prescriptions':
      return 'Prescriptions';
    case 'Blood Reports':
      return 'Blood Reports';
    case 'X-Ray Reports':
      return 'X-Ray Reports';
    case 'Scans':
      return 'Scans';
    case 'Consultation Records':
      return 'Consultation Records';
    default:
      return 'Other Documents';
  }
}

function readOcrStatus(value: unknown): ExtractedData['ocrStatus'] {
  switch (value) {
    case 'completed':
      return 'completed';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'failed';
    default:
      return 'simulated';
  }
}

function readMedicines(value: unknown): ExtractedData['medicines'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const medicine = entry as Record<string, unknown>;
    if (typeof medicine.name !== 'string') return [];
    return [{ name: medicine.name, dosage: text(medicine.dosage) }];
  });
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function extractionMetadata(extracted: ExtractedData): Record<string, unknown> {
  return {
    doctorName: extracted.doctorName,
    hospital: extracted.hospital,
    prescriptionDate: extracted.prescriptionDate,
    patientName: extracted.patientName ?? '',
    medicines: extracted.medicines,
    labTests: extracted.labTests ?? [],
    category: extracted.category,
    ocrStatus: extracted.ocrStatus,
  };
}

function mapExtraction(value: unknown, fallback: ExtractedData): ExtractedData {
  if (!value || typeof value !== 'object') return fallback;
  const row = value as Record<string, unknown>;
  const metadata = row.extracted_metadata;
  const data =
    metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};

  const verification =
    row.verification_status === 'verified' ? 'verified' : 'unverified';

  return {
    doctorName: text(data.doctorName) || fallback.doctorName,
    hospital: text(data.hospital) || fallback.hospital,
    prescriptionDate: text(data.prescriptionDate) || fallback.prescriptionDate,
    medicines: readMedicines(data.medicines),
    category: readCategory(data.category ?? fallback.category),
    ocrStatus: readOcrStatus(data.ocrStatus),
    extractedText: text(row.extracted_text),
    patientName: text(data.patientName),
    labTests: readStringArray(data.labTests),
    verificationStatus: verification,
  };
}

export function mapRecordRow(value: unknown): MedicalRecord {
  if (!value || typeof value !== 'object') {
    throw new RepositoryError('Supabase returned an unexpected record.');
  }
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const userId = text(row.user_id);
  const title = text(row.title);
  if (!id || !userId || !title) {
    throw new RepositoryError('A record from Supabase is missing required fields.');
  }

  const category = readCategory(row.document_type);
  const doctorName = text(row.doctor_name);
  const hospital = text(row.hospital_name);
  const visitDate = text(row.record_date);
  const fallbackExtracted: ExtractedData = {
    doctorName,
    hospital,
    prescriptionDate: visitDate,
    medicines: [],
    category,
    ocrStatus: 'simulated',
    verificationStatus: 'unverified',
  };

  const extractionRow = Array.isArray(row.extracted_data)
    ? row.extracted_data[0]
    : row.extracted_data;
  const filePath = text(row.file_path);

  return {
    id,
    userId,
    title,
    category,
    doctorName,
    hospital,
    visitDate,
    uploadDate: text(row.created_at).slice(0, 10),
    fileName: text(row.file_name),
    fileSizeKb: Math.round(numberValue(row.file_size) / 1024),
    mimeType: text(row.file_type),
    notes: text(row.notes),
    fileHash: text(row.file_hash),
    hasFile: Boolean(filePath),
    isSample: row.is_sample === true,
    extracted: mapExtraction(extractionRow, fallbackExtracted),
  };
}

function mapRows(value: unknown): MedicalRecord[] {
  if (!Array.isArray(value)) {
    throw new RepositoryError('Supabase returned an unexpected records response.');
  }
  return value
    .map(mapRecordRow)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}

function patchToRow(patch: RecordPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.document_type = patch.category;
  if (patch.doctorName !== undefined) row.doctor_name = patch.doctorName;
  if (patch.hospital !== undefined) row.hospital_name = patch.hospital;
  if (patch.visitDate !== undefined) row.record_date = patch.visitDate || null;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

function storagePath(userId: string, recordId: string, fileName: string): string {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'document';
  return `${userId}/${recordId}/${safeName}`;
}

async function run<T>(fallback: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw toRepositoryError(error, fallback);
  }
}

class SupabaseRecordRepository implements RecordRepository {
  list(userId: string): Promise<MedicalRecord[]> {
    return run('Could not load your records from Supabase.', async () => {
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .select('*, extracted_data(*)')
        .eq('user_id', userId)
        .order('record_date', { ascending: false });
      if (error) throw new RepositoryError('Could not load your records from Supabase.');
      return mapRows(data);
    });
  }

  get(userId: string, id: string): Promise<MedicalRecord | null> {
    return run('Could not read that record from Supabase.', async () => {
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .select('*, extracted_data(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new RepositoryError('Could not read that record from Supabase.');
      if (!data) return null;
      return mapRecordRow(data);
    });
  }

  create(userId: string, input: NewRecordInput): Promise<MedicalRecord> {
    return run('Could not save the record to Supabase.', async () => {
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .insert({
          user_id: userId,
          title: input.title,
          document_type: input.category,
          doctor_name: input.doctorName,
          hospital_name: input.hospital,
          record_date: input.visitDate || null,
          file_name: input.fileName,
          file_type: input.mimeType,
          file_size: Math.round(input.fileSizeKb * 1024),
          file_hash: input.fileHash,
          notes: input.notes,
          is_sample: input.isSample,
        })
        .select('*, extracted_data(*)')
        .single();
      if (error) throw new RepositoryError('Could not save the record to Supabase.');

      const record = mapRecordRow(data);
      const { error: extractionError } = await client.from(TABLES.extractedData).upsert(
        {
          record_id: record.id,
          extracted_text: input.extracted.extractedText ?? '',
          extracted_metadata: extractionMetadata(input.extracted),
          verification_status: input.extracted.verificationStatus ?? 'unverified',
        },
        { onConflict: 'record_id' },
      );

      if (extractionError) {
        await client
          .from(TABLES.medicalRecords)
          .delete()
          .eq('id', record.id)
          .eq('user_id', userId);
        throw new RepositoryError('The record metadata could not be saved. Please try again.');
      }

      return { ...record, extracted: input.extracted };
    });
  }

  update(userId: string, id: string, patch: RecordPatch): Promise<MedicalRecord> {
    return run('Could not update that record in Supabase.', async () => {
      const client = requireSupabase();
      const row = patchToRow(patch);
      if (Object.keys(row).length > 0) {
        const { error } = await client
          .from(TABLES.medicalRecords)
          .update(row)
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw new RepositoryError('Could not update that record in Supabase.');
      }

      if (patch.extracted) {
        const { error: extractionError } = await client
          .from(TABLES.extractedData)
          .upsert(
            {
              record_id: id,
              extracted_text: patch.extracted.extractedText ?? '',
              extracted_metadata: extractionMetadata(patch.extracted),
              verification_status: patch.extracted.verificationStatus ?? 'unverified',
            },
            { onConflict: 'record_id' },
          );
        if (extractionError) {
          throw new RepositoryError('The record was updated but its OCR details could not be saved.');
        }
      }

      const updated = await this.get(userId, id);
      if (!updated) throw new RepositoryError('That record no longer exists.');
      return updated;
    });
  }

  remove(userId: string, id: string): Promise<void> {
    return run('Could not delete that record from Supabase.', async () => {
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .select('file_path')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new RepositoryError('Could not find that record to delete it.');

      const { error: deleteError } = await client
        .from(TABLES.medicalRecords)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (deleteError) throw new RepositoryError('Could not delete that record from Supabase.');

      const path = data && typeof data === 'object' ? text((data as Record<string, unknown>).file_path) : '';
      if (path) {
        // Best effort: a leftover private object can never be read without a
        // signed URL, and RLS keeps it unavailable to other users.
        await client.storage.from(STORAGE_BUCKET).remove([path]);
      }
    });
  }

  findByHash(userId: string, hash: string): Promise<MedicalRecord[]> {
    return run('Could not check for duplicate documents.', async () => {
      if (!hash) return [];
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .select('*, extracted_data(*)')
        .eq('user_id', userId)
        .eq('file_hash', hash);
      if (error) throw new RepositoryError('Could not check for duplicate documents.');
      return mapRows(data);
    });
  }

  saveFile(userId: string, recordId: string, file: File, hash: string): Promise<void> {
    return run('Could not upload the original file.', async () => {
      const client = requireSupabase();
      const path = storagePath(userId, recordId, file.name);

      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });
      if (uploadError) {
        throw new RepositoryError('Could not upload the original file to private storage.');
      }

      const { error: updateError } = await client
        .from(TABLES.medicalRecords)
        .update({
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_hash: hash,
        })
        .eq('id', recordId)
        .eq('user_id', userId);

      if (updateError) {
        await client.storage.from(STORAGE_BUCKET).remove([path]);
        throw new RepositoryError('The file was uploaded but could not be linked to the record.');
      }
    });
  }

  getFile(userId: string, recordId: string): Promise<StoredDocument | null> {
    return run('Could not read the original file from Supabase.', async () => {
      const client = requireSupabase();
      const { data: row, error } = await client
        .from(TABLES.medicalRecords)
        .select('file_name, file_type, file_hash, file_path')
        .eq('id', recordId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new RepositoryError('Could not find the stored file.');
      if (!row || typeof row !== 'object') return null;

      const record = row as Record<string, unknown>;
      const path = text(record.file_path);
      if (!path) return null;

      const { data: blob, error: downloadError } = await client.storage
        .from(STORAGE_BUCKET)
        .download(path);
      if (downloadError || !blob) {
        throw new RepositoryError('The original file could not be downloaded from private storage.');
      }

      return {
        recordId,
        userId,
        fileName: text(record.file_name) || 'document',
        mimeType: text(record.file_type) || blob.type,
        size: blob.size,
        hash: text(record.file_hash),
        blob,
      };
    });
  }

  removeFile(userId: string, recordId: string): Promise<void> {
    return run('Could not remove the stored file from Supabase.', async () => {
      const client = requireSupabase();
      const { data, error } = await client
        .from(TABLES.medicalRecords)
        .select('file_path')
        .eq('id', recordId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new RepositoryError('Could not find the stored file.');
      if (!data || typeof data !== 'object') return;
      const path = text((data as Record<string, unknown>).file_path);
      if (!path) return;
      const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([path]);
      if (removeError) throw new RepositoryError('Could not remove the stored file.');
    });
  }
}

export const supabaseRecordRepository: RecordRepository = new SupabaseRecordRepository();
