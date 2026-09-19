import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KEYCHAINS, type KeychainMaterial } from '@/lib/keychains';
import { formatINR } from '@/lib/currency';
import { fadeInUp, staggerContainer, hoverLift, tapScale, revealViewport } from '@/lib/motion';

type MaterialFilter = 'All' | KeychainMaterial;
const MATERIALS: MaterialFilter[] = ['All', 'MDF/Wood', 'Metal', 'Acrylic'];

export default function KeychainCollectionPage() {
  const [material, setMaterial] = useState<MaterialFilter>('All');
  const [search, setSearch] = useState('');

  const filtered = KEYCHAINS.filter((k) => {
    const matchesMaterial = material === 'All' || k.material === material;
    const matchesSearch =
      !search || k.name.toLowerCase().includes(search.toLowerCase()) || k.shape.toLowerCase().includes(search.toLowerCase());
    return matchesMaterial && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800 py-16">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeInUp} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Custom Keychains</h1>
              <p className="mt-1 text-teal-50">Pick a material, choose a shape, and print your favourite photos.</p>
            </div>
          </motion.div>
          <motion.form variants={fadeInUp} onSubmit={(e) => e.preventDefault()} className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search keychains by name or shape..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-slate-800 outline-none shadow-lg"
              />
            </div>
          </motion.form>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Material filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {MATERIALS.map((m) => (
              <button
                key={m}
                onClick={() => setMaterial(m)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  material === m
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-500">
            {filtered.length} keychain{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No keychains found.</p>
          </div>
        ) : (
          <motion.div
            key={`${material}-${search}`}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
          >
            {filtered.map((k) => (
              <motion.div key={k.id} variants={fadeInUp} whileHover={hoverLift} whileTap={tapScale}>
                <Link
                  to={`/keychains/${k.id}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={k.image_url}
                      alt={k.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-slate-700 shadow-sm">
                      {k.material}
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                    <h3 className="text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 group-hover:text-teal-600 transition-colors">
                      {k.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 capitalize">{k.shape} shape</p>
                    <div className="mt-2 sm:mt-4 flex items-center justify-between mt-auto">
                      <span className="text-sm sm:text-xl font-bold text-slate-900">{formatINR(k.price)}</span>
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
