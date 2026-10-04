import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Search } from 'lucide-react';
import {
  MUG_DESIGNS, DESIGN_CATEGORIES, MUG_TYPES, type MugDesign,
} from '@/lib/mugs';
import MugWrap from './MugWrap';
import MugDesignHelp from './MugDesignHelp';
import { initConfig } from './mugState';

interface MugGallerySelectorProps {
  onStart: (design: MugDesign) => void;
}

// Browse ready-made mug designs with category filters. Each card renders a live
// flat-wrap thumbnail (using the template defaults) and a "Start Design" button.
export default function MugGallerySelector({ onStart }: MugGallerySelectorProps) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => MUG_DESIGNS.filter((design) => (category === 'All' || design.category === category) && `${design.name} ${design.category}`.toLowerCase().includes(search.toLowerCase().trim())),
    [category, search],
  );

  const defaultType = MUG_TYPES[0];

  return (
    <div className="mt-6 space-y-5">
      <MugDesignHelp />
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-teal-600" /> A little inspiration to start
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Pick a ready-made template to personalize, then upload your photos and text.
        </p>
        <label className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400" /><input aria-label="Search mug templates" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a template, occasion or style…" className="min-w-0 w-full bg-transparent text-sm outline-none" />
        </label>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {DESIGN_CATEGORIES.map((cat) => (
            <button
              type="button" key={cat} aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                category === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Design grid */}
        {!filtered.length && <p role="status" className="py-10 text-center text-sm text-slate-500">No templates found. Try a different search or category.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((design) => {
            const config = initConfig(design, defaultType.id, defaultType.baseColor, defaultType.handles[0]);
            return (
              <motion.div
                key={design.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                  <MugWrap design={design} config={config} width={400} className="shadow-sm" />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{design.name}</p>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${design.accent ?? '#0d9488'}22`, color: design.accent ?? '#0d9488' }}
                    >
                      {design.category}
                    </span>
                  </div>
                  <button
                    type="button" onClick={() => onStart(design)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
                  >
                    Start Design
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
