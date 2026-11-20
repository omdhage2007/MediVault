import { Bell, HelpCircle, Menu, Moon, Search, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile, Theme } from '@/types';

interface NavbarProps {
  theme: Theme;
  onToggleTheme: () => void;
  profile: Profile;
  query: string;
  onQuery: (q: string) => void;
  onMenu: () => void;
  onHelp: () => void;
  onBell: () => void;
  onProfile: () => void;
}

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
      className={cn(
        'relative flex h-7 w-12 shrink-0 items-center rounded-full border border-[var(--border)] px-1 transition',
        dark ? 'justify-end bg-[var(--card)]' : 'justify-start bg-[var(--tint)]',
      )}
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--primary)] text-white shadow">
        {dark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </span>
      <span className="sr-only">{dark ? 'Dark mode on' : 'Light mode on'}</span>
    </button>
  );
}

export default function Navbar({
  theme,
  onToggleTheme,
  profile,
  query,
  onQuery,
  onMenu,
  onHelp,
  onBell,
  onProfile,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--tint)] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden min-w-0 flex-1 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search records, doctors, hospitals…"
            className="w-full max-w-md rounded-full border border-[var(--border)] bg-[var(--base)] py-2 pl-9 pr-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="min-w-0 flex-1 sm:hidden" />

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <button
          onClick={onBell}
          aria-label="Notifications (demo — none available)"
          className="relative rounded-full p-2 text-[var(--muted)] hover:bg-[var(--tint)]"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          onClick={onHelp}
          aria-label="Help (demo — not available)"
          className="hidden rounded-full p-2 text-[var(--muted)] hover:bg-[var(--tint)] sm:block"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <button onClick={onProfile} className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--tint)]">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
            {profile.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-sm font-semibold leading-tight text-[var(--text)]">{profile.fullName}</span>
            <span className="block text-xs leading-tight text-[var(--muted)]">{profile.email}</span>
          </span>
        </button>
      </div>
    </header>
  );
}
