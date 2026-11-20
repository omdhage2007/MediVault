import { useMemo, useState } from 'react';
import { History, Upload } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { categoryIcon } from '@/components/records/RecordCard';
import type { MedicalRecord } from '@/types';

interface MedicalHistoryProps {
  records: MedicalRecord[];
  onOpen: (record: MedicalRecord) => void;
  onUpload: () => void;
}

export default function MedicalHistory({ records, onOpen, onUpload }: MedicalHistoryProps) {
  const years = useMemo(() => {
    const map = new Map<string, Map<string, MedicalRecord[]>>();
    const sorted = [...records].sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    for (const r of sorted) {
      const d = new Date(r.visitDate + 'T00:00:00');
      const year = String(d.getFullYear());
      const month = d.toLocaleDateString('en-IN', { month: 'long' });
      if (!map.has(year)) map.set(year, new Map());
      const months = map.get(year) as Map<string, MedicalRecord[]>;
      if (!months.has(month)) months.set(month, []);
      (months.get(month) as MedicalRecord[]).push(r);
    }
    return [...map.entries()];
  }, [records]);

  const [yearFilter, setYearFilter] = useState<string>('All');
  const shownYears = yearFilter === 'All' ? years : years.filter(([y]) => y === yearFilter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Medical History</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Your visits, prescriptions and reports in chronological order.</p>
      </header>

      {records.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
          <History className="h-12 w-12 text-[var(--muted)]" strokeWidth={1.4} aria-hidden />
          <h2 className="mt-4 font-display text-lg font-semibold text-[var(--text)]">Your timeline is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            Add a prescription, report or consultation and it will appear here in chronological order.
          </p>
          <button
            onClick={onUpload}
            className="mt-4 flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            <Upload className="h-4 w-4" aria-hidden /> Upload a document
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['All', ...years.map(([y]) => y)].map((y) => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
              yearFilter === y
                ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)]'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div
        className="relative space-y-10 border-l-2 border-[var(--primary)]/50 pl-6"
        hidden={records.length === 0}
      >
        {shownYears.map(([year, months]) => (
          <section key={year}>
            <h2 className="font-display text-xl font-bold text-[var(--primary)]">{year}</h2>
            {[...months.entries()].map(([month, items]) => (
              <div key={month} className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{month}</h3>
                <div className="mt-3 space-y-4">
                  {items.map((r) => {
                    const Icon = categoryIcon(r.category);
                    return (
                      <button
                        key={r.id}
                        onClick={() => onOpen(r)}
                        className="relative block w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]"
                      >
                        <span className="absolute -left-[31px] top-6 h-3.5 w-3.5 rounded-full border-2 border-[var(--card)] bg-[var(--primary)]" />
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
                            <Icon className="h-5 w-5" strokeWidth={1.8} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--primary)]">{formatDate(r.visitDate)}</p>
                            <p className="font-display text-base font-semibold text-[var(--text)]">{r.title}</p>
                            <p className="text-sm text-[var(--muted)]">
                              {r.doctorName} · {r.hospital} · {r.category}
                            </p>
                            {r.extracted.medicines.length > 0 && (
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                Medicines: {r.extracted.medicines.map((m) => m.name).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
        {shownYears.length === 0 && <p className="text-sm text-[var(--muted)]">No visits in this year.</p>}
      </div>
    </div>
  );
}
