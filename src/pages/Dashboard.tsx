import { FileText, Pill, Share2, Upload, Microscope } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentRecords from '@/components/dashboard/RecentRecords';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import type { AuthMode } from '@/hooks/useAuth';
import type { MedicalRecord, Profile } from '@/types';

interface DashboardProps {
  profile: Profile;
  mode: AuthMode;
  records: MedicalRecord[];
  sharedCount: number;
  onOpen: (record: MedicalRecord) => void;
  onNavigate: (route: 'upload' | 'records' | 'history') => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ profile, mode, records, sharedCount, onOpen, onNavigate }: DashboardProps) {
  const firstName = profile.fullName.split(' ')[0];
  const prescriptions = records.filter((r) => r.category === 'Prescriptions').length;
  const labs = records.filter((r) => r.category === 'Blood Reports').length;
  const byCategory = (['Prescriptions', 'Blood Reports', 'X-Ray Reports', 'Scans', 'Consultation Records'] as const).map(
    (c) => ({ label: c, count: records.filter((r) => r.category === c).length }),
  );
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count));

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--primary)] p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/85">
            Your health records are organized and ready whenever you need them.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#008080] hover:bg-[#E6F2F2]"
            >
              <Upload className="h-4 w-4" /> Upload Prescription
            </button>
            <button
              onClick={() => onNavigate('records')}
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              View Medical Records
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total Medical Records" value={records.length} hint="Across all categories" icon={FileText} trend={[30, 45, 40, 60, 55, 75, 80]} />
        <StatsCard label="Prescriptions" value={prescriptions} hint="Active prescriptions" icon={Pill} trend={[20, 35, 30, 50, 45, 60, 65]} delay={0.05} />
        <StatsCard label="Laboratory Reports" value={labs} hint="Blood & lab panels" icon={Microscope} trend={[10, 25, 40, 35, 55, 50, 70]} delay={0.1} />
        <StatsCard
          label="Shared Documents"
          value={sharedCount}
          hint={mode === 'demo' ? 'Local demo shares' : 'Active share links'}
          icon={Share2}
          trend={[5, 15, 10, 30, 25, 40, 45]}
          delay={0.15}
        />
      </section>

      {/* Two-column content */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <RecentRecords records={records} onOpen={onOpen} onUpload={() => onNavigate('upload')} />
          {/* Health overview */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
            <h2 className="font-display text-lg font-semibold text-[var(--text)]">Records by Category</h2>
            <div className="mt-4 space-y-3">
              {byCategory.map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text)]">{c.label}</span>
                    <span className="text-[var(--muted)]">{c.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--tint)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <ActivityTimeline records={records} onOpen={onOpen} />
          {/* Quick upload widget */}
          <button
            onClick={() => onNavigate('upload')}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--primary)]/50 bg-[var(--card)] p-6 text-center shadow-[var(--shadow)] transition hover:border-[var(--primary)] hover:bg-[var(--tint)]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--tint)] text-[var(--primary)]">
              <Upload className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold text-[var(--text)]">Quick Upload</span>
            <span className="text-xs text-[var(--muted)]">Drop a prescription or report — PDF, JPG or PNG</span>
          </button>
        </div>
      </section>
    </div>
  );
}
