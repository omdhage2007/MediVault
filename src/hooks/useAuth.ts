import { useCallback, useEffect, useRef, useState } from 'react';
import { demoGoogleSignIn } from '@/services/auth';
import { registerDemoAccount, signInDemoAccount, updateDemoAccount } from '@/lib/demoAccounts';
import { AVATARS_BUCKET, googleAuthEnabled, isSupabaseConfigured, supabase } from '@/services/supabase';
import { safeStorage } from '@/lib/utils';
import type { Profile } from '@/types';

export type AuthMode = 'supabase' | 'demo';

const DEMO_PROFILE_KEY = 'medivault-demo-profile';

function readDemoProfile(): Profile | null {
  const saved = safeStorage.get(DEMO_PROFILE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<Profile>;
    if (typeof parsed?.email === 'string' && typeof parsed?.fullName === 'string') {
      return parsed as Profile;
    }
    return null;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapProfileRow(value: unknown, fallback: { id: string; email: string; name: string }): Profile {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    id: text(row.id) || fallback.id,
    fullName: text(row.full_name) || fallback.name,
    email: text(row.email) || fallback.email,
    avatarUrl: text(row.avatar_url),
    phone: text(row.phone),
    dob: text(row.dob),
    bloodGroup: text(row.blood_group),
    address: text(row.address),
    emailNotifications: row.email_notifications !== false,
    shareAlerts: row.share_alerts !== false,
    twoFactor: row.two_factor === true,
  };
}

function profileToRow(profile: Profile): Record<string, unknown> {
  return {
    id: profile.id,
    full_name: profile.fullName,
    email: profile.email,
    avatar_url: profile.avatarUrl ?? null,
    phone: profile.phone || null,
    dob: profile.dob || null,
    blood_group: profile.bloodGroup || null,
    address: profile.address || null,
    email_notifications: profile.emailNotifications,
    share_alerts: profile.shareAlerts,
    two_factor: profile.twoFactor,
  };
}

function authErrorMessage(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : '';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Confirm your email address before signing in.';
  if (lower.includes('user already registered')) return 'An account already exists for this email.';
  if (lower.includes('password should be at least')) return 'Use a password with at least 8 characters.';
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (lower.includes('auth session missing')) return 'This reset link has expired. Request a new one.';
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

export function useAuth() {
  const mode: AuthMode = isSupabaseConfigured ? 'supabase' : 'demo';
  const [profile, setProfile] = useState<Profile | null>(() =>
    isSupabaseConfigured ? null : readDemoProfile(),
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const loadingUser = useRef<string | null>(null);

  const loadSupabaseProfile = useCallback(
    async (userId: string, email: string, metadataName: string) => {
      if (!supabase) return;
      if (loadingUser.current === userId) return;
      loadingUser.current = userId;

      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          // The auth session is valid even if the profile row/table is not.
          setProfile(
            mapProfileRow(null, { id: userId, email, name: metadataName || email.split('@')[0] }),
          );
          setError('Your profile could not be loaded. Apply the database migration and try again.');
          return;
        }

        if (data) {
          setProfile(mapProfileRow(data, { id: userId, email, name: metadataName }));
          setError(null);
          return;
        }

        const fallback = mapProfileRow(null, {
          id: userId,
          email,
          name: metadataName || email.split('@')[0],
        });
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert(profileToRow(fallback), { onConflict: 'id' });
        if (insertError) {
          setError('Your profile could not be created. Apply the database migration and try again.');
        } else {
          setError(null);
        }
        setProfile(fallback);
      } finally {
        loadingUser.current = null;
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(authErrorMessage(sessionError));
          setLoading(false);
          return;
        }
        const user = data.session?.user;
        if (user) {
          void loadSupabaseProfile(
            user.id,
            user.email ?? '',
            text(user.user_metadata?.full_name),
          );
        } else {
          setLoading(false);
        }
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        setError(authErrorMessage(sessionError));
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }
      const user = session.user;
      // Supabase warns against awaiting other client calls inside this
      // callback (the auth lock is held), so profile loading is deferred.
      setTimeout(() => {
        if (active) {
          void loadSupabaseProfile(user.id, user.email ?? '', text(user.user_metadata?.full_name));
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadSupabaseProfile]);

  const persistDemoProfile = useCallback((next: Profile) => {
    setProfile(next);
    safeStorage.set(DEMO_PROFILE_KEY, JSON.stringify(next));
    updateDemoAccount(next);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      if (mode === 'demo') {
        const demo = await signInDemoAccount(email, password);
        if (!demo) throw new Error('Email or password is incorrect. Use the demo credentials shown below.');
        persistDemoProfile(demo);
        return;
      }
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error(authErrorMessage(signInError));
      const user = data.user;
      if (user) {
        await loadSupabaseProfile(user.id, user.email ?? '', text(user.user_metadata?.full_name));
      }
    },
    [mode, persistDemoProfile, loadSupabaseProfile],
  );

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      setError(null);
      if (mode === 'demo') {
        const profile = await registerDemoAccount(fullName, email, password);
        persistDemoProfile(profile);
        return { requiresVerification: false, message: 'Local demo account opened.' };
      }

      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
      if (signUpError) throw new Error(authErrorMessage(signUpError));
      // With email confirmation enabled there is no session yet; loading a
      // profile here would falsely look like a signed-in user.
      if (data.session && data.user) {
        await loadSupabaseProfile(
          data.user.id,
          data.user.email ?? '',
          fullName.trim(),
        );
      }
      return {
        requiresVerification: !data.session,
        message: data.session
          ? 'Account created and signed in.'
          : 'Check your inbox to confirm your email address, then sign in.',
      };
    },
    [mode, persistDemoProfile, loadSupabaseProfile],
  );

  const signInWithGoogle = useCallback(async () => {
    if (mode === 'demo') {
      persistDemoProfile(demoGoogleSignIn());
      return;
    }
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!googleAuthEnabled) {
      throw new Error('Google sign-in is not enabled for this project. Use email and password.');
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) throw new Error(authErrorMessage(oauthError));
  }, [mode, persistDemoProfile]);

  const signOut = useCallback(async () => {
    if (mode === 'demo') {
      safeStorage.remove(DEMO_PROFILE_KEY);
      setProfile(null);
      return;
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
  }, [mode]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<string> => {
      if (mode === 'demo') {
        return 'Demo mode: no reset email was sent. Password management is not connected.';
      }
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
      });
      if (resetError) throw new Error(authErrorMessage(resetError));
      return 'If an account exists for that address, a reset link is on its way.';
    },
    [mode],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (mode === 'demo') {
        throw new Error('Password changes are not connected in local demo mode.');
      }
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(authErrorMessage(updateError));
    },
    [mode],
  );

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      if (mode === 'demo') {
        throw new Error('Password changes are not connected in local demo mode.');
      }
      if (!supabase || !profile) throw new Error('You are not signed in.');
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('Your current password is incorrect.');
      const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });
      if (updateError) throw new Error(authErrorMessage(updateError));
    },
    [mode, profile],
  );

  const updateProfile = useCallback(
    async (next: Profile) => {
      if (mode === 'demo') {
        persistDemoProfile(next);
        return;
      }
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileToRow(next))
        .eq('id', next.id);
      if (updateError) throw new Error('Could not save your profile changes.');
      setProfile(next);
    },
    [mode, persistDemoProfile],
  );

  const requestEmailChange = useCallback(
    async (email: string): Promise<string> => {
      if (mode === 'demo') {
        if (profile) persistDemoProfile({ ...profile, email });
        return 'Email updated in this browser only.';
      }
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) throw new Error(authErrorMessage(emailError));
      if (profile) {
        await supabase.from('profiles').update({ email: email.trim() }).eq('id', profile.id);
      }
      return 'Check your inbox to confirm the new email address.';
    },
    [mode, profile, persistDemoProfile],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (mode === 'demo') {
        throw new Error('Profile photo upload requires Supabase. It is unavailable in local demo mode.');
      }
      if (!supabase || !profile) throw new Error('You are not signed in.');
      if (!file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG or WebP image.');
      if (file.size > 2 * 1024 * 1024) throw new Error('Profile photos must be smaller than 2 MB.');

      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeExtension = ['png', 'jpg', 'jpeg', 'webp'].includes(extension) ? extension : 'png';
      const path = `${profile.id}/avatar-${Date.now()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error('Could not upload the profile photo.');

      const { data: publicUrl } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', profile.id);
      if (updateError) throw new Error('The photo uploaded but your profile could not be updated.');

      setProfile({ ...profile, avatarUrl: publicUrl.publicUrl });
    },
    [mode, profile],
  );

  return {
    mode,
    profile,
    loading,
    error,
    googleEnabled: mode === 'demo' || googleAuthEnabled,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    updatePassword,
    changePassword,
    updateProfile,
    requestEmailChange,
    uploadAvatar,
  };
}
