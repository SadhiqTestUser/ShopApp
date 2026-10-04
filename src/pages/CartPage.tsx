import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Lock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/currency';
import { CustomizationSuggestionsField } from '@/components/CustomizationSuggestions';
import { CustomizationSummary } from '@/components/CustomizationSummary';
import { primaryCustomizationImage } from '@/lib/customizationDisplay';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, updateSuggestions, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();


  function handleCheckout() {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="text-center"
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"
          >
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-6">Browse our products and add items to your cart.</p>
          <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all">
            Browse Products
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-2xl font-bold text-slate-900 mb-6"
        >
          Shopping Cart
        </motion.h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, index) => {
              const unitPrice = item.customization?.unit_price ?? Number(item.product.price);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -24, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-4"
                >
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    <img src={primaryCustomizationImage(item.customization) ?? item.product.image_url ?? ''} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <Link to={`/products/${item.product.id}`} className="font-semibold text-slate-900 hover:text-teal-600 transition-colors">
                        {item.product.name}
                      </Link>
                      <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded mt-1 inline-block">{item.product.category}</span>
                      <CustomizationSummary data={item.customization} compact />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center justify-between mt-3">
                      {item.customization?.name_packs?.length ? (
                        <p className="text-xs text-slate-500">{item.quantity} pack(s) · Quantities set per name</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <span className="w-10 text-center font-semibold text-slate-900 text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">{formatINR(unitPrice * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <CustomizationSuggestionsField
                    className="w-full" productName={`${item.product.name}, item ${index + 1}`}
                    value={item.customization?.suggestions ?? ''}
                    onChange={(value) => updateSuggestions(item.id, value)}
                  />
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.08 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit"
          >
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
            <motion.button
              onClick={handleCheckout}
              disabled={false}
              whileHover={reduceMotion ? undefined : { scale: 1.015 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              className="w-full mt-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <>Checkout <Lock className="w-4 h-4" /></>
            </motion.button>
            {!user && (
              <p className="mt-3 text-center text-xs text-slate-500">
                You'll need to sign in to complete checkout.
              </p>
            )}
            <p className="mt-3 text-center text-xs text-slate-400">
              Secure payment via Razorpay (UPI, Cards, Net Banking)
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
