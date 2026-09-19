import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, Search, Key } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatINR, getOfferInfo } from '@/lib/currency';
import { fadeInUp, staggerContainer, hoverLift, tapScale, revealViewport } from '@/lib/motion';
import { KEYCHAIN_CATEGORY_IMAGE } from '@/lib/keychains';
import { MAGNET_SQUARE_IMG } from '@/components/MagnetCustomizer';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getDocs(query(collection(db, 'products'), where('active', '==', true)))
      .then((snap) => {
        if (!mounted) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
        list.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

        const magnetProducts = list.filter((p) => p.customization_type === 'magnet' || /fridge magnets?/i.test(p.name));
        const canonicalMagnet = magnetProducts.find((p) => p.id === '38661002-59aa-421b-b1f3-9fb191f0c6a1')
          ?? magnetProducts.find((p) => /acrylic fridge magnets?/i.test(p.name))
          ?? magnetProducts[0];
        const nonMagnetProducts = list.filter((p) => !magnetProducts.includes(p));
        setProducts(canonicalMagnet
          ? [{ ...canonicalMagnet, name: 'Acrylic Fridge Magnets', image_url: MAGNET_SQUARE_IMG }, ...nonMagnetProducts]
          : nonMagnetProducts);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const showKeychainCard = filter === 'All' || filter === 'Accessories';
  const keychainMatchesSearch = !searchQuery || 'keychain'.includes(searchQuery.toLowerCase());
  const filtered = products.filter((p) => {
    if (p.customization_type === 'keychain') return false;
    const matchesCategory = filter === 'All' || p.category === filter;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(searchQuery ? `/products?q=${encodeURIComponent(searchQuery)}` : '/products');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 py-16">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-white">All Products</motion.h1>
          <motion.p variants={fadeInUp} className="mt-3 text-teal-50">Browse our full catalog of customizable print products</motion.p>
          <motion.form variants={fadeInUp} onSubmit={handleSearch} className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-slate-800 outline-none shadow-lg"
              />
            </div>
          </motion.form>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No products found for "{searchQuery}"</p>
          </div>
        ) : (
          <motion.div
            key={`${filter}-${searchQuery}`}
            className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
          >
            {showKeychainCard && keychainMatchesSearch && (
              <motion.div key="keychain-category" variants={fadeInUp} whileHover={hoverLift} whileTap={tapScale}>
                <Link
                  to="/keychains"
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-teal-100 flex flex-col h-full"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img src={KEYCHAIN_CATEGORY_IMAGE} alt="Custom Keychains" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 inline-flex items-center gap-1 text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-teal-600 text-white shadow-sm">
                      <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> New
                    </span>
                  </div>
                  <div className="p-2 sm:p-4 flex flex-col flex-1">
                    <span className="text-[10px] sm:text-xs font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit">Accessories</span>
                    <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 sm:line-clamp-none group-hover:text-teal-600 transition-colors">Custom Keychains</h3>
                    <div className="mt-2 sm:mt-4 flex items-center justify-between mt-auto">
                      <span className="text-sm sm:text-xl font-bold text-slate-900">From {formatINR(149)}</span>
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-teal-600 group-hover:text-teal-700 font-medium text-sm transition-all">
                        Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}
            {filtered.map((p) => (
              <motion.div key={p.id} variants={fadeInUp} whileHover={hoverLift} whileTap={tapScale}>
              <Link
                to={`/products/${p.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img src={p.image_url ?? ''} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {getOfferInfo(p).hasOffer && (
                    <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 inline-flex items-center gap-1 text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-green-600 text-white shadow-sm">
                      {getOfferInfo(p).discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div className="p-2 sm:p-4 flex flex-col flex-1">
                  <span className="text-[10px] sm:text-xs font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit">{p.category}</span>
                  <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 sm:line-clamp-none group-hover:text-teal-600 transition-colors">{p.name}</h3>
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
                      Customize <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
