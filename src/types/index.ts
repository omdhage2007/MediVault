export type RecordCategory =
  | 'Prescriptions'
  | 'Blood Reports'
  | 'X-Ray Reports'
  | 'Scans'
  | 'Consultation Records'
  | 'Other Documents';

export interface Medicine {
  name: string;
  dosage: string;
}

export interface ExtractedData {
  doctorName: string;
  hospital: string;
  prescriptionDate: string;
  medicines: Medicine[];
  category: RecordCategory;
  /**
   * 'simulated' = no text was read from a file (for example demo data or a
   * manual upload without OCR).
   * 'completed' = browser OCR produced editable suggestions.
   */
  ocrStatus: 'simulated' | 'completed' | 'processing' | 'failed';
  /** Full OCR text. Editable by the user; never treated as verified automatically. */
  extractedText?: string;
  patientName?: string;
  labTests?: string[];
  verificationStatus?: 'unverified' | 'verified';
}

export interface MedicalRecord {
  id: string;
  /** Local demo user that owns this record. */
  userId: string;
  title: string;
  category: RecordCategory;
  doctorName: string;
  hospital: string;
  visitDate: string; // ISO date
  uploadDate: string; // ISO date
  fileName: string;
  fileSizeKb: number;
  mimeType: string;
  notes: string;
  extracted: ExtractedData;
  /** SHA-256 of the original file, or '' when no file is attached. */
  fileHash: string;
  /** True when the original file is stored in the local database. */
  hasFile: boolean;
  /** Demo records created during initial database setup. */
  isSample: boolean;
}

export interface ShareLink {
  id: string;
  userId: string;
  /** Random local demo token. Never contains medical information. */
  token: string;
  recordIds: string[];
  expiresAt: string; // ISO timestamp
  revokedAt: string | null;
  /** Computed from revokedAt/expiresAt when the share is read. */
  status: 'active' | 'revoked' | 'expired';
  createdAt: string; // ISO timestamp
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  /** Public profile photo URL. Never used for medical documents. */
  avatarUrl?: string;
  phone: string;
  dob: string;
  bloodGroup: string;
  address: string;
  emailNotifications: boolean;
  shareAlerts: boolean;
  twoFactor: boolean;
}

export type Theme = 'light' | 'dark';

export type Route =
  | 'landing'
  | 'login'
  | 'signup'
  | 'reset-password'
  | 'share'
  | 'dashboard'
  | 'records'
  | 'upload'
  | 'preview'
  | 'history'
  | 'shared'
  | 'settings';
