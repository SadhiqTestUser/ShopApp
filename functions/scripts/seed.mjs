/**
 * Seed the Firestore `products` collection.
 *
 * Usage:
 *   # Against a real project (uses Application Default Credentials):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     GCLOUD_PROJECT=your-project-id node scripts/seed.mjs
 *
 *   # Against the local emulator:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *     GCLOUD_PROJECT=your-project-id node scripts/seed.mjs
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
initializeApp(usingEmulator ? {} : { credential: applicationDefault() });
const db = getFirestore();

const now = new Date().toISOString();

const products = [
  {
    name: 'Custom Photo Book',
    description: 'Premium hardcover photo album with lay-flat binding. Choose your photos, pick a layout, and we print a keepsake that lasts a lifetime.',
    price: 799, category: 'Photo Books',
    image_url: 'https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'photo_book',
    customization_options: { pageCounts: [10, 20, 30], pricePerPage: 50 },
  },
  {
    name: 'Personalized Phone Case',
    description: 'Slim, durable phone case printed with your favorite photo or design. Compatible with all major phone models.',
    price: 349, category: 'Accessories',
    image_url: 'https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'phone_case',
    customization_options: { maxImages: 1 },
  },
  {
    name: 'Custom Photo Mug',
    description: 'Start your morning with a smile. 11oz ceramic mug printed with your photo, full-color and dishwasher safe.',
    price: 249, category: 'Drinkware',
    image_url: 'https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'mug',
    customization_options: { maxImages: 1 },
  },
  {
    name: 'Canvas Wall Print',
    description: 'Turn your best shots into gallery-quality canvas prints. Stretched on a wooden frame, ready to hang.',
    price: 1199, category: 'Wall Art',
    image_url: 'https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'standard', customization_options: {},
  },
  {
    name: 'Acrylic Fridge Magnet',
    description: 'Set of 6 custom photo magnets. High-gloss acrylic finish with strong magnetic backing.',
    price: 199, category: 'Gifts',
    image_url: 'https://images.pexels.com/photos/8101470/pexels-photo-8101470.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'magnet',
    customization_options: { shapes: ['round', 'square'], maxImages: 6 },
  },
  {
    name: 'Personalized Name Pen',
    description: 'Metal ballpoint pen engraved with your name. Smooth writing, premium finish, available in 5 colors.',
    price: 149, category: 'Stationery',
    image_url: 'https://images.pexels.com/photos/261767/pexels-photo-261767.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'standard', customization_options: {},
  },
  {
    name: 'Photo Collage Frame',
    description: 'Multi-photo wall frame with custom layout. Print up to 12 photos in a single elegant frame.',
    price: 699, category: 'Wall Art',
    image_url: 'https://images.pexels.com/photos/28529926/pexels-photo-28529926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'standard', customization_options: {},
  },
  {
    name: 'Custom Greeting Cards',
    description: 'Set of 10 personalized greeting cards with your photos and messages. Premium cardstock, envelopes included.',
    price: 299, category: 'Stationery',
    image_url: 'https://images.pexels.com/photos/1724181/pexels-photo-1724181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    customization_type: 'standard', customization_options: {},
  },
];

async function seed() {
  const existing = await db.collection('products').limit(1).get();
  if (!existing.empty) {
    console.log('Products collection is not empty; skipping seed.');
    return;
  }
  const batch = db.batch();
  for (const p of products) {
    const ref = db.collection('products').doc();
    batch.set(ref, { ...p, active: true, created_at: now });
  }
  await batch.commit();
  console.log(`Seeded ${products.length} products.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
