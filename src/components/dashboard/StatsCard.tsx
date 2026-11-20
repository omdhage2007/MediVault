import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsCardProps {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  trend: number[]; // sparkline points 0–100
  delay?: number;
}

export default function StatsCard({ label, value, hint, icon: Icon, trend, delay = 0 }: StatsCardProps) {
  const points = trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${28 - (v / 100) * 24}`).join(' ');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <svg viewBox="0 0 100 30" className="h-8 w-24" aria-hidden>
          <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-4 font-display text-3xl font-bold text-[var(--text)]">{value}</p>
      <p className="text-sm font-medium text-[var(--text)]">{label}</p>
      <p className="text-xs text-[var(--muted)]">{hint}</p>
    </motion.div>
  );
}
