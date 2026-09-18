import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, User, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatINR } from '@/lib/currency';
import type { Order } from '@/types';

type Tab = 'overview' | 'orders' | 'profile';

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function UserDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    getDocs(query(collection(db, 'orders'), where('user_id', '==', profile.id))).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setOrders(list);
      setLoading(false);
    });
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await updateDoc(doc(db, 'profiles', profile.id), { full_name: fullName, phone });
    await refreshProfile();
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  }

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {profile?.full_name || profile?.phone}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: 'Total Orders', value: orders.length, color: 'teal' },
            { icon: Clock, label: 'In Progress', value: pendingCount, color: 'amber' },
            { icon: Package, label: 'Total Spent', value: formatINR(totalSpent), color: 'blue' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 text-${s.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-100 w-fit">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'orders', label: 'My Orders' },
            { key: 'profile', label: 'Profile' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                tab === t.key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Orders</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No orders yet. Start creating your custom products!</p>
                <Link to="/products" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all">
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => {
                  const sc = statusConfig[order.status] ?? statusConfig.pending;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center`}>
                          <sc.icon className={`w-5 h-5 ${sc.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color} capitalize`}>{order.status}</span>
                        <span className="font-semibold text-slate-900">{formatINR(Number(order.total))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">All Orders</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No orders to show.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Order ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Items</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const sc = statusConfig[order.status] ?? statusConfig.pending;
                      return (
                        <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">#{order.id.slice(0, 8)}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{order.order_items?.length ?? 0} item(s)</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color} capitalize`}>{order.status}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatINR(Number(order.total))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Settings</h2>
            {savedMsg && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" /> Profile updated successfully
              </div>
            )}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
