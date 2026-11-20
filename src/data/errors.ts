/** Error raised by the data layer with a message safe to show to the user. */
export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/** Convert any thrown value into a user-facing message without leaking internals. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof RepositoryError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function toRepositoryError(error: unknown, fallback: string): RepositoryError {
  if (error instanceof RepositoryError) return error;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return new RepositoryError('There is not enough browser storage left for this file. Free some space and try again.');
    }
    if (error.name === 'InvalidStateError') {
      return new RepositoryError('The local database is not available. Close other tabs and try again.');
    }
  }
  return new RepositoryError(fallback);
}
