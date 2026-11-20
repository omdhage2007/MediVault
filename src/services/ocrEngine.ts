import type { Medicine } from '@/types';

export interface OcrMetadata {
  doctorName: string;
  patientName: string;
  hospital: string;
  prescriptionDate: string;
  medicines: Medicine[];
  labTests: string[];
  documentTitle: string;
}

export interface OcrOutcome {
  text: string;
  metadata: OcrMetadata;
  pages: number;
}

export interface OcrProgressUpdate {
  progress: number;
  label: string;
}

/** Cap PDF pages so OCR cannot exhaust memory on long documents. */
const MAX_PDF_PAGES = 5;

const UNIT_PATTERN =
  '(?:mg|mcg|g|ml|iu|units?|tablets?|tabs?|capsules?|caps?|drops?|syrup|syp|inhaler|cream|gel|ointment|%)';

const LAB_TESTS = [
  'Haemoglobin',
  'Hemoglobin',
  'Complete Blood Count',
  'CBC',
  'Platelet Count',
  'WBC',
  'RBC',
  'ESR',
  'Blood Sugar',
  'Fasting Glucose',
  'HbA1c',
  'Cholesterol',
  'Triglycerides',
  'HDL',
  'LDL',
  'Creatinine',
  'Urea',
  'TSH',
  'Vitamin D',
  'Vitamin B12',
  'SGOT',
  'SGPT',
  'Bilirubin',
  'Sodium',
  'Potassium',
  'Calcium',
  'Urine Routine',
];

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Find the first plausible date in OCR text and return it as YYYY-MM-DD. */
export function parseOcrDate(text: string): string {
  const iso = text.match(/\b(20\d{2}|19\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (isValidDate(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`;
  }

  const numeric = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|19\d{2})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = Number(numeric[3]);
    if (isValidDate(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`;
  }

  const dayMonthYear = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?,?\s+(20\d{2}|19\d{2})\b/i);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = MONTHS[dayMonthYear[2].toLowerCase().slice(0, 3)];
    const year = Number(dayMonthYear[3]);
    if (month && isValidDate(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`;
  }

  const monthDayYear = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2}|19\d{2})\b/i);
  if (monthDayYear) {
    const month = MONTHS[monthDayYear[1].toLowerCase().slice(0, 3)];
    const day = Number(monthDayYear[2]);
    const year = Number(monthDayYear[3]);
    if (month && isValidDate(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`;
  }

  return '';
}

/** Heuristic medicine lines. Results are suggestions, never verified data. */
export function parseOcrMedicines(text: string): Medicine[] {
  const unit = new RegExp(`\\d+\\s*${UNIT_PATTERN}`, 'i');
  const seen = new Set<string>();
  const medicines: Medicine[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line.length < 4 || line.length > 120) continue;
    if (!unit.test(line) && !/^(tab|cap|syp|inj)\b/i.test(line)) continue;
    if (!/[a-z]/i.test(line)) continue;

    const cleaned = line
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^(tab|cap|syp|inj)\.?\s*/i, '')
      .trim();
    const firstDigit = cleaned.search(/\d/);
    const name = (firstDigit > 0 ? cleaned.slice(0, firstDigit) : cleaned)
      .replace(/[:\-–]+$/, '')
      .trim();
    const dosage = firstDigit > 0 ? cleaned.slice(firstDigit).trim() : '';

    if (name.length < 2 || name.length > 60) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    medicines.push({ name, dosage });
    if (medicines.length >= 12) break;
  }

  return medicines;
}

export function parseOcrLabTests(text: string): string[] {
  const found: string[] = [];
  for (const test of LAB_TESTS) {
    const pattern = new RegExp(`\\b${test.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(text) && !found.some((item) => item.toLowerCase() === test.toLowerCase())) {
      found.push(test);
    }
  }
  return found;
}

/** Extract suggested metadata from OCR text. Missing values stay empty. */
export function extractOcrMetadata(text: string): OcrMetadata {
  // Name separators are spaces/tabs only, so a name never swallows the next
  // line (for example "Dr. Meera Kulkarni\nDate: ...").
  const doctorMatch = text.match(
    /\b(?:Dr\.?|Doctor)[ \t]+([A-Z][A-Za-z.'-]+(?:[ \t]+[A-Z][A-Za-z.'-]+){0,3})/,
  );
  const patientMatch = text.match(
    /\bPatient(?:[ \t]*Name)?[ \t]*[:\-][ \t]*([A-Z][A-Za-z.'-]+(?:[ \t]+[A-Z][A-Za-z.'-]+){0,3})/i,
  );
  const hospitalLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /(hospital|clinic|medical cent(?:er|re)|diagnostics|laborator|healthcare)/i.test(line));
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 3 && line.length <= 80) ?? '';

  return {
    doctorName: doctorMatch ? `Dr. ${doctorMatch[1].replace(/\.$/, '')}` : '',
    patientName: patientMatch ? patientMatch[1] : '',
    hospital: hospitalLine ? hospitalLine.slice(0, 90) : '',
    prescriptionDate: parseOcrDate(text),
    medicines: parseOcrMedicines(text),
    labTests: parseOcrLabTests(text),
    documentTitle: firstLine,
  };
}

async function renderPdfPages(file: File, onProgress: (update: OcrProgressUpdate) => void): Promise<Blob[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const pages: Blob[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      onProgress({
        progress: 10 + Math.round((pageNumber / pageCount) * 15),
        label: `Rendering PDF page ${pageNumber} of ${pageCount}…`,
      });
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not prepare the PDF page for OCR.');
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      if (blob) pages.push(blob);
    }
  } finally {
    await pdf.destroy();
  }

  if (pages.length === 0) throw new Error('No pages could be read from this PDF.');
  return pages;
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Run OCR entirely in the browser. Tesseract and pdf.js are imported lazily so
 * they never enter the initial bundle.
 */
export async function runOcr(
  file: File,
  onProgress: (update: OcrProgressUpdate) => void,
): Promise<OcrOutcome> {
  onProgress({ progress: 2, label: 'Loading OCR engine…' });

  let pages: Blob[];
  if (isPdf(file)) {
    pages = await renderPdfPages(file, onProgress);
  } else {
    pages = [file];
  }

  onProgress({ progress: 30, label: 'Starting text recognition…' });
  const tesseract = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof tesseract.createWorker>> | null = null;
  const pageTexts: string[] = [];

  try {
    worker = await tesseract.createWorker('eng', 1, {
      logger: (message: { status: string; progress: number }) => {
        if (message.status === 'recognizing text') {
          onProgress({
            progress: 30 + Math.round(message.progress * 65),
            label: 'Recognizing text…',
          });
        }
      },
    });

    for (let index = 0; index < pages.length; index++) {
      onProgress({
        progress: 30 + Math.round((index / pages.length) * 65),
        label: `Reading page ${index + 1} of ${pages.length}…`,
      });
      const { data } = await worker.recognize(pages[index]);
      pageTexts.push(data.text);
    }
  } finally {
    if (worker) await worker.terminate();
  }

  onProgress({ progress: 97, label: 'Organizing extracted information…' });
  const text = pageTexts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  const outcome: OcrOutcome = {
    text,
    metadata: extractOcrMetadata(text),
    pages: pages.length,
  };
  onProgress({ progress: 100, label: 'Extraction complete' });
  return outcome;
}
