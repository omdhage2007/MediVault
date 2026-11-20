import { useState } from 'react';
import { ArrowLeft, Download, Pencil, Plus, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import DocumentViewer from '@/components/records/DocumentViewer';
import Modal from '@/components/ui/Modal';
import { errorMessage } from '@/data/errors';
import { useRecordFile } from '@/hooks/useRecordFile';
import type { AuthMode } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import type { MedicalRecord } from '@/types';

interface DocumentPreviewProps {
  userId: string;
  mode: AuthMode;
  record: MedicalRecord | null;
  onBack: () => void;
  onDelete: (record: MedicalRecord) => Promise<boolean>;
  onShare: (record: MedicalRecord) => void;
  onSave: (record: MedicalRecord) => Promise<void>;
  onDownload: (record: MedicalRecord) => void;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function DocumentPreview({
  userId,
  mode,
  record,
  onBack,
  onDelete,
  onShare,
  onSave,
  onDownload,
  notify,
}: DocumentPreviewProps) {
  const file = useRecordFile(userId, record);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState('');
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [medicines, setMedicines] = useState<MedicalRecord['extracted']['medicines']>([]);

  if (!record) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-[var(--text)]">No document selected</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Open a document from your Medical Library to preview it here.</p>
        <button onClick={onBack} className="mt-5 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white">
          Back to Records
        </button>
      </div>
    );
  }

  const ex = record.extracted;
  const ocrLabel =
    ex.ocrStatus === 'simulated'
      ? 'Demo data'
      : ex.ocrStatus === 'completed'
        ? ex.verificationStatus === 'verified'
          ? 'Verified'
          : 'Unverified'
        : ex.ocrStatus === 'failed'
          ? 'OCR failed'
          : 'Processing';
  const showReviewed = ex.ocrStatus === 'completed' && ex.verificationStatus === 'verified';

  function startEdit() {
    setDoctor(record.doctorName);
    setHospital(record.hospital);
    setNotes(record.notes);
    setOcrText(ex.extractedText ?? '');
    setMedicines(ex.medicines);
    setEditing(true);
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        ...record,
        doctorName: doctor,
        hospital,
        notes,
        extracted: {
          ...ex,
          doctorName: doctor,
          hospital,
          extractedText: ocrText.trim(),
          medicines: medicines.filter((medicine) => medicine.name.trim().length > 0),
        },
      });
      setEditing(false);
      notify(mode === 'demo' ? 'Record updated in the browser-local database.' : 'Record updated.');
    } catch (caught) {
      notify(errorMessage(caught, 'Could not update this record.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function markVerified() {
    try {
      await onSave({
        ...record,
        extracted: { ...ex, verificationStatus: 'verified' },
      });
      notify('Marked as reviewed by you. OCR results are never verified automatically.');
    } catch (caught) {
      notify(errorMessage(caught, 'Could not update the verification status.'), 'error');
    }
  }

  async function deleteRecord() {
    if (deleting) return;
    setDeleting(true);
    const deleted = await onDelete(record);
    setDeleting(false);
    setConfirmDelete(false);
    if (deleted) onBack();
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Records
      </button>

      {record.isSample && (
        <p className="rounded-2xl border border-amber-300 bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)]">
          <span className="font-semibold">Demonstration record.</span> This sample has no original file. Edit or delete
          it freely; sample data is only inserted during the first demo setup.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DocumentViewer record={record} file={file} onDownload={onDownload} onNotify={notify} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Extracted Information</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  showReviewed ? 'bg-[var(--tint)] text-[var(--primary)]' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {ocrLabel}
              </span>
            </div>

            {!showReviewed && (
              <p className="mt-3 rounded-xl bg-[var(--tint)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                {ex.ocrStatus === 'simulated'
                  ? 'These values were not read from a document. They are demo placeholders you can edit.'
                  : 'OCR suggestions are unverified. Check every value against the original document.'}
              </p>
            )}

            {editing ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Doctor name
                  <input value={doctor} onChange={(e) => setDoctor(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--base)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
                </label>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Hospital / Clinic
                  <input value={hospital} onChange={(e) => setHospital(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--base)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
                </label>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Notes
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--base)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => void saveEdit()} disabled={saving} className="flex-1 rounded-full bg-[var(--primary)] py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm font-medium text-[var(--text)]">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Doctor</dt><dd className="text-right font-medium text-[var(--text)]">{record.doctorName}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Hospital</dt><dd className="text-right font-medium text-[var(--text)]">{record.hospital}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Record date</dt><dd className="text-right font-medium text-[var(--text)]">{formatDate(ex.prescriptionDate)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Category</dt><dd className="text-right font-medium text-[var(--text)]">{ex.category}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Original file</dt><dd className="text-right font-medium text-[var(--text)]">{record.hasFile ? record.fileName : 'Not attached'}</dd></div>
                {record.notes && (
                  <div><dt className="text-[var(--muted)]">Notes</dt><dd className="mt-0.5 text-[var(--text)]">{record.notes}</dd></div>
                )}
              </dl>
            )}

            {!editing && ex.ocrStatus === 'completed' && ex.verificationStatus !== 'verified' && (
              <button
                onClick={() => void markVerified()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--tint)]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden /> I have checked these details
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
            <h2 className="font-display text-lg font-semibold text-[var(--text)]">Extracted text</h2>
            {editing ? (
              <textarea
                rows={6}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Paste or correct the text read from the document…"
                className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--base)] px-3 py-2 text-xs text-[var(--text)] outline-none"
              />
            ) : ex.extractedText ? (
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--tint)] p-3 text-xs leading-relaxed text-[var(--text)]">
                {ex.extractedText}
              </pre>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">
                No OCR text is stored for this record. You can add it while editing.
              </p>
            )}
            {(ex.patientName || (ex.labTests && ex.labTests.length > 0)) && !editing && (
              <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                {ex.patientName && <p>Patient: <span className="text-[var(--text)]">{ex.patientName}</span></p>}
                {ex.labTests && ex.labTests.length > 0 && (
                  <p>Tests detected: <span className="text-[var(--text)]">{ex.labTests.join(', ')}</span></p>
                )}
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
              OCR output is for document organization only. It is not medical advice and is never verified automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[var(--text)]">Medicines</h2>
              {editing && (
                <button
                  type="button"
                  onClick={() => setMedicines((previous) => [...previous, { name: '', dosage: '' }])}
                  className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]"
                >
                  <Plus className="h-3 w-3" aria-hidden /> Add
                </button>
              )}
            </div>
            {editing ? (
              <div className="mt-3 space-y-2">
                {medicines.length === 0 && <p className="text-xs text-[var(--muted)]">No medicines recorded.</p>}
                {medicines.map((medicine, index) => (
                  <div key={index} className="space-y-1 rounded-xl bg-[var(--tint)] p-2">
                    <input
                      value={medicine.name}
                      aria-label={`Medicine ${index + 1} name`}
                      onChange={(e) => setMedicines((previous) => previous.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                    />
                    <div className="flex gap-1">
                      <input
                        value={medicine.dosage}
                        aria-label={`Medicine ${index + 1} dosage`}
                        onChange={(e) => setMedicines((previous) => previous.map((item, i) => (i === index ? { ...item, dosage: e.target.value } : item)))}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMedicines((previous) => previous.filter((_, i) => i !== index))}
                        className="rounded-lg px-2 text-[11px] font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : ex.medicines.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {ex.medicines.map((medicine, index) => (
                  <li key={`${medicine.name}-${index}`} className="rounded-xl bg-[var(--tint)] px-3 py-2 text-sm">
                    <p className="font-medium text-[var(--text)]">{medicine.name}</p>
                    <p className="text-xs text-[var(--muted)]">{medicine.dosage}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">No medicines recorded.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow)]">
            <button
              onClick={() => onDownload(record)}
              disabled={!record.hasFile}
              title={record.hasFile ? 'Download the original file' : 'No original file attached'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Download
            </button>
            <button onClick={() => onShare(record)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--tint)]">
              <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
            </button>
            <button onClick={startEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--tint)]">
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(false)} labelledBy="preview-delete-title">
          <h2 id="preview-delete-title" className="font-display text-lg font-semibold text-[var(--text)]">Delete document?</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            “{record.title}” and its stored original file will be permanently removed from{' '}
            {mode === 'demo' ? 'this browser.' : 'your vault and private storage.'}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              onClick={() => void deleteRecord()}
              disabled={deleting}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
