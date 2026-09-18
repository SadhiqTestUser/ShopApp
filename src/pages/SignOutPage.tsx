import { Link } from 'react-router-dom';
import { Printer, CheckCircle, LogIn, Home } from 'lucide-react';

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 text-slate-900 font-bold text-2xl mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Printer className="w-6 h-6 text-white" />
          </div>
          Printcraft
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-6">
            <CheckCircle className="w-9 h-9 text-teal-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Signed Out Successfully</h1>
          <p className="text-slate-500 mb-8">
            You have been securely signed out of your account. Come back anytime to keep creating.
          </p>

          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Sign In Again
            </Link>
            <Link
              to="/"
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" /> Back to Home
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          On a shared device? Close this browser window to fully protect your account.
        </p>
      </div>
    </div>
  );
}
