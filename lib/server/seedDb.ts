/**
 * Builds the demo database by replaying real actions through the reducer, so
 * every payment, pot, trip and message in the seed is produced by the same
 * rules the live app uses — and is guaranteed to balance.
 */
import { SharedDB, DB_VERSION, registerSeed } from "./db";
import { reduce } from "./reducer";
import { ServerAction } from "./actions";
import { planDelivery } from "../planner";
import { memberPositions } from "../pot";
import { DeliveryPrefs } from "../types";
import {
  SEED_SHOPS,
  SEED_GOODS,
  SEED_LISTINGS,
  SEED_THREADS,
  SEED_TRAINING_SESSIONS,
  SEED_VERIFICATION_REQUESTS,
  SEED_CERTIFICATES,
  SEED_COURSES,
  SEED_FUNDING,
  SEED_WHOLESALERS,
  SEED_DRIVERS,
  SEED_USERS,
  SEED_DEAL_TEMPLATES,
} from "../seed";

const ADMIN = "Zanele Dube";
const ADMIN_ID = "user-admin";
const ADMIN2_ID = "user-admin-2";

type Prefs = Omit<DeliveryPrefs, "agreedAt">;
const WEEKDAYS = [1, 2, 3, 4, 5];
const P = {
  standard: { days: WEEKDAYS, time: "any", ifMissed: "next-run" } as Prefs,
  retry: { days: WEEKDAYS, time: "any", ifMissed: "retry-later" } as Prefs,
  collect: { days: [1, 2, 3, 4, 5, 6], time: "any", ifMissed: "collect" } as Prefs,
  partner: (partnerShopId: string, time: Prefs["time"] = "any", days = WEEKDAYS): Prefs => ({ days, time, ifMissed: "partner", partnerShopId }),
};

/** Shops that agreed to be drop points for neighbours' missed deliveries. */
const PARTNERS: Record<string, { capacityUnits: number; dropCode: string }> = {
  "shop-thandi": { capacityUnits: 20, dropCode: "5150" },
  "shop-butchery": { capacityUnits: 15, dropCode: "7721" },
  "shop-tebogo": { capacityUnits: 20, dropCode: "3308" },
};

function run(db: SharedDB, action: ServerAction): SharedDB {
  const r = reduce(db, action);
  if (r.meta.error) throw new Error(`Seed step ${action.type} failed: ${r.meta.error}`);
  return r.db;
}

/** Reserve units (no money moves until the deal is full). */
function join(db: SharedDB, dealId: string, shopId: string, qty: number, prefs: Prefs = P.standard): SharedDB {
  return run(db, { type: "JOIN_DEAL", dealId, shopId, qty, prefs });
}

/** Full deal: shops pay their share into TradeSafe escrow (a mix of payment methods). */
function pay(db: SharedDB, dealId: string, skip: string[] = []): SharedDB {
  const methods = ["eft", "card", "eft", "cash"] as const;
  memberPositions(db.pools.find((p) => p.id === dealId)!)
    .filter((m) => m.dueCents > 0 && !skip.includes(m.shopId))
    .forEach((m, i) => {
      db = run(db, { type: "PAY_DEAL", dealId, shopId: m.shopId, method: methods[i % methods.length] });
    });
  return db;
}

/** Two-person rule: Zanele asks, Lindiwe approves. */
function placeOrder(db: SharedDB, dealId: string): SharedDB {
  const r = reduce(db, { type: "ADMIN_REQUEST_APPROVAL", kind: "place-order", dealId, adminId: ADMIN_ID });
  if (r.meta.error) throw new Error(r.meta.error);
  return run(r.db, { type: "ADMIN_DECIDE_APPROVAL", approvalId: r.meta.approvalId, adminId: ADMIN2_ID, approve: true });
}

function isoDate(daysFromNow: number) {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().slice(0, 10);
}

function planAndAssign(db: SharedDB, dealId: string, date: string): SharedDB {
  const deal = db.pools.find((p) => p.id === dealId)!;
  const plan = planDelivery({
    deal,
    shops: db.shops,
    drivers: db.drivers,
    wholesaler: db.wholesalers.find((w) => w.id === deal.wholesalerId)!,
    busyDriverIds: new Set(db.trips.filter((t) => t.date === date && t.status !== "completed").map((t) => t.driverId)),
    date,
    startTime: "08:00",
  });
  return run(db, {
    type: "ADMIN_ASSIGN_TRIPS",
    dealId,
    adminName: ADMIN,
    date,
    startTime: "08:00",
    trips: plan.trips.map((t) => ({ driverId: t.driverId, shopIds: t.stops.map((s) => s.shopId) })),
  });
}

export function buildSeed(): SharedDB {
  let db: SharedDB = {
    version: DB_VERSION,
    users: SEED_USERS,
    shops: SEED_SHOPS.map((s) => (PARTNERS[s.id] ? { ...s, partner: { active: true, ...PARTNERS[s.id], agreedAt: new Date(Date.now() - 20 * 86400000).toISOString() } } : s)),
    goods: SEED_GOODS,
    wholesalers: SEED_WHOLESALERS,
    drivers: SEED_DRIVERS,
    pools: [],
    payments: [],
    fees: [],
    trips: [],
    messages: [],
    approvals: [],
    listings: SEED_LISTINGS,
    threads: SEED_THREADS,
    courierJobs: [],
    trainingSessions: SEED_TRAINING_SESSIONS,
    verificationRequests: SEED_VERIFICATION_REQUESTS,
    certificates: SEED_CERTIFICATES,
    courses: SEED_COURSES,
    funding: SEED_FUNDING,
    fundingInterests: [],
    fundingProfiles: [],
  };

  // 2. the admin publishes the wholesalers' deals (ids come back from the reducer)
  const ids: Record<string, string> = {};
  for (const t of SEED_DEAL_TEMPLATES) {
    const r = reduce(db, { type: "ADMIN_CREATE_DEAL", adminName: ADMIN, ...t });
    db = r.db;
    ids[t.id] = r.meta.dealId;
  }

  // 3a. Last week's finished deals — delivered, then rated by the shops that received them
  const deliverAll = (d: SharedDB, dealId: string) => {
    for (const t of d.trips.filter((x) => x.dealId === dealId)) {
      d = run(d, { type: "DRIVER_ACCEPT", tripId: t.id, driverId: t.driverId });
      d = run(d, { type: "DRIVER_COLLECT", tripId: t.id, driverId: t.driverId });
      for (const st of t.stops) d = run(d, { type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: st.shopId, code: d.pools.find((p) => p.id === dealId)!.deliveryCodes[st.shopId] });
    }
    return d;
  };
  const rate = (d: SharedDB, dealId: string, shopId: string, stars: number, comment?: string) => run(d, { type: "RATE_DEAL", dealId, shopId, stars, comment });
  db = join(db, ids["deal-soap"], "shop-kgomotso", 6, P.partner("shop-tebogo"));
  db = join(db, ids["deal-soap"], "shop-thandi", 4);
  db = join(db, ids["deal-soap"], "shop-bongani", 5, P.partner("shop-butchery"));
  db = join(db, ids["deal-soap"], "shop-mama-joy", 5, P.partner("shop-thandi", "afternoon"));
  db = pay(db, ids["deal-soap"]);
  db = run(db, { type: "ADMIN_CONFIRM_PAYMENTS", dealId: ids["deal-soap"], adminName: ADMIN });
  db = placeOrder(db, ids["deal-soap"]);
  db = planAndAssign(db, ids["deal-soap"], isoDate(-6));
  db = deliverAll(db, ids["deal-soap"]);
  db = rate(db, ids["deal-soap"], "shop-kgomotso", 5, "Driver came on time and every case was sealed.");
  db = rate(db, ids["deal-soap"], "shop-thandi", 5, "R27 cheaper a case than my usual cash & carry.");
  db = rate(db, ids["deal-soap"], "shop-bongani", 4, "Good price. Came in the afternoon instead of morning.");
  db = rate(db, ids["deal-soap"], "shop-mama-joy", 5);

  db = join(db, ids["deal-maize10"], "shop-thandi", 6);
  db = join(db, ids["deal-maize10"], "shop-sipho", 5, P.partner("shop-thandi"));
  db = join(db, ids["deal-maize10"], "shop-ayanda", 4, P.collect);
  db = join(db, ids["deal-maize10"], "shop-butchery", 5, P.retry);
  db = pay(db, ids["deal-maize10"]);
  db = run(db, { type: "ADMIN_CONFIRM_PAYMENTS", dealId: ids["deal-maize10"], adminName: ADMIN });
  db = placeOrder(db, ids["deal-maize10"]);
  db = planAndAssign(db, ids["deal-maize10"], isoDate(-5));
  db = deliverAll(db, ids["deal-maize10"]);
  db = rate(db, ids["deal-maize10"], "shop-thandi", 5, "Saved me a trip to town. Bags were clean and dry.");
  db = rate(db, ids["deal-maize10"], "shop-ayanda", 4, "Collected at the wholesaler — quick and easy.");
  db = rate(db, ids["deal-maize10"], "shop-butchery", 5);

  // 3. Cake flour: fully delivered last week (complete history, pot at R0)
  db = join(db, ids["deal-flour"], "shop-ayanda", 6, P.collect);
  db = join(db, ids["deal-flour"], "shop-thandi", 6);
  db = join(db, ids["deal-flour"], "shop-sipho", 8, P.partner("shop-thandi"));
  db = pay(db, ids["deal-flour"]);
  db = run(db, { type: "ADMIN_CONFIRM_PAYMENTS", dealId: ids["deal-flour"], adminName: ADMIN });
  db = placeOrder(db, ids["deal-flour"]);
  db = planAndAssign(db, ids["deal-flour"], isoDate(-2));
  for (const t of db.trips.filter((x) => x.dealId === ids["deal-flour"])) {
    db = run(db, { type: "DRIVER_ACCEPT", tripId: t.id, driverId: t.driverId });
    db = run(db, { type: "DRIVER_COLLECT", tripId: t.id, driverId: t.driverId });
    for (const s of t.stops) {
      const code = db.pools.find((p) => p.id === ids["deal-flour"])!.deliveryCodes[s.shopId];
      db = run(db, { type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: s.shopId, code });
    }
  }

  db = rate(db, ids["deal-flour"], "shop-ayanda", 5, "Fresh stock, long expiry dates.");
  db = rate(db, ids["deal-flour"], "shop-sipho", 4, "Left at Thandi's next door — easy to collect.");

  // 4. Rice: on the road today — the driver demo
  //    Kgomotso missed the driver and chose her partner shop, so her rice waits at Tebogo's.
  db = join(db, ids["deal-rice"], "shop-kgomotso", 6, P.partner("shop-tebogo"));
  db = join(db, ids["deal-rice"], "shop-tebogo", 4);
  db = join(db, ids["deal-rice"], "shop-bongani", 7, P.retry);
  db = join(db, ids["deal-rice"], "shop-butchery", 8, { ...P.standard, backupName: "Sibusiso (son)", backupPhone: "072 555 0101" });
  db = pay(db, ids["deal-rice"]);
  db = run(db, { type: "ADMIN_CONFIRM_PAYMENTS", dealId: ids["deal-rice"], adminName: ADMIN });
  db = placeOrder(db, ids["deal-rice"]);
  db = planAndAssign(db, ids["deal-rice"], isoDate(0));
  {
    const t = db.trips.find((x) => x.dealId === ids["deal-rice"])!;
    const codes = () => db.pools.find((p) => p.id === ids["deal-rice"])!.deliveryCodes;
    for (const s of t.stops) if (s.shopId !== "shop-kgomotso") db = run(db, { type: "OWNER_CONFIRM", dealId: ids["deal-rice"], shopId: s.shopId });
    db = run(db, { type: "DRIVER_ACCEPT", tripId: t.id, driverId: t.driverId });
    db = run(db, { type: "DRIVER_COLLECT", tripId: t.id, driverId: t.driverId });
    for (const s of t.stops) {
      if (s.shopId === "shop-tebogo") db = run(db, { type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: s.shopId, code: codes()[s.shopId] });
      if (s.shopId === "shop-kgomotso")
        db = run(db, { type: "DRIVER_LEAVE_AT_PARTNER", tripId: t.id, driverId: t.driverId, shopId: s.shopId, reason: "Owner is not there", code: PARTNERS["shop-tebogo"].dropCode });
    }
  }

  // 5. Sugar: just filled — shops are paying into TradeSafe escrow (the payment demo).
  //    Thandi and Sipho haven't paid yet; Tebogo is on the waitlist for a spot.
  db = join(db, ids["deal-sugar"], "shop-thandi", 6, { days: WEEKDAYS, time: "morning", ifMissed: "next-run", backupName: "Lerato (daughter)", backupPhone: "071 555 0123" });
  db = join(db, ids["deal-sugar"], "shop-mama-joy", 4, P.partner("shop-thandi", "afternoon"));
  db = join(db, ids["deal-sugar"], "shop-bongani", 5, P.partner("shop-butchery"));
  db = join(db, ids["deal-sugar"], "shop-kgomotso", 6, P.partner("shop-tebogo"));
  db = join(db, ids["deal-sugar"], "shop-ayanda", 4, P.collect);
  db = join(db, ids["deal-sugar"], "shop-sipho", 5, P.partner("shop-thandi", "any", [2, 3, 4]));
  db = pay(db, ids["deal-sugar"], ["shop-thandi", "shop-sipho"]);
  db = join(db, ids["deal-sugar"], "shop-tebogo", 5, P.retry);

  // 6. Open deals: shops reserve units, nobody has paid anything yet
  db = join(db, ids["deal-maize"], "shop-sipho", 8, P.partner("shop-thandi"));
  db = join(db, ids["deal-maize"], "shop-kgomotso", 6, P.partner("shop-tebogo"));
  db = join(db, ids["deal-maize"], "shop-butchery", 4, P.retry);
  db = join(db, ids["deal-maize"], "shop-mama-joy", 5, P.partner("shop-thandi", "afternoon"));
  db = join(db, ids["deal-oil"], "shop-bongani", 6, P.partner("shop-butchery"));
  db = join(db, ids["deal-oil"], "shop-tebogo", 5, P.retry);
  db = join(db, ids["deal-oil"], "shop-ayanda", 6, P.collect);
  db = join(db, ids["deal-oil"], "shop-thandi", 4);

  // shops that have looked at the open deals without reserving yet (real "viewed by" counts)
  for (const [deal, shops] of [
    ["deal-oil", ["shop-sipho", "shop-kgomotso", "shop-mama-joy", "shop-butchery"]],
    ["deal-maize", ["shop-thandi", "shop-bongani", "shop-ayanda", "shop-tebogo"]],
  ] as const)
    for (const shopId of shops) db = run(db, { type: "VIEW_DEAL", dealId: ids[deal], shopId });

  // newest deals first in lists; mark seed history messages as read so inboxes start tidy
  const firstUnread = new Set(db.messages.slice(-12).map((m) => m.id));
  db = { ...db, messages: db.messages.map((m) => ({ ...m, read: !firstUnread.has(m.id) })) };
  return db;
}

registerSeed(buildSeed);
