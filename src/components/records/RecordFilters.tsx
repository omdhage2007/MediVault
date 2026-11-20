import { LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecordCategory } from '@/types';

export const CATEGORIES: (RecordCategory | 'All')[] = [
  'All',
  'Prescriptions',
  'Blood Reports',
  'X-Ray Reports',
  'Scans',
  'Consultation Records',
  'Other Documents',
];

interface RecordFiltersProps {
  query: string;
  onQuery: (q: string) => void;
  category: RecordCategory | 'All';
  onCategory: (c: RecordCategory | 'All') => void;
  sort: 'newest' | 'oldest';
  onSort: (s: 'newest' | 'oldest') => void;
  view: 'grid' | 'list';
  onView: (v: 'grid' | 'list') => void;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
  resultCount: number;
}

export default function RecordFilters({
  query,
  onQuery,
  category,
  onCategory,
  sort,
  onSort,
  view,
  onView,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  resultCount,
}: RecordFiltersProps) {
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search documents, doctors, hospitals…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as 'newest' | 'oldest')}
          aria-label="Sort records"
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--text)] outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <div className="flex overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]">
          <button
            onClick={() => onView('grid')}
            aria-label="Grid view"
            className={cn('p-2.5', view === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)]')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onView('list')}
            aria-label="List view"
            className={cn('p-2.5', view === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)]')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFrom(e.target.value)}
            aria-label="Filter from visit date"
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateTo(e.target.value)}
            aria-label="Filter to visit date"
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              onDateFrom('');
              onDateTo('');
            }}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
          >
            Clear dates
          </button>
        )}
        {dateInvalid && (
          <p className="text-xs font-medium text-red-600">The start date is after the end date.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => onCategory(c)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
              category === c
                ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]',
            )}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--muted)]">
          {resultCount} record{resultCount === 1 ? '' : 's'} found
        </span>
      </div>
    </div>
  );
}
