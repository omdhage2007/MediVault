import { describe, expect, it } from 'vitest';
import { mapRecordRow } from './supabaseRecordRepository';

describe('mapRecordRow', () => {
  it('maps snake_case cloud rows into the UI model', () => {
    const mapped = mapRecordRow({
      id: '4b7d9e0e-1f52-4e1b-9c64-8a1e0f2f3a44',
      user_id: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
      title: 'Blood Report',
      document_type: 'Blood Reports',
      doctor_name: 'Dr. Meera Kulkarni',
      hospital_name: 'City Diagnostics',
      record_date: '2026-11-12',
      file_name: 'blood.pdf',
      file_path: 'user/record/blood.pdf',
      file_type: 'application/pdf',
      file_size: 2048,
      file_hash: 'abc123',
      notes: 'Fasting sample',
      is_sample: false,
      created_at: '2026-11-13T09:30:00.000Z',
      extracted_data: [
        {
          extracted_text: 'HbA1c 6.1',
          extracted_metadata: {
            doctorName: 'Dr. Meera Kulkarni',
            hospital: 'City Diagnostics',
            prescriptionDate: '2026-11-12',
            patientName: 'Om Dhage',
            medicines: [{ name: 'Metformin', dosage: '500 mg' }],
            labTests: ['HbA1c'],
            category: 'Blood Reports',
            ocrStatus: 'completed',
          },
          verification_status: 'unverified',
        },
      ],
    });

    expect(mapped).toMatchObject({
      id: '4b7d9e0e-1f52-4e1b-9c64-8a1e0f2f3a44',
      userId: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
      category: 'Blood Reports',
      doctorName: 'Dr. Meera Kulkarni',
      hospital: 'City Diagnostics',
      visitDate: '2026-11-12',
      uploadDate: '2026-11-13',
      fileSizeKb: 2,
      hasFile: true,
      fileHash: 'abc123',
    });
    expect(mapped.extracted.verificationStatus).toBe('unverified');
    expect(mapped.extracted.patientName).toBe('Om Dhage');
    expect(mapped.extracted.medicines).toEqual([{ name: 'Metformin', dosage: '500 mg' }]);
    expect(mapped.extracted.ocrStatus).toBe('completed');
  });

  it('falls back safely when optional fields or extraction rows are missing', () => {
    const mapped = mapRecordRow({
      id: 'a',
      user_id: 'b',
      title: 'Scan',
      document_type: 'not-a-known-category',
      record_date: null,
      file_path: null,
      file_size: null,
    });
    expect(mapped.category).toBe('Other Documents');
    expect(mapped.visitDate).toBe('');
    expect(mapped.hasFile).toBe(false);
    expect(mapped.extracted.verificationStatus).toBe('unverified');
    expect(mapped.extracted.ocrStatus).toBe('simulated');
  });

  it('rejects rows missing required identity fields', () => {
    expect(() => mapRecordRow({ id: 'a', title: 'No owner' })).toThrow();
    expect(() => mapRecordRow(null)).toThrow();
  });
});
