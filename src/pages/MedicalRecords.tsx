import { useMemo, useState } from 'react';
import { FileSearch } from 'lucide-react';
import RecordCard from '@/components/records/RecordCard';
import RecordFilters from '@/components/records/RecordFilters';
import Modal from '@/components/ui/Modal';
import { filterRecords } from '@/services/records';
import type { MedicalRecord, RecordCategory } from '@/types';

interface MedicalRecordsProps {
  records: MedicalRecord[];
  query: string;
  onQuery: (q: string) => void;
  onOpen: (record: MedicalRecord) => void;
  onDelete: (record: MedicalRecord) => void;
  onDownload: (record: MedicalRecord) => void;
}

export default function MedicalRecords({ records, query, onQuery, onOpen, onDelete, onDownload }: MedicalRecordsProps) {
  const [category, setCategory] = useState<RecordCategory | 'All'>('All');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingDelete, setPendingDelete] = useState<MedicalRecord | null>(null);

  const filtered = useMemo(
    () => filterRecords(records, query, category, sort, dateFrom, dateTo),
    [records, query, category, sort, dateFrom, dateTo],
  );
  const hasFilters = Boolean(query || category !== 'All' || dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Your Medical Library</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every report, prescription and consultation, organized in one place.
        </p>
      </header>

      <RecordFilters
        query={query}
        onQuery={onQuery}
        category={category}
        onCategory={setCategory}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
          <FileSearch className="h-12 w-12 text-[var(--muted)]" strokeWidth={1.4} />
          <h2 className="mt-4 font-display text-lg font-semibold text-[var(--text)]">
            {records.length === 0 ? 'No medical records yet' : 'No records match your search'}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            {records.length === 0
              ? 'Upload your first prescription or report and it will appear here.'
              : dateFrom && dateTo && dateFrom > dateTo
                ? 'The start date is after the end date. Adjust the range or clear the dates.'
                : 'Try a different search term, date range, or category.'}
          </p>
          {hasFilters ? (
            <button
              onClick={() => {
                onQuery('');
                setCategory('All');
                setDateFrom('');
                setDateTo('');
              }}
              className="mt-4 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RecordCard key={r.id} record={r} view="grid" onOpen={onOpen} onDownload={onDownload} onDelete={setPendingDelete} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RecordCard key={r.id} record={r} view="list" onOpen={onOpen} onDownload={onDownload} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      {pendingDelete && (
        <Modal open onClose={() => setPendingDelete(null)} labelledBy="records-delete-title">
          <h2 id="records-delete-title" className="font-display text-lg font-semibold text-[var(--text)]">
            Delete document?
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            “{pendingDelete.title}” will be removed from this browser session. Nothing is stored on a server, so it
            cannot be recovered — sample records return when you reload.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setPendingDelete(null)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete(pendingDelete);
                setPendingDelete(null);
              }}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
