// Seed script: adds the Printcraft product catalog to Firestore.
//
// Usage:
//   node scripts/seed-products.mjs
//   node scripts/seed-products.mjs --only=photo-frames
// The --only variant writes just that product and never removes legacy docs.
//
// Reads Firebase web config from the project .env (same VITE_FIREBASE_* vars
// the app uses). Uses fixed document IDs so re-running is idempotent (updates
// existing docs instead of creating duplicates).
//
// If your Firestore security rules require authentication to write to the
// `products` collection, set these optional env vars (in .env or the shell)
// and the script will sign in first:
//   SEED_EMAIL=you@example.com
//   SEED_PASSWORD=your-password

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv(path) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnv(envPath), ...process.env };

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

for (const [k, v] of Object.entries(firebaseConfig)) {
  if (!v) {
    console.error(`Missing Firebase config value for "${k}". Check your .env file.`);
    process.exit(1);
  }
}

const products = [
  JSON.parse(readFileSync(resolve(__dirname, '../src/data/photo-frames.json'), 'utf8')),
  { id: 'canvas-wall-print', name: 'Canvas Wall Print', description: 'Turn your best shots into gallery-quality canvas prints. Stretched on a wooden frame, ready to hang.', price: 1199.0, category: 'Wall Art', image_url: 'https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  JSON.parse(readFileSync(resolve(__dirname, '../src/data/name-pen.json'), 'utf8')),
  { id: 'photo-collage-frame', name: 'Photo Collage Frame', description: 'Multi-photo wall frame with custom layout. Print up to 12 photos in a single elegant frame.', price: 699.0, category: 'Wall Art', image_url: 'https://images.pexels.com/photos/28529926/pexels-photo-28529926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: 'custom-greeting-cards', name: 'Custom Greeting Cards', description: 'Set of 10 personalized greeting cards with your photos and messages. Premium cardstock, envelopes included.', price: 299.0, category: 'Stationery', image_url: 'https://images.pexels.com/photos/1724181/pexels-photo-1724181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: 'custom-photo-book', name: 'Custom Photo Book', description: 'Premium hardcover photo album with lay-flat binding. Choose your photos, pick a layout, and we print a keepsake that lasts a lifetime.', price: 799.0, category: 'Photo Books', image_url: 'https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'photo_book', customization_options: { pageCounts: [10, 20, 30], pricePerPage: 50 } },
  { id: 'personalized-phone-case', name: 'Personalized Phone Case', description: 'Slim, durable phone case printed with your favorite photo or design. Compatible with all major phone models.', price: 349.0, category: 'Accessories', image_url: 'https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'phone_case', customization_options: { maxImages: 1 } },
  { id: 'custom-photo-mug', name: 'Photo Mugs', description: 'Design your own photo mug (200mm × 97mm print area). Pick a ready-made design, add your photos and text with live preview, choose from 7 mug types — Regular, Premium, Magic, Unbreakable (Fiber), Disco Magic, Radium and Glass — and see a realistic 3D preview before you order. Quantity-based pricing and free shipping.', price: 249.0, original_price: 399.0, offer_active: true, category: 'Drinkware', image_url: 'https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'mug', customization_options: { printSizeMm: { width: 200, height: 97 }, maxImages: 3 } },
  { id: 'acrylic-fridge-magnet', name: 'Acrylic Fridge Magnet', description: 'Custom acrylic fridge magnets in Square (3×3 inch) or Rectangle (3.5×2.5 inch). High-gloss acrylic finish with strong magnetic backing. Add multiple magnets and get quantity-based pricing.', price: 169.0, category: 'Gifts', image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRu2JI9yvGIezwh4Hyw06C_k17lpuQfAi21HvnfaHhV2b_s_S-cFqg68_Vr79Ae5PknRgB8evlHVb5Tgw1XGZmcImBxgdaG1g', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'magnet', customization_options: { shapes: ['square', 'rectangle'], maxImages: 1, magnetShapes: [{ id: 'square', label: 'Square', dimensions: '3 × 3 inch', image: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRu2JI9yvGIezwh4Hyw06C_k17lpuQfAi21HvnfaHhV2b_s_S-cFqg68_Vr79Ae5PknRgB8evlHVb5Tgw1XGZmcImBxgdaG1g' }, { id: 'rectangle', label: 'Rectangle', dimensions: '3.5 × 2.5 inch', image: 'https://m.media-amazon.com/images/I/41zYzknLVWL.jpg' }] } },

  // --- New customizable photo products ---
  {
    id: 'custom-fridge-magnets',
    name: 'Custom Fridge Magnets',
    description: 'Personalized acrylic fridge magnets in Square (3×3 inch) or Rectangle (3.5×2.5 inch). High-gloss finish with strong magnetic backing. Add multiple magnets for quantity-based pricing.',
    price: 169.0,
    category: 'Gifts',
    image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRu2JI9yvGIezwh4Hyw06C_k17lpuQfAi21HvnfaHhV2b_s_S-cFqg68_Vr79Ae5PknRgB8evlHVb5Tgw1XGZmcImBxgdaG1g',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'magnet',
    customization_options: { shapes: ['square', 'rectangle'], maxImages: 1, magnetShapes: [{ id: 'square', label: 'Square', dimensions: '3 × 3 inch', image: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRu2JI9yvGIezwh4Hyw06C_k17lpuQfAi21HvnfaHhV2b_s_S-cFqg68_Vr79Ae5PknRgB8evlHVb5Tgw1XGZmcImBxgdaG1g' }, { id: 'rectangle', label: 'Rectangle', dimensions: '3.5 × 2.5 inch', image: 'https://m.media-amazon.com/images/I/41zYzknLVWL.jpg' }] },
  },
  {
    id: 'wooden-photo-stand',
    name: 'Wooden Photo Stand',
    description: 'Elegant wooden photo stand crafted from premium MDF with a smooth matte finish. Pick a stand shape and a photo layout to display your favourite memories on any desk or shelf.',
    price: 499.0,
    category: 'Home Decor',
    image_url: 'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'wooden_stand',
    customization_options: {
      shapes: ['rectangle', 'arch', 'oval', 'hexagon'],
      layouts: ['single', 'collage-2', 'collage-3', 'collage-4'],
      maxImages: 4,
    },
  },
  {
    id: 'hanging-photo-stand',
    name: 'Hanging Photo Stand',
    description: 'Decorative hanging photo stand with your photo cut to a custom shape. Choose from Heart, Oval, Square and more. Comes ready to hang with a premium cord and finish.',
    price: 399.0,
    category: 'Home Decor',
    image_url: 'https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'hanging_stand',
    customization_options: {
      shapes: ['heart', 'oval', 'square', 'round', 'star'],
      maxImages: 1,
    },
  },
  {
    id: 'photo-frame-digi-painting',
    name: 'Custom Photo Frame Maker / Digi Painting',
    description: 'Upload your photo and turn it into a stunning framed digital painting. Choose your frame size, number of people in the artwork, and get a beautifully finished, ready-to-hang keepsake. Soft copy also available.',
    price: 799.0,
    category: 'Wall Art',
    image_url: 'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'digi_painting',
    customization_options: {
      maxImages: 1,
      pricePerPerson: 0,
      sizes: [
        { id: '8x10', label: '8 × 10 inches', price: 799 },
        { id: '10x14', label: '10 × 14 inches', price: 799 },
        { id: '12x18', label: '12 × 18 inches', price: 799 },
        { id: '14x20', label: '14 × 20 inches', price: 799 },
        { id: '20x30', label: '20 × 30 inches', price: 799 },
        { id: '20x36', label: '20 × 36 inches', price: 799 },
      ],
      peopleOptions: [1, 2, 3, 4, 5, 6],
    },
  },

  // --- Keychains (Accessories) ---
  {
    id: 'keychain-mdf-square',
    name: 'MDF Square Keychain',
    description: 'Warm, lightweight MDF keychain with a clean square photo area. Single or double-sided print.',
    price: 149.0,
    category: 'Accessories',
    image_url: '/keychains/mdf-square.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'MDF/Wood', shape: 'square',
      printTypes: ['Single Side Print', 'Double Side Print'],
      maxImages: 2,
      image_url: '/keychains/mdf-square.png',
    },
  },
  {
    id: 'keychain-mdf-heart',
    name: 'MDF Heart Keychain',
    description: 'A soft heart silhouette made for a meaningful everyday keepsake. Single or double-sided print.',
    price: 149.0,
    category: 'Accessories',
    image_url: '/keychains/mdf-heart.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'MDF/Wood', shape: 'heart',
      printTypes: ['Single Side Print', 'Double Side Print'],
      maxImages: 2,
    },
  },
  {
    id: 'keychain-metal-love',
    name: 'Metal Love Keychain',
    description: 'Polished metal love shape with vivid two-sided printing.',
    price: 199.0,
    category: 'Accessories',
    image_url: '/keychains/metal-love.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Metal', shape: 'love',
      printTypes: ['Double Side Print'],
      maxImages: 2,
    },
  },
  {
    id: 'keychain-metal-square',
    name: 'Metal Square Keychain',
    description: 'Crisp square metal keychain with a durable premium finish. Double-sided print.',
    price: 199.0,
    category: 'Accessories',
    image_url: '/keychains/metal-square.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Metal', shape: 'square',
      printTypes: ['Double Side Print'],
      maxImages: 2,
    },
  },
  {
    id: 'keychain-metal-rectangle',
    name: 'Metal Rectangle Keychain',
    description: 'A sleek rectangular metal keepsake for portraits and names. Double-sided print.',
    price: 229.0,
    category: 'Accessories',
    image_url: '/keychains/metal-rectangle.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Metal', shape: 'rectangle',
      printTypes: ['Double Side Print'],
      maxImages: 2,
    },
  },
  {
    id: 'keychain-metal-hexagon',
    name: 'Metal Hexagon Keychain',
    description: 'Geometric hexagon metal keychain printed on both sides.',
    price: 229.0,
    category: 'Accessories',
    image_url: '/keychains/metal-hexagon.png',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Metal', shape: 'hexagon',
      printTypes: ['Double Side Print'],
      maxImages: 2,
    },
  },
  {
    id: 'keychain-acrylic-heart',
    name: 'Acrylic Heart Keychain',
    description: 'Glossy transparent acrylic heart with a bright single-sided photo.',
    price: 199.0,
    category: 'Accessories',
    image_url: '/keychains/acrylic-heart.jpg',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Acrylic', shape: 'heart',
      printTypes: ['Single Side Print'],
      maxImages: 1,
    },
  },

  // --- Customizable writing pads (Stationery) ---
  {
    id: 'customizable-writing-pad',
    name: 'Customizable Writing Pad',
    description: 'A4 MDF wooden or acrylic writing pad with your photo placed inside the writing area. Drag, zoom and edit your image before adding it to cart.',
    price: 399.0,
    category: 'Stationery',
    image_url: '/stationery/pads/5a7b6026-10d9-4402-bff8-82021ea5869c.png',
    active: true,
    created_at: '2026-10-04T00:00:00.000000+00:00',
    customization_type: 'stationery_pad',
    customization_options: {
      materials: ['wooden', 'acrylic'],
      defaultMaterial: 'wooden',
      size: 'A4',
      price: 399,
      maxImages: 1,
      previewImage: '/stationery/pads/5a7b6026-10d9-4402-bff8-82021ea5869c.png',
      writingArea: { left: 0.20, top: 0.16, width: 0.60, height: 0.82 },
    },
  },

  // --- Name Pencils (Stationery) ---
  {
    id: 'name-pencil-set',
    name: 'Personalized Name Pencils',
    description: 'Premium wooden pencils printed with your name. Each pack contains 10 pencils with your chosen name printed along the barrel — perfect for school, gifting and return gifts. Add multiple names and get quantity-based pricing.',
    price: 149.0,
    category: 'Stationery',
    image_url: 'https://cdn.printshoppy.com/image/catalog/pencils/webp/name-pencil-preview-s2.webp',
    active: true,
    created_at: '2026-09-19T00:00:00.000000+00:00',
    customization_type: 'name_pencil',
    customization_options: {
      pencilsPerPack: 10,
      maxNameLength: 14,
      gallery: [
        'https://cdn.printshoppy.com/image/catalog/pencils/webp/name-pencil-preview-s2.webp',
        'https://cdn.printshoppy.com/image/catalog/pencils/webp/name-pencil-preview-s4.webp',
        'https://cdn.printshoppy.com/image/catalog/pencils/webp/name-pencil-preview-s5.webp',
      ],
      tiers: [
        { minPacks: 10, price: 99 },
        { minPacks: 5, price: 129 },
        { minPacks: 2, price: 149 },
        { minPacks: 1, price: 149 },
      ],
    },
  },
];

// Old UUIDs and retired product slugs that must not remain in the catalog.
const productIdsToDelete = [
  'ff0295ca-f873-4c30-9c01-df12c26d02bb', // Canvas Wall Print
  'd61a8ce8-8944-489d-8c97-fd86d6c281c3', // Personalized Name Pen
  'b53b58db-89df-4383-b8fa-9ee4068ad72d', // Photo Collage Frame
  '8ec32387-f172-4f9d-8b99-19e86bcef98b', // Custom Greeting Cards
  '6101c3d4-51e8-4146-970c-108769989cef', // Custom Photo Book
  '69c23222-470d-435d-987b-3c18e8447c0d', // Personalized Phone Case
  'b57e5f59-4ddd-46fb-a84f-bbecc8db9314', // Custom Photo Mug
  '38661002-59aa-421b-b1f3-9fb191f0c6a1', // Acrylic Fridge Magnet
  'a1111111-1111-4111-8111-111111111111', // Custom Fridge Magnets
  'a2222222-2222-4222-8222-222222222222', // Wooden Photo Stand
  'a3333333-3333-4333-8333-333333333333', // Hanging Photo Stand
  'a4444444-4444-4444-8444-444444444444', // Custom Photo Frame Maker / Digi Painting
  'keychain-acrylic-locket', // Retired Acrylic Heart Opening Locket
];

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !/^--only=[a-z0-9-]+$/.test(arg))) {
    console.error('Usage: node scripts/seed-products.mjs [--only=product-id]. Nothing was written.');
    process.exit(1);
  }
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
  const selectedProducts = only === undefined ? products : products.filter((product) => product.id === only);
  if (selectedProducts.length === 0) {
    console.error('No product matches --only. Nothing was written.');
    process.exit(1);
  }
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  if (env.SEED_EMAIL && env.SEED_PASSWORD) {
    const auth = getAuth(app);
    console.log(`Signing in as ${env.SEED_EMAIL} ...`);
    await signInWithEmailAndPassword(auth, env.SEED_EMAIL, env.SEED_PASSWORD);
    console.log('Signed in.');
  }

  console.log(`Seeding ${selectedProducts.length} products into project "${firebaseConfig.projectId}" ...`);
  let ok = 0;
  for (const p of selectedProducts) {
    const { id, ...data } = p;
    try {
      await setDoc(doc(db, 'products', id), data, { merge: true });
      ok += 1;
      console.log(`  ✓ ${p.name} (${id})`);
    } catch (err) {
      console.error(`  ✗ ${p.name} (${id}):`, err?.message ?? err);
    }
  }
  console.log(`Done. ${ok}/${selectedProducts.length} products written.`);

  if (only !== undefined) process.exit(ok === selectedProducts.length ? 0 : 1);

  console.log(`Removing ${productIdsToDelete.length} retired product docs ...`);
  for (const id of productIdsToDelete) {
    try {
      await deleteDoc(doc(db, 'products', id));
      console.log(`  ✓ removed ${id}`);
    } catch (err) {
      console.error(`  ✗ ${id}:`, err?.message ?? err);
    }
  }

  process.exit(ok === products.length ? 0 : 1);
}

main().catch((err) => {
  console.error('Seeding failed:', err?.message ?? err);
  process.exit(1);
});
