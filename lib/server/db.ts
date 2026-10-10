import fs from "fs";
import os from "os";
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
  StockSale,
  FundingApplication,
  FundingProfile,
  FundingProgramme,
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
import { seedPoolLedger } from "../pot";
import { SEED_FUNDING_PROGRAMMES } from "../funding";

export interface SharedDB {
  schemaVersion: number;
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
  sales: StockSale[];
  fundingProgrammes: FundingProgramme[];
  fundingProfiles: FundingProfile[];
  fundingApplications: FundingApplication[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
// Read-only hosts (e.g. Netlify lambdas) can't write to the deploy dir, so
// writes fall back to a per-instance scratch file in the OS temp dir.
const TMP_PATH = path.join(os.tmpdir(), "kasi-connect-db.json");
let writePath = DB_PATH;

function seedDB(): SharedDB {
  return {
    schemaVersion: 3,
    shops: SEED_SHOPS,
    goods: SEED_GOODS,
    orders: SEED_ORDERS,
    pools: SEED_POOLS.map(seedPoolLedger),
    listings: SEED_LISTINGS,
    threads: SEED_THREADS,
    trainingSessions: SEED_TRAINING_SESSIONS,
    verificationRequests: SEED_VERIFICATION_REQUESTS,
    certificates: SEED_CERTIFICATES,
    courses: SEED_COURSES,
    accounts: SEED_ACCOUNTS,
    sales: [],
    fundingProgrammes: SEED_FUNDING_PROGRAMMES,
    fundingProfiles: [],
    fundingApplications: [],
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

  const pools = db.pools.map(seedPoolLedger);
  const poolsChanged = pools.some((pool, index) => pool !== db.pools[index]);
  const versionChanged = db.schemaVersion !== 3;
  return changed || poolsChanged || versionChanged
    ? { db: { ...db, schemaVersion: 3, accounts, pools }, changed: true }
    : { db, changed: false };
}

// module-level cache so repeated reads in the same process don't hit disk every time
let cache: SharedDB | null = null;

/** Best-effort disk write: deploy dir first, then the OS temp dir. Never throws on success of caching alone. */
function persistToDisk(db: SharedDB): void {
  const json = JSON.stringify(db, null, 2);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporaryPath = `${writePath}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, json, "utf-8");
      fs.renameSync(temporaryPath, writePath);
    } catch (error) {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      throw error;
    }
  } catch {
    // read-only deploy dir — retry into the temp dir (writable on lambdas)
    fs.mkdirSync(path.dirname(TMP_PATH), { recursive: true });
    fs.writeFileSync(TMP_PATH, json, "utf-8");
    writePath = TMP_PATH;
  }
}

export function readDB(): SharedDB {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const loaded = JSON.parse(raw) as SharedDB;
    const parsed = {
      ...loaded,
      sales: Array.isArray(loaded.sales) ? loaded.sales : [],
      fundingProgrammes: Array.isArray(loaded.fundingProgrammes) ? loaded.fundingProgrammes : SEED_FUNDING_PROGRAMMES,
      fundingProfiles: Array.isArray(loaded.fundingProfiles) ? loaded.fundingProfiles : [],
      fundingApplications: Array.isArray(loaded.fundingApplications) ? loaded.fundingApplications : [],
    };
    const { db: migrated, changed } = ensureAccounts(parsed);
    cache = migrated;
    if (changed) {
      // keep db.json in step with the migration — a read-only filesystem just
      // keeps serving the in-memory copy for the life of this process
      try {
        persistToDisk(migrated);
      } catch {
        // fully read-only environment — memory-only mode
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

/**
 * Updates the in-memory cache always, and the disk only where the filesystem
 * allows it (locally: data/db.json; on serverless hosts: a per-instance temp
 * file at best). Netlify/Vercel state therefore resets on cold starts — the
 * seed data ships in the bundle so the app is always fully usable.
 */
export function writeDB(db: SharedDB): void {
  cache = db;
  try {
    persistToDisk(db);
  } catch {
    // memory-only mode
  }
}

export function resetDB(): SharedDB {
  const fresh = seedDB();
  writeDB(fresh);
  return fresh;
}
