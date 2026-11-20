/** Largest document MediVault will store locally. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export const STORAGE_MODE_LABEL = 'Browser-local storage';
