import { useState } from 'react';
import { Activity, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/Navbar';
import type { AuthMode } from '@/hooks/useAuth';
import type { Theme } from '@/types';

interface ResetPasswordProps {
  theme: Theme;
  onToggleTheme: () => void;
  mode: AuthMode;
  onUpdatePassword: (password: string) => Promise<void>;
  onNavigate: (route: 'login' | 'landing' | 'dashboard') => void;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function ResetPassword({
  theme,
  onToggleTheme,
  mode,
  onUpdatePassword,
  onNavigate,
  notify,
}: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await onUpdatePassword(password);
      setDone(true);
      notify('Password updated. You can continue to your vault.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The password could not be updated. Request a new reset link.',
      );
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 pr-11 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--base)]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Activity className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold text-[var(--text)]">MediVault</span>
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--tint)] text-[var(--primary)]">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>

          {done ? (
            <>
              <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text)]">Password updated</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Your new password is active. Continue to your vault to use this session.
              </p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="mt-6 w-full rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                Continue to MediVault
              </button>
            </>
          ) : (
            <>
              <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text)]">Choose a new password</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {mode === 'demo'
                  ? 'Password recovery needs a configured Supabase project. This build is running in local demo mode.'
                  : 'Enter a new password for your account. Reset links expire quickly and can only be used once.'}
              </p>

              <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-[var(--text)]">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={mode === 'demo'}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-[var(--text)]">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={mode === 'demo'}
                    className={`${inputCls} pr-4`}
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">
                    {error}
                    {error.toLowerCase().includes('expired') && (
                      <button
                        onClick={() => onNavigate('login')}
                        className="mt-1 block font-semibold underline"
                      >
                        Request a new reset email
                      </button>
                    )}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || mode === 'demo'}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>

              <button
                onClick={() => onNavigate('login')}
                className="mt-4 w-full text-center text-sm font-semibold text-[var(--primary)]"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
