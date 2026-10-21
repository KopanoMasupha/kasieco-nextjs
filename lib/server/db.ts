import fs from "fs";
import { setTimeout as delay } from "timers/promises";
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
  CourierJob,
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
  courierJobs: CourierJob[];
  trainingSessions: TrainingSession[];
  verificationRequests: VerificationRequest[];
  certificates: Certificate[];
  courses: Course[];
  funding: FundingOpportunity[];
  fundingInterests: FundingInterest[];
  fundingProfiles: FundingProfile[];
}

// Bump when the shape changes so an old data/db.json is replaced, not misread.
export const DB_VERSION = 9;

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

export function readDB(): SharedDB {
  let contents: string;
  try {
    contents = fs.readFileSync(DB_PATH, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const fresh = seedDB();
    writeDB(fresh);
    return fresh;
  }

  let parsed: SharedDB;
  try {
    parsed = JSON.parse(contents) as SharedDB;
  } catch (error) {
    throw new Error(`Unable to parse persisted database at ${DB_PATH}`, { cause: error });
  }

  if (parsed.version === DB_VERSION - 1) {
    const migrated = { ...parsed, version: DB_VERSION, courierJobs: parsed.courierJobs ?? [] };
    writeDB(migrated);
    return migrated;
  }
  if (parsed.version !== DB_VERSION) {
    throw new Error(`Unsupported database version ${parsed.version}; expected ${DB_VERSION}`);
  }
  return parsed;
}

export function writeDB(db: SharedDB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, DB_PATH);
}

/** Serialize read-reduce-write actions across Next.js workers sharing this file. */
export async function withDBLock<T>(operation: () => T | Promise<T>): Promise<T> {
  const lockPath = `${DB_PATH}.lock`;
  const timeoutAt = Date.now() + 10000;
  let lock: fs.promises.FileHandle | undefined;

  while (!lock) {
    let candidate: fs.promises.FileHandle;
    try {
      candidate = await fs.promises.open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      try {
        const age = Date.now() - (await fs.promises.stat(lockPath)).mtimeMs;
        if (age > 30000) await fs.promises.unlink(lockPath);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError;
      }

      if (Date.now() >= timeoutAt) {
        throw new Error("Timed out waiting to update the shared database.");
      }
      await delay(20);
      continue;
    }

    try {
      await candidate.writeFile(`${process.pid}\n${Date.now()}\n`);
      lock = candidate;
    } catch (error) {
      await candidate.close();
      await fs.promises.unlink(lockPath);
      throw error;
    }
  }

  try {
    return await operation();
  } finally {
    await lock.close();
    try {
      await fs.promises.unlink(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export function resetDB(): SharedDB {
  const fresh = seedDB();
  writeDB(fresh);
  return fresh;
}
