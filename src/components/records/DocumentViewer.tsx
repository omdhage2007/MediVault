import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileWarning, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { RecordFileState } from '@/hooks/useRecordFile';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { MedicalRecord } from '@/types';
import { categoryIcon } from './RecordCard';

interface DocumentViewerProps {
  record: MedicalRecord;
  file: RecordFileState;
  onDownload: (record: MedicalRecord) => void;
  onNotify: (msg: string, variant?: 'info' | 'error') => void;
}

function previewKind(record: MedicalRecord, file: RecordFileState): 'pdf' | 'image' | 'unknown' {
  const name = file.status === 'ready' ? file.fileName : record.fileName;
  const mime = file.status === 'ready' ? file.mimeType : record.mimeType;
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png)$/i.test(name)) return 'image';
  return 'unknown';
}

function SampleSheet({ record, zoom }: { record: MedicalRecord; zoom: number }) {
  const Icon = categoryIcon(record.category);
  return (
    <div className="w-full max-w-xl rounded-lg bg-white p-8 text-slate-800 shadow-lg" style={{ fontSize: `${(zoom / 100) * 14}px` }}>
      <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
        Sample preview — this demonstration record has no original file attached.
      </p>
      <div className="mt-4 flex items-center gap-3 border-b border-slate-200 pb-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E6F2F2] text-[#008080]">
          <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
        </span>
        <div>
          <p className="font-display text-base font-bold leading-tight">{record.hospital}</p>
          <p className="text-xs text-slate-500">{record.category}</p>
        </div>
      </div>
      <h3 className="mt-5 font-display text-lg font-bold">{record.title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {record.doctorName} · {formatDate(record.visitDate)}
      </p>
      {record.extracted.medicines.length > 0 && (
        <table className="mt-5 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Medicine</th>
              <th className="py-2">Dosage</th>
            </tr>
          </thead>
          <tbody>
            {record.extracted.medicines.map((medicine, index) => (
              <tr key={`${medicine.name}-${index}`} className="border-b border-slate-100">
                <td className="py-2 font-medium">{medicine.name}</td>
                <td className="py-2 text-slate-600">{medicine.dosage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {record.notes && <p className="mt-5 rounded-lg bg-[#E6F2F2] p-3 text-sm text-slate-700">{record.notes}</p>}
      <p className="mt-6 text-center text-xs text-slate-400">Demonstration data — not a stored document.</p>
    </div>
  );
}

export default function DocumentViewer({ record, file, onDownload, onNotify }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const fileUrl = file.status === 'ready' ? file.url : null;

  useEffect(() => {
    setZoom(100);
    setPdfLoaded(false);
    setImageError(false);
  }, [record.id, fileUrl]);

  const kind = previewKind(record, file);
  const isPdf = kind === 'pdf';
  const canDownload = record.hasFile;

  async function openFullscreen() {
    const node = shellRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      onNotify('Full-screen preview is not available in this browser.', 'error');
    }
  }

  return (
    <div
      ref={shellRef}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="max-w-[45%] truncate text-sm font-semibold text-[var(--text)]">{record.fileName}</span>
        <span className="text-xs text-[var(--muted)]">{formatFileSize(record.fileSizeKb)}</span>
        {!record.hasFile && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">No original file</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoom((value) => Math.max(60, value - 10))}
            disabled={isPdf}
            aria-label="Zoom out"
            title={isPdf ? 'Use the PDF viewer zoom controls' : 'Zoom out'}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-medium text-[var(--text)]">{isPdf ? '—' : `${zoom}%`}</span>
          <button
            onClick={() => setZoom((value) => Math.min(160, value + 10))}
            disabled={isPdf}
            aria-label="Zoom in"
            title={isPdf ? 'Use the PDF viewer zoom controls' : 'Zoom in'}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDownload(record)}
            disabled={!canDownload}
            aria-label={canDownload ? 'Download original file' : 'No original file attached'}
            title={canDownload ? 'Download original file' : 'No original file attached'}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => void openFullscreen()}
            aria-label="Full screen"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-[22rem] justify-center overflow-auto bg-[var(--base)] p-6">
        {(file.status === 'loading' || (record.hasFile && file.status === 'idle')) && (
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Opening the original file…
          </div>
        )}

        {file.status === 'error' && (
          <div className="flex max-w-md flex-col items-center justify-center rounded-xl bg-[var(--card)] p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={1.6} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">Could not open the original file</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{file.message}</p>
          </div>
        )}

        {file.status === 'ready' && isPdf && (
          <div className="relative h-[70vh] w-full">
            {!pdfLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Loading PDF…
              </div>
            )}
            <iframe
              src={file.url}
              title={`PDF preview of ${record.title}`}
              onLoad={() => setPdfLoaded(true)}
              className="h-full w-full rounded-lg border border-[var(--border)] bg-white"
            />
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-[var(--primary)] underline"
            >
              PDF not showing? Open it in a new tab
            </a>
          </div>
        )}

        {file.status === 'ready' && kind === 'image' && !imageError && (
          <img
            src={file.url}
            alt={`Preview of ${record.title}`}
            onError={() => setImageError(true)}
            style={{ width: `${zoom}%` }}
            className="mx-auto h-auto max-w-none self-start rounded-lg bg-white shadow-lg"
          />
        )}

        {file.status === 'ready' && kind === 'image' && imageError && (
          <div className="flex max-w-md flex-col items-center justify-center rounded-xl bg-[var(--card)] p-6 text-center">
            <FileWarning className="h-8 w-8 text-amber-600" strokeWidth={1.6} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">This image could not be displayed</p>
            <p className="mt-1 text-xs text-[var(--muted)]">The stored file may be damaged. Download it to inspect the original.</p>
          </div>
        )}

        {file.status === 'ready' && kind === 'unknown' && (
          <div className="flex max-w-md flex-col items-center justify-center rounded-xl bg-[var(--card)] p-6 text-center">
            <FileWarning className="h-8 w-8 text-amber-600" strokeWidth={1.6} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">Preview is not available for this file type</p>
            <p className="mt-1 text-xs text-[var(--muted)]">You can still download the original file.</p>
          </div>
        )}

        {(file.status === 'idle' || file.status === 'missing') && record.isSample && (
          <SampleSheet record={record} zoom={zoom} />
        )}

        {(file.status === 'idle' || file.status === 'missing') && !record.isSample && (
          <div className="flex max-w-md flex-col items-center justify-center rounded-xl bg-[var(--card)] p-6 text-center">
            <FileWarning className="h-8 w-8 text-amber-600" strokeWidth={1.6} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">Original file is not available</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              The metadata is intact, but the stored file could not be found in this browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
