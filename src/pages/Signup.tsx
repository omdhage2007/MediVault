import { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/Navbar';
import type { AuthMode } from '@/hooks/useAuth';
import type { Theme } from '@/types';

interface RegisterResult {
  requiresVerification: boolean;
  message: string;
}

interface SignupProps {
  theme: Theme;
  onToggleTheme: () => void;
  mode: AuthMode;
  onRegister: (fullName: string, email: string, password: string) => Promise<RegisterResult>;
  onNavigate: (route: 'login' | 'landing' | 'dashboard') => void;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function Signup({ theme, onToggleTheme, mode, onRegister, onNavigate, notify }: SignupProps) {
  const isDemo = mode === 'demo';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setError('');
    setLoading(true);
    try {
      const result = await onRegister(fullName, email, password);
      if (result.requiresVerification) {
        setVerificationMessage(result.message);
        return;
      }
      notify(result.message);
      onNavigate('dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

  return (
    <div className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-center overflow-hidden p-10 lg:flex">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--primary)]/20 blur-3xl" />
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
            Create your secure vault in under a minute. Your prescriptions, lab reports and consultations — organised
            from day one.
          </p>
        </div>
      </div>

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
            {verificationMessage ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow)]">
                <MailCheck className="mx-auto h-10 w-10 text-[var(--primary)]" strokeWidth={1.6} aria-hidden />
                <h2 className="mt-3 font-display text-2xl font-bold text-[var(--text)]">Confirm your email</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{verificationMessage}</p>
                <button
                  onClick={() => onNavigate('login')}
                  className="mt-6 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  Go to sign in
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-3xl font-bold text-[var(--text)]">Create your account</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Start organising your medical history today.</p>

                <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
                  <div>
                    <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-[var(--text)]">Full name</label>
                    <input id="fullName" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Om Dhage" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-[var(--text)]">Email</label>
                    <input id="signup-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-[var(--text)]">Password</label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className={`${inputCls} pr-11`}
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
                    <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[var(--text)]">Confirm password</label>
                    <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--primary-hover)] disabled:opacity-70"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <p className="mt-4 rounded-xl bg-[var(--tint)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--muted)]">
                  {isDemo
                    ? 'Demo mode. No account is created on a server and no email is sent. This browser keeps a local password hash so you can sign in again.'
                    : 'Your account is created with Supabase Auth. We will email a confirmation link before your first sign-in. Passwords are hashed by Supabase and never stored by MediVault.'}
                </p>
                <p className="mt-6 text-center text-sm text-[var(--muted)]">
                  Already have an account?{' '}
                  <button onClick={() => onNavigate('login')} className="font-semibold text-[var(--primary)]">
                    Sign in
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
