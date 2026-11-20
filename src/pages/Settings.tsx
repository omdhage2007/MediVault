import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { AuthMode } from '@/hooks/useAuth';
import type { Profile } from '@/types';

type Section = 'profile' | 'account' | 'security' | 'privacy' | 'notifications';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Personal Profile' },
  { id: 'account', label: 'Account Information' },
  { id: 'security', label: 'Security' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'notifications', label: 'Notifications' },
];

interface SettingsProps {
  profile: Profile;
  mode: AuthMode;
  onSave: (profile: Profile) => Promise<void>;
  onChangePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  onEmailChange: (email: string) => Promise<string>;
  onPasswordReset: () => Promise<string>;
  onAvatarUpload: (file: File) => Promise<void>;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function Settings({
  profile,
  mode,
  onSave,
  onChangePassword,
  onEmailChange,
  onPasswordReset,
  onAvatarUpload,
  notify,
}: SettingsProps) {
  const isDemo = mode === 'demo';
  const [section, setSection] = useState<Section>('profile');
  const [form, setForm] = useState<Profile>(profile);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--base)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

  async function saveProfile() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(form);
      notify(isDemo ? 'Saved in this browser only — nothing is sent to a server.' : 'Profile saved.');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveEmail() {
    if (!form.email.includes('@')) {
      notify('Enter a valid email address.', 'error');
      return;
    }
    if (form.email.trim().toLowerCase() === profile.email.trim().toLowerCase()) {
      notify('That is already your email address.');
      return;
    }
    setSavingEmail(true);
    try {
      const message = await onEmailChange(form.email.trim());
      notify(message);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not update your email.', 'error');
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    if (newPw.length < 8) return notify('New password must be at least 8 characters.', 'error');
    if (newPw !== confirmPw) return notify('New passwords do not match.', 'error');
    if (isDemo) return notify('Password changes are not connected in local demo mode.', 'error');
    setSavingPassword(true);
    try {
      await onChangePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      notify('Password updated.');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not change your password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function sendPasswordReset() {
    setSendingReset(true);
    try {
      notify(await onPasswordReset());
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not send the reset email.', 'error');
    } finally {
      setSendingReset(false);
    }
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      await onAvatarUpload(file);
      notify('Profile photo updated.');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not upload the photo.', 'error');
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = '';
    }
  }

  function Toggle({
    checked,
    onChange,
    label,
    disabled = false,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--accent)]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    );
  }

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your profile, security and preferences.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-medium ${
                section === s.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] sm:p-6 lg:col-span-3">
          {section === 'profile' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Personal Profile</h2>

              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--tint)] text-lg font-bold text-[var(--primary)]">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials || 'MV'
                  )}
                </div>
                <div>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void uploadAvatar(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInput.current?.click()}
                    disabled={isDemo || avatarBusy}
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--base)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {avatarBusy ? 'Uploading…' : 'Change photo'}
                  </button>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {isDemo
                      ? 'Photo upload needs Supabase and is unavailable in local demo mode.'
                      : 'JPG, PNG or WebP up to 2 MB. Profile photos are not medical documents.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[var(--text)]">Full name
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={`${inputCls} mt-1`} />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">Date of birth
                  <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={`${inputCls} mt-1`} />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">Blood group
                  <input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={`${inputCls} mt-1`} />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">Phone
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputCls} mt-1`} />
                </label>
                <label className="block text-sm font-medium text-[var(--text)] sm:col-span-2">Address
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputCls} mt-1`} />
                </label>
              </div>
              <button
                onClick={() => void saveProfile()}
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}

          {section === 'account' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Account Information</h2>
              <label className="block text-sm font-medium text-[var(--text)]">Email address
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} mt-1`} />
              </label>
              <p className="text-xs text-[var(--muted)]">
                {isDemo
                  ? 'Demo mode — this changes the address shown in this browser. No real account exists, and no verification email is sent.'
                  : 'Changing your email sends a confirmation link from Supabase. The new address only becomes active after you confirm it.'}
              </p>
              <button
                onClick={() => void saveEmail()}
                disabled={savingEmail}
                className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingEmail ? 'Updating…' : 'Update email'}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Password Management</h2>
              <p className="text-sm text-[var(--muted)]">
                {isDemo
                  ? 'Password changes are not connected in local demo mode. The fields below only validate your entries.'
                  : 'Enter your current password, then choose a new one. Supabase re-authenticates before the change.'}
              </p>
              <label className="block text-sm font-medium text-[var(--text)]">Current password
                <input type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">New password
                <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">Confirm new password
                <input type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void changePassword()}
                  disabled={savingPassword || isDemo}
                  className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savingPassword ? 'Updating…' : 'Change password'}
                </button>
                <button
                  onClick={() => void sendPasswordReset()}
                  disabled={sendingReset}
                  className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--tint)] disabled:opacity-60"
                >
                  {sendingReset ? 'Sending…' : 'Email me a reset link'}
                </button>
              </div>
              <div className="rounded-xl bg-[var(--tint)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--text)]">Two-factor authentication</span>
                  <Toggle checked={false} onChange={() => undefined} label="Two-factor authentication (unavailable)" disabled />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Not available yet — this switch is disabled and does not protect the account.
                </p>
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Privacy</h2>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {isDemo
                  ? 'Demo mode — records and files are stored in this browser’s IndexedDB, not on a server. Clearing site data removes them. Sharing only works in the browser that created it.'
                  : 'Documents are stored in a private Supabase bucket under your user ID. Row Level Security scopes every query to your account, and downloads use short-lived signed URLs. Share links are hashed, expire automatically and can be revoked.'}
              </p>
              <div className="flex items-center justify-between rounded-xl bg-[var(--tint)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--text)]">Allow anonymous usage analytics <span className="font-normal text-[var(--muted)]">(demo)</span></span>
                <Toggle checked={false} onChange={() => notify('Analytics are not collected, and this preference is not saved.')} label="Allow anonymous usage analytics" />
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Notifications</h2>
              <div className="flex items-center justify-between rounded-xl bg-[var(--tint)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--text)]">Email notifications</span>
                <Toggle checked={form.emailNotifications} onChange={(v) => setForm({ ...form, emailNotifications: v })} label="Email notifications" />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--tint)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--text)]">Alerts when a record is shared</span>
                <Toggle checked={form.shareAlerts} onChange={(v) => setForm({ ...form, shareAlerts: v })} label="Alerts when a record is shared" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                These preferences are saved to your profile. Email delivery is not connected yet, so no notification emails are sent.
              </p>
              <button onClick={() => void saveProfile()} disabled={saving} className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
