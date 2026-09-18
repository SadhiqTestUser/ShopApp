import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile } from '@/types';

interface SendOtpResult {
  error: string | null;
}

interface VerifyOtpResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  sendOtp: (phone: string, purpose: 'login' | 'signup', fullName?: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const pendingSignupRef = useRef<{ fullName: string; phone: string } | null>(null);

  async function loadProfile(userId: string) {
    const snap = await getDoc(doc(db, 'profiles', userId));
    setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        loadProfile(fbUser.uid).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  function getRecaptcha(): RecaptchaVerifier {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
        size: 'invisible',
      });
    }
    return recaptchaRef.current;
  }

  function resetRecaptcha() {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
  }

  async function sendOtp(phone: string, purpose: 'login' | 'signup', fullName?: string): Promise<SendOtpResult> {
    try {
      pendingSignupRef.current = purpose === 'signup' ? { fullName: fullName ?? '', phone } : null;
      const verifier = getRecaptcha();
      confirmationRef.current = await signInWithPhoneNumber(auth, phone, verifier);
      return { error: null };
    } catch (err) {
      resetRecaptcha();
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      return { error: message };
    }
  }

  async function verifyOtp(_phone: string, code: string): Promise<VerifyOtpResult> {
    try {
      if (!confirmationRef.current) {
        return { error: 'Please request an OTP first.' };
      }
      const credential = await confirmationRef.current.confirm(code);
      const fbUser = credential.user;

      const ref = doc(db, 'profiles', fbUser.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const pending = pendingSignupRef.current;
        await setDoc(ref, {
          email: fbUser.email ?? null,
          full_name: pending?.fullName ?? '',
          phone: fbUser.phoneNumber ?? pending?.phone ?? '',
          role: 'customer',
          created_at: new Date().toISOString(),
        });
      } else if (pendingSignupRef.current?.fullName) {
        await setDoc(ref, { full_name: pendingSignupRef.current.fullName }, { merge: true });
      }

      pendingSignupRef.current = null;
      confirmationRef.current = null;
      resetRecaptcha();
      await loadProfile(fbUser.uid);
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { error: message };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.uid);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, sendOtp, verifyOtp, signOut, refreshProfile }}
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
