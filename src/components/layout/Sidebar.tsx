import {
  Activity,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Share2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuthMode } from '@/hooks/useAuth';
import type { Route } from '@/types';

const NAV: { id: Route; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'records', label: 'Medical Records', icon: FileText },
  { id: 'upload', label: 'Upload Documents', icon: Upload },
  { id: 'history', label: 'Medical Timeline', icon: History },
  { id: 'shared', label: 'Shared Records', icon: Share2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  route: Route;
  recordCount: number;
  onNavigate: (route: Route) => void;
  onLogout: () => void;
  mode: AuthMode;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ route, recordCount, onNavigate, onLogout, mode, open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 px-5 pt-6 pb-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Activity className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-none text-[var(--text)]">MediVault</p>
            <p className="text-[11px] text-[var(--muted)]">Your Health. Your History.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = route === item.id || (item.id === 'records' && route === 'preview');
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-[var(--tint)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--text)]',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'records' && (
                  <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {recordCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <div className="rounded-xl bg-[var(--tint)] p-3 text-xs leading-relaxed text-[var(--muted)]">
            <p className="font-semibold text-[var(--text)]">{mode === 'demo' ? 'Demo mode' : 'Secure cloud mode'}</p>
            <p>
              {mode === 'demo'
                ? 'Records stay in this browser. Secure cloud storage is not connected.'
                : 'Records are stored in your private Supabase vault and scoped to your account.'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--text)]"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
