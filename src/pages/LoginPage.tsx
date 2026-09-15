import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Phone, Loader2, AlertCircle, KeyRound, ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  function formatPhone(input: string): string {
    const digits = input.replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return digits.slice(0, 10);
  }

  function startResendTimer() {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDevCode(null);
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    const fullPhone = `+91${phone}`;
    const { error, devCode } = await sendOtp(fullPhone, 'login');
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setOtpSent(true);
      startResendTimer();
      if (devCode) setDevCode(devCode);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    const fullPhone = `+91${phone}`;
    const { error } = await verifyOtp(fullPhone, otp);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  }

  async function handleResend() {
    setError(null);
    setDevCode(null);
    setLoading(true);
    const fullPhone = `+91${phone}`;
    const { error, devCode } = await sendOtp(fullPhone, 'login');
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      startResendTimer();
      if (devCode) setDevCode(devCode);
    }
  }

  function handlePhoneChange() {
    setOtp('');
    setOtpSent(false);
    setError(null);
    setDevCode(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 text-slate-900 font-bold text-2xl mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Printer className="w-6 h-6 text-white" />
          </div>
          Printcraft
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500 mb-6">
            {otpSent ? 'Enter the OTP sent to your phone' : 'Sign in with your phone number'}
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {devCode && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Dev mode:</strong> Your OTP is <span className="font-mono font-bold tracking-wider">{devCode}</span>
              </span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">+91</span>
                  <Phone className="absolute left-12 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatPhone(e.target.value));
                      handlePhoneChange();
                    }}
                    className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="98765 43210"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  OTP sent to +91 {phone}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-center text-2xl tracking-[0.5em] font-semibold"
                    placeholder="------"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setError(null);
                    setDevCode(null);
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change number
                </button>
                {resendTimer > 0 ? (
                  <span className="text-slate-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
