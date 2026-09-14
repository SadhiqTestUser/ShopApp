import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Loader2, Check, Minus, Plus, Truck, ShieldCheck, Clock, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
        setLoading(false);
      });
  }, [id]);

  function handleAddToCart() {
    if (!product) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleBuyNow() {
    if (!product) return;
    if (!session) {
      navigate('/login');
      return;
    }
    setOrdering(true);
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({ total: Number(product.price) * quantity, shipping_address: '' })
        .select()
        .single();

      if (error || !order) {
        setOrdering(false);
        return;
      }

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        quantity,
        price: product.price,
      });
      navigate('/dashboard');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 text-lg">Product not found.</p>
          <Link to="/products" className="mt-4 inline-flex items-center gap-2 text-teal-600 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="aspect-square bg-slate-100">
              <img src={product.image_url ?? ''} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">{product.category}</span>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">{product.name}</h1>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-slate-500">(128 reviews)</span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900">${product.price}</p>

            <p className="mt-5 text-slate-600 leading-relaxed">{product.description}</p>

            {/* Quantity */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4 text-slate-600" />
                </button>
                <span className="w-12 text-center text-lg font-semibold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                disabled={added}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-70"
              >
                {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {added ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={ordering}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50"
              >
                {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy Now'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Free shipping over $50</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Quality guaranteed</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Clock className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Ships in 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
