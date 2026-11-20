import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/Navbar';
import { errorMessage } from '@/data/errors';
import { formatDate, formatDateTime } from '@/lib/utils';
import { resolvePublicShare, type PublicShareView } from '@/services/shareResolver';
import type { Theme } from '@/types';

interface SharedLinkProps {
  token: string | null;
  theme: Theme;
  onToggleTheme: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; view: PublicShareView }
  | { status: 'error'; message: string };

export default function SharedLink({ token, theme, onToggleTheme }: SharedLinkProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const view = await resolvePublicShare(token ?? '');
        if (!cancelled) setState({ status: 'ready', view });
      } catch (caught) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: errorMessage(caught, 'This share link could not be checked. Try again later.'),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const view = state.status === 'ready' ? state.view : null;
  const blocked = view && view.status !== 'active';

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Activity className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="font-display text-lg font-bold text-[var(--text)]">MediVault</span>
          <span className="ml-auto">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] sm:p-8">
          {state.status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking this share link…
            </div>
          )}

          {state.status === 'error' && (
            <div className="py-10 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-500" strokeWidth={1.5} aria-hidden />
              <h1 className="mt-3 font-display text-xl font-bold text-[var(--text)]">Could not open this link</h1>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{state.message}</p>
            </div>
          )}

          {view?.status === 'invalid' && (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-[var(--muted)]" strokeWidth={1.5} aria-hidden />
              <h1 className="mt-3 font-display text-xl font-bold text-[var(--text)]">This link is not valid</h1>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
                The link may be mistyped, expired, or revoked. Ask the record owner for a new share link.
              </p>
              {view.mode === 'local' && (
                <p className="mx-auto mt-4 max-w-md rounded-xl bg-[var(--tint)] px-4 py-3 text-xs text-[var(--muted)]">
                  Local demo shares only exist in the browser that created them. On this device, open the link in the
                  same browser.
                </p>
              )}
            </div>
          )}

          {view && blocked && view.status !== 'invalid' && (
            <div className="py-10 text-center">
              <Clock className="mx-auto h-10 w-10 text-amber-600" strokeWidth={1.5} aria-hidden />
              <h1 className="mt-3 font-display text-xl font-bold text-[var(--text)]">
                {view.status === 'expired' ? 'This link has expired' : 'This link has been revoked'}
              </h1>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
                For privacy, the shared records are no longer available. Ask the record owner to create a new link.
              </p>
            </div>
          )}

          {view?.status === 'active' && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Shared medical records</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-[var(--text)]">Records shared with you</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Only the documents selected by the record owner are shown here.
                {view.expiresAt ? ` Access expires ${formatDateTime(view.expiresAt)}.` : ''}
              </p>

              {view.mode === 'local' && (
                <p className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  Browser-local demo: this page reads IndexedDB in the browser that created the share. It grants no
                  access on another device, and no document previews are available here.
                </p>
              )}

              {view.records.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  The selected documents are no longer available.
                </p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {view.records.map((record) => (
                    <li key={record.id} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
                          <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-base font-semibold text-[var(--text)]">{record.title}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {record.category} · {formatDate(record.visitDate)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {record.doctorName}
                            {record.hospital ? ` · ${record.hospital}` : ''}
                          </p>
                        </div>
                      </div>

                      {record.previewUrl && record.mimeType.startsWith('image/') && (
                        <img
                          src={record.previewUrl}
                          alt={`Preview of ${record.title}`}
                          className="mt-3 max-h-96 w-full rounded-xl object-contain"
                        />
                      )}
                      {record.previewUrl && record.mimeType === 'application/pdf' && (
                        <iframe
                          src={record.previewUrl}
                          title={`PDF preview of ${record.title}`}
                          className="mt-3 h-96 w-full rounded-xl border border-[var(--border)] bg-white"
                        />
                      )}
                      {record.previewUrl && (
                        <a
                          href={record.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-[var(--primary)] underline"
                        >
                          Open {record.fileName || 'document'}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--muted)]">
          MediVault is a personal record organizer. Shared documents are not medical advice.
        </p>
      </main>
    </div>
  );
}
