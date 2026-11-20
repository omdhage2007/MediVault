import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, ScanText, UploadCloud } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { CATEGORIES } from '@/components/records/RecordFilters';
import { errorMessage } from '@/data/errors';
import type { AuthMode } from '@/hooks/useAuth';
import type { NewRecordDetails } from '@/hooks/useRecords';
import { validateDocumentFile } from '@/lib/files';
import { sha256Hex } from '@/lib/hash';
import { formatFileSize } from '@/lib/utils';
import { runOcr, type OcrOutcome } from '@/services/ocrEngine';
import type { ExtractedData, MedicalRecord, Medicine, RecordCategory } from '@/types';

const DEMO_STEPS = ['Checking file', 'Hashing file', 'Checking for duplicates', 'Saving to browser storage'];
const CLOUD_STEPS = ['Checking file', 'Hashing file', 'Checking for duplicates', 'Uploading to private storage'];

interface OcrState {
  status: 'idle' | 'running' | 'ready' | 'error';
  progress: number;
  label: string;
  result?: OcrOutcome;
  message?: string;
}

interface UploadDocumentsProps {
  mode: AuthMode;
  onCreateRecord: (details: NewRecordDetails, file: File, hash: string) => Promise<MedicalRecord>;
  findByHash: (hash: string) => Promise<MedicalRecord[]>;
  onNavigate: (route: 'records') => void;
  notify: (msg: string, variant?: 'info' | 'error') => void;
}

export default function UploadDocuments({
  mode,
  onCreateRecord,
  findByHash,
  onNavigate,
  notify,
}: UploadDocumentsProps) {
  const isDemo = mode === 'demo';
  const steps = isDemo ? DEMO_STEPS : CLOUD_STEPS;
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('Prescriptions');
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ record: MedicalRecord; hash: string } | null>(null);
  const [ocr, setOcr] = useState<OcrState>({ status: 'idle', progress: 0, label: '' });
  const [ocrText, setOcrText] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const ocrRun = useRef(0);

  function resetOcr() {
    ocrRun.current += 1;
    setOcr({ status: 'idle', progress: 0, label: '' });
    setOcrText('');
    setMedicines([]);
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    const validation = validateDocumentFile(f);
    if (!validation.ok) {
      notify(validation.message, 'error');
      return;
    }
    setFile(f);
    setTitle((current) => current || f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    setStep(-1);
    setProgress(0);
    setError('');
    setDuplicate(null);
    resetOcr();
  }

  async function startOcr() {
    if (!file) {
      notify('Choose a PDF, JPG, or PNG file first.', 'error');
      return;
    }
    const run = ++ocrRun.current;
    setOcr({ status: 'running', progress: 0, label: 'Preparing OCR engine…' });
    try {
      const result = await runOcr(file, (update) => {
        if (ocrRun.current !== run) return;
        setOcr({
          status: 'running',
          progress: update.progress,
          label: update.label,
        });
      });
      if (ocrRun.current !== run) return;
      setOcr({ status: 'ready', progress: 100, label: 'Extraction complete', result });
      setOcrText(result.text);
      setMedicines(result.metadata.medicines);
      if (result.metadata.medicines.length === 0 && result.metadata.labTests.length > 0) {
        setMedicines(result.metadata.labTests.map((test) => ({ name: test, dosage: 'Lab test' })));
      }
      notify('Text extracted. Review the suggestions before saving — nothing has been verified.');
    } catch (caught) {
      if (ocrRun.current !== run) return;
      setOcr({
        status: 'error',
        progress: 0,
        label: '',
        message: errorMessage(caught, 'OCR could not read this document. Enter the details manually.'),
      });
    }
  }

  function applySuggestions() {
    const result = ocr.result;
    if (!result) return;
    if (!doctorName.trim() && result.metadata.doctorName) setDoctorName(result.metadata.doctorName);
    if (!hospital.trim() && result.metadata.hospital) setHospital(result.metadata.hospital);
    if (result.metadata.prescriptionDate) setVisitDate(result.metadata.prescriptionDate);
    if (!title.trim() && result.metadata.documentTitle) setTitle(result.metadata.documentTitle);
    notify('Suggestions applied where fields were empty. Check them before saving.');
  }

  function updateMedicine(index: number, patch: Partial<Medicine>) {
    setMedicines((previous) =>
      previous.map((medicine, i) => (i === index ? { ...medicine, ...patch } : medicine)),
    );
  }

  function removeMedicine(index: number) {
    setMedicines((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSave(allowDuplicate = false) {
    if (busy) return;
    if (!file) {
      setError('Choose a PDF, JPG, or PNG file.');
      return;
    }
    const validation = validateDocumentFile(file);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    if (!title.trim()) {
      setError('Enter a document title.');
      return;
    }
    if (!visitDate) {
      setError('Choose the record date.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      setStep(0);
      setProgress(15);
      const hash = await sha256Hex(file);

      setStep(1);
      setProgress(40);
      if (!allowDuplicate) {
        const duplicates = await findByHash(hash);
        if (duplicates.length > 0) {
          setDuplicate({ record: duplicates[0], hash });
          setProgress(0);
          setStep(-1);
          return;
        }
      }

      setStep(2);
      setProgress(70);
      const extracted: ExtractedData = {
        doctorName: doctorName.trim(),
        hospital: hospital.trim() || 'Not specified',
        prescriptionDate: visitDate,
        medicines,
        category,
        ocrStatus: ocr.status === 'ready' ? 'completed' : 'simulated',
        extractedText: ocrText.trim(),
        patientName: ocr.result?.metadata.patientName ?? '',
        labTests: ocr.result?.metadata.labTests ?? [],
        verificationStatus: 'unverified',
      };

      setStep(3);
      setProgress(90);
      await onCreateRecord(
        {
          title: title.trim(),
          category,
          doctorName: doctorName.trim() || 'Not specified',
          hospital: hospital.trim() || 'Not specified',
          visitDate,
          notes: notes.trim(),
          extracted,
        },
        file,
        hash,
      );

      setProgress(100);
      notify(isDemo ? 'Document saved in the browser-local database.' : 'Document and original file saved to your vault.');
      onNavigate('records');
    } catch (caught) {
      const message = errorMessage(caught, 'Could not save the document.');
      setError(message);
      notify(message, 'error');
      setStep(-1);
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Bring Your Medical Records Together.</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isDemo
            ? 'Upload your prescriptions and reports. MediVault organizes the information in this browser.'
            : 'Upload your prescriptions and reports. Originals go to private storage and metadata stays scoped to your account.'}
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragOver ? 'border-[var(--primary)] bg-[var(--tint)]' : 'border-[var(--primary)]/40 bg-[var(--card)]'
        }`}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--tint)] text-[var(--primary)]">
          <UploadCloud className="h-8 w-8" strokeWidth={1.6} aria-hidden />
        </span>
        <p className="mt-4 max-w-full break-all font-display text-lg font-semibold text-[var(--text)]">
          {file ? file.name : 'Drag & drop your document here'}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">PDF, JPG, JPEG and PNG · up to 20 MB</p>
        {file && <p className="mt-1 text-xs text-[var(--muted)]">{formatFileSize(Math.max(1, Math.round(file.size / 1024)))}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            <FileUp className="h-4 w-4" aria-hidden /> Browse files
          </button>
          {file && (
            <button
              type="button"
              onClick={() => void startOcr()}
              disabled={ocr.status === 'running'}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ocr.status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ScanText className="h-4 w-4" aria-hidden />
              )}
              {ocr.status === 'running' ? 'Reading document…' : 'Extract text (OCR)'}
            </button>
          )}
        </div>
      </div>

      {busy && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--text)]">{steps[Math.max(0, step)]}</span>
            <span className="text-[var(--muted)]">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--tint)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ol className="mt-4 flex flex-wrap gap-2">
            {steps.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  i < step
                    ? 'bg-[var(--tint)] text-[var(--primary)]'
                    : i === step
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--tint)] text-[var(--muted)]'
                }`}
              >
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {ocr.status === 'running' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--text)]">Reading document text</span>
            <span className="text-[var(--muted)]">{ocr.progress}%</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{ocr.label}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--tint)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${ocr.progress}%` }} />
          </div>
        </div>
      )}

      {ocr.status === 'error' && (
        <p className="rounded-2xl border border-amber-300 bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)]">
          <span className="font-semibold">OCR unavailable.</span> {ocr.message} You can still enter the details manually.
        </p>
      )}

      {ocr.status === 'ready' && ocr.result && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--text)]">
              <ScanText className="h-5 w-5 text-[var(--primary)]" aria-hidden /> Extracted text
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Unverified
              </span>
            </h2>
            <button
              type="button"
              onClick={applySuggestions}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--tint)]"
            >
              Apply detected fields
            </button>
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            OCR output is a suggestion, not verified medical information. Check every value and correct it before
            relying on it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="rounded-xl bg-[var(--tint)] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="block font-semibold text-[var(--text)]">Doctor</span>
              {ocr.result.metadata.doctorName || 'Not detected'}
            </p>
            <p className="rounded-xl bg-[var(--tint)] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="block font-semibold text-[var(--text)]">Hospital / clinic</span>
              {ocr.result.metadata.hospital || 'Not detected'}
            </p>
            <p className="rounded-xl bg-[var(--tint)] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="block font-semibold text-[var(--text)]">Patient</span>
              {ocr.result.metadata.patientName || 'Not detected'}
            </p>
            <p className="rounded-xl bg-[var(--tint)] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="block font-semibold text-[var(--text)]">Date</span>
              {ocr.result.metadata.prescriptionDate || 'Not detected'}
            </p>
          </div>
          <label className="block text-sm font-medium text-[var(--text)]">
            Extracted text (editable)
            <textarea
              rows={5}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className={`${inputCls} mt-1`}
            />
          </label>
          {medicines.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Medicines & tests</h3>
              <div className="mt-2 space-y-2">
                {medicines.map((medicine, index) => (
                  <div key={index} className="flex flex-col gap-2 rounded-xl bg-[var(--tint)] p-2 sm:flex-row">
                    <input
                      value={medicine.name}
                      onChange={(e) => updateMedicine(index, { name: e.target.value })}
                      aria-label={`Medicine ${index + 1} name`}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                    />
                    <input
                      value={medicine.dosage}
                      onChange={(e) => updateMedicine(index, { dosage: e.target.value })}
                      aria-label={`Medicine ${index + 1} dosage`}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedicine(index)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-[var(--muted)]">
            OCR is for organizing documents only. MediVault does not interpret results or give medical advice.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Document details</h2>
        <p className="mt-2 rounded-xl bg-[var(--tint)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
          {isDemo
            ? "The file is stored in this browser's IndexedDB database. Metadata is saved separately so search and filters"
            : 'The original is uploaded to the private medical-documents bucket under your user ID. Metadata is saved separately so search and filters'}
          stay fast.
        </p>
        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="up-title" className="mb-1 block text-sm font-medium text-[var(--text)]">Document title</label>
            <input id="up-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="General consultation prescription" required className={inputCls} />
          </div>
          <div>
            <label htmlFor="up-category" className="mb-1 block text-sm font-medium text-[var(--text)]">Document category</label>
            <select id="up-category" value={category} onChange={(e) => setCategory(e.target.value as RecordCategory)} className={inputCls}>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="up-doctor" className="mb-1 block text-sm font-medium text-[var(--text)]">Doctor name</label>
            <input id="up-doctor" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Dr. Meera Kulkarni" className={inputCls} />
          </div>
          <div>
            <label htmlFor="up-hospital" className="mb-1 block text-sm font-medium text-[var(--text)]">Hospital / Clinic</label>
            <input id="up-hospital" value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Ruby Hall Clinic, Pune" className={inputCls} />
          </div>
          <div>
            <label htmlFor="up-date" className="mb-1 block text-sm font-medium text-[var(--text)]">Medical visit date</label>
            <input id="up-date" type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="up-notes" className="mb-1 block text-sm font-medium text-[var(--text)]">Additional notes</label>
            <textarea id="up-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this visit…" className={inputCls} />
          </div>
        </div>
        <button
          onClick={() => void handleSave(false)}
          disabled={busy}
          className="mt-5 w-full rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {busy ? 'Saving…' : 'Save Document'}
        </button>
      </div>

      <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center text-sm text-[var(--muted)]">
        {isDemo
          ? 'Browser-local storage only. Records survive refresh on this device, but they are not synced or backed up.'
          : 'Files stay private to your account. Nothing is shared until you create a link, and links can be revoked.'}
      </p>

      {duplicate && (
        <Modal open onClose={() => setDuplicate(null)} labelledBy="duplicate-title">
          <h2 id="duplicate-title" className="font-display text-lg font-semibold text-[var(--text)]">
            This file already exists
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            “{duplicate.record.title}” has the same SHA-256 hash. Saving again creates a second copy rather than
            replacing it.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDuplicate(null)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const pending = duplicate;
                setDuplicate(null);
                if (pending) {
                  void handleSave(true);
                }
              }}
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Save anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
