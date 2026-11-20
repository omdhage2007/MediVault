import { requireSupabase } from './supabase';
import { DEMO_LOGIN } from '../data/sampleData';
import type { Profile } from '../types';

/**
 * Authentication helpers for the Supabase deployment and the built-in demo
 * account. The hook selects the appropriate path based on configuration.
 */

export async function signUp(fullName: string, email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Client-side demo sign-in used by the scaffold login page. */
export function demoSignIn(email: string, password: string): Profile | null {
  if (email.trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password) {
    return {
      id: 'profile-om',
      fullName: 'Om Dhage',
      email: DEMO_LOGIN.email,
      phone: '9975143668',
      dob: '2007-09-08',
      bloodGroup: 'O+',
      address: 'Ravet, Pune, Maharashtra 412101',
      emailNotifications: true,
      shareAlerts: true,
      twoFactor: false,
    };
  }
  return null;
}

/** Demo Google sign-in: clearly a demo — no real OAuth is connected. */
export function demoGoogleSignIn(): Profile {
  return {
    id: 'profile-om',
    fullName: 'Om Dhage',
    email: DEMO_LOGIN.email,
    phone: '9975143668',
    dob: '2007-09-08',
    bloodGroup: 'O+',
    address: 'Ravet, Pune, Maharashtra 412101',
    emailNotifications: true,
    shareAlerts: true,
    twoFactor: false,
  };
}
