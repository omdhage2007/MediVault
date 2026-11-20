import type { MedicalRecord, RecordCategory } from '../types';

/**
 * Pure filtering/sorting used by the Medical Library. Cloud and demo records
 * both use this, and no failed query can fall back to sample data here.
 */
export function filterRecords(
  records: MedicalRecord[],
  query: string,
  category: RecordCategory | 'All',
  sort: 'newest' | 'oldest',
  dateFrom = '',
  dateTo = '',
): MedicalRecord[] {
  const q = query.trim().toLowerCase();
  const out = records.filter((r) => {
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.doctorName.toLowerCase().includes(q) ||
      r.hospital.toLowerCase().includes(q);
    const matchesCategory = category === 'All' || r.category === category;
    const matchesFrom = !dateFrom || r.visitDate >= dateFrom;
    const matchesTo = !dateTo || r.visitDate <= dateTo;
    return matchesQuery && matchesCategory && matchesFrom && matchesTo;
  });
  out.sort((a, b) =>
    sort === 'newest'
      ? b.visitDate.localeCompare(a.visitDate)
      : a.visitDate.localeCompare(b.visitDate),
  );
  return out;
}
