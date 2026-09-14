import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/currency';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { session, profile } = useAuth();

  const [form, setForm] = useState({
    name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address: '',
    pincode: '',
    city: '',
    state: '',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderId: string } | null>(null);

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nothing to checkout</h2>
          <p className="text-slate-500 mb-6">Your cart is empty.</p>
          <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    if (!form.name.trim()) { setError('Please enter your name'); return false; }
    if (!form.phone.trim() || form.phone.length < 10) { setError('Please enter a valid phone number'); return false; }
    if (!form.address.trim()) { setError('Please enter your address'); return false; }
    if (!form.pincode.trim() || form.pincode.length !== 6) { setError('Please enter a valid 6-digit pincode'); return false; }
    if (!form.city.trim()) { setError('Please enter your city'); return false; }
    if (!form.state.trim()) { setError('Please enter your state'); return false; }
    setError(null);
    return true;
  }

  async function handlePayment() {
    if (!validate() || !session) return;
    setProcessing(true);
    setError(null);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.customization?.unit_price ?? Number(item.product.price),
        customization_data: item.customization ?? null,
      }));

      // Call edge function to create Razorpay order
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: total,
            shipping_name: form.name,
            shipping_phone: form.phone,
            shipping_address: form.address,
            shipping_pincode: form.pincode,
            shipping_city: form.city,
            shipping_state: form.state,
            items: orderItems,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to initiate payment');
        setProcessing(false);
        return;
      }

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: result.razorpay_key_id,
        amount: result.amount,
        currency: result.currency,
        name: 'Printcraft',
        description: 'Custom Print Order',
        order_id: result.razorpay_order_id,
        prefill: {
          name: form.name,
          email: session.user.email ?? '',
          contact: form.phone,
        },
        theme: { color: '#0d9488' },
        handler: async (paymentResponse: RazorpayResponse) => {
          // Verify payment on server
          const verifyResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                order_id: result.order_id,
              }),
            }
          );

          const verifyResult = await verifyResponse.json();

          if (verifyResponse.ok && verifyResult.success) {
            clearCart();
            setSuccess({ orderId: result.order_id });
            setProcessing(false);
          } else {
            setError(verifyResult.error || 'Payment verification failed');
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setError('Payment cancelled. You can try again.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Something went wrong. Please try again.');
      setProcessing(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-slate-500 mb-1">Your order has been placed successfully.</p>
          <p className="text-sm text-slate-400 mb-6">Order ID: #{success.orderId.slice(0, 8)}</p>
          <div className="flex flex-col gap-3">
            <Link
              to="/dashboard"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all"
            >
              View My Orders
            </Link>
            <Link
              to="/products"
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/cart" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipping Address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Pincode</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="6-digit pincode"
                    maxLength={6}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all resize-none"
                    placeholder="House no, street, area, landmark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="Enter your city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="Enter your state"
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const unitPrice = item.customization?.unit_price ?? Number(item.product.price);
                  return (
                    <div key={item.product.id + (item.customization ? '-custom' : '')} className="flex items-center gap-3 py-2">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img src={item.product.image_url ?? ''} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">{formatINR(unitPrice * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit sticky top-20">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>{formatINR(total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between font-bold text-slate-900 text-lg">
                  <span>Total</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full mt-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Pay {formatINR(total)}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secured by Razorpay
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                UPI, Cards, Net Banking & Wallets accepted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
