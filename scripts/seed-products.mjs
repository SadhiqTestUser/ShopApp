// Seed script: adds the Printcraft product catalog to Firestore.
//
// Usage:
//   node scripts/seed-products.mjs
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
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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
  { id: 'ff0295ca-f873-4c30-9c01-df12c26d02bb', name: 'Canvas Wall Print', description: 'Turn your best shots into gallery-quality canvas prints. Stretched on a wooden frame, ready to hang.', price: 1199.0, category: 'Wall Art', image_url: 'https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: 'd61a8ce8-8944-489d-8c97-fd86d6c281c3', name: 'Personalized Name Pen', description: 'Metal ballpoint pen engraved with your name. Smooth writing, premium finish, available in 5 colors.', price: 149.0, category: 'Stationery', image_url: 'https://images.pexels.com/photos/261767/pexels-photo-261767.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: 'b53b58db-89df-4383-b8fa-9ee4068ad72d', name: 'Photo Collage Frame', description: 'Multi-photo wall frame with custom layout. Print up to 12 photos in a single elegant frame.', price: 699.0, category: 'Wall Art', image_url: 'https://images.pexels.com/photos/28529926/pexels-photo-28529926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: '8ec32387-f172-4f9d-8b99-19e86bcef98b', name: 'Custom Greeting Cards', description: 'Set of 10 personalized greeting cards with your photos and messages. Premium cardstock, envelopes included.', price: 299.0, category: 'Stationery', image_url: 'https://images.pexels.com/photos/1724181/pexels-photo-1724181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'standard', customization_options: {} },
  { id: '6101c3d4-51e8-4146-970c-108769989cef', name: 'Custom Photo Book', description: 'Premium hardcover photo album with lay-flat binding. Choose your photos, pick a layout, and we print a keepsake that lasts a lifetime.', price: 799.0, category: 'Photo Books', image_url: 'https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'photo_book', customization_options: { pageCounts: [10, 20, 30], pricePerPage: 50 } },
  { id: '69c23222-470d-435d-987b-3c18e8447c0d', name: 'Personalized Phone Case', description: 'Slim, durable phone case printed with your favorite photo or design. Compatible with all major phone models.', price: 349.0, category: 'Accessories', image_url: 'https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'phone_case', customization_options: { maxImages: 1 } },
  { id: 'b57e5f59-4ddd-46fb-a84f-bbecc8db9314', name: 'Custom Photo Mug', description: 'Start your morning with a smile. 11oz ceramic mug printed with your photo, full-color and dishwasher safe.', price: 249.0, category: 'Drinkware', image_url: 'https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'mug', customization_options: { maxImages: 1 } },
  { id: '38661002-59aa-421b-b1f3-9fb191f0c6a1', name: 'Acrylic Fridge Magnet', description: 'Set of 6 custom photo magnets. High-gloss acrylic finish with strong magnetic backing.', price: 199.0, category: 'Gifts', image_url: 'https://images.pexels.com/photos/8101470/pexels-photo-8101470.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', active: true, created_at: '2026-09-14T11:44:37.520264+00:00', customization_type: 'magnet', customization_options: { shapes: ['round', 'square'], maxImages: 6 } },

  // --- New customizable photo products ---
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Custom Fridge Magnets',
    description: 'Personalized photo fridge magnets in your choice of Round or Square shape. High-gloss finish with a strong magnetic backing that holds firmly.',
    price: 149.0,
    category: 'Gifts',
    image_url: 'https://images.pexels.com/photos/8101470/pexels-photo-8101470.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'magnet',
    customization_options: { shapes: ['round', 'square'], maxImages: 6 },
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
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
    id: 'a3333333-3333-4333-8333-333333333333',
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
    id: 'a4444444-4444-4444-8444-444444444444',
    name: 'Custom Photo Frame Maker / Digi Painting',
    description: 'Upload your photo and turn it into a stunning framed digital painting. Choose your frame size, number of people in the artwork, and get a beautifully finished, ready-to-hang keepsake. Soft copy also available.',
    price: 799.0,
    category: 'Wall Art',
    image_url: 'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    active: true,
    created_at: '2026-09-15T10:00:00.000000+00:00',
    customization_type: 'photo_frame',
    customization_options: {
      maxImages: 1,
      sizeGuideUrl: 'https://www.printshoppy.com/size-guide',
      pricePerPerson: 199,
      sizes: [
        { id: '7x9', label: '7 x 9 inches', price: 799, mrp: 1299 },
        { id: '9x13', label: '9 x 13 inches', price: 999, mrp: 1599 },
        { id: '11x15', label: '11 x 15 inches', price: 1299, mrp: 1999 },
        { id: '13x18', label: '13 x 18 inches', price: 1599, mrp: 2499 },
        { id: '15x21', label: '15 x 21 inches', price: 1999, mrp: 2999 },
        { id: '18x26', label: '18 x 26 inches', price: 2499, mrp: 3799 },
        { id: '21x31', label: '21 x 31 inches', price: 3199, mrp: 4699 },
        { id: '27x36', label: '27 x 36 inches', price: 4299, mrp: 6199 },
        { id: '36x50', label: '36 x 50 inches', price: 6499, mrp: 8999 },
        { id: 'soft-copy', label: 'Soft Copy (Digital)', price: 499, softCopy: true },
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
    image_url: 'https://m.media-amazon.com/images/I/81VzuOVNExL._SX679_.jpg',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'MDF/Wood', shape: 'square',
      printTypes: ['Single Side Print', 'Double Side Print'],
      maxImages: 2,
      image_url: 'https://m.media-amazon.com/images/I/81VzuOVNExL._SX679_.jpg',
    },
  },
  {
    id: 'keychain-mdf-heart',
    name: 'MDF Heart Keychain',
    description: 'A soft heart silhouette made for a meaningful everyday keepsake. Single or double-sided print.',
    price: 149.0,
    category: 'Accessories',
    image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcT1vA0udoB_io8TlxyD5mV892PSwBXRbCfEKcGaVnUJCobZO6RII5lpTG_t1J5BJKg777QgFKRtWhqnix5at8diUY40KUxVeB4j9zxo9-Hj1xKU7LZUPnKe',
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
    image_url: 'https://images.meesho.com/images/products/1076887390/izmkq_512.avif?width=512',
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
    image_url: 'https://digiprintshop.com/wp-content/uploads/2025/01/keychain-square-pic11.jpg',
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
    image_url: 'https://rukminim2.flixcart.com/image/1676/1676/xif0q/key-chain/u/i/f/premium-custom-men-photo-keychain-rectangular-shape-for-birthday-original-imaheqgqbbsytfkp.jpeg?q=90',
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
    image_url: 'https://kalanidhigifts.in/cdn/shop/files/PhotoPrintedHexagonMetalDoubleSideKeychain_2.avif?v=1776754016&width=1920',
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
    image_url: 'https://cdn.printshoppy.com/image/cache/catalog/product-image/key-chains-2/kc-102-600x600.jpg',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Acrylic', shape: 'heart',
      printTypes: ['Single Side Print'],
      maxImages: 1,
    },
  },
  {
    id: 'keychain-acrylic-locket',
    name: 'Acrylic Heart Opening Locket',
    description: 'A special opening acrylic locket for two photos or a name engraving. Left/Right print or Name Laser Print.',
    price: 299.0,
    category: 'Accessories',
    image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTlFUZkCJoJDiKHHE0JsqtXVa7i5liq7Pk4aAlilxZ3saSlhwg8535MA1NlrEJQsK97sDErfXKb9kzEMPBITy5MHVSmm0vMGt4TbC3812IKwfelXBY4_9D9iKg',
    active: true,
    created_at: '2026-09-18T00:00:00.000000+00:00',
    customization_type: 'keychain',
    customization_options: {
      material: 'Acrylic', shape: 'locket',
      printTypes: ['Left/Right Print', 'Name Laser Print'],
      maxImages: 2,
    },
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  if (env.SEED_EMAIL && env.SEED_PASSWORD) {
    const auth = getAuth(app);
    console.log(`Signing in as ${env.SEED_EMAIL} ...`);
    await signInWithEmailAndPassword(auth, env.SEED_EMAIL, env.SEED_PASSWORD);
    console.log('Signed in.');
  }

  console.log(`Seeding ${products.length} products into project "${firebaseConfig.projectId}" ...`);
  let ok = 0;
  for (const p of products) {
    const { id, ...data } = p;
    try {
      await setDoc(doc(db, 'products', id), data, { merge: true });
      ok += 1;
      console.log(`  ✓ ${p.name} (${id})`);
    } catch (err) {
      console.error(`  ✗ ${p.name} (${id}):`, err?.message ?? err);
    }
  }
  console.log(`Done. ${ok}/${products.length} products written.`);
  process.exit(ok === products.length ? 0 : 1);
}

main().catch((err) => {
  console.error('Seeding failed:', err?.message ?? err);
  process.exit(1);
});
