import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
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
          <p className="text-slate-500 mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
