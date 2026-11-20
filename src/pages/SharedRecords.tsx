import { useRef, useState } from 'react';
import { Ban, CheckCircle2, Copy, Download, Link2, QrCode, ShieldCheck, Upload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { errorMessage } from '@/data/errors';
import { buildShareUrl, triggerDownload } from '@/lib/files';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { AuthMode } from '@/hooks/useAuth';
import type { MedicalRecord, ShareLink } from '@/types';

interface SharedRecordsProps {
  records: MedicalRecord[];
  shares: ShareLink[];
  mode: AuthMode;
  onCreateShare: (recordIds: string[], expiryDays: number) => Promise<ShareLink>;
  onRevoke: (id: string) => Promise<void>;
  notify: (msg: string, variant?: 'info' | 'error') => void;
  preselectedId?: string | null;
  onUpload: () => void;
  error?: string | null;
}

export default function SharedRecords({
  records,
  shares,
  mode,
  onCreateShare,
  onRevoke,
  notify,
  preselectedId,
  onUpload,
  error,
}: SharedRecordsProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedId ? [preselectedId] : []),
  );
  const [expiry, setExpiry] = useState(7);
  const [latest, setLatest] = useState<ShareLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const isDemo = mode === 'demo';

  const latestUrl = latest?.token ? buildShareUrl(latest.token) : '';
  const latestRecords = latest
    ? latest.recordIds
        .map((id) => records.find((record) => record.id === id))
        .filter((record): record is MedicalRecord => Boolean(record))
    : [];

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (selected.size === 0) {
      notify('Select at least one document first.', 'error');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const share = await onCreateShare([...selected], expiry);
      setLatest(share);
      notify(
        isDemo
          ? 'Local demo share created. It only works in this browser.'
          : 'Secure share link created. Only the selected documents are included.',
      );
    } catch (caught) {
      notify(errorMessage(caught, 'Could not create the share link.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    try {
      await onRevoke(id);
    } finally {
      setRevoking(null);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify(isDemo ? 'Demo link copied. It will only open in this browser.' : 'Share link copied.');
    } catch {
      notify('Could not copy the link. Select the address and copy it manually.', 'error');
    }
  }

  async function downloadQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg || !latest) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.decoding = 'sync';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('QR image could not be prepared.'));
        image.src = svgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 720;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('QR image could not be exported.');
      triggerDownload(png, `medivault-share-${(latest.token || latest.id).slice(0, 8)}.png`);
      notify('QR code downloaded.');
    } catch {
      triggerDownload(svgBlob, `medivault-share-${(latest.token || latest.id).slice(0, 8)}.svg`);
      notify('QR code downloaded as SVG.');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Your Records. Your Permission.</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          {isDemo
            ? 'Local demo sharing: the QR code and link are real and scannable, but they only open a demo notice in this browser. No documents leave this device and a doctor cannot access them yet.'
            : 'Select the documents a doctor may see, then create a link or QR code. Links expire automatically, are validated on the server, and can be revoked at any time.'}
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-300 bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)]">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] lg:col-span-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--text)]">
            <ShieldCheck className="h-5 w-5 text-[var(--primary)]" aria-hidden /> {isDemo ? 'Create a demo share' : 'Create a secure share'}
          </h2>
          {records.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--text)]">No documents to share yet</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Upload a record first, then choose what to share.</p>
              <button
                onClick={onUpload}
                className="mt-4 flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden /> Upload a document
              </button>
            </div>
          ) : (
            <ul className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
              {records.map((record) => (
                <li key={record.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--tint)]">
                    <input
                      type="checkbox"
                      checked={selected.has(record.id)}
                      onChange={() => toggle(record.id)}
                      className="h-4 w-4 accent-[#008080]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--text)]">{record.title}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {record.doctorName} · {formatDate(record.visitDate)}
                        {record.isSample ? ' · Sample' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {selected.size > 0 && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Selected: {[...selected].map((id) => records.find((record) => record.id === id)?.title).filter(Boolean).join(', ')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-[var(--text)]">
              Link expires in{' '}
              <select
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value))}
                className="rounded-full border border-[var(--border)] bg-[var(--base)] px-3 py-1.5 text-sm outline-none"
              >
                <option value={1}>24 hours</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
            <button
              onClick={() => void generate()}
              disabled={records.length === 0 || busy}
              className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Download className="h-4 w-4 animate-pulse" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              {busy ? 'Creating…' : 'Generate share link'}
            </button>
          </div>

          {latest && (
            <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl bg-[var(--tint)] p-5 sm:flex-row">
              <div ref={qrRef} className="rounded-xl bg-white p-2 shadow">
                <QRCodeSVG
                  value={latestUrl || buildShareUrl(latest.id)}
                  size={170}
                  bgColor="#ffffff"
                  fgColor="#1a2e2e"
                  level="M"
                  title={`QR code for MediVault share ${(latest.token || latest.id).slice(0, 8)}`}
                />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--text)] sm:justify-start">
                  <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" aria-hidden /> {isDemo ? 'Demo share created' : 'Share link created'}
                </p>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">{latestUrl}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Expires {formatDateTime(latest.expiresAt)} · includes:{' '}
                  {latestRecords.map((record) => record.title).join(', ') || 'selected records'}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <button
                    onClick={() => void copyLink(latestUrl)}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy link
                  </button>
                  <button
                    onClick={() => void downloadQr()}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden /> Download QR
                  </button>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[var(--muted)] sm:justify-start">
                  <QrCode className="h-3.5 w-3.5" aria-hidden /> {isDemo
                    ? 'Scannable QR. Scanning it on another device shows the browser-local demo notice, not your documents.'
                    : 'Scannable QR. It opens the public viewer with only these documents until the link expires or is revoked.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">{isDemo ? 'Share history (demo)' : 'Share history'}</h2>
          {shares.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--text)]">Nothing here yet</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {isDemo
                  ? 'Demo shares you create are stored in this browser. No real access is granted.'
                  : 'Shares you create will appear here with their expiry and status.'}
              </p>
            </div>
          )}
          <ul className="mt-4 space-y-3">
            {shares.map((share) => (
              <li key={share.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-[var(--text)]">
                    {share.token
                      ? buildShareUrl(share.token)
                      : 'Link not stored — create a new share if you need the URL again'}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      share.status === 'active'
                        ? 'bg-[var(--tint)] text-[var(--primary)]'
                        : 'bg-red-500/10 text-red-600'
                    }`}
                  >
                    {share.status === 'active' ? 'Active' : share.status === 'expired' ? 'Expired' : 'Removed'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {share.recordIds.length} document{share.recordIds.length === 1 ? '' : 's'} · expires{' '}
                  {formatDateTime(share.expiresAt)}
                </p>
                {share.status === 'active' && (
                  <button
                    onClick={() => void revoke(share.id)}
                    disabled={revoking === share.id}
                    className="mt-2 flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden /> {revoking === share.id ? 'Revoking…' : 'Revoke access'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
