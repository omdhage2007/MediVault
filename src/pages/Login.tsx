import { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Eye, EyeOff, FileText, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/Navbar';
import type { AuthMode } from '@/hooks/useAuth';
import type { Theme } from '@/types';

interface LoginProps {
  theme: Theme;
  onToggleTheme: () => void;
  mode: AuthMode;
  googleEnabled: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<string>;
  onNavigate: (route: 'signup' | 'landing' | 'reset-password' | 'dashboard') => void;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function Login({
  theme,
  onToggleTheme,
  mode,
  googleEnabled,
  onSubmit,
  onGoogle,
  onForgotPassword,
  onNavigate,
  notify,
}: LoginProps) {
  const isDemo = mode === 'demo';
  const [email, setEmail] = useState(isDemo ? 'odhage3@gmail.com' : '');
  const [password, setPassword] = useState(isDemo ? 'Demo1234' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(email, password);
      notify(isDemo ? 'Local demo session started — no real sign-in took place.' : 'Signed in.');
      onNavigate('dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address first, then request a reset link.');
      return;
    }
    setResetting(true);
    try {
      const message = await onForgotPassword(email);
      notify(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send a reset email.');
    } finally {
      setResetting(false);
    }
  }

  async function googleSignIn() {
    if (!googleEnabled) return;
    setError('');
    setGoogleLoading(true);
    try {
      await onGoogle();
      onNavigate('dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in could not start.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-2">
      {/* Left — illustration */}
      <div className="relative hidden flex-col justify-center overflow-hidden p-10 lg:flex">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--primary)]/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="relative">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] text-white">
              <Activity className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-xl font-bold text-[var(--text)]">MediVault</span>
          </button>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-10 font-display text-4xl font-bold leading-tight text-[var(--text)] xl:text-5xl"
          >
            Your Health Journey, All in One Place.
          </motion.h1>
          <p className="mt-4 max-w-md leading-relaxed text-[var(--muted)]">
            Every prescription, lab report and consultation — organised, searchable and ready whenever you or your
            doctor need it.
          </p>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-10 w-72 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--tint)] text-[var(--primary)]">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">General Prescription</p>
                <p className="text-xs text-[var(--muted)]">Dr. Meera Kulkarni · 12 Nov 2026</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              Paracetamol 650 mg — 1 tablet, three times a day after food.
            </p>
          </motion.div>
          <div className="absolute right-8 top-24 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-white shadow-xl">
            +
          </div>
        </div>
      </div>

      {/* Right — glass auth panel */}
      <div className="flex flex-col bg-[var(--base)] px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
              <Activity className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold text-[var(--text)]">MediVault</span>
          </span>
          <span className="hidden lg:block" />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="font-display text-3xl font-bold text-[var(--text)]">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Sign in to your MediVault account.</p>

            <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text)]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 pr-11 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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

              <div className="flex items-center justify-end text-sm">
                <button
                  type="button"
                  onClick={() => void forgotPassword()}
                  disabled={resetting}
                  className="font-medium text-[var(--primary)] disabled:opacity-60"
                >
                  {resetting ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--primary-hover)] disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <button
              onClick={() => void googleSignIn()}
              disabled={!googleEnabled || googleLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue with Google
              <span className="rounded-full bg-[var(--tint)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                {isDemo ? 'Demo' : googleEnabled ? 'OAuth' : 'Unavailable'}
              </span>
            </button>
            {!isDemo && !googleEnabled && (
              <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
                Google is not enabled for this Supabase project. Email and password sign-in works.
              </p>
            )}

            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              Don&apos;t have an account?{' '}
              <button onClick={() => onNavigate('signup')} className="font-semibold text-[var(--primary)]">
                Create account
              </button>
            </p>

            {isDemo ? (
              <p className="mt-6 rounded-xl bg-[var(--tint)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--muted)]">
                Demo login — email <span className="font-semibold text-[var(--text)]">odhage3@gmail.com</span> · password{' '}
                <span className="font-semibold text-[var(--text)]">Demo1234</span>
                <br />
                Demo only: no real account is created and nothing is sent to a server. Your details stay in this browser.
              </p>
            ) : (
              <p className="mt-6 rounded-xl bg-[var(--tint)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--muted)]">
                Accounts use Supabase Auth. New accounts must confirm their email before signing in. Your session is
                restored automatically when you return.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
