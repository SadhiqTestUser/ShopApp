import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Menu, X, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-slate-900 font-bold text-xl">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span>Printcraft</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Home</Link>
            <Link to="/products" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Products</Link>
            {profile && (
              <Link to="/dashboard" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">My Dashboard</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Admin</Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {profile ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 py-4 space-y-3">
            <Link to="/" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/products" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Products</Link>
            {profile && (
              <Link to="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>My Dashboard</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Admin</Link>
            )}
            {profile ? (
              <button onClick={handleSignOut} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 font-medium">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            ) : (
              <div className="flex flex-col gap-2 px-3">
                <Link to="/login" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 font-medium" onClick={() => setOpen(false)}>
                  <User className="w-4 h-4" /> Sign In
                </Link>
                <Link to="/register" className="px-3 py-2 rounded-lg bg-teal-600 text-white font-medium text-center" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
