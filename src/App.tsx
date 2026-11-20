import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  Settings as SettingsIcon,
  Share2,
  Upload,
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import MedicalRecords from '@/pages/MedicalRecords';
import UploadDocuments from '@/pages/UploadDocuments';
import DocumentPreview from '@/pages/DocumentPreview';
import MedicalHistory from '@/pages/MedicalHistory';
import SharedRecords from '@/pages/SharedRecords';
import SharedLink from '@/pages/SharedLink';
import Settings from '@/pages/Settings';
import ResetPassword from '@/pages/ResetPassword';
import { errorMessage } from '@/data/errors';
import { getRecordRepository } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useRecords } from '@/hooks/useRecords';
import { useShares } from '@/hooks/useShares';
import { readShareToken, triggerDownload } from '@/lib/files';
import { safeStorage } from '@/lib/utils';
import type { MedicalRecord, Route, Theme } from '@/types';

const APP_ROUTES: Route[] = ['dashboard', 'records', 'upload', 'preview', 'history', 'shared', 'settings'];

function routeFromHash(): Route {
  const raw = window.location.hash;
  // Supabase recovery links arrive with tokens in the hash fragment.
  if (raw.includes('type=recovery')) return 'reset-password';
  const h = raw.replace(/^#\/?/, '').split('?')[0];
  if (h === 's' || h.startsWith('s/')) return 'share';
  const known: Route[] = ['landing', 'login', 'signup', 'reset-password', 'share', ...APP_ROUTES];
  return (known as string[]).includes(h) ? (h as Route) : 'landing';
}

type ToastVariant = 'info' | 'error';

interface Toast {
  id: number;
  msg: string;
  variant: ToastVariant;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());
  const [theme, setTheme] = useState<Theme>(() => (safeStorage.get('medivault-theme') as Theme) || 'light');
  const auth = useAuth();
  const profile = auth.profile;
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [sharePreselect, setSharePreselect] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const recordsApi = useRecords(profile?.id ?? null);
  const sharesApi = useShares(profile?.id ?? null);
  const { createRecord, updateRecord, deleteRecord, findByHash, refresh, records, loading, error } =
    recordsApi;
  const shareToken = route === 'share' ? readShareToken() : null;

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeStorage.set('medivault-theme', theme);
  }, [theme]);

  // A restored session should not sit on the sign-in or sign-up screen.
  useEffect(() => {
    if (profile && (route === 'login' || route === 'signup')) {
      window.location.hash = '/dashboard';
      setRoute('dashboard');
    }
  }, [profile, route]);

  const navigate = useCallback((r: Route) => {
    window.location.hash = `/${r}`;
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  const notify = useCallback((msg: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const logout = useCallback(() => {
    setSelected(null);
    void auth.signOut();
    navigate('landing');
  }, [auth, navigate]);

  const openRecord = useCallback(
    (r: MedicalRecord) => {
      setSelected(r);
      navigate('preview');
    },
    [navigate],
  );

  const downloadRecord = useCallback(
    async (r: MedicalRecord) => {
      if (!profile) {
        notify('Sign in before downloading a document.', 'error');
        return;
      }
      if (!r.hasFile) {
        notify('This record has no original file attached.', 'error');
        return;
      }
      try {
        const stored = await getRecordRepository().getFile(profile.id, r.id);
        if (!stored) {
          notify('The original file could not be found in this browser.', 'error');
          return;
        }
        triggerDownload(stored.blob, stored.fileName);
        notify(`Downloading ${stored.fileName}.`);
      } catch (caught) {
        notify(errorMessage(caught, 'Could not download the original file.'), 'error');
      }
    },
    [profile, notify],
  );

  const handleDeleteRecord = useCallback(
    async (r: MedicalRecord): Promise<boolean> => {
      try {
        await deleteRecord(r.id);
        if (selected?.id === r.id) setSelected(null);
        notify(
          auth.mode === 'demo'
            ? 'Deleted from the browser-local database.'
            : 'Record and its stored file deleted.',
        );
        return true;
      } catch (caught) {
        notify(errorMessage(caught, 'Could not delete that record.'), 'error');
        return false;
      }
    },
    [deleteRecord, selected, notify, auth.mode],
  );

  const revokeShare = useCallback(
    async (id: string) => {
      try {
        await sharesApi.revokeShare(id);
        notify(
          auth.mode === 'demo'
            ? 'Local demo share removed. It no longer opens in this browser.'
            : 'Share revoked. The link no longer opens.',
        );
      } catch (caught) {
        notify(errorMessage(caught, 'Could not revoke that share.'), 'error');
      }
    },
    [sharesApi, notify],
  );

  const isAppRoute = APP_ROUTES.includes(route);

  const loginPage = (
    <Login
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      mode={auth.mode}
      googleEnabled={auth.googleEnabled}
      onSubmit={auth.signIn}
      onGoogle={auth.signInWithGoogle}
      onForgotPassword={auth.requestPasswordReset}
      onNavigate={(r) => navigate(r)}
      notify={notify}
    />
  );

  // Public pages
  if (route === 'share') {
    return (
      <div data-theme={theme}>
        <SharedLink
          token={shareToken}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        />
        <Toasts toasts={toasts} />
      </div>
    );
  }
  if (route === 'landing') {
    return (
      <div data-theme={theme}>
        <Landing
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          onNavigate={(r) => navigate(r)}
          onSubscribe={() => Promise.resolve()}
        />
        <Toasts toasts={toasts} />
      </div>
    );
  }
  if (route === 'login') {
    return (
      <div data-theme={theme}>
        {loginPage}
        <Toasts toasts={toasts} />
      </div>
    );
  }
  if (route === 'signup') {
    return (
      <div data-theme={theme}>
        <Signup
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          mode={auth.mode}
          onRegister={auth.signUp}
          onNavigate={(r) => navigate(r)}
          notify={notify}
        />
        <Toasts toasts={toasts} />
      </div>
    );
  }
  if (route === 'reset-password') {
    return (
      <div data-theme={theme}>
        <ResetPassword
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          mode={auth.mode}
          onUpdatePassword={auth.updatePassword}
          onNavigate={(r) => navigate(r)}
          notify={notify}
        />
        <Toasts toasts={toasts} />
      </div>
    );
  }

  // App pages require an authenticated Supabase session (or the local demo).
  if (!profile) {
    if (auth.loading) {
      return (
        <div data-theme={theme} className="grid min-h-screen place-items-center bg-[var(--bg)]">
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Restoring your session…
          </p>
        </div>
      );
    }
    return (
      <div data-theme={theme}>
        {loginPage}
        <Toasts toasts={toasts} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--bg)]">
      <Sidebar
        route={route}
        recordCount={records.length}
        onNavigate={(r) => navigate(r)}
        onLogout={logout}
        mode={auth.mode}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-64">
        <Navbar
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          profile={profile}
          query={query}
          onQuery={(q) => {
            setQuery(q);
            if (route !== 'records') navigate('records');
          }}
          onMenu={() => setSidebarOpen(true)}
          onHelp={() => notify('The help centre is not available yet.')}
          onBell={() => notify('There are no live notifications yet.')}
          onProfile={() => navigate('settings')}
        />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-10">
          {auth.error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-amber-300 bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] shadow-[var(--shadow)]"
            >
              {auth.error}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-red-300 bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] shadow-[var(--shadow)]"
            >
              <span className="min-w-0 flex-1">{error}</span>
              <button
                onClick={() => void refresh()}
                className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your records…
            </div>
          ) : (
            <>
              {route === 'dashboard' && (
                <Dashboard
                  profile={profile}
                  mode={auth.mode}
                  records={records}
                  sharedCount={sharesApi.activeCount}
                  onOpen={openRecord}
                  onNavigate={(r) => navigate(r)}
                />
              )}
              {route === 'records' && (
                <MedicalRecords
                  records={records}
                  query={query}
                  onQuery={setQuery}
                  onOpen={openRecord}
                  onDelete={handleDeleteRecord}
                  onDownload={downloadRecord}
                />
              )}
              {route === 'upload' && (
                <UploadDocuments
                  mode={auth.mode}
                  onCreateRecord={createRecord}
                  findByHash={findByHash}
                  onNavigate={(r) => navigate(r)}
                  notify={notify}
                />
              )}
              {route === 'preview' && (
                <DocumentPreview
                  userId={profile.id}
                  mode={auth.mode}
                  record={selected}
                  onBack={() => navigate('records')}
                  onDelete={handleDeleteRecord}
                  onShare={(r) => {
                    setSharePreselect(r.id);
                    navigate('shared');
                  }}
                  onSave={async (updated) => {
                    const saved = await updateRecord(updated.id, {
                      doctorName: updated.doctorName,
                      hospital: updated.hospital,
                      notes: updated.notes,
                      extracted: updated.extracted,
                    });
                    setSelected(saved);
                  }}
                  onDownload={downloadRecord}
                  notify={notify}
                />
              )}
              {route === 'history' && (
                <MedicalHistory records={records} onOpen={openRecord} onUpload={() => navigate('upload')} />
              )}
              {route === 'shared' && (
                <SharedRecords
                  records={records}
                  shares={sharesApi.shares}
                  mode={auth.mode}
                  onCreateShare={sharesApi.createShare}
                  onRevoke={revokeShare}
                  notify={notify}
                  preselectedId={sharePreselect}
                  onUpload={() => navigate('upload')}
                  error={sharesApi.error}
                />
              )}
              {route === 'settings' && (
                <Settings
                  profile={profile}
                  mode={auth.mode}
                  onSave={auth.updateProfile}
                  onChangePassword={auth.changePassword}
                  onEmailChange={auth.requestEmailChange}
                  onPasswordReset={() => auth.requestPasswordReset(profile.email)}
                  onAvatarUpload={auth.uploadAvatar}
                  notify={notify}
                />
              )}
              {!isAppRoute && (
                <Dashboard
                  profile={profile}
                  mode={auth.mode}
                  records={records}
                  sharedCount={sharesApi.activeCount}
                  onOpen={openRecord}
                  onNavigate={(r) => navigate(r)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--card)] py-2 lg:hidden">
        {(
          [
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'records', label: 'Records', icon: FileText },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'history', label: 'History', icon: History },
            { id: 'shared', label: 'Shared', icon: Share2 },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
              route === item.id ? 'text-[var(--primary)]' : 'text-[var(--muted)]'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <Toasts toasts={toasts} />
    </div>
  );
}

function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm space-y-2 lg:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          className={`rounded-xl bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--text)] shadow-xl ring-1 ${
            t.variant === 'error' ? 'ring-red-400/70' : 'ring-[var(--border)]'
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
