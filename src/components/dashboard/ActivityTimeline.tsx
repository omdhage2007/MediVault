import { formatDate } from '@/lib/utils';
import type { MedicalRecord } from '@/types';

interface ActivityTimelineProps {
  records: MedicalRecord[];
  onOpen: (record: MedicalRecord) => void;
}

export default function ActivityTimeline({ records, onOpen }: ActivityTimelineProps) {
  const sorted = [...records].sort((a, b) => b.visitDate.localeCompare(a.visitDate)).slice(0, 5);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <h2 className="mb-4 font-display text-lg font-semibold text-[var(--text)]">Medical Activity</h2>
      {sorted.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No activity yet. Your timeline builds as you add documents.
        </p>
      )}
      <ol className="relative space-y-5 border-l-2 border-[var(--primary)]/40 pl-5">
        {sorted.map((r) => (
          <li key={r.id} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--card)] bg-[var(--primary)]" />
            <button
              type="button"
              onClick={() => onOpen(r)}
              className="w-full rounded-lg px-1 py-0.5 text-left transition hover:bg-[var(--tint)]"
            >
              <p className="text-xs font-semibold text-[var(--primary)]">{formatDate(r.visitDate)}</p>
              <p className="text-sm font-semibold text-[var(--text)]">{r.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {r.doctorName} · {r.hospital}
              </p>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
