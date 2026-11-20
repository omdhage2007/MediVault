import { describe, expect, it } from 'vitest';
import type { MedicalRecord } from '@/types';
import { filterRecords } from './records';

function record(overrides: Partial<MedicalRecord>): MedicalRecord {
  return {
    id: 'rec',
    userId: 'user',
    title: 'Report',
    category: 'Other Documents',
    doctorName: 'Dr. Rao',
    hospital: 'City Hospital',
    visitDate: '2026-01-01',
    uploadDate: '2026-01-01',
    fileName: 'file.pdf',
    fileSizeKb: 10,
    mimeType: 'application/pdf',
    notes: '',
    fileHash: '',
    hasFile: true,
    isSample: false,
    extracted: {
      doctorName: 'Dr. Rao',
      hospital: 'City Hospital',
      prescriptionDate: '2026-01-01',
      medicines: [],
      category: 'Other Documents',
      ocrStatus: 'completed',
    },
    ...overrides,
  };
}

const records = [
  record({ id: 'a', title: 'Blood Test', category: 'Blood Reports', visitDate: '2026-03-10' }),
  record({ id: 'b', title: 'X-Ray Chest', category: 'X-Ray Reports', doctorName: 'Dr. Meera', visitDate: '2026-05-02' }),
  record({ id: 'c', title: 'Prescription', category: 'Prescriptions', hospital: 'Ravet Clinic', visitDate: '2025-12-31' }),
];

describe('filterRecords', () => {
  it('matches title, doctor and hospital case-insensitively', () => {
    expect(filterRecords(records, 'meera', 'All', 'newest').map((r) => r.id)).toEqual(['b']);
    expect(filterRecords(records, 'ravet', 'All', 'newest').map((r) => r.id)).toEqual(['c']);
    expect(filterRecords(records, 'BLOOD', 'All', 'newest').map((r) => r.id)).toEqual(['a']);
  });

  it('filters by category', () => {
    expect(filterRecords(records, '', 'Prescriptions', 'newest').map((r) => r.id)).toEqual(['c']);
  });

  it('filters by inclusive date range', () => {
    expect(
      filterRecords(records, '', 'All', 'newest', '2026-01-01', '2026-04-01').map((r) => r.id),
    ).toEqual(['a']);
  });

  it('sorts newest and oldest without mutating the input order', () => {
    const newest = filterRecords(records, '', 'All', 'newest').map((r) => r.id);
    const oldest = filterRecords(records, '', 'All', 'oldest').map((r) => r.id);
    expect(newest).toEqual(['b', 'a', 'c']);
    expect(oldest).toEqual(['c', 'a', 'b']);
    expect(records.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
