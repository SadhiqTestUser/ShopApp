import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Clock, Star } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/types';
import { formatINR, getOfferInfo } from '@/lib/currency';
import { fadeInUp, scaleIn, staggerContainer, tapScale, revealViewport } from '@/lib/motion';
import { ScrollProgressBar, Magnetic, Parallax } from '@/components/anim';
import { RevealText, Marquee, CountUp } from '@/components/reveal';

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  useEffect(() => {
    let mounted = true;

    getDocs(query(collection(db, 'products'), where('active', '==', true)))
      .then((snap) => {
        if (!mounted) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
        list.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
        setProducts(list.slice(0, 8));
      })
      .catch(() => {
        if (mounted) setProductsError(true);
      })
      .finally(() => {
        if (mounted) setProductsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-white">
      <ScrollProgressBar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50">
        <div className="absolute inset-0 opacity-40">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-teal-300 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl"
            animate={{ x: [0, -40, 0], y: [0, 25, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 15, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6"
              >
                <Sparkles className="w-4 h-4" /> Trusted by millions since 2015
              </motion.div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
                <RevealText text="Turn Your Memories Into" mode="mount" className="block" />
                <RevealText
                  text="Beautiful Products"
                  mode="mount"
                  delay={0.3}
                  className="block text-teal-600"
                />
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl"
              >
                Custom photo books, phone cases, mugs, canvas prints, and more. Crafted with premium materials and printed with love.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.85 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Magnetic>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30"
                  >
                    Start Creating <ArrowRight className="w-5 h-5" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 text-slate-700 font-semibold transition-all"
                  >
                    Create Account
                  </Link>
                </Magnetic>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-10 grid grid-cols-3 gap-6 max-w-lg"
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                    <CountUp value={1} suffix="Cr+" />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Photos Printed</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                    <CountUp value={50} suffix="k+" />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Happy Customers</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                    <CountUp value={24} suffix="h" />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Turnaround</div>
                </div>
              </motion.div>
            </div>

            <motion.div variants={scaleIn} initial="hidden" animate="show" className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Parallax speed={30} className="space-y-4">
                  <img src="https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Photo Book" className="rounded-2xl shadow-xl w-full h-48 object-cover" />
                  <img src="https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Photo Mug" className="rounded-2xl shadow-xl w-full h-32 object-cover" />
                </Parallax>
                <Parallax speed={-30} className="space-y-4 pt-8">
                  <img src="https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Phone Case" className="rounded-2xl shadow-xl w-full h-32 object-cover" />
                  <img src="https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=400&w=400" alt="Canvas Print" className="rounded-2xl shadow-xl w-full h-48 object-cover" />
                </Parallax>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="absolute -top-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> 4.9/5 Rated
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3, type: 'spring', stiffness: 200, damping: 15 }}
                className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Truck className="w-4 h-4 text-teal-500" /> Free Shipping
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marquee band */}
      <section className="border-y border-slate-100 bg-slate-900 py-4">
        <Marquee speed={28}>
          {['Photo Books', 'Phone Cases', 'Canvas Prints', 'Custom Mugs', 'Wooden Stands', 'Wall Frames'].map((t) => (
            <span key={t} className="mx-8 inline-flex items-center gap-3 text-lg font-semibold text-white/80">
              {t} <Sparkles className="w-4 h-4 text-teal-400" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* Products */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <RevealText as="h2" text="Popular Products" className="text-3xl sm:text-4xl font-bold text-slate-900" />
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Explore our most loved customizable products. Each one crafted with care and printed to perfection.</p>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm animate-pulse">
                  <div className="aspect-square bg-slate-200" />
                  <div className="space-y-2 p-2 sm:p-4">
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                    <div className="h-4 w-4/5 rounded bg-slate-200" />
                    <div className="h-5 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
              Products are temporarily unavailable. Please refresh and try again.
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              No products are available right now.
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={revealViewport}
            >
              {products.map((p) => (
                <motion.div key={p.id} variants={fadeInUp} whileTap={tapScale}>
                  <Link
                    to={`/products/${p.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={p.image_url ?? ''}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {getOfferInfo(p).hasOffer && (
                        <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 inline-flex items-center gap-1 text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-green-600 text-white shadow-sm">
                          {getOfferInfo(p).discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-4 flex flex-col flex-1">
                      <span className="text-[10px] sm:text-xs font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit">{p.category}</span>
                      <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 sm:line-clamp-2 group-hover:text-teal-600 transition-colors">{p.name}</h3>
                      <div className="mt-2 sm:mt-4 flex items-center justify-between mt-auto">
                        {(() => {
                          const offer = getOfferInfo(p);
                          return offer.hasOffer ? (
                            <span className="flex items-baseline gap-1 sm:gap-2">
                              <span className="text-sm sm:text-xl font-bold text-slate-900">{formatINR(offer.price)}</span>
                              <span className="text-[10px] sm:text-sm text-slate-400 line-through">{formatINR(offer.originalPrice)}</span>
                            </span>
                          ) : (
                            <span className="text-sm sm:text-xl font-bold text-slate-900">{formatINR(p.price)}</span>
                          );
                        })()}
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-teal-600 group-hover:text-teal-700 font-medium text-sm transition-all">
                          Customize <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="text-center mt-10">
            <Magnetic className="inline-block">
              <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all">
                View All Products <ArrowRight className="w-5 h-5" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-4 gap-2 sm:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
          >
            {[
              { icon: Truck, title: 'Fast Delivery', desc: 'Free shipping on orders over ₹500. Delivered in 3-5 business days.' },
              { icon: ShieldCheck, title: 'Quality Guarantee', desc: 'Not happy? We reprint it free. Premium materials, every time.' },
              { icon: Clock, title: 'Quick Turnaround', desc: 'Most orders printed and shipped within 24 hours of approval.' },
              { icon: Sparkles, title: 'Easy Customization', desc: 'Our smart editor makes designing your product effortless.' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="group h-full rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:p-6 transition-all hover:border-slate-200 hover:bg-white hover:shadow-xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 transition-transform duration-300 group-hover:scale-110 sm:mb-4 sm:h-12 sm:w-12 sm:rounded-xl">
                    <f.icon className="h-4 w-4 text-teal-600 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-[10px] font-semibold leading-tight text-slate-900 sm:text-base">{f.title}</h3>
                  <p className="mt-1 hidden text-sm leading-relaxed text-slate-500 sm:block">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <RevealText as="h2" text="Loved by Customers" className="text-3xl sm:text-4xl font-bold text-slate-900" />
          </div>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
          >
            {[
              { name: 'Sarah J.', text: 'The photo book quality is stunning. The lay-flat binding makes every page look professional. Will definitely order again!' },
              { name: 'Michael R.', text: 'Got a custom phone case and it exceeded my expectations. The print is crisp and the case fits perfectly. Great service!' },
              { name: 'Priya K.', text: 'Ordered canvas prints for my living room and they look like gallery pieces. Fast delivery and excellent packaging.' },
            ].map((t, i) => (
              <motion.div key={i} variants={fadeInUp} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
                <p className="font-semibold text-slate-900">{t.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-cyan-700">
        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
        >
          <RevealText as="h2" text="Ready to Create Something Beautiful?" className="text-3xl sm:text-4xl font-bold text-white" />
          <p className="mt-4 text-teal-50 text-lg">Join millions of customers who trust us with their memories.</p>
          <Magnetic className="inline-block mt-8">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-teal-700 font-bold hover:bg-teal-50 transition-all shadow-lg"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </Magnetic>
        </motion.div>
      </section>
    </div>
  );
}
