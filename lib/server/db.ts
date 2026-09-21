import fs from "fs";
import path from "path";
import {
  Shop,
  Good,
  ConsumerOrder,
  Pool,
  StockListing,
  ExchangeThread,
  TrainingSession,
  VerificationRequest,
  Certificate,
  Course,
  Account,
} from "../types";
import {
  SEED_SHOPS,
  SEED_GOODS,
  SEED_POOLS,
  SEED_LISTINGS,
  SEED_THREADS,
  SEED_ORDERS,
  SEED_TRAINING_SESSIONS,
  SEED_VERIFICATION_REQUESTS,
  SEED_CERTIFICATES,
  SEED_COURSES,
  SEED_ACCOUNTS,
  DEMO_PIN_HASH,
} from "../seed";

export interface SharedDB {
  shops: Shop[];
  goods: Good[];
  orders: ConsumerOrder[];
  pools: Pool[];
  listings: StockListing[];
  threads: ExchangeThread[];
  trainingSessions: TrainingSession[];
  verificationRequests: VerificationRequest[];
  certificates: Certificate[];
  courses: Course[];
  /** Sign-in accounts — server-side only, stripped from every API response. */
  accounts: Account[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function seedDB(): SharedDB {
  return {
    shops: SEED_SHOPS,
    goods: SEED_GOODS,
    orders: SEED_ORDERS,
    pools: SEED_POOLS,
    listings: SEED_LISTINGS,
    threads: SEED_THREADS,
    trainingSessions: SEED_TRAINING_SESSIONS,
    verificationRequests: SEED_VERIFICATION_REQUESTS,
    certificates: SEED_CERTIFICATES,
    courses: SEED_COURSES,
    accounts: SEED_ACCOUNTS,
  };
}

/**
 * Every shop needs an owner account so it can be signed into locally. Seeded
 * shops use the shared demo PIN, and shops registered before sign-in existed
 * also get a demo account so nobody is locked out of their own dashboard.
 */
function ensureAccounts(db: SharedDB): { db: SharedDB; changed: boolean } {
  const stored = Array.isArray(db.accounts) ? db.accounts : [];
  // sign-in is shop-owner only, so any legacy shopper accounts are dropped
  const accounts: Account[] = stored.filter((a) => a.role === "owner");
  let changed = !Array.isArray(db.accounts) || accounts.length !== stored.length;

  if (accounts.length === 0) {
    accounts.push(...SEED_ACCOUNTS);
    changed = true;
  }

  for (const shop of db.shops) {
    if (accounts.some((a) => a.shopId === shop.id)) continue;
    accounts.push({
      id: `acc-${shop.id}`,
      role: "owner",
      name: shop.ownerName || shop.name,
      phone: shop.phone,
      pinHash: DEMO_PIN_HASH,
      shopId: shop.id,
      demo: true,
      createdAt: shop.createdAt,
    });
    changed = true;
  }

  return changed ? { db: { ...db, accounts }, changed } : { db, changed };
}

// module-level cache so repeated reads in the same process don't hit disk every time
let cache: SharedDB | null = null;

export function readDB(): SharedDB {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SharedDB;
    const { db: migrated, changed } = ensureAccounts(parsed);
    cache = migrated;
    if (changed) {
      // keep db.json in step with the migration — a read-only filesystem just
      // keeps serving the in-memory copy for the life of this process
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), "utf-8");
      } catch {
        // ignore
      }
    }
    return cache;
  } catch {
    const fresh = seedDB();
    cache = fresh;
    try {
      writeDB(fresh);
    } catch {
      // read-only filesystem (e.g. some serverless hosts) — keep serving from
      // the in-memory cache for the life of this process instead of crashing
    }
    return fresh;
  }
}

export function writeDB(db: SharedDB): void {
  cache = db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function resetDB(): SharedDB {
  const fresh = seedDB();
  writeDB(fresh);
  return fresh;
}
