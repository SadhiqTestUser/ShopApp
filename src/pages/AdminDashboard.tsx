import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ShoppingBag, TrendingUp, Loader2,
  Clock, Plus, Trash2, Edit3, X, Search, Tag, ImageIcon,
} from 'lucide-react';
import {
  collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatINR, getOfferInfo } from '@/lib/currency';
import type { Product, Order, Profile } from '@/types';

type Tab = 'overview' | 'orders' | 'products' | 'users';

const statusConfig: Record<string, { color: string; bg: string }> = {
  pending: { color: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { color: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { color: 'text-purple-600', bg: 'bg-purple-50' },
  delivered: { color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { color: 'text-red-600', bg: 'bg-red-50' },
};

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', original_price: '', offer_price: '',
    offer_active: false, category: '', image_url: '', active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFrom, setOrderFrom] = useState('');
  const [orderTo, setOrderTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) =>
      a.created_at < b.created_at ? 1 : -1;

    // Load each collection independently so a permission failure on one
    // (orders/profiles need admin) doesn't discard the others or hang the UI.
    const [prodRes, ordRes, profRes] = await Promise.allSettled([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'profiles')),
    ]);

    if (prodRes.status === 'fulfilled') {
      setProducts(prodRes.value.docs.map((d) => ({ id: d.id, ...d.data() }) as Product).sort(byCreatedDesc));
    }
    if (ordRes.status === 'fulfilled') {
      setOrders(ordRes.value.docs.map((d) => ({ id: d.id, ...d.data() }) as Order).sort(byCreatedDesc));
    }
    if (profRes.status === 'fulfilled') {
      setUsers(profRes.value.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile).sort(byCreatedDesc));
    }

    if (prodRes.status === 'rejected') console.error('[admin] products load failed:', prodRes.reason);
    if (ordRes.status === 'rejected') console.error('[admin] orders load failed:', ordRes.reason);
    if (profRes.status === 'rejected') console.error('[admin] profiles load failed:', profRes.reason);

    setLoading(false);
  }

  async function updateOrderStatus(orderId: string, status: string) {
    await updateDoc(doc(db, 'orders', orderId), { status });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)));
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({
      name: '', description: '', original_price: '', offer_price: '',
      offer_active: false, category: '', image_url: '', active: true,
    });
    setShowProductModal(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    const original = p.original_price != null && p.original_price > 0 ? p.original_price : p.price;
    setProductForm({
      name: p.name,
      description: p.description ?? '',
      original_price: String(original),
      offer_price: p.offer_active ? String(p.price) : '',
      offer_active: Boolean(p.offer_active),
      category: p.category,
      image_url: p.image_url ?? '',
      active: p.active,
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    const originalPrice = Number(productForm.original_price);
    const offerPrice = productForm.offer_price === '' ? NaN : Number(productForm.offer_price);
    const offerActive =
      productForm.offer_active && !Number.isNaN(offerPrice) && offerPrice > 0 && offerPrice < originalPrice;
    const effectivePrice = offerActive ? offerPrice : originalPrice;
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: effectivePrice,
      original_price: originalPrice,
      offer_active: offerActive,
      category: productForm.category,
      image_url: productForm.image_url,
      active: productForm.active,
    };
    if (editingProduct) {
      await updateDoc(doc(db, 'products', editingProduct.id), payload);
    } else {
      await addDoc(collection(db, 'products'), {
        ...payload,
        customization_type: 'standard',
        customization_options: {},
        created_at: new Date().toISOString(),
      });
    }
    setSavingProduct(false);
    setShowProductModal(false);
    loadData();
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await deleteDoc(doc(db, 'products', id));
    loadData();
  }

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const customerCount = users.filter((u) => u.role === 'customer').length;

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    const orderDate = (o.created_at ?? '').slice(0, 10);
    if (orderFrom && orderDate < orderFrom) return false;
    if (orderTo && orderDate > orderTo) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      const haystack = [
        o.id, o.shipping_name, o.shipping_phone, o.shipping_city,
        o.shipping_state, o.shipping_pincode,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const filteredRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);

  const productMap: Record<string, Product> = {};
  for (const p of products) productMap[p.id] = p;
  const orderItemThumbnails = (o: Order): { url: string; name: string }[] => {
    const out: { url: string; name: string }[] = [];
    for (const item of o.order_items ?? []) {
      const p = productMap[item.product_id];
      if (p?.image_url) out.push({ url: p.image_url, name: p.name });
    }
    return out;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage products, orders, and users</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Total Revenue', value: formatINR(totalRevenue), color: 'teal' },
            { icon: ShoppingBag, label: 'Total Orders', value: orders.length, color: 'blue' },
            { icon: Clock, label: 'Pending Orders', value: pendingOrders, color: 'amber' },
            { icon: Users, label: 'Customers', value: customerCount, color: 'purple' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className={`w-10 h-10 rounded-lg bg-${s.color}-100 flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              </div>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-100 w-fit">
          {([
            { key: 'overview', label: 'Overview', icon: LayoutDashboard },
            { key: 'orders', label: 'Orders', icon: Package },
            { key: 'products', label: 'Products', icon: ShoppingBag },
            { key: 'users', label: 'Users', icon: Users },
          ] as { key: Tab; label: string; icon: typeof LayoutDashboard }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                tab === t.key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Orders</h2>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => {
                      const sc = statusConfig[order.status] ?? statusConfig.pending;
                      return (
                        <div
                          key={order.id}
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-900 text-sm">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color} capitalize`}>{order.status}</span>
                            <span className="font-semibold text-slate-900 text-sm">{formatINR(Number(order.total))}</span>
                          </div>
                        </div>
                      );
                    })}
                    {orders.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">No orders yet.</p>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Products</h2>
                  <div className="space-y-3">
                    {products.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.category}</p>
                        </div>
                        {(() => {
                          const offer = getOfferInfo(p);
                          return offer.hasOffer ? (
                            <span className="text-sm text-right leading-tight">
                              <span className="block font-semibold text-slate-900">{formatINR(offer.price)}</span>
                              <span className="text-xs text-slate-400 line-through">{formatINR(offer.originalPrice)}</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-900 text-sm">{formatINR(p.price)}</span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Orders */}
            {tab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">All Orders</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">Showing <span className="font-semibold text-slate-900">{filteredOrders.length}</span> of {orders.length}</span>
                    <span className="text-slate-500">Revenue <span className="font-semibold text-slate-900">{formatINR(filteredRevenue)}</span></span>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search id, name, phone, city…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all capitalize"
                  >
                    <option value="all">All statuses</option>
                    {orderStatuses.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={orderFrom}
                    onChange={(e) => setOrderFrom(e.target.value)}
                    aria-label="From date"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                  />
                  <input
                    type="date"
                    value={orderTo}
                    onChange={(e) => setOrderTo(e.target.value)}
                    aria-label="To date"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                  />
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No orders match the filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Product</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Items</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Total</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const sc = statusConfig[order.status] ?? statusConfig.pending;
                          return (
                            <tr
                              key={order.id}
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                            >
                              <td className="py-3 px-4 text-sm font-medium text-slate-900">#{order.id.slice(0, 8)}</td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const thumbs = orderItemThumbnails(order);
                                  if (thumbs.length === 0) return <ImageIcon className="w-5 h-5 text-slate-300" />;
                                  return (
                                    <div className="flex -space-x-2">
                                      {thumbs.slice(0, 3).map((t, i) => (
                                        <img
                                          key={i}
                                          src={t.url}
                                          alt={t.name}
                                          title={t.name}
                                          className="w-9 h-9 rounded-lg border-2 border-white object-cover shadow-sm"
                                        />
                                      ))}
                                      {thumbs.length > 3 && (
                                        <span className="w-9 h-9 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shadow-sm">
                                          +{thumbs.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-500">
                                <span className="block text-slate-900">{order.shipping_name || '—'}</span>
                                <span className="text-xs text-slate-400">{[order.shipping_city, order.shipping_state].filter(Boolean).join(', ') || '—'}</span>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                              <td className="py-3 px-4 text-sm text-slate-500">{order.order_items?.length ?? 0}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-slate-900">{formatINR(Number(order.total))}</td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`text-xs font-medium px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.color} capitalize border-0 outline-none cursor-pointer`}
                                >
                                  {orderStatuses.map((s) => (
                                    <option key={s} value={s} className="bg-white text-slate-700 capitalize">{s}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Products */}
            {tab === 'products' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Products</h2>
                  <button
                    onClick={openAddProduct}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Category</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Offer</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Active</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                              </div>
                              <span className="text-sm font-medium text-slate-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">{p.category}</td>
                          <td className="py-3 px-4 text-sm">
                            {(() => {
                              const offer = getOfferInfo(p);
                              return offer.hasOffer ? (
                                <span className="flex flex-col leading-tight">
                                  <span className="font-semibold text-slate-900">{formatINR(offer.price)}</span>
                                  <span className="text-xs text-slate-400 line-through">{formatINR(offer.originalPrice)}</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-900">{formatINR(p.price)}</span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const offer = getOfferInfo(p);
                              return offer.hasOffer ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                                  <Tag className="w-3 h-3" /> {offer.discountPercent}% OFF
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                              {p.active ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditProduct(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">All Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{u.full_name || '—'}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{u.phone || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowProductModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea required value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Original Price (₹)</label>
                  <input required type="number" step="0.01" min="0" value={productForm.original_price} onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <input required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
                </div>
              </div>

              {/* Offer */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-slate-700">Run an offer</span>
                  <input type="checkbox" checked={productForm.offer_active} onChange={(e) => setProductForm({ ...productForm, offer_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                </label>
                {productForm.offer_active && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Offer Price (₹)</label>
                    <input type="number" step="0.01" min="0" value={productForm.offer_price} onChange={(e) => setProductForm({ ...productForm, offer_price: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" placeholder="Must be lower than original price" />
                    {productForm.offer_price !== '' && Number(productForm.offer_price) >= Number(productForm.original_price) && (
                      <p className="text-xs text-red-500 mt-1.5">Offer price should be lower than the original price.</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Image URL</label>
                <input value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" placeholder="https://..." />
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-slate-700">Product active (visible in store)</span>
                <input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              </label>
              <button type="submit" disabled={savingProduct}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {savingProduct ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
