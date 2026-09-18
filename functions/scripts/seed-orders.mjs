/**
 * Seed the Firestore `orders` collection directly (bypasses security rules).
 *
 * The `orders` collection has `allow create: if false`, so orders can only be
 * created server-side. This script uses the Firebase Admin SDK (same as
 * seed.mjs) which bypasses rules, writing order documents in the exact shape
 * the `createRazorpayOrder` Cloud Function produces and the Admin Dashboard
 * reads. Useful for populating the dashboard without a real checkout.
 *
 * Usage:
 *   # Against a real project (uses Application Default Credentials):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     GCLOUD_PROJECT=printcraft-e8c9e node scripts/seed-orders.mjs
 *
 *   # Against the local emulator:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *     GCLOUD_PROJECT=printcraft-e8c9e node scripts/seed-orders.mjs
 *
 * Options (env vars):
 *   ORDERS_COUNT=8   How many orders to create (default 8).
 *   SEED_FORCE=1     Seed even if this script has already added orders.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
initializeApp(usingEmulator ? {} : { credential: applicationDefault() });
const db = getFirestore();

const ORDERS_COUNT = Number(process.env.ORDERS_COUNT) || 8;
const FORCE = process.env.SEED_FORCE === '1';
const SEED_TAG = 'seed-orders';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_BY_STATUS = {
  pending: 'pending',
  processing: 'paid',
  shipped: 'paid',
  delivered: 'paid',
  cancelled: 'failed',
};

const SAMPLE_CUSTOMERS = [
  { name: 'Aarav Sharma', phone: '9876543210', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { name: 'Diya Patel', phone: '9823456789', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { name: 'Vivaan Reddy', phone: '9701234567', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { name: 'Ananya Iyer', phone: '9944556677', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { name: 'Kabir Singh', phone: '9812345678', city: 'Delhi', state: 'Delhi', pincode: '110001' },
  { name: 'Ishita Nair', phone: '9895123456', city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { name: 'Arjun Mehta', phone: '9833011223', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { name: 'Saanvi Rao', phone: '9741122334', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function loadRefs() {
  const [profSnap, prodSnap] = await Promise.all([
    db.collection('profiles').get(),
    db.collection('products').get(),
  ]);
  const customers = profSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.role !== 'admin');
  const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { customers, products };
}

function buildOrder({ customers, products }, index) {
  const status = STATUSES[index % STATUSES.length];
  const cust = customers.length ? pick(customers) : null;
  const sample = pick(SAMPLE_CUSTOMERS);

  // Build 1-3 order items from real products when available.
  const itemCount = randInt(1, 3);
  const order_items = [];
  for (let i = 0; i < itemCount; i += 1) {
    const p = products.length ? pick(products) : null;
    const price = p ? Number(p.price) : randInt(149, 1999);
    order_items.push({
      product_id: p ? p.id : `sample-product-${i + 1}`,
      quantity: randInt(1, 2),
      price,
      customization_data: null,
    });
  }
  const total = order_items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  // Spread created_at across the past ~30 days.
  const daysAgo = randInt(0, 30);
  const created = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - randInt(0, 86400) * 1000);
  const iso = created.toISOString();

  return {
    user_id: cust ? cust.id : `sample-user-${index + 1}`,
    total,
    shipping_name: cust?.full_name || sample.name,
    shipping_phone: cust?.phone || sample.phone,
    shipping_address: `${randInt(1, 300)}, ${sample.city} Main Road`,
    shipping_pincode: sample.pincode,
    shipping_city: sample.city,
    shipping_state: sample.state,
    order_items,
    payment_status: PAYMENT_BY_STATUS[status],
    status,
    created_at: iso,
    created_at_ts: created,
    seeded_by: SEED_TAG,
  };
}

async function seed() {
  if (!FORCE) {
    const existing = await db.collection('orders').where('seeded_by', '==', SEED_TAG).limit(1).get();
    if (!existing.empty) {
      console.log('Seed orders already exist; skipping. Set SEED_FORCE=1 to add more.');
      return;
    }
  }

  const refs = await loadRefs();
  console.log(
    `Using ${refs.customers.length} customer profile(s) and ${refs.products.length} product(s) as references.`,
  );

  const batch = db.batch();
  for (let i = 0; i < ORDERS_COUNT; i += 1) {
    const ref = db.collection('orders').doc();
    batch.set(ref, buildOrder(refs, i));
  }
  await batch.commit();
  console.log(`Seeded ${ORDERS_COUNT} orders into the "orders" collection.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Order seed failed:', err);
    process.exit(1);
  });
