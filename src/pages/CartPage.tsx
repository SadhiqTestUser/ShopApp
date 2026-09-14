import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, Loader2, ArrowLeft, ImageIcon, Lock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/currency';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleCheckout() {
    if (!session) {
      navigate('/login');
      return;
    }
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({ total, shipping_address: '' })
        .select()
        .single();

      if (error || !order) {
        setCheckingOut(false);
        return;
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.customization?.unit_price ?? item.product.price,
        customization_data: item.customization ?? null,
      }));

      await supabase.from('order_items').insert(orderItems);
      clearCart();
      navigate('/dashboard');
    } finally {
      setCheckingOut(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-6">Browse our products and add items to your cart.</p>
          <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const unitPrice = item.customization?.unit_price ?? Number(item.product.price);
              return (
                <div key={item.product.id + (item.customization ? '-custom' : '')} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    <img src={item.product.image_url ?? ''} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link to={`/products/${item.product.id}`} className="font-semibold text-slate-900 hover:text-teal-600 transition-colors">
                        {item.product.name}
                      </Link>
                      <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded mt-1 inline-block">{item.product.category}</span>
                      {item.customization && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.customization.page_count && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{item.customization.page_count} pages</span>
                          )}
                          {item.customization.magnet_shape && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded capitalize">{item.customization.magnet_shape} shape</span>
                          )}
                          {item.customization.images.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> {item.customization.images.length} photo(s)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <span className="w-10 text-center font-semibold text-slate-900 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">{formatINR(unitPrice * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
            <h2 className="font-semibold text-slate-900 mb-4">Order Summary</h2>
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
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full mt-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Checkout <Lock className="w-4 h-4" /></>}
            </button>
            {!session && (
              <p className="mt-3 text-center text-xs text-slate-500">
                You'll need to sign in to complete checkout.
              </p>
            )}
            <p className="mt-3 text-center text-xs text-slate-400">
              Secure payment via Stripe (setup required)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
