import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Clock, Star, Key, MessageCircle } from 'lucide-react';
import { loadProducts } from '@/lib/products';
import type { Product } from '@/types';
import { formatINR, getOfferInfo } from '@/lib/currency';
import { KEYCHAIN_CATEGORY_IMAGE } from '@/lib/keychains';
import { fadeInUp, scaleIn, staggerContainer, tapScale, revealViewport } from '@/lib/motion';
import { ScrollProgressBar, Magnetic, Parallax, TiltCard } from '@/components/anim';
import { RevealText, Marquee, CountUp } from '@/components/reveal';

const customerReviews = [
  {
    name: 'Ananya S.',
    location: 'Bengaluru',
    product: 'Matte Photo Frame',
    date: '3 days ago',
    rating: 5,
    text: 'I ordered this as a birthday gift for my mum and was honestly nervous about the photo quality. It came out really clear, the frame is neat, and it was packed very well. She loved it.',
  },
  {
    name: 'Rahul M.',
    location: 'Hyderabad',
    product: 'Custom Photo Mug',
    date: 'Last week',
    rating: 5,
    text: 'The editor was easy to use and the preview looked close to the actual mug. Colours are nice and bright. Delivery took four days for me, which was fine.',
  },
  {
    name: 'Meera P.',
    location: 'Pune',
    product: 'Metal Keychain',
    date: '2 weeks ago',
    rating: 5,
    text: 'Got two keychains with pictures of my dogs. They are small but the print is sharp, and the metal feels sturdy. Already ordered another one for my brother.',
  },
  {
    name: 'Karthik R.',
    location: 'Chennai',
    product: 'Canvas Print',
    date: '2 weeks ago',
    rating: 4,
    text: 'The canvas looks great above our sofa and the colours are true to the photo. The delivery box had a small dent, but the print itself was completely safe inside.',
  },
  {
    name: 'Nisha V.',
    location: 'Mumbai',
    product: 'Photo Book',
    date: '3 weeks ago',
    rating: 5,
    text: 'Made this from our Kerala trip photos. The pages feel good, nothing looked dark or blurry, and everyone at home kept passing it around. Worth the time spent making it.',
  },
];

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadProducts()
      .then((list) => {
        if (!mounted) return;
        // Keychain options belong to their dedicated collection. The home
        // page presents one entry point instead of every individual shape.
        setProducts(list.filter((product) => product.customization_type !== 'keychain').slice(0, 7));
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
          ) : (
            <motion.div
              className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={revealViewport}
            >
              <motion.div variants={fadeInUp} whileTap={tapScale}>
                <TiltCard className="h-full" max={4}>
                <Link
                  to="/keychains"
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-teal-100 flex flex-col h-full"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={KEYCHAIN_CATEGORY_IMAGE}
                      alt="Custom Keychains"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 inline-flex items-center gap-1 text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-teal-600 text-white shadow-sm">
                      <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> New
                    </span>
                  </div>
                  <div className="p-2 sm:p-4 flex flex-col flex-1">
                    <span className="text-[10px] sm:text-xs font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit">Accessories</span>
                    <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 sm:line-clamp-2 group-hover:text-teal-600 transition-colors">Custom Keychains</h3>
                    <div className="mt-2 sm:mt-4 flex items-center justify-between mt-auto">
                      <span className="text-sm sm:text-xl font-bold text-slate-900">From {formatINR(149)}</span>
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-teal-600 group-hover:text-teal-700 font-medium text-sm transition-all">
                        Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
                </TiltCard>
              </motion.div>
              {products.map((p) => (
                <motion.div key={p.id} variants={fadeInUp} whileTap={tapScale}>
                  <TiltCard className="h-full" max={4}>
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
                  </TiltCard>
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

      {/* Customer reviews */}
      <section className="overflow-hidden bg-slate-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700">
              <MessageCircle className="h-4 w-4" /> Customer reviews
            </div>
            <RevealText as="h2" text="Made for meaningful moments" className="text-3xl sm:text-4xl font-bold text-slate-900" />
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">A few words from customers who turned their favourite photos into something they can keep.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,2fr)] lg:items-stretch">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="show" viewport={revealViewport} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold text-slate-500">Customer rating</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight text-slate-900">4.8</span>
                <span className="mb-1 text-sm text-slate-500">out of 5</span>
              </div>
              <div className="mt-3 flex gap-1" aria-label="4.8 out of 5 stars">
                {[...Array(5)].map((_, index) => <Star key={index} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
              </div>
              <div className="my-6 h-px bg-slate-100" />
              <p className="text-sm leading-relaxed text-slate-600">Thoughtful gifts, clear photo prints, and little details that make the memory feel special.</p>
            </motion.div>

            <motion.div
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={revealViewport}
            >
              {customerReviews.map((review) => (
                <motion.article key={`${review.name}-${review.product}`} variants={fadeInUp} className="flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:w-[320px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700" aria-hidden="true">
                      {review.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{review.name}</p>
                      <p className="text-xs text-slate-500">{review.location} · {review.date}</p>
                    </div>
                    <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {[...Array(5)].map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />)}
                    </div>
                  </div>
                  <p className="mt-5 flex-1 text-sm leading-6 text-slate-600">“{review.text}”</p>
                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700">{review.product}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
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
