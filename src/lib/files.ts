import { ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES } from './config';

export type FileValidation = { ok: true } | { ok: false; message: string };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validate both the MIME type and the extension before storing a document. */
export function validateDocumentFile(file: File, maxBytes = MAX_UPLOAD_BYTES): FileValidation {
  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return { ok: false, message: 'Only PDF, JPG, JPEG and PNG files are supported.' };
  }

  if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return { ok: false, message: `The file type "${file.type}" is not supported. Choose a PDF, JPG or PNG.` };
  }

  if (file.size === 0) {
    return { ok: false, message: 'That file is empty. Choose a document with content.' };
  }

  if (file.size > maxBytes) {
    return { ok: false, message: `That file is ${formatMb(file.size)}. The limit is ${formatMb(maxBytes)}.` };
  }

  return { ok: true };
}

/** Trigger a real browser download of an original file. */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build the public share URL from the current app origin. */
export function buildShareUrl(token: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/s/${encodeURIComponent(token)}`;
}

export function readShareToken(): string | null {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  if (segments[0] === 's' && segments[1]) return decodeURIComponent(segments[1]);
  const fromQuery = new URLSearchParams(query).get('token');
  return fromQuery && fromQuery.trim() ? fromQuery.trim() : null;
}
