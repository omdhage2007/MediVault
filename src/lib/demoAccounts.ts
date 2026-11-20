import { demoProfile, DEMO_LOGIN } from '@/data/sampleData';
import { safeStorage } from './utils';
import { localProfileIdForEmail } from './demoIdentity';
import { sha256Hex } from './hash';
import type { Profile } from '@/types';

const DEMO_ACCOUNTS_KEY = 'medivault-demo-accounts';

interface StoredDemoAccount {
  profile: Profile;
  passwordHash: string;
}

function readAccounts(): StoredDemoAccount[] {
  const raw = safeStorage.get(DEMO_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is StoredDemoAccount => {
      if (!entry || typeof entry !== 'object') return false;
      const account = entry as Record<string, unknown>;
      const profile = account.profile;
      return Boolean(
        profile &&
          typeof profile === 'object' &&
          typeof (profile as Record<string, unknown>).id === 'string' &&
          typeof (profile as Record<string, unknown>).email === 'string' &&
          typeof account.passwordHash === 'string',
      );
    });
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredDemoAccount[]): void {
  safeStorage.set(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function registerDemoAccount(
  fullName: string,
  email: string,
  password: string,
): Promise<Profile> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === DEMO_LOGIN.email) {
    throw new Error('That is the built-in demo account. Use the demo credentials on the sign-in screen.');
  }

  const accounts = readAccounts();
  if (accounts.some((account) => account.profile.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account already exists for this email in this browser.');
  }

  const profile: Profile = {
    ...demoProfile,
    id: await localProfileIdForEmail(normalizedEmail),
    fullName: fullName.trim(),
    email: email.trim(),
    phone: '',
    dob: '',
    bloodGroup: '',
    address: '',
    avatarUrl: '',
  };
  accounts.push({ profile, passwordHash: await sha256Hex(password) });
  writeAccounts(accounts);
  return profile;
}

export async function signInDemoAccount(email: string, password: string): Promise<Profile | null> {
  if (email.trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password) {
    return demoProfile;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const account = readAccounts().find(
    (entry) => entry.profile.email.trim().toLowerCase() === normalizedEmail,
  );
  if (!account) return null;
  return (await sha256Hex(password)) === account.passwordHash ? account.profile : null;
}

export function updateDemoAccount(profile: Profile): void {
  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.profile.id === profile.id);
  if (index === -1) return;
  accounts[index] = { ...accounts[index], profile };
  writeAccounts(accounts);
}
