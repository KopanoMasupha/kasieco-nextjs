import fs from "fs";
import path from "path";
import {
  Shop,
  Good,
  Pool,
  StockListing,
  ExchangeThread,
  TrainingSession,
  VerificationRequest,
  Certificate,
  Course,
  FundingOpportunity,
  FundingInterest,
  FundingProfile,
  Wholesaler,
  Driver,
  UserAccount,
  PaymentTx,
  Fee,
  Trip,
  Message,
  Approval,
} from "../types";

export interface SharedDB {
  version: number;
  users: UserAccount[];
  shops: Shop[];
  goods: Good[];
  wholesalers: Wholesaler[];
  drivers: Driver[];
  pools: Pool[]; // the deals
  payments: PaymentTx[]; // TradeSafe's record: shop payments into escrow, refunds, drop-point payouts
  fees: Fee[]; // drop-point and re-delivery fees owners owe
  trips: Trip[];
  messages: Message[];
  approvals: Approval[];
  listings: StockListing[];
  threads: ExchangeThread[];
  trainingSessions: TrainingSession[];
  verificationRequests: VerificationRequest[];
  certificates: Certificate[];
  courses: Course[];
  funding: FundingOpportunity[];
  fundingInterests: FundingInterest[];
  fundingProfiles: FundingProfile[];
}

// Bump when the shape changes so an old data/db.json is replaced, not misread.
export const DB_VERSION = 8;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

/** What a browser is allowed to see: everything except sign-in PINs. */
export function publicState(db: SharedDB): SharedDB {
  return { ...db, users: db.users.map(({ pin, ...rest }) => rest) };
}

const digits = (s: string) => s.replace(/\D/g, "");
export function findUserForSignIn(db: SharedDB, phone: string, pin: string) {
  return db.users.find((u) => digits(u.phone) === digits(phone) && !!u.pin && u.pin === pin.trim());
}

// The seed is built by replaying real actions through the reducer (see seedDb.ts).
// It is injected here to avoid a circular import.
let seedFactory: (() => SharedDB) | null = null;
export function registerSeed(factory: () => SharedDB) {
  seedFactory = factory;
}
export function seedDB(): SharedDB {
  if (!seedFactory) throw new Error("Seed not registered");
  return seedFactory();
}

let cache: SharedDB | null = null;

export function readDB(): SharedDB {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as SharedDB;
    if (parsed.version !== DB_VERSION) throw new Error("old db shape");
    cache = parsed;
    return cache;
  } catch {
    const fresh = seedDB();
    writeDB(fresh);
    return fresh;
  }
}

export function writeDB(db: SharedDB): void {
  cache = db;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tmp, DB_PATH); // atomic swap so a crash never leaves half a file
  } catch {
    // read-only filesystem — keep the in-memory copy
  }
}

export function resetDB(): SharedDB {
  const fresh = seedDB();
  writeDB(fresh);
  return fresh;
}
