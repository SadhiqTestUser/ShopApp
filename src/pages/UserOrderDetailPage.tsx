import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, MapPin, Package } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { formatINR } from '@/lib/currency';
import type { Order, Product } from '@/types';
import { CustomizationSuggestionsNote } from '@/components/CustomizationSuggestions';
import { CustomizationSummary } from '@/components/CustomizationSummary';
import { primaryCustomizationImage } from '@/lib/customizationDisplay';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600', processing: 'bg-blue-50 text-blue-600',
  shipped: 'bg-purple-50 text-purple-600', delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-600',
};

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export default function UserOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id || !user) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'orders', id));
        if (!snap.exists()) return;
        const value = { id: snap.id, ...snap.data() } as Order;
        if (value.user_id !== user.uid) return;
        setOrder(value);
        const ids = [...new Set((value.order_items ?? []).map((item) => item.product_id))];
        const found = await Promise.all(ids.map(async (productId) => {
          const product = await getDoc(doc(db, 'products', productId));
          return product.exists() ? ({ id: product.id, ...product.data() } as Product) : null;
        }));
        setProducts(Object.fromEntries(found.filter((product): product is Product => !!product).map((product) => [product.id, product])));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, user]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!order) return <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4"><div className="text-center"><Package className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="text-slate-500">Order not found.</p><Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-teal-600">Back to My Dashboard</Link></div></div>;

  const paymentMethod = order.payment_method ?? (order.payment_status === 'paid' ? 'Razorpay' : 'Awaiting payment');
  const items = order.order_items ?? [];
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/dashboard')} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Back to My Orders</button>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h1><p className="mt-1 text-sm text-slate-500">Placed on {new Date(order.created_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusStyles[order.status] ?? statusStyles.pending}`}>{order.status}</span></div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><MapPin className="h-4 w-4 text-teal-600" /> Delivery details</h2><dl className="space-y-2 text-sm text-slate-700"><div>{order.shipping_name || '—'}</div><div>{order.shipping_phone || '—'}</div><div className="whitespace-pre-line">{[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join('\n') || '—'}</div></dl></section>
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><CreditCard className="h-4 w-4 text-teal-600" /> Payment details</h2><dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Total</dt><dd className="font-semibold text-slate-900">{formatINR(Number(order.total))}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="capitalize text-slate-700">{order.payment_status || 'pending'}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Method</dt><dd className="capitalize text-slate-700">{readable(paymentMethod)}</dd></div>{order.razorpay_payment_id && <div className="flex justify-between gap-3"><dt className="text-slate-500">Transaction ID</dt><dd className="break-all text-right text-slate-700">{order.razorpay_payment_id}</dd></div>}</dl></section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><Package className="h-4 w-4 text-teal-600" /> Items ({items.length})</h2><div className="space-y-5">{items.map((item, index) => { const product = products[item.product_id]; const custom = item.customization_data ?? null; return <article key={item.id ?? `${item.product_id}-${index}`} className="rounded-xl border border-slate-100 p-4"><div className="flex gap-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{(primaryCustomizationImage(custom) || product?.image_url) && <img src={primaryCustomizationImage(custom) ?? product?.image_url ?? ''} alt={product?.name ?? 'Customized product'} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div>{product ? <Link to={`/products/${product.id}`} className="block truncate font-medium text-slate-900 hover:text-teal-600">{product.name}</Link> : <p className="font-medium text-slate-900">Product #{item.product_id.slice(0, 8)}</p>}<p className="mt-0.5 text-xs text-slate-500">Qty {item.quantity} · {formatINR(Number(item.price))} each</p></div><span className="whitespace-nowrap text-sm font-semibold text-slate-900">{formatINR(Number(item.price) * item.quantity)}</span></div></div></div><CustomizationSummary data={custom} /><CustomizationSuggestionsNote data={custom} /></article>; })}</div></section>
      </div>
    </div>
  );
}