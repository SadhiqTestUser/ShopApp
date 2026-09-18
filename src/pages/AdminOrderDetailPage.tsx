import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, MapPin, User, Phone, CreditCard, ImageIcon, ExternalLink,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatINR } from '@/lib/currency';
import type { Order, Product } from '@/types';

const statusConfig: Record<string, { color: string; bg: string }> = {
  pending: { color: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { color: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { color: 'text-purple-600', bg: 'bg-purple-50' },
  delivered: { color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { color: 'text-red-600', bg: 'bg-red-50' },
};

// Human-readable labels for the customization fields stored on each order item.
const CUSTOM_FIELD_LABELS: Record<string, string> = {
  customization_type: 'Type',
  page_count: 'Pages',
  magnet_shape: 'Magnet shape',
  shape: 'Shape',
  layout: 'Layout',
  frame_size: 'Frame size',
  number_of_people: 'People',
  soft_copy: 'Soft copy',
};

function customizationEntries(data: Record<string, unknown> | null | undefined) {
  if (!data) return [] as { label: string; value: string }[];
  const out: { label: string; value: string }[] = [];
  for (const [key, label] of Object.entries(CUSTOM_FIELD_LABELS)) {
    const raw = data[key];
    if (raw === null || raw === undefined || raw === '' || raw === false) continue;
    out.push({ label, value: typeof raw === 'boolean' ? 'Yes' : String(raw) });
  }
  return out;
}

function imageUrls(data: Record<string, unknown> | null | undefined): string[] {
  if (!data) return [];
  const imgs = data.images;
  return Array.isArray(imgs) ? imgs.filter((u): u is string => typeof u === 'string') : [];
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setNotFound(false);
      setErrorMsg(null);
      try {
        const snap = await getDoc(doc(db, 'orders', id));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const ord = { id: snap.id, ...snap.data() } as Order;
        setOrder(ord);

        const ids = Array.from(
          new Set((ord.order_items ?? []).map((i) => i.product_id).filter(Boolean))
        );
        const results = await Promise.all(
          ids.map(async (pid) => {
            try {
              const ps = await getDoc(doc(db, 'products', pid));
              return ps.exists() ? ({ id: ps.id, ...ps.data() } as Product) : null;
            } catch {
              return null;
            }
          })
        );
        const map: Record<string, Product> = {};
        for (const p of results) if (p) map[p.id] = p;
        setProducts(map);
      } catch (err) {
        console.error('[admin] order detail load failed:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load this order.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (errorMsg || notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-4">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">{errorMsg ? 'Could not load this order.' : 'Order not found.'}</p>
          {errorMsg && <p className="text-xs text-slate-400 break-words mb-4">{errorMsg}</p>}
          <Link to="/admin" className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[order.status] ?? statusConfig.pending;
  const items = order.order_items ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to orders
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${sc.bg} ${sc.color} capitalize`}>
            {order.status}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Customer & shipping */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" /> Customer & Shipping
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{order.shipping_name || '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{order.shipping_phone || '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">
                  {[
                    order.shipping_address,
                    [order.shipping_city, order.shipping_state].filter(Boolean).join(', '),
                    order.shipping_pincode,
                  ].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
            </dl>
            <p className="text-xs text-slate-400 mt-4 break-all">User ID: {order.user_id}</p>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" /> Payment
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total</dt>
                <dd className="font-semibold text-slate-900">{formatINR(Number(order.total))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment status</dt>
                <dd className="text-slate-700 capitalize">{order.payment_status || '—'}</dd>
              </div>
              {order.razorpay_order_id && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Razorpay order</dt>
                  <dd className="text-slate-700 break-all text-right">{order.razorpay_order_id}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600" /> Items ({items.length})
          </h2>
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No items on this order.</p>
          ) : (
            <div className="space-y-5">
              {items.map((item, idx) => {
                const product = products[item.product_id];
                const custom = item.customization_data ?? null;
                const entries = customizationEntries(custom);
                const uploads = imageUrls(custom);
                return (
                  <div key={item.id ?? `${item.product_id}-${idx}`} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {product?.image_url && (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {product ? (
                              <Link to={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-teal-600 truncate block">
                                {product.name}
                              </Link>
                            ) : (
                              <p className="font-medium text-slate-900 truncate">Product #{String(item.product_id ?? '').slice(0, 8)}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5">
                              Qty {item.quantity} · {formatINR(Number(item.price))} each
                            </p>
                          </div>
                          <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                            {formatINR(Number(item.price) * item.quantity)}
                          </span>
                        </div>

                        {entries.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {entries.map((e) => (
                              <span key={e.label} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded capitalize">
                                {e.label}: {e.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {uploads.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" /> Uploaded images ({uploads.length})
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {uploads.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                            >
                              <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
