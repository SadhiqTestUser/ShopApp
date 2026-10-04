// Data model for the Photo Mugs design studio: mug types, ready-made design
// templates (photo/text slots) and quantity-based pricing helpers.
// Print area for all mugs is 200mm x 97mm (wrap-around).

export const MUG_PRINT_MM = { width: 200, height: 97 };
export const MUG_WRAP_RATIO = MUG_PRINT_MM.width / MUG_PRINT_MM.height; // ~2.06
export const WHITE_MUG_COLOR = '#ffffff';

export type MugMaterial = 'glossy' | 'matte' | 'reveal' | 'glass' | 'metal';
export type HandleStyle = 'round' | 'love';

export interface MugType {
  id: string;
  label: string;
  price: number;
  mrp: number;
  description: string;
  material: MugMaterial;
  // Base body colour used by the 3D preview (design prints on top of it).
  baseColor: string;
  // Whether the customer may recolour the mug body/handle.
  allowColor: boolean;
  // Handle styles offered for this type.
  handles: HandleStyle[];
}

export const MUG_TYPES: MugType[] = [
  {
    id: 'regular', label: 'Regular Mug', price: 249, mrp: 399,
    description: '11oz white ceramic, glossy full-colour print. Dishwasher safe.',
    material: 'glossy', baseColor: WHITE_MUG_COLOR, allowColor: false, handles: ['round', 'love'],
  },
  {
    id: 'premium', label: 'Premium Mug', price: 349, mrp: 549,
    description: 'Premium white ceramic with a brighter, sharper photo print.',
    material: 'glossy', baseColor: WHITE_MUG_COLOR, allowColor: false, handles: ['round', 'love'],
  },
  {
    id: 'fiber', label: 'Unbreakable (Fiber) Mug', price: 399, mrp: 599,
    description: 'Shatter-proof white fiber body with a durable matte finish. Great for kids.',
    material: 'matte', baseColor: WHITE_MUG_COLOR, allowColor: false, handles: ['round'],
  },
];

export function getMugType(id: string): MugType {
  return MUG_TYPES.find((t) => t.id === id) ?? MUG_TYPES[0];
}

// Curated font stacks that render on most systems (no extra font files).
export const MUG_FONTS: { id: string; label: string; stack: string }[] = [
  { id: 'poppins', label: 'Rounded', stack: "'Poppins','Segoe UI',sans-serif" },
  { id: 'serif', label: 'Classic', stack: "Georgia,'Times New Roman',serif" },
  { id: 'script', label: 'Script', stack: "'Brush Script MT','Segoe Script',cursive" },
  { id: 'impact', label: 'Bold', stack: "Impact,'Arial Black',sans-serif" },
  { id: 'mono', label: 'Type', stack: "'Courier New',monospace" },
  { id: 'comic', label: 'Fun', stack: "'Comic Sans MS','Trebuchet MS',cursive" },
];

export const TEXT_COLORS = [
  '#111827', '#ffffff', '#ef4444', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#78350f', '#facc15',
];

// Quantity-based unit price: gentle volume discount off the type's base price.
export function quantityUnitPrice(base: number, qty: number): number {
  let factor = 1;
  if (qty >= 6) factor = 0.85;
  else if (qty >= 4) factor = 0.9;
  else if (qty >= 2) factor = 0.95;
  return Math.round(base * factor);
}

export const QUANTITY_TIERS = [
  { minQty: 2, label: '2+ mugs', off: '5% off' },
  { minQty: 4, label: '4+ mugs', off: '10% off' },
  { minQty: 6, label: '6+ mugs', off: '15% off' },
];

// --- Ready-made design templates ---
export type SlotType = 'photo' | 'text';

export interface DesignSlot {
  id: string;
  type: SlotType;
  // Position/size as % of the wrap print area.
  x: number; y: number; w: number; h: number;
  radius?: number; // border radius % for photo slots
  // Text defaults
  text?: string;
  fontId?: string;
  color?: string;
  fontScale?: number; // relative to slot height
  align?: 'left' | 'center' | 'right';
}

// --- Vector decoration layer ---
// Decorations are resolution-independent shapes drawn behind the photo/text
// slots. They are rendered by one shared painter (mugArtwork.ts) so the flat
// preview and the 3D texture look identical. All positions/sizes are % of the
// print area unless noted. Scatter decorations use a seed for stable layout.
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type Decoration =
  | { kind: 'band'; color: string; edge: 'top' | 'bottom' | 'both'; size: number }
  | { kind: 'border'; color: string; inset: number; width: number; radius?: number }
  | { kind: 'dots'; color: string; size: number; gap: number; opacity?: number }
  | { kind: 'stripes'; colors: string[]; width: number; angle?: number; opacity?: number }
  | { kind: 'checker'; colors: [string, string]; size: number; opacity?: number }
  | { kind: 'confetti'; colors: string[]; count: number; seed?: number; opacity?: number }
  | { kind: 'hearts'; color: string; count: number; seed?: number; sizeRange?: [number, number]; opacity?: number }
  | { kind: 'stars'; color: string; count: number; seed?: number; sizeRange?: [number, number]; opacity?: number }
  | { kind: 'waves'; colors: string[]; edge: 'top' | 'bottom'; height: number }
  | { kind: 'ribbon'; color: string; y: number; height: number; shadow?: string }
  | { kind: 'sunburst'; color: string; cx: number; cy: number; rays?: number; opacity?: number }
  | { kind: 'floral'; color: string; corners?: Corner[]; size?: number; opacity?: number }
  | { kind: 'panel'; color: string; x: number; y: number; w: number; h: number; radius?: number; shadow?: boolean; stroke?: string };

export interface MugDesign {
  id: string;
  name: string;
  category: string;
  // Wrap background: a CSS colour, linear-gradient() or radial-gradient().
  background: string;
  // Optional accent used for the thumbnail label.
  accent?: string;
  // Vector artwork drawn behind the slots (shared by preview + 3D texture).
  decorations?: Decoration[];
  slots: DesignSlot[];
}

export const DESIGN_CATEGORIES = ['All', 'Photo', 'Birthday', 'Love', 'Anniversary', 'Kids', 'Quotes', 'Festive'];

const T = (over: Partial<DesignSlot>): DesignSlot => ({
  id: '', type: 'text', x: 0, y: 0, w: 100, h: 20,
  text: 'Your Text', fontId: 'poppins', color: '#111827', fontScale: 0.6, align: 'center', ...over,
});
const P = (over: Partial<DesignSlot>): DesignSlot => ({
  id: '', type: 'photo', x: 0, y: 0, w: 40, h: 84, radius: 6, ...over,
});

export const MUG_DESIGNS: MugDesign[] = [
  // ---------------- Photo ----------------
  {
    id: 'full-photo', name: 'Full Wrap Photo', category: 'Photo', background: '#ffffff', accent: '#0ea5e9',
    decorations: [{ kind: 'border', color: '#e2e8f0', inset: 1.6, width: 0.7, radius: 3 }],
    slots: [P({ x: 4, y: 7, w: 92, h: 86, radius: 3 })],
  },
  {
    id: 'photo-caption', name: 'Photo + Caption', category: 'Photo',
    background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', accent: '#6366f1',
    decorations: [
      { kind: 'band', color: '#6366f1', edge: 'bottom', size: 8 },
      { kind: 'panel', color: '#ffffff', x: 4, y: 9, w: 44, h: 82, radius: 5, shadow: true },
    ],
    slots: [
      P({ x: 6, y: 11, w: 40, h: 78, radius: 4 }),
      T({ x: 52, y: 28, w: 44, h: 24, text: 'Best Friends', fontId: 'script', color: '#4338ca', fontScale: 0.62 }),
      T({ x: 52, y: 58, w: 44, h: 16, text: 'since 2016', fontId: 'poppins', color: '#64748b', fontScale: 0.42 }),
    ],
  },
  {
    id: 'collage-3', name: 'Three Photos', category: 'Photo',
    background: 'linear-gradient(135deg,#0f172a,#1e293b)', accent: '#f59e0b',
    decorations: [
      { kind: 'panel', color: '#ffffff', x: 2, y: 11, w: 30, h: 78, radius: 4, shadow: true },
      { kind: 'panel', color: '#ffffff', x: 35, y: 11, w: 30, h: 78, radius: 4, shadow: true },
      { kind: 'panel', color: '#ffffff', x: 68, y: 11, w: 30, h: 78, radius: 4, shadow: true },
    ],
    slots: [
      P({ x: 3.5, y: 12.5, w: 27, h: 75, radius: 3 }),
      P({ x: 36.5, y: 12.5, w: 27, h: 75, radius: 3 }),
      P({ x: 69.5, y: 12.5, w: 27, h: 75, radius: 3 }),
    ],
  },
  {
    id: 'collage-2', name: 'Two Photos', category: 'Photo',
    background: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', accent: '#0ea5e9',
    decorations: [
      { kind: 'dots', color: '#cbd5e1', size: 0.6, gap: 6, opacity: 0.5 },
      { kind: 'panel', color: '#ffffff', x: 3, y: 12, w: 45, h: 76, radius: 5, shadow: true },
      { kind: 'panel', color: '#ffffff', x: 52, y: 12, w: 45, h: 76, radius: 5, shadow: true },
    ],
    slots: [
      P({ x: 4.5, y: 13.5, w: 42, h: 73, radius: 4 }),
      P({ x: 53.5, y: 13.5, w: 42, h: 73, radius: 4 }),
    ],
  },
  {
    id: 'polaroid', name: 'Polaroid Memory', category: 'Photo',
    background: '#f4eee2', accent: '#0ea5e9',
    decorations: [
      { kind: 'dots', color: '#e6dbc6', size: 0.7, gap: 7, opacity: 0.7 },
      { kind: 'panel', color: '#ffffff', x: 36, y: 8, w: 28, h: 84, radius: 3, shadow: true },
    ],
    slots: [
      P({ x: 38, y: 10, w: 24, h: 62, radius: 2 }),
      T({ x: 36, y: 76, w: 28, h: 12, text: 'Memories', fontId: 'script', color: '#334155', fontScale: 0.55 }),
    ],
  },
  {
    id: 'heart-photo', name: 'Heart Photo', category: 'Photo',
    background: 'linear-gradient(135deg,#fee2e2,#fecdd3)', accent: '#e11d48',
    decorations: [{ kind: 'hearts', color: '#fda4af', count: 26, seed: 5, opacity: 0.55, sizeRange: [0.02, 0.05] }],
    slots: [
      T({ x: 8, y: 10, w: 84, h: 12, text: 'Love You', fontId: 'script', color: '#e11d48', fontScale: 0.62 }),
      P({ x: 34, y: 24, w: 32, h: 62, radius: 50 }),
    ],
  },

  // ---------------- Birthday ----------------
  {
    id: 'birthday-confetti', name: 'Confetti Birthday', category: 'Birthday',
    background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', accent: '#db2777',
    decorations: [
      { kind: 'confetti', colors: ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#ec4899'], count: 60, seed: 9 },
      { kind: 'ribbon', color: '#db2777', y: 5, height: 14, shadow: '#9d174d' },
    ],
    slots: [
      T({ x: 6, y: 6, w: 88, h: 12, text: 'HAPPY BIRTHDAY', fontId: 'impact', color: '#ffffff', fontScale: 0.7 }),
      P({ x: 38, y: 26, w: 24, h: 54, radius: 50 }),
      T({ x: 18, y: 83, w: 64, h: 12, text: 'Name', fontId: 'script', color: '#be123c', fontScale: 0.6 }),
    ],
  },
  {
    id: 'birthday-gold', name: 'Golden Birthday', category: 'Birthday',
    background: 'linear-gradient(135deg,#111827,#1f2937)', accent: '#fbbf24',
    decorations: [
      { kind: 'stars', color: '#fbbf24', count: 40, seed: 2, opacity: 0.9, sizeRange: [0.015, 0.04] },
      { kind: 'border', color: '#fbbf24', inset: 3, width: 0.5, radius: 2 },
    ],
    slots: [
      T({ x: 8, y: 14, w: 84, h: 18, text: 'Happy Birthday', fontId: 'serif', color: '#fbbf24', fontScale: 0.6 }),
      T({ x: 25, y: 40, w: 50, h: 36, text: '25', fontId: 'impact', color: '#f59e0b', fontScale: 0.95 }),
      T({ x: 15, y: 82, w: 70, h: 12, text: 'Cheers!', fontId: 'script', color: '#fde68a', fontScale: 0.5 }),
    ],
  },
  {
    id: 'birthday-balloons', name: 'Party Balloons', category: 'Birthday',
    background: 'linear-gradient(135deg,#a7f3d0,#bfdbfe)', accent: '#0891b2',
    decorations: [
      { kind: 'dots', color: '#ffffff', size: 1.1, gap: 9, opacity: 0.55 },
      { kind: 'confetti', colors: ['#f472b6', '#fb923c', '#34d399', '#818cf8'], count: 34, seed: 4 },
    ],
    slots: [
      T({ x: 6, y: 7, w: 88, h: 14, text: 'Happy Birthday', fontId: 'comic', color: '#0e7490', fontScale: 0.6 }),
      P({ x: 38, y: 26, w: 24, h: 52, radius: 50 }),
      T({ x: 18, y: 82, w: 64, h: 12, text: 'Buddy', fontId: 'comic', color: '#0369a1', fontScale: 0.55 }),
    ],
  },

  // ---------------- Love ----------------
  {
    id: 'love-hearts', name: 'With Love', category: 'Love',
    background: 'linear-gradient(135deg,#ffe4e6,#fecdd3)', accent: '#e11d48',
    decorations: [{ kind: 'hearts', color: '#fb7185', count: 30, seed: 6, opacity: 0.5 }],
    slots: [
      P({ x: 8, y: 16, w: 34, h: 68, radius: 50 }),
      T({ x: 46, y: 26, w: 50, h: 22, text: 'I love you', fontId: 'script', color: '#e11d48', fontScale: 0.72 }),
      T({ x: 46, y: 54, w: 50, h: 16, text: 'to the moon', fontId: 'serif', color: '#9f1239', fontScale: 0.42 }),
    ],
  },
  {
    id: 'love-couple', name: 'Together', category: 'Love',
    background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', accent: '#db2777',
    decorations: [
      { kind: 'hearts', color: '#f9a8d4', count: 18, seed: 11, opacity: 0.6 },
      { kind: 'panel', color: '#ffffff', x: 5, y: 12, w: 42, h: 62, radius: 5, shadow: true },
      { kind: 'panel', color: '#ffffff', x: 53, y: 24, w: 42, h: 62, radius: 5, shadow: true },
    ],
    slots: [
      P({ x: 6.5, y: 13.5, w: 39, h: 59, radius: 4 }),
      P({ x: 54.5, y: 25.5, w: 39, h: 59, radius: 4 }),
      T({ x: 6, y: 80, w: 44, h: 12, text: 'Us', fontId: 'script', color: '#be185d', fontScale: 0.6 }),
    ],
  },
  {
    id: 'love-quote', name: 'Favourite Hello', category: 'Love',
    background: 'linear-gradient(135deg,#4c0519,#881337)', accent: '#fda4af',
    decorations: [{ kind: 'hearts', color: '#9f1239', count: 22, seed: 8, opacity: 0.5 }],
    slots: [T({ x: 10, y: 22, w: 80, h: 56, text: 'You are my favourite hello', fontId: 'script', color: '#fecdd3', fontScale: 0.5 })],
  },

  // ---------------- Anniversary ----------------
  {
    id: 'anniversary-gold', name: 'Golden Anniversary', category: 'Anniversary',
    background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', accent: '#b45309',
    decorations: [
      { kind: 'sunburst', color: '#fde68a', cx: 50, cy: 42, rays: 36, opacity: 0.5 },
      { kind: 'floral', color: '#f59e0b', corners: ['tl', 'tr', 'bl', 'br'], size: 22, opacity: 0.7 },
      { kind: 'border', color: '#d97706', inset: 3, width: 0.6, radius: 2 },
    ],
    slots: [
      T({ x: 12, y: 11, w: 76, h: 12, text: 'HAPPY ANNIVERSARY', fontId: 'serif', color: '#b45309', fontScale: 0.5 }),
      P({ x: 38, y: 26, w: 24, h: 48, radius: 50 }),
      T({ x: 20, y: 80, w: 60, h: 12, text: '25 Years', fontId: 'script', color: '#92400e', fontScale: 0.55 }),
    ],
  },
  {
    id: 'anniversary-photos', name: 'Our Journey', category: 'Anniversary',
    background: 'linear-gradient(135deg,#1e293b,#0f172a)', accent: '#fbbf24',
    decorations: [
      { kind: 'border', color: '#fbbf24', inset: 3, width: 0.5, radius: 2 },
      { kind: 'panel', color: '#f8fafc', x: 4, y: 14, w: 43, h: 62, radius: 4, shadow: true },
      { kind: 'panel', color: '#f8fafc', x: 53, y: 14, w: 43, h: 62, radius: 4, shadow: true },
    ],
    slots: [
      P({ x: 5.5, y: 15.5, w: 40, h: 59, radius: 3 }),
      P({ x: 54.5, y: 15.5, w: 40, h: 59, radius: 3 }),
      T({ x: 15, y: 82, w: 70, h: 12, text: 'Then & Now', fontId: 'serif', color: '#fbbf24', fontScale: 0.5 }),
    ],
  },

  // ---------------- Kids ----------------
  {
    id: 'kids-fun', name: 'Kids Fun', category: 'Kids',
    background: 'linear-gradient(120deg,#a7f3d0,#93c5fd)', accent: '#0891b2',
    decorations: [
      { kind: 'confetti', colors: ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981'], count: 40, seed: 1 },
      { kind: 'panel', color: '#ffffff', x: 4, y: 14, w: 43, h: 60, radius: 6, shadow: true },
      { kind: 'panel', color: '#ffffff', x: 53, y: 14, w: 43, h: 60, radius: 6, shadow: true },
    ],
    slots: [
      P({ x: 5.5, y: 15.5, w: 40, h: 57, radius: 5 }),
      P({ x: 54.5, y: 15.5, w: 40, h: 57, radius: 5 }),
      T({ x: 10, y: 80, w: 80, h: 14, text: 'Superstar', fontId: 'comic', color: '#0e7490', fontScale: 0.6 }),
    ],
  },
  {
    id: 'kids-stars', name: 'Little Star', category: 'Kids',
    background: 'linear-gradient(135deg,#c7d2fe,#ddd6fe)', accent: '#6d28d9',
    decorations: [{ kind: 'stars', color: '#ffffff', count: 34, seed: 12, opacity: 0.9 }],
    slots: [
      P({ x: 34, y: 16, w: 32, h: 60, radius: 50 }),
      T({ x: 12, y: 80, w: 76, h: 14, text: 'My Little Star', fontId: 'comic', color: '#5b21b6', fontScale: 0.55 }),
    ],
  },

  // ---------------- Quotes ----------------
  {
    id: 'quote-dream', name: 'Dream Big', category: 'Quotes',
    background: 'linear-gradient(135deg,#111827,#374151)', accent: '#f59e0b',
    decorations: [{ kind: 'stars', color: '#f59e0b', count: 20, seed: 15, opacity: 0.6 }],
    slots: [T({ x: 8, y: 22, w: 84, h: 56, text: 'Dream Big', fontId: 'impact', color: '#fbbf24', fontScale: 0.9 })],
  },
  {
    id: 'quote-coffee', name: 'But First, Coffee', category: 'Quotes',
    background: 'linear-gradient(135deg,#3f2412,#5b3a29)', accent: '#d6a06a',
    decorations: [{ kind: 'dots', color: '#7c5a43', size: 0.8, gap: 7, opacity: 0.5 }],
    slots: [
      T({ x: 10, y: 20, w: 80, h: 26, text: 'But First', fontId: 'serif', color: '#f5e9dc', fontScale: 0.6 }),
      T({ x: 10, y: 50, w: 80, h: 30, text: 'Coffee', fontId: 'script', color: '#d6a06a', fontScale: 0.82 }),
    ],
  },
  {
    id: 'quote-boss', name: 'Like a Boss', category: 'Quotes',
    background: '#111827', accent: '#f59e0b',
    decorations: [{ kind: 'band', color: '#f59e0b', edge: 'both', size: 6 }],
    slots: [
      T({ x: 8, y: 24, w: 84, h: 26, text: 'Like a Boss', fontId: 'impact', color: '#f8fafc', fontScale: 0.82 }),
      T({ x: 8, y: 56, w: 84, h: 14, text: '#hustle', fontId: 'mono', color: '#f59e0b', fontScale: 0.5 }),
    ],
  },

  // ---------------- Festive ----------------
  {
    id: 'festive-xmas', name: 'Merry Christmas', category: 'Festive',
    background: 'linear-gradient(135deg,#064e3b,#065f46)', accent: '#ef4444',
    decorations: [
      { kind: 'stars', color: '#fde68a', count: 26, seed: 21, opacity: 0.85 },
      { kind: 'waves', colors: ['#ffffff'], edge: 'bottom', height: 8 },
    ],
    slots: [
      T({ x: 6, y: 8, w: 88, h: 16, text: 'Merry Christmas', fontId: 'serif', color: '#fecaca', fontScale: 0.6 }),
      P({ x: 38, y: 28, w: 24, h: 48, radius: 50 }),
      T({ x: 20, y: 82, w: 60, h: 10, text: '2026', fontId: 'poppins', color: '#fde68a', fontScale: 0.5 }),
    ],
  },
  {
    id: 'festive-valentine', name: "Valentine's", category: 'Festive',
    background: 'linear-gradient(135deg,#fb7185,#f43f5e)', accent: '#ffffff',
    decorations: [
      { kind: 'hearts', color: '#ffffff', count: 28, seed: 22, opacity: 0.4 },
      { kind: 'panel', color: '#ffffff', x: 36, y: 12, w: 28, h: 72, radius: 5, shadow: true },
    ],
    slots: [
      P({ x: 38, y: 14, w: 24, h: 50, radius: 3 }),
      T({ x: 36, y: 68, w: 28, h: 12, text: 'Be Mine', fontId: 'script', color: '#e11d48', fontScale: 0.55 }),
    ],
  },
  {
    id: 'festive-diwali', name: 'Happy Diwali', category: 'Festive',
    background: 'radial-gradient(#fbbf24,#b45309)', accent: '#7c2d12',
    decorations: [
      { kind: 'sunburst', color: '#fde68a', cx: 50, cy: 45, rays: 40, opacity: 0.35 },
      { kind: 'dots', color: '#fef3c7', size: 0.7, gap: 6, opacity: 0.5 },
    ],
    slots: [
      T({ x: 10, y: 15, w: 80, h: 16, text: 'Happy Diwali', fontId: 'serif', color: '#7c2d12', fontScale: 0.62 }),
      P({ x: 38, y: 34, w: 24, h: 44, radius: 50 }),
      T({ x: 16, y: 82, w: 68, h: 10, text: 'Shine bright', fontId: 'script', color: '#7c2d12', fontScale: 0.45 }),
    ],
  },
];

// Stable IDs keep persisted uploads and captions attached after a page reload.
MUG_DESIGNS.forEach((design) => {
  design.slots.forEach((slot, index) => { slot.id = `${design.id}-${slot.type}-${index + 1}`; });
});

export function getDesign(id: string): MugDesign {
  return MUG_DESIGNS.find((d) => d.id === id) ?? MUG_DESIGNS[0];
}

export function fontStack(fontId?: string): string {
  return MUG_FONTS.find((f) => f.id === fontId)?.stack ?? MUG_FONTS[0].stack;
}
