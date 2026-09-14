import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Menu, X, LayoutDashboard, LogOut, User, ShoppingCart, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-slate-900 font-bold text-xl flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:inline">Printcraft</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 focus:bg-white border border-transparent focus:border-teal-300 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
              />
            </div>
          </form>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Home</Link>
            <Link to="/products" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Products</Link>
            {isAdmin && (
              <Link to="/admin" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">Admin</Link>
            )}
            <Link to="/cart" className="relative text-slate-600 hover:text-teal-600 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">{itemCount}</span>
              )}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
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
            <form onSubmit={handleSearch} className="px-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-teal-300 outline-none text-sm"
                />
              </div>
            </form>
            <Link to="/" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/products" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Products</Link>
            <Link to="/cart" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Cart ({itemCount})</Link>
            {isAdmin && (
              <Link to="/admin" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Admin</Link>
            )}
            {profile ? (
              <>
                <Link to="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-slate-100 font-medium" onClick={() => setOpen(false)}>Dashboard</Link>
                <button onClick={handleSignOut} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 font-medium">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
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
