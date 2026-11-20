import { Eye, Upload } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MedicalRecord } from '@/types';
import { categoryIcon } from '../records/RecordCard';

interface RecentRecordsProps {
  records: MedicalRecord[];
  onOpen: (record: MedicalRecord) => void;
  onUpload: () => void;
}

export default function RecentRecords({ records, onOpen, onUpload }: RecentRecordsProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Recent Documents</h2>
        <span className="text-xs text-[var(--muted)]">{records.length} total</span>
      </div>
      {records.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
            <Upload className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--text)]">No documents yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Upload a prescription or report to see it here.</p>
          <button
            onClick={onUpload}
            className="mt-4 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            Upload a document
          </button>
        </div>
      ) : (
      <ul className="divide-y divide-[var(--border)]">
        {records.slice(0, 5).map((r) => {
          const Icon = categoryIcon(r.category);
          return (
            <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text)]">{r.title}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {r.doctorName} · {formatDate(r.visitDate)}
                </p>
              </div>
              <span className="hidden rounded-full bg-[var(--tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] sm:block">
                {r.category}
              </span>
              <button
                onClick={() => onOpen(r)}
                className="flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
