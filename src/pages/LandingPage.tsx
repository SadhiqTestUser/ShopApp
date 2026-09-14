import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Clock, Star, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .limit(6)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> Trusted by millions since 2015
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
                Turn Your Memories Into <span className="text-teal-600">Beautiful Products</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
                Custom photo books, phone cases, mugs, canvas prints, and more. Crafted with premium materials and printed with love.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30"
                >
                  Start Creating <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 text-slate-700 font-semibold transition-all"
                >
                  Create Account
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> 1 Crore+ Photos Printed</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Premium Materials</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Fast Delivery</span>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img src="https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Photo Book" className="rounded-2xl shadow-xl w-full h-48 object-cover" />
                  <img src="https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Photo Mug" className="rounded-2xl shadow-xl w-full h-32 object-cover" />
                </div>
                <div className="space-y-4 pt-8">
                  <img src="https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Phone Case" className="rounded-2xl shadow-xl w-full h-32 object-cover" />
                  <img src="https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Canvas Print" className="rounded-2xl shadow-xl w-full h-48 object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Fast Delivery', desc: 'Free shipping on orders over $50. Delivered in 3-5 business days.' },
              { icon: ShieldCheck, title: 'Quality Guarantee', desc: 'Not happy? We reprint it free. Premium materials, every time.' },
              { icon: Clock, title: 'Quick Turnaround', desc: 'Most orders printed and shipped within 24 hours of approval.' },
              { icon: Sparkles, title: 'Easy Customization', desc: 'Our smart editor makes designing your product effortless.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg border border-transparent hover:border-slate-200 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Popular Products</h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Explore our most loved customizable products. Each one crafted with care and printed to perfection.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={p.image_url ?? ''}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded">{p.category}</span>
                  <h3 className="mt-3 font-semibold text-slate-900 text-lg">{p.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-bold text-slate-900">${p.price}</span>
                    <Link to={`/products/${p.id}`} className="px-4 py-2 rounded-lg bg-slate-100 group-hover:bg-teal-600 group-hover:text-white text-slate-700 font-medium text-sm transition-all">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all">
              View All Products <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Loved by Customers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah J.', text: 'The photo book quality is stunning. The lay-flat binding makes every page look professional. Will definitely order again!' },
              { name: 'Michael R.', text: 'Got a custom phone case and it exceeded my expectations. The print is crisp and the case fits perfectly. Great service!' },
              { name: 'Priya K.', text: 'Ordered canvas prints for my living room and they look like gallery pieces. Fast delivery and excellent packaging.' },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
                <p className="font-semibold text-slate-900">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-cyan-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Create Something Beautiful?</h2>
          <p className="mt-4 text-teal-50 text-lg">Join millions of customers who trust us with their memories.</p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-teal-700 font-bold hover:bg-teal-50 transition-all shadow-lg"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
