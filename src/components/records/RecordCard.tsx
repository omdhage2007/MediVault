import { Download, Eye, FileText, Microscope, Pill, Scan, Stethoscope, Trash2 } from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { MedicalRecord, RecordCategory } from '@/types';

export function categoryIcon(category: RecordCategory) {
  switch (category) {
    case 'Prescriptions':
      return Pill;
    case 'Blood Reports':
      return Microscope;
    case 'X-Ray Reports':
      return Scan;
    case 'Scans':
      return Scan;
    case 'Consultation Records':
      return Stethoscope;
    default:
      return FileText;
  }
}

interface RecordCardProps {
  record: MedicalRecord;
  view: 'grid' | 'list';
  onOpen: (record: MedicalRecord) => void;
  onDownload: (record: MedicalRecord) => void;
  onDelete: (record: MedicalRecord) => void;
}

export default function RecordCard({ record, view, onOpen, onDownload, onDelete }: RecordCardProps) {
  const Icon = categoryIcon(record.category);
  if (view === 'list') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{record.title}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {record.doctorName} · {record.hospital} · {formatDate(record.visitDate)}
          </p>
        </div>
        {record.isSample && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">Sample</span>
        )}
        <span className="rounded-full bg-[var(--tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
          {record.category}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onOpen(record)} aria-label="View" className="rounded-lg p-2 text-[var(--primary)] hover:bg-[var(--tint)]">
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDownload(record)}
            disabled={!record.hasFile}
            aria-label={record.hasFile ? 'Download' : 'No original file attached'}
            title={record.hasFile ? 'Download the original file' : 'No original file attached'}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(record)} aria-label="Delete" className="rounded-lg p-2 text-red-500 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--tint)] text-[var(--primary)] transition group-hover:scale-105">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <div className="flex flex-col items-end gap-1">
          {record.isSample && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">Sample</span>
          )}
          <span className="rounded-full bg-[var(--tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
            {record.category}
          </span>
        </div>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold leading-snug text-[var(--text)]">{record.title}</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">{record.doctorName}</p>
      <p className="text-xs text-[var(--muted)]">
        {formatDate(record.visitDate)} · {formatFileSize(record.fileSizeKb)}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onOpen(record)}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={() => onDownload(record)}
          disabled={!record.hasFile}
          aria-label={record.hasFile ? 'Download' : 'No original file attached'}
          title={record.hasFile ? 'Download the original file' : 'No original file attached'}
          className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(record)}
          aria-label="Delete"
          className="rounded-full border border-[var(--border)] p-2 text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
