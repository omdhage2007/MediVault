/**
 * SHA-256 hashing with the browser's Web Crypto API.
 * Document bytes never leave the machine for hashing.
 */
export async function sha256Hex(input: Blob | ArrayBuffer | string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot hash files (Web Crypto is unavailable). Use a modern browser over HTTPS or localhost.');
  }

  let buffer: ArrayBuffer;
  if (typeof input === 'string') {
    buffer = new TextEncoder().encode(input).buffer;
  } else if (input instanceof Blob) {
    buffer = await input.arrayBuffer();
  } else {
    buffer = input;
  }

  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
