import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2, Check, Truck, Type } from 'lucide-react';
import { formatINR } from '@/lib/currency';
import PenPreview from '@/components/PenPreview';
import type { CartItem } from '@/context/CartContext';
import type { Product } from '@/types';

interface PriceTier {
  minPacks: number;
  price: number;
}

interface StationeryName {
  id: string;
  text: string;
  packs: number;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Uppercase and keep only characters we can cleanly print on a barrel.
export function sanitizeName(raw: string, maxLength = 14): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 &.'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLength);
}

// Lowest per-pack price whose minPacks threshold is met by the total pack count.
function tierPrice(tiers: PriceTier[], totalPacks: number): number {
  const sorted = [...tiers].sort((a, b) => b.minPacks - a.minPacks);
  for (const t of sorted) {
    if (totalPacks >= t.minPacks) return t.price;
  }
  return sorted.length ? sorted[sorted.length - 1].price : 0;
}

// Live, print-accurate pencil rendered as scalable SVG so the name always fits.
export function PencilPreview({ name, className }: { name: string; className?: string }) {
  const text = (name || '').trim() || 'YOUR NAME';
  // Shrink long names so they never spill past the barrel's print area.
  const fontSize = Math.min(70, 740 / (0.62 * Math.max(text.length, 1)));
  return (
    <svg viewBox="0 0 1000 160" className={className} role="img" aria-label={`Pencil with name ${text}`}>
      <defs>
        <linearGradient id="np-barrel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="np-ferrule" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>
      {/* Sharpened wood cone + graphite tip */}
      <polygon points="0,80 70,35 70,125" fill="#e2b07a" />
      <polygon points="0,80 26,64 26,96" fill="#374151" />
      {/* Barrel */}
      <rect x="66" y="35" width="800" height="90" fill="url(#np-barrel)" />
      <rect x="66" y="35" width="18" height="90" fill="#b45309" opacity="0.55" />
      {/* Ferrule (metal band) */}
      <rect x="866" y="35" width="72" height="90" fill="url(#np-ferrule)" />
      <rect x="884" y="35" width="4" height="90" fill="#4b5563" opacity="0.6" />
      <rect x="912" y="35" width="4" height="90" fill="#4b5563" opacity="0.6" />
      {/* Eraser */}
      <path d="M938 35 H960 a45 45 0 0 1 0 90 H938 Z" fill="#f7a8b8" />
      {/* Top sheen */}
      <rect x="66" y="40" width="800" height="12" fill="#ffffff" opacity="0.28" />
      {/* Printed name */}
      <text
        x="470"
        y="83"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Poppins','Segoe UI',sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        letterSpacing="2"
        fill="#3b1d06"
      >
        {text}
      </text>
    </svg>
  );
}

export default function NamePencilCustomizer({
  product,
  onAddToCart,
  suggestionsField,
}: {
  product: Product;
  onAddToCart: (customization: NonNullable<CartItem['customization']>, totalQty: number, unitPrice: number) => void;
  suggestionsField?: ReactNode;
}) {
  const opts = product.customization_options ?? {};
  const isPen = product.customization_type === 'name_pen';
  const itemLabel = isPen ? 'pen' : 'pencil';
  const itemsPerPack = ((isPen ? opts.pensPerPack : opts.pencilsPerPack) as number) ?? 10;
  const Preview = isPen ? PenPreview : PencilPreview;
  const maxNameLength = (opts.maxNameLength as number) ?? 14;
  const gallery = (opts.gallery as string[]) ?? (product.image_url ? [product.image_url] : []);
  const tiers = (opts.tiers as PriceTier[]) ?? [
    { minPacks: 10, price: 99 },
    { minPacks: 5, price: 129 },
    { minPacks: 2, price: 149 },
    { minPacks: 1, price: 149 },
  ];

  const [names, setNames] = useState<StationeryName[]>([{ id: makeId(), text: '', packs: 1 }]);
  const [added, setAdded] = useState(false);

  const totalPacks = names.reduce((sum, n) => sum + n.packs, 0);
  const perPack = tierPrice(tiers, totalPacks);
  const totalPrice = perPack * totalPacks;
  const namedCount = names.filter((n) => n.text.trim().length > 0).length;
  const allNamed = names.every((n) => n.text.trim().length > 0);

  function updateName(id: string, text: string) {
    setNames((prev) => prev.map((n) => (n.id === id ? { ...n, text: sanitizeName(text, maxNameLength) } : n)));
  }

  function changePacks(id: string, delta: number) {
    setNames((prev) => prev.map((n) => (n.id === id ? { ...n, packs: Math.max(1, n.packs + delta) } : n)));
  }

  function addName() {
    setNames((prev) => [...prev, { id: makeId(), text: '', packs: 1 }]);
  }

  function removeName(id: string) {
    setNames((prev) => (prev.length > 1 ? prev.filter((n) => n.id !== id) : prev));
  }

  function handleAddToCart() {
    if (!allNamed) return;
    onAddToCart(
      {
        customization_type: isPen ? 'name_pen' : 'name_pencil',
        page_count: null,
        magnet_shape: null,
        images: [],
        unit_price: perPack,
        ...(isPen
          ? { pen_names: names.map((n) => n.text.trim()), pen_packs: totalPacks }
          : { pencil_names: names.map((n) => n.text.trim()), pencil_packs: totalPacks }),
        name_packs: names.map((n) => ({ name: n.text.trim(), packs: n.packs })),
      },
      totalPacks,
      perPack,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Product Gallery</h3>
          <div className="grid grid-cols-3 gap-3">
            {gallery.map((src, i) => (
              <div key={src} className="aspect-square rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                <img src={src} alt={`Name ${itemLabel} sample ${i + 1}`} loading="lazy" className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Name entries */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Type className="w-4 h-4 text-teal-600" /> Personalize Your {isPen ? 'Pens' : 'Pencils'}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Type a name, see it live on the {itemLabel}, and pick how many packs you need. Each pack has {itemsPerPack} {itemLabel}s.
        </p>

        <div className="space-y-4">
          {names.map((n, idx) => (
            <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
              {/* Live preview for this name */}
              <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-3 mb-3">
                <p className="text-center text-xs text-slate-500 mb-1">Live name preview</p>
                <Preview name={n.text} className="w-full h-auto" />
              </div>

              <label htmlFor={`stationery-name-${n.id}`} className="block text-xs font-medium text-slate-500 mb-1">
                Name {names.length > 1 ? `#${idx + 1}` : ''} (Your Text)
              </label>
              <input
                id={`stationery-name-${n.id}`}
                type="text"
                value={n.text}
                onChange={(e) => updateName(n.id, e.target.value)}
                placeholder="e.g. SATHWIKA"
                maxLength={maxNameLength}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-900 font-semibold tracking-wide uppercase"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Packs</span>
                  <button aria-label={`Remove a pack for name ${idx + 1}`} disabled={n.packs === 1} onClick={() => changePacks(n.id, -1)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-slate-900">{n.packs}</span>
                  <button aria-label={`Add a pack for name ${idx + 1}`} onClick={() => changePacks(n.id, 1)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="text-xs text-slate-400">= {n.packs * itemsPerPack} {itemLabel}s</span>
                </div>
                {names.length > 1 && (
                  <button aria-label={`Remove name ${idx + 1}`} onClick={() => removeName(n.id)} className="w-8 h-8 rounded-lg border border-red-200 hover:bg-red-50 flex items-center justify-center text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addName}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 text-slate-600 hover:text-teal-600 font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Another Name
        </button>
      </div>

      {/* Pricing summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total Packs</span>
          <span className="font-semibold text-slate-900">{totalPacks} ({totalPacks * itemsPerPack} {itemLabel}s)</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Price per Pack</span>
          <span className="font-semibold text-slate-900">{formatINR(perPack)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total Price</span>
          <span className="text-xl font-bold text-teal-600">{formatINR(totalPrice)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Truck className="w-4 h-4" />
          <span className="font-medium">Free Shipping Included</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[...tiers].filter((t) => t.minPacks > 1).sort((a, b) => a.minPacks - b.minPacks).map((t) => (
            <span
              key={t.minPacks}
              className={`text-xs px-2 py-1 rounded-full ${perPack === t.price ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {t.minPacks}+ packs → {formatINR(t.price)} each
            </span>
          ))}
        </div>
      </div>

      {/* Add to cart */}
      {suggestionsField}
      <motion.button
        onClick={handleAddToCart}
        disabled={added || !allNamed}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        {added ? 'Added to Cart' : 'Add to Cart'}
      </motion.button>

      {!allNamed && (
        <p className="text-sm text-amber-600">
          Please enter a name for each {itemLabel} ({namedCount}/{names.length} done).
        </p>
      )}
    </div>
  );
}
