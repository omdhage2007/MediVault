import { describe, expect, it } from 'vitest';
import {
  extractOcrMetadata,
  parseOcrDate,
  parseOcrLabTests,
  parseOcrMedicines,
} from './ocrEngine';

describe('parseOcrDate', () => {
  it('reads ISO, day-first numeric and month-name dates', () => {
    expect(parseOcrDate('Date: 2026-11-12')).toBe('2026-11-12');
    expect(parseOcrDate('Date: 12/11/2026')).toBe('2026-11-12');
    expect(parseOcrDate('Date: 12 Nov 2026')).toBe('2026-11-12');
    expect(parseOcrDate('Date: November 12, 2026')).toBe('2026-11-12');
  });

  it('does not invent a date for invalid or missing values', () => {
    expect(parseOcrDate('31/02/2026')).toBe('');
    expect(parseOcrDate('No date on this page')).toBe('');
  });
});

describe('parseOcrMedicines', () => {
  it('extracts medicine names and dosage text from prescription lines', () => {
    const medicines = parseOcrMedicines(
      ['Rx', 'Paracetamol 650 mg - 1 tablet twice daily', 'Amoxicillin 500 mg capsules'].join('\n'),
    );
    expect(medicines.map((m) => m.name)).toContain('Paracetamol');
    expect(medicines[0]?.dosage).toMatch(/650 mg/);
    expect(medicines.map((m) => m.name)).toContain('Amoxicillin');
  });

  it('ignores prose without dosage information', () => {
    expect(parseOcrMedicines('Please take rest and drink water')).toEqual([]);
  });
});

describe('parseOcrLabTests', () => {
  it('finds known tests without duplicates', () => {
    const tests = parseOcrLabTests('CBC and HbA1c; complete blood count repeated. Haemoglobin low.');
    expect(tests).toEqual(expect.arrayContaining(['CBC', 'HbA1c', 'Haemoglobin']));
    expect(new Set(tests.map((t) => t.toLowerCase())).size).toBe(tests.length);
  });
});

describe('extractOcrMetadata', () => {
  it('extracts only values present in the text', () => {
    const metadata = extractOcrMetadata(
      [
        'City Diagnostics and Clinic',
        'Patient Name: Om Dhage',
        'Dr. Meera Kulkarni',
        'Date: 12/11/2026',
        'Paracetamol 650 mg twice daily',
        'HbA1c 6.1',
      ].join('\n'),
    );
    expect(metadata.doctorName).toBe('Dr. Meera Kulkarni');
    expect(metadata.patientName).toBe('Om Dhage');
    expect(metadata.hospital).toMatch(/City Diagnostics/);
    expect(metadata.prescriptionDate).toBe('2026-11-12');
    expect(metadata.medicines[0]?.name).toBe('Paracetamol');
    expect(metadata.labTests).toContain('HbA1c');
  });

  it('leaves missing fields empty instead of fabricating them', () => {
    const metadata = extractOcrMetadata('Some unreadable page');
    expect(metadata.doctorName).toBe('');
    expect(metadata.patientName).toBe('');
    expect(metadata.prescriptionDate).toBe('');
    expect(metadata.medicines).toEqual([]);
  });
});
