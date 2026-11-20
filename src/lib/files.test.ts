import { describe, expect, it } from 'vitest';
import { validateDocumentFile } from './files';

function makeFile(name: string, type: string, bytes = 32): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('validateDocumentFile', () => {
  it('accepts supported PDF and image files', () => {
    expect(validateDocumentFile(makeFile('report.pdf', 'application/pdf')).ok).toBe(true);
    expect(validateDocumentFile(makeFile('scan.JPG', 'image/jpeg')).ok).toBe(true);
    expect(validateDocumentFile(makeFile('photo.png', 'image/png')).ok).toBe(true);
  });

  it('rejects unsupported extensions and MIME types', () => {
    expect(validateDocumentFile(makeFile('notes.txt', 'text/plain')).ok).toBe(false);
    expect(validateDocumentFile(makeFile('fake.pdf', 'text/html')).ok).toBe(false);
  });

  it('rejects empty files', () => {
    const result = validateDocumentFile(makeFile('empty.pdf', 'application/pdf', 0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/empty/i);
  });

  it('enforces the size limit', () => {
    const result = validateDocumentFile(makeFile('big.pdf', 'application/pdf', 2048), 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/limit/i);
  });
});
