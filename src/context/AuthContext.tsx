import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signUpWithPhone: (phone: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        (async () => {
          await loadProfile(newSession.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function sendOtp(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });

    if (!error) return { error: null };
    if (error.code === 'otp_disabled' || error.message.toLowerCase().includes('signups not allowed for otp')) {
      return { error: 'No account was found for this phone number. Please create an account first.' };
    }
    if (error.code === 'phone_provider_disabled' || error.message.toLowerCase().includes('unsupported phone provider')) {
      return { error: 'Phone OTP is not enabled yet. Please ask the administrator to enable SMS login.' };
    }
    return { error: error.message };
  }

  async function verifyOtp(phone: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (!error) return { error: null };
    if (error.code === 'otp_expired' || error.message.toLowerCase().includes('expired')) {
      return { error: 'The OTP has expired. Please request a new one.' };
    }
    if (error.code === 'invalid_otp' || error.message.toLowerCase().includes('invalid')) {
      return { error: 'Incorrect OTP. Please check and try again.' };
    }
    return { error: error.message };
  }

  async function signUpWithPhone(phone: string, fullName: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName },
      },
    });

    if (!error) return { error: null };
    if (error.code === 'phone_provider_disabled' || error.message.toLowerCase().includes('unsupported phone provider')) {
      return { error: 'Phone OTP is not enabled yet. Please ask the administrator to enable SMS login.' };
    }
    if (error.code === 'user_already_exists' || error.message.toLowerCase().includes('already registered')) {
      return { error: 'This phone number is already registered. Please sign in instead.' };
    }
    return { error: error.message };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, sendOtp, verifyOtp, signUpWithPhone, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
