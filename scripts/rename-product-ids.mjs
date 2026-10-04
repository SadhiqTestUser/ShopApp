// Rename product docs with UUID / random IDs to readable slugs.
//
// Usage:
//   node scripts/rename-product-ids.mjs            # rename all auto-detected docs
//   node scripts/rename-product-ids.mjs <id> ...   # rename only the given doc IDs
//
// Reads Firebase web config from the project .env (same VITE_FIREBASE_* vars the
// app uses). For each matching product it copies the doc to a slug derived from
// its `name`, then deletes the original so no duplicate is left behind.
//
// If your Firestore rules require auth to write `products`, set SEED_EMAIL and
// SEED_PASSWORD (in .env or the shell) and the script will sign in first.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A doc ID needs renaming if it's a UUID or a random Firestore auto-ID
// (contains uppercase letters). Clean lowercase-hyphen slugs are left alone.
function needsRename(id) {
  return UUID_RE.test(id) || /[A-Z]/.test(id);
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(db, base, takenLocally) {
  let slug = base || 'product';
  let n = 1;
  // Avoid clashing with existing docs or ones renamed earlier in this run.
  while (takenLocally.has(slug) || (await getDoc(doc(db, 'products', slug))).exists()) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  if (env.SEED_EMAIL && env.SEED_PASSWORD) {
    const auth = getAuth(app);
    console.log(`Signing in as ${env.SEED_EMAIL} ...`);
    await signInWithEmailAndPassword(auth, env.SEED_EMAIL, env.SEED_PASSWORD);
    console.log('Signed in.');
  }

  const explicitIds = process.argv.slice(2);
  const snap = await getDocs(collection(db, 'products'));
  const targets = snap.docs.filter((d) =>
    explicitIds.length ? explicitIds.includes(d.id) : needsRename(d.id)
  );

  if (!targets.length) {
    console.log('No product docs need renaming.');
    process.exit(0);
  }

  console.log(`Renaming ${targets.length} product doc(s) ...`);
  const taken = new Set();
  let ok = 0;
  for (const d of targets) {
    const data = d.data();
    const base = slugify(data.name);
    if (!base) {
      console.error(`  ✗ ${d.id}: missing "name" field, cannot derive slug`);
      continue;
    }
    try {
      const newId = await uniqueSlug(db, base, taken);
      taken.add(newId);
      await setDoc(doc(db, 'products', newId), data);
      await deleteDoc(doc(db, 'products', d.id));
      ok += 1;
      console.log(`  ✓ ${data.name}: ${d.id} -> ${newId}`);
    } catch (err) {
      console.error(`  ✗ ${d.id}:`, err?.message ?? err);
    }
  }
  console.log(`Done. ${ok}/${targets.length} renamed.`);
  process.exit(ok === targets.length ? 0 : 1);
}

main().catch((err) => {
  console.error('Rename failed:', err?.message ?? err);
  process.exit(1);
});
