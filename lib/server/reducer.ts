import { SharedDB, findUserForSignIn } from "./db";
import { ServerAction } from "./actions";
import { uid } from "../id";
import {
  Approval,
  DeliveryPrefs,
  Fee,
  Message,
  PAYMENT_METHOD_LABEL,
  PAYMENT_WINDOW_HOURS,
  Pool,
  Trip,
  TripStop,
  UserRole,
  PARTNER_FEE_PER_UNIT_CENTS,
  PARTNER_RADIUS_KM,
  REBOOK_TRIP_FEE_CENTS,
  REDELIVERY_FEE_CENTS,
  DealRating,
  CourierJob,
  CourierLeg,
  COURIER_MAX_KM,
  COURIER_WINDOWS,
} from "../types";
import { distanceKm } from "../geo";
import { applyPledge, applyPayment, applyCancel, lockAtTarget, memberPositions, totalQtyOf, goodsTotal, serviceTotal, appendTx, auditPot, formatCents, paymentRef, potBalance, toCents, tierFor, unitCentsFor } from "../pot";
import { appendPayment } from "../payments";
import { buildTrip, splitFees } from "../planner";
import { courierQuote, courierShares, nearestFreeDriver, roadKm } from "../courier";
import { units } from "../units";

export interface ReduceResult {
  db: SharedDB;
  meta: Record<string, any>;
}

const fail = (db: SharedDB, error: string): ReduceResult => ({ db, meta: { error } });

function verifiedShop(db: SharedDB, shopId: string) {
  const shop = db.shops.find((s) => s.id === shopId);
  return shop && shop.verificationStatus === "verified" ? shop : null;
}

function replacePool(db: SharedDB, pool: Pool): SharedDB {
  return { ...db, pools: db.pools.map((p) => (p.id === pool.id ? pool : p)) };
}

function withEvent(pool: Pool, text: string, by: string): Pool {
  return { ...pool, events: [...pool.events, { at: new Date().toISOString(), text, by }] };
}

function notify(
  db: SharedDB,
  msgs: { toRole: UserRole; toId: string; text: string; dealId?: string; tripId?: string }[],
  fromName = "MzansiConnect",
  fromRole: Message["fromRole"] = "system"
): SharedDB {
  const now = new Date().toISOString();
  return {
    ...db,
    messages: [
      ...db.messages,
      ...msgs.map((m) => ({ id: uid("msg"), fromName, fromRole, createdAt: now, read: false, ...m })),
    ],
  };
}

const ownersOf = (pool: Pool) => pool.commitments.map((c) => c.shopId);

function code4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function replaceJob(db: SharedDB, job: CourierJob): SharedDB {
  return { ...db, courierJobs: db.courierJobs.map((j) => (j.id === job.id ? job : j)) };
}

function courierFullyPaid(db: SharedDB, jobId: string): SharedDB {
  const job = db.courierJobs.find((j) => j.id === jobId);
  if (!job || job.status !== "awaiting-payment") return db;
  const shares = db.fees.filter((f) => f.courierJobId === jobId && f.status !== "cancelled");
  if (shares.some((f) => f.status !== "paid")) return db;
  const next = replaceJob(db, { ...job, status: "assigned" });
  const day = new Date(job.day + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" });
  const route = job.legs.map((l) => `${l.fromShopName} → ${l.toShopName}`).join(", then ");
  return notify(next, [
    { toRole: "driver", toId: job.driverId, text: `New shop-to-shop run on ${day}, ${job.window}: ${route} (${job.distanceKm} km). Pays ${formatCents(job.feeCents)}. Open My trips to accept.` },
    ...job.shopIds.map((id) => ({ toRole: "owner" as const, toId: id, text: `Transport booked: ${job.driverName} (${job.vehicle}, ${job.plate}) will move the goods on ${day}, ${job.window}. The fee is held by TradeSafe until delivery.` })),
  ]);
}

const shortName = (n: string) => n.split(" (")[0];

function adminById(db: SharedDB, id: string) {
  return db.users.find((u) => u.id === id && u.role === "admin");
}

function setStop(trip: Trip, shopId: string, patch: Partial<TripStop>): Trip {
  return { ...trip, stops: trip.stops.map((s) => (s.shopId === shopId ? { ...s, ...patch } : s)) };
}

/** Units of other shops' stock a drop point is holding right now. */
function heldAt(db: SharedDB, partnerShopId: string) {
  return db.trips.flatMap((t) => t.stops).filter((s) => s.status === "at-partner" && s.partnerShopId === partnerShopId).reduce((n, s) => n + s.qty, 0);
}

const DEFAULT_PREFS: Omit<DeliveryPrefs, "agreedAt"> = { days: [1, 2, 3, 4, 5], time: "any", ifMissed: "next-run" };

function checkPrefs(db: SharedDB, shopId: string, prefs: Omit<DeliveryPrefs, "agreedAt">): string | null {
  if (!prefs.days?.length) return "Choose at least one day you can receive stock.";
  if (prefs.days.some((d) => d < 1 || d > 6)) return "Deliveries run Monday to Saturday.";
  if (prefs.ifMissed === "partner") {
    const me = db.shops.find((s) => s.id === shopId)!;
    const partner = db.shops.find((s) => s.id === prefs.partnerShopId);
    if (!partner || partner.id === shopId || !partner.partner?.active || partner.verificationStatus !== "verified") return "Choose one of the partner shops in the list.";
    if (distanceKm(me.lat, me.lng, partner.lat, partner.lng) > PARTNER_RADIUS_KM) return `Choose a partner shop within ${PARTNER_RADIUS_KM} km, so you can walk there.`;
  }
  if (prefs.backupName && !prefs.backupPhone) return "Add your backup person's phone number.";
  return null;
}

function withBackupCode(pool: Pool, shopId: string, backupName?: string): Pool {
  const backupCodes = { ...pool.backupCodes };
  if (backupName?.trim()) {
    if (!backupCodes[shopId]) {
      let c = code4();
      while (c === pool.deliveryCodes[shopId]) c = code4();
      backupCodes[shopId] = c;
    }
  } else delete backupCodes[shopId];
  return { ...pool, backupCodes };
}

/**
 * A stop's stock leaves the vehicle (handed over, left at a partner shop, or
 * taken back to the wholesaler): the driver is paid for that stop from the pot,
 * once, and the trip is finished when nothing is left on the vehicle.
 */
function stopLeavesVehicle(db: SharedDB, tripId: string, shopId: string, patch: Partial<TripStop>): SharedDB {
  const trip = db.trips.find((t) => t.id === tripId)!;
  const stop = trip.stops.find((s) => s.shopId === shopId)!;
  let nextTrip = setStop(trip, shopId, { ...patch, paid: true });
  const done = nextTrip.stops.every((s) => s.status !== "pending");
  if (done) nextTrip = { ...nextTrip, status: "completed" };
  let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === tripId ? nextTrip : t)) };
  if (!stop.paid && stop.feeCents > 0) {
    const pool = next.pools.find((p) => p.id === trip.dealId)!;
    next = replacePool(next, { ...pool, ledger: appendTx(pool.ledger, { type: "payout-driver", amountCents: stop.feeCents, note: `${trip.driverName}: stop at ${stop.shopName}` }) });
  }
  if (done) {
    const earned = nextTrip.paidBy === "pot" ? nextTrip.stops.reduce((n, s) => n + s.feeCents, 0) : nextTrip.feeCents;
    next = notify(next, [{ toRole: "admin", toId: "admin", dealId: trip.dealId, tripId, text: `${trip.driverName} finished the trip on ${trip.date}. Driver paid ${formatCents(earned)}${nextTrip.paidBy === "kasieco" ? " by MzansiConnect" : ""}.` }], trip.driverName, "driver");
  }
  return next;
}

function addFee(db: SharedDB, fee: Omit<Fee, "id" | "createdAt" | "status">): SharedDB {
  return { ...db, fees: [...db.fees, { ...fee, id: uid("fee"), createdAt: new Date().toISOString(), status: "due" }] };
}

/** Owner said "I'll be there" but wasn't: the agreed re-delivery fee is added to what they owe (paid through TradeSafe). */
function chargeRedeliveryIfOwed(db: SharedDB, pool: Pool, stop: TripStop, reason: string): SharedDB {
  const ownerFault = /not there|closed|refused|doesn't want/i.test(reason);
  if (!stop.confirmed || !ownerFault) return db;
  return addFee(db, { kind: "redelivery", shopId: stop.shopId, shopName: stop.shopName, dealId: pool.id, amountCents: REDELIVERY_FEE_CENTS, note: `Re-delivery fee: confirmed but not there (${reason})` });
}

/** The lot is fully reserved: lock the price, open the 48-hour payment window, tell everyone what to pay. */
function openPaymentWindow(db: SharedDB, pool: Pool, by = "System"): SharedDB {
  const p0 = lockAtTarget(pool, PAYMENT_WINDOW_HOURS);
  const price = formatCents(p0.priceLockedCents!);
  const p = withEvent(p0, `Deal full — all ${p0.minQty} ${units(p0.unitLabel)} reserved. Price locked at ${price}. Shops have ${PAYMENT_WINDOW_HOURS} hours to pay into TradeSafe escrow.`, by);
  let next = replacePool(db, p);
  const pos = memberPositions(p);
  next = notify(next, [
    { toRole: "admin", toId: "admin", dealId: p.id, text: `${p.productName} is full (${p.minQty} ${units(p.unitLabel)}, ${p.commitments.length} shops). Payments are due within ${PAYMENT_WINDOW_HOURS} hours.` },
    ...pos
      .filter((m) => m.dueCents > 0)
      .map((m) => ({
        toRole: "owner" as const,
        toId: m.shopId,
        dealId: p.id,
        text: `The ${p.productName} deal is full! Final price ${price} per ${p.unitLabel}. Please pay ${formatCents(m.dueCents)} within ${PAYMENT_WINDOW_HOURS} hours — it's held safely by TradeSafe until your stock is delivered.`,
      })),
  ]);
  return next;
}

/** When every shop in the deal has its stock in hand: pay the platform fee and finish the deal. */
function finishDealIfDone(db: SharedDB, dealId: string): SharedDB {
  const pool = db.pools.find((p) => p.id === dealId)!;
  if (pool.status === "delivered") return db;
  const trips = db.trips.filter((t) => t.dealId === dealId);
  const delivered = new Set(trips.flatMap((t) => t.stops.filter((s) => s.status === "delivered").map((s) => s.shopId)));
  if (!pool.commitments.every((c) => delivered.has(c.shopId))) return db;
  const fee = serviceTotal(pool);
  const next = withEvent(
    { ...pool, ledger: appendTx(pool.ledger, { type: "payout-platform", amountCents: fee, note: `MzansiConnect service fee (${Math.round(pool.serviceFeeRate * 100)}%)` }), status: "delivered" },
    "Every shop has its stock. Deal complete — pot settled to R0.",
    "System"
  );
  let out = replacePool(db, next);
  out = notify(out, [{ toRole: "admin", toId: "admin", dealId, text: `${pool.productName}: all ${pool.commitments.length} shops have their stock. Pot settled to R0.` }]);
  return out;
}

/** Approved by two admins: pay the wholesaler from the pot and place the order. */
function placeOrder(db: SharedDB, dealId: string, by: string): ReduceResult {
  const pool = db.pools.find((p) => p.id === dealId);
  if (!pool) return fail(db, "Deal not found");
  if (pool.status !== "payment-confirmed") return fail(db, "Confirm the payments before placing the order.");
  const goods = goodsTotal(pool);
  const po = `PO-${pool.productName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 5)}-${Math.floor(1000 + Math.random() * 9000)}`;
  let p: Pool = {
    ...pool,
    poNumber: po,
    status: "ordered",
    ledger: appendTx(pool.ledger, { type: "payout-supplier", amountCents: goods, note: `${pool.supplierName} paid for ${totalQtyOf(pool)} ${units(pool.unitLabel)} — order ${po}` }),
  };
  p = withEvent(p, `Paid ${pool.supplierName} ${formatCents(goods)} and placed order ${po} (approved by two admins).`, by);
  let next = replacePool(db, p);
  next = notify(
    next,
    ownersOf(pool).map((id) => ({
      toRole: "owner" as const,
      toId: id,
      dealId: pool.id,
      text: `Order placed: MzansiConnect paid ${pool.supplierName} for the ${pool.productName} deal (order ${po}). We're planning deliveries now — you'll get your day and time slot soon.`,
    }))
  );
  return { db: next, meta: { poNumber: po } };
}

/** Cancel a deal that hasn't been ordered. TradeSafe refunds every shop that paid; shops that only reserved paid nothing. */
function cancelDeal(db: SharedDB, dealId: string, by: string): ReduceResult {
  const pool = db.pools.find((p) => p.id === dealId);
  if (!pool) return fail(db, "Deal not found");
  const res = applyCancel(pool);
  if ("error" in res) return fail(db, res.error);
  let payments = db.payments;
  for (const r of res.refunds) payments = appendPayment(payments, { shopId: r.shopId, type: "refund", amountCents: r.cents, dealId: pool.id, note: `Refund: ${pool.productName} deal cancelled`, ref: r.ref });
  const refundedShops = new Set(res.refunds.map((r) => r.shopId));
  let next: SharedDB = {
    ...replacePool(db, withEvent(res.pool, res.refunds.length ? `Deal cancelled — TradeSafe refunded ${res.refunds.length} shop${res.refunds.length === 1 ? "" : "s"} in full to their bank.` : "Deal closed without filling — nobody had paid, so nothing to refund.", by)),
    payments,
  };
  next = notify(next, [
    ...res.refunds.map((r) => ({ toRole: "owner" as const, toId: r.shopId, dealId: pool.id, text: `The ${pool.productName} deal is cancelled. TradeSafe is refunding ${formatCents(r.cents)} to the account you paid from (usually 1–3 working days).` })),
    ...pool.commitments.filter((c) => !refundedShops.has(c.shopId)).map((c) => ({ toRole: "owner" as const, toId: c.shopId, dealId: pool.id, text: `The ${pool.productName} deal didn't fill, so it's closed. You hadn't paid anything, so there's nothing to refund.` })),
  ]);
  return { db: next, meta: { refunds: res.refunds.length } };
}

export function reduce(db: SharedDB, action: ServerAction): ReduceResult {
  const meta: Record<string, any> = {};

  switch (action.type) {
    // ---------------- accounts ----------------

    case "SIGN_IN": {
      const user = findUserForSignIn(db, action.phone, action.pin);
      if (!user) return fail(db, "That phone number and PIN don't match an account. Check both and try again.");
      return { db, meta: { userId: user.id, role: user.role, shopId: user.shopId, driverId: user.driverId, name: user.name } };
    }

    case "REGISTER_SHOP": {
      if (!/^\d{4}$/.test(action.pin || "")) return fail(db, "Choose a 4-digit PIN.");
      const phone = action.shop.phone.replace(/\D/g, "");
      if (db.users.some((u) => u.phone.replace(/\D/g, "") === phone))
        return fail(db, "Someone already signs in with that phone number. Sign in instead, or use another number.");
      // No quiz, no shop: every new shop must pass the compliance quiz to register.
      const course = db.courses.find((c) => c.id === action.quiz?.courseId);
      if (!course || !action.quiz) return fail(db, "Pass the compliance quiz to register your shop.");
      const correct = course.quiz.filter((q) => action.quiz!.answers[q.id] === q.correctIndex).length;
      const score = correct / course.quiz.length;
      if (score < course.passMark) return fail(db, `Quiz score ${Math.round(score * 100)}% — you need ${Math.round(course.passMark * 100)}% to register.`);
      const now = new Date().toISOString();
      const shop = { ...action.shop, verified: true, verificationStatus: "verified" as const, verificationMethod: "course" as const, verifiedAt: now };
      const user = { id: `user-${shop.id}`, role: "owner" as const, name: shop.ownerName, phone: shop.phone, pin: action.pin, shopId: shop.id };
      const certificate = {
        id: uid("cert"),
        shopId: shop.id,
        shopName: shop.name,
        courseId: course.id,
        courseTitle: course.title,
        score,
        certificateNumber: `MC-CC-${Math.floor(100000 + Math.random() * 899999)}`,
        issuedAt: now,
        issuedWith: course.issuedWith,
      };
      return {
        db: { ...db, shops: [...db.shops, shop], users: [...db.users, user], certificates: [certificate, ...db.certificates] },
        meta: { userId: user.id, role: "owner", shopId: shop.id, name: user.name, certificateId: certificate.id, score },
      };
    }

    case "UPDATE_SHOP": {
      const { verificationStatus, verified, verifiedAt, verificationMethod, partner, ...safe } = action.patch;
      return { db: { ...db, shops: db.shops.map((s) => (s.id === action.shopId ? { ...s, ...safe } : s)) }, meta };
    }

    // ---------------- stock ----------------

    case "ADD_GOOD":
      return { db: { ...db, goods: [...db.goods, { ...action.good, soldLast7Days: action.good.soldLast7Days ?? 0 }] }, meta };

    case "UPDATE_GOOD":
      return { db: { ...db, goods: db.goods.map((g) => (g.id === action.goodId ? { ...g, ...action.patch } : g)) }, meta };

    case "REMOVE_GOOD":
      return { db: { ...db, goods: db.goods.filter((g) => g.id !== action.goodId) }, meta };

    case "RECORD_SALE": {
      const good = db.goods.find((g) => g.id === action.goodId);
      if (!good) return fail(db, "Item not found");
      const qty = Math.max(1, Math.floor(action.qty));
      if (good.stockQty < qty) return fail(db, `Only ${good.stockQty} in stock`);
      return {
        db: { ...db, goods: db.goods.map((g) => (g.id === good.id ? { ...g, stockQty: g.stockQty - qty, soldLast7Days: g.soldLast7Days + qty } : g)) },
        meta,
      };
    }

    // ---------------- deals: shop owners ----------------

    case "JOIN_DEAL": {
      const shop = verifiedShop(db, action.shopId);
      if (!shop) return fail(db, "Only verified shops can join deals. Get verified under Compliance first.");
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      const existingPrefs = pool.commitments.find((c) => c.shopId === shop.id)?.prefs;
      const prefsIn = action.prefs ?? existingPrefs ?? DEFAULT_PREFS;
      const prefsErr = checkPrefs(db, shop.id, prefsIn);
      if (prefsErr) return fail(db, prefsErr);
      const prefs: DeliveryPrefs = action.prefs || !existingPrefs ? { ...prefsIn, agreedAt: new Date().toISOString() } : existingPrefs;

      // full deal → the waitlist (takes a spot if a shop doesn't pay in time)
      if (pool.status === "target-reached") {
        if (pool.commitments.some((c) => c.shopId === shop.id)) return fail(db, "You're already in this deal. Units can't be added once it's full.");
        if (pool.waitlist.some((c) => c.shopId === shop.id)) return fail(db, "You're already on the waitlist for this deal.");
        if (!Number.isInteger(action.qty) || action.qty < 1) return fail(db, "Choose at least 1 unit.");
        const entry = { shopId: shop.id, shopName: shop.name, township: shop.township, qty: action.qty, joinedAt: new Date().toISOString(), prefs };
        const p = withEvent({ ...pool, waitlist: [...pool.waitlist, entry] }, `${shop.name} joined the waitlist for ${action.qty} ${units(pool.unitLabel, action.qty)}.`, shop.name);
        meta.waitlisted = true;
        return { db: replacePool(db, p), meta };
      }

      const res = applyPledge(pool, shop, action.qty);
      if ("error" in res) return fail(db, res.error);
      let p: Pool = { ...res.pool, deliveryCodes: { ...res.pool.deliveryCodes, [shop.id]: res.pool.deliveryCodes[shop.id] || code4() } };
      p = { ...p, commitments: p.commitments.map((c) => (c.shopId === shop.id ? { ...c, prefs } : c)) };
      p = withBackupCode(p, shop.id, prefs.backupName);
      p = withEvent(p, `${shop.name} reserved ${action.qty} ${units(pool.unitLabel, action.qty)}.`, shop.name);
      p = { ...p, views: { ...p.views, [shop.id]: new Date().toISOString() } };
      meta.reserved = action.qty;
      if (totalQtyOf(p) >= p.minQty) {
        meta.targetReached = true;
        return { db: openPaymentWindow(db, p), meta };
      }
      return { db: replacePool(db, p), meta };
    }

    case "PAY_DEAL": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      const res = applyPayment(pool, action.shopId, action.method);
      if ("error" in res) return fail(db, res.error);
      const shopName = pool.commitments.find((c) => c.shopId === action.shopId)!.shopName;
      let p = withEvent(res.pool, `${shopName} paid ${formatCents(res.paidCents)} into TradeSafe escrow (${PAYMENT_METHOD_LABEL[action.method]}).`, shopName);
      let next: SharedDB = {
        ...replacePool(db, p),
        payments: appendPayment(db.payments, { shopId: action.shopId, type: "deal-payment", amountCents: res.paidCents, method: action.method, dealId: pool.id, note: `${pool.productName} — held in escrow until delivery`, ref: res.ref }),
      };
      const unpaid = memberPositions(p).filter((m) => m.dueCents > 0).length;
      if (unpaid === 0) next = notify(next, [{ toRole: "admin", toId: "admin", dealId: p.id, text: `All ${p.commitments.length} shops have paid for ${p.productName} — ${formatCents(potBalance(p.ledger))} held in TradeSafe escrow. Check and confirm the payments.` }]);
      meta.ref = res.ref;
      meta.paidCents = res.paidCents;
      meta.allPaid = unpaid === 0;
      return { db: next, meta };
    }

    case "PAY_FEE": {
      const fee = db.fees.find((f) => f.id === action.feeId && f.shopId === action.shopId);
      if (!fee) return fail(db, "Fee not found");
      if (fee.status === "paid") return fail(db, "This fee is already paid.");
      if (fee.status === "cancelled") return fail(db, "This run was cancelled, so there's nothing to pay.");
      const ref = paymentRef();
      const now = new Date().toISOString();
      let payments = appendPayment(db.payments, { shopId: fee.shopId, type: "fee-payment", amountCents: fee.amountCents, method: action.method, dealId: fee.dealId, feeId: fee.id, note: fee.note, ref });
      if (fee.kind === "drop-point" && fee.toShopId)
        payments = appendPayment(payments, { shopId: fee.toShopId, type: "fee-payout", amountCents: fee.amountCents, dealId: fee.dealId, feeId: fee.id, note: `Drop-point earnings: holding stock for ${fee.shopName}`, ref: `${ref}-P` });
      let next: SharedDB = { ...db, payments, fees: db.fees.map((f) => (f.id === fee.id ? { ...f, status: "paid" as const, paidAt: now, ref } : f)) };
      if (fee.kind === "drop-point" && fee.toShopId)
        next = notify(next, [{ toRole: "owner", toId: fee.toShopId, dealId: fee.dealId, text: `${fee.shopName} paid the ${formatCents(fee.amountCents)} drop-point fee. TradeSafe is paying it to your bank.` }]);
      if (fee.kind === "courier" && fee.courierJobId) {
        next = courierFullyPaid(next, fee.courierJobId);
        meta.booked = next.courierJobs.find((j) => j.id === fee.courierJobId)?.status === "assigned";
      }
      meta.ref = ref;
      return { db: next, meta };
    }

    // ---------------- deals: admin ----------------

    case "ADMIN_CREATE_DEAL": {
      const ws = db.wholesalers.find((w) => w.id === action.wholesalerId);
      if (!ws) return fail(db, "Choose a wholesaler.");
      if (!action.productName.trim()) return fail(db, "Give the product a name.");
      if (action.minQty < 2) return fail(db, "The lot must have at least 2 units.");
      const tiers = [...action.tiers].sort((a, b) => a.minQty - b.minQty);
      if (tiers.some((t, i) => i > 0 && t.price > tiers[i - 1].price)) return fail(db, "Prices must go down as more units are sold.");
      const now = new Date();
      const pool: Pool = {
        id: uid("deal"),
        wholesalerId: ws.id,
        productName: action.productName.trim(),
        unitLabel: action.unitLabel.trim() || "unit",
        unitWeightKg: action.unitWeightKg,
        supplierName: ws.name,
        supplierVerified: ws.verified,
        minQty: action.minQty,
        tiers,
        retailPrice: action.retailPrice,
        commitments: [],
        deliveryFeeCents: action.deliveryFeeCents,
        serviceFeeRate: 0.02,
        ledger: [],
        createdAt: now.toISOString(),
        closesAt: new Date(now.getTime() + Math.max(1, action.closesInDays) * 86400000).toISOString(),
        status: "open",
        events: [{ at: now.toISOString(), text: `Deal published for ${ws.name}.`, by: action.adminName }],
        deliveryCodes: {},
        backupCodes: {},
        deliveryWithinDays: Math.max(1, Math.min(14, action.deliveryWithinDays ?? 5)),
        waitlist: [],
        tripIds: [],
        ratings: [],
        views: {},
        photo: action.photo || undefined,
      };
      let next: SharedDB = { ...db, pools: [pool, ...db.pools] };
      next = notify(
        next,
        db.shops.filter((s) => s.verificationStatus === "verified").map((s) => ({
          toRole: "owner" as const,
          toId: s.id,
          dealId: pool.id,
          text: `New deal from ${ws.name}: ${pool.productName}, ${pool.minQty} ${units(pool.unitLabel)}. Price starts at ${formatCents(toCents(tiers[0].price))} and drops to ${formatCents(toCents(tiers[tiers.length - 1].price))} when the lot sells out.`,
        }))
      );
      meta.dealId = pool.id;
      return { db: next, meta };
    }

    case "ADMIN_CONFIRM_PAYMENTS": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      if (pool.status !== "target-reached") return fail(db, "Payments can only be confirmed once the deal is full.");
      const unpaid = memberPositions(pool).filter((m) => m.dueCents > 0);
      if (unpaid.length) return fail(db, `${unpaid.length} shop${unpaid.length === 1 ? " hasn't" : "s haven't"} paid yet. Wait for the payment window, or release unpaid spots after it ends.`);
      if (!auditPot(pool).ok) return fail(db, "The ledger proof doesn't pass — don't confirm. Check the payments list.");
      let next = replacePool(db, withEvent({ ...pool, status: "payment-confirmed" }, `Checked ${pool.commitments.length} payments, ${formatCents(potBalance(pool.ledger))} held in TradeSafe escrow. All correct.`, action.adminName));
      next = notify(next, ownersOf(pool).map((id) => ({ toRole: "owner" as const, toId: id, dealId: pool.id, text: `MzansiConnect has checked your payment for the ${pool.productName} deal. The order goes to ${pool.supplierName} next.` })));
      return { db: next, meta };
    }

    case "ADMIN_RELEASE_UNPAID": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      if (pool.status !== "target-reached") return fail(db, "Only a full deal waiting for payments has spots to release.");
      if (pool.paymentDueAt && new Date(pool.paymentDueAt).getTime() > Date.now()) return fail(db, "Shops still have time to pay. Wait until the payment window ends.");
      const pos = memberPositions(pool);
      const unpaid = pos.filter((m) => m.dueCents > 0 && m.paidCents === 0);
      if (!unpaid.length) return fail(db, "Every shop has paid — nothing to release.");
      const dropped = new Set(unpaid.map((m) => m.shopId));
      let commitments = pool.commitments.filter((c) => !dropped.has(c.shopId));
      const deliveryCodes = { ...pool.deliveryCodes };
      const backupCodes = { ...pool.backupCodes };
      dropped.forEach((id) => {
        delete deliveryCodes[id];
        delete backupCodes[id];
      });
      // move the waitlist up, first come first served, while there's room
      const waitlist = [...pool.waitlist];
      const promoted: string[] = [];
      for (let i = 0; i < waitlist.length; ) {
        const left = pool.minQty - commitments.reduce((s, c) => s + c.qty, 0);
        if (left <= 0) break;
        const w = waitlist[i];
        if (w.qty <= left) {
          commitments = [...commitments, { ...w, joinedAt: new Date().toISOString() }];
          deliveryCodes[w.shopId] = code4();
          if (w.prefs?.backupName) backupCodes[w.shopId] = code4();
          promoted.push(w.shopName);
          waitlist.splice(i, 1);
        } else i++;
      }
      const qty = commitments.reduce((s, c) => s + c.qty, 0);
      let p: Pool = { ...pool, commitments, waitlist, deliveryCodes, backupCodes };
      p = withEvent(p, `Payment window over: released ${unpaid.length} unpaid spot${unpaid.length === 1 ? "" : "s"} (${unpaid.map((m) => m.shopName).join(", ")})${promoted.length ? `; moved up from the waitlist: ${promoted.join(", ")}` : ""}.`, action.adminName);
      let next = db;
      if (qty >= pool.minQty) next = openPaymentWindow(next, p, action.adminName);
      else {
        p = withEvent({ ...p, status: "open", paymentDueAt: undefined }, `Deal reopened: ${pool.minQty - qty} ${units(pool.unitLabel, pool.minQty - qty)} to fill again. Price stays locked at ${formatCents(p.priceLockedCents!)}; shops that paid stay in.`, "System");
        next = replacePool(next, p);
      }
      next = notify(next, [
        ...unpaid.map((m) => ({ toRole: "owner" as const, toId: m.shopId, dealId: pool.id, text: `Your reservation in the ${pool.productName} deal was released because it wasn't paid in time. No money was taken.` })),
        ...(qty < pool.minQty ? commitments.map((c) => ({ toRole: "owner" as const, toId: c.shopId, dealId: pool.id, text: `A few shops didn't pay, so the ${pool.productName} deal is filling again. Your place is kept.` })) : []),
      ]);
      meta.released = unpaid.length;
      meta.promoted = promoted.length;
      meta.reopened = qty < pool.minQty;
      return { db: next, meta };
    }

    case "ADMIN_REQUEST_APPROVAL": {
      const admin = adminById(db, action.adminId);
      if (!admin) return fail(db, "Only an admin can ask for this.");
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      if (db.approvals.some((a) => a.dealId === pool.id && a.kind === action.kind && a.status === "pending"))
        return fail(db, "This is already waiting for another admin to approve.");
      let amountCents = 0;
      let summary = "";
      if (action.kind === "place-order") {
        if (pool.status !== "payment-confirmed") return fail(db, "Confirm the payments before asking to place the order.");
        amountCents = goodsTotal(pool);
        summary = `Pay ${pool.supplierName} ${formatCents(amountCents)} for ${totalQtyOf(pool)} ${units(pool.unitLabel)} of ${pool.productName}`;
      } else {
        if (pool.status !== "open" && pool.status !== "target-reached") return fail(db, "Only a deal that hasn't been ordered can be cancelled.");
        amountCents = potBalance(pool.ledger);
        // no money held → nothing leaves escrow, so one admin can close it
        if (amountCents === 0) {
          const r = cancelDeal(db, pool.id, shortName(admin.name));
          if (r.meta.error) return r;
          return { db: r.db, meta: { ...r.meta, cancelledDirectly: true } };
        }
        const payers = memberPositions(pool).filter((m) => m.paidCents > 0).length;
        summary = `Cancel ${pool.productName} and refund ${formatCents(amountCents)} to ${payers} shop${payers === 1 ? "" : "s"}`;
      }
      const approval: Approval = {
        id: uid("appr"),
        kind: action.kind,
        dealId: pool.id,
        amountCents,
        summary,
        requestedById: admin.id,
        requestedByName: shortName(admin.name),
        requestedAt: new Date().toISOString(),
        status: "pending",
      };
      let next: SharedDB = { ...db, approvals: [...db.approvals, approval] };
      next = replacePool(next, withEvent(pool, `Asked a second admin to approve: ${summary}.`, shortName(admin.name)));
      next = notify(next, [{ toRole: "admin", toId: "admin", dealId: pool.id, text: `${shortName(admin.name)} needs a second admin to approve: ${summary}.` }], shortName(admin.name), "admin");
      meta.approvalId = approval.id;
      return { db: next, meta };
    }

    case "ADMIN_DECIDE_APPROVAL": {
      const admin = adminById(db, action.adminId);
      if (!admin) return fail(db, "Only an admin can approve.");
      const ap = db.approvals.find((a) => a.id === action.approvalId);
      if (!ap || ap.status !== "pending") return fail(db, "This request has already been decided.");
      if (ap.requestedById === admin.id) return fail(db, "You asked for this, so a different admin must approve it. That's the two-person rule.");
      const decided: Approval = { ...ap, status: action.approve ? "approved" : "rejected", decidedById: admin.id, decidedByName: shortName(admin.name), decidedAt: new Date().toISOString(), note: action.note?.trim() || undefined };
      let next: SharedDB = { ...db, approvals: db.approvals.map((a) => (a.id === ap.id ? decided : a)) };
      const by = `${ap.requestedByName} + ${shortName(admin.name)}`;
      if (!action.approve) {
        const pool = next.pools.find((p) => p.id === ap.dealId)!;
        next = replacePool(next, withEvent(pool, `${shortName(admin.name)} said no to: ${ap.summary}${decided.note ? ` — "${decided.note}"` : ""}.`, shortName(admin.name)));
        next = notify(next, [{ toRole: "admin", toId: "admin", dealId: ap.dealId, text: `${shortName(admin.name)} did not approve "${ap.summary}"${decided.note ? `: ${decided.note}` : ""}.` }], shortName(admin.name), "admin");
        return { db: next, meta };
      }
      const r = ap.kind === "place-order" ? placeOrder(next, ap.dealId, by) : cancelDeal(next, ap.dealId, by);
      if (r.meta.error) return fail(db, r.meta.error);
      return { db: r.db, meta: { ...r.meta, approved: true } };
    }

    case "ADMIN_ASSIGN_TRIPS": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      if (pool.status !== "ordered") return fail(db, "Place the order with the wholesaler before booking drivers.");
      const ws = db.wholesalers.find((w) => w.id === pool.wholesalerId)!;
      const allShops = action.trips.flatMap((t) => t.shopIds);
      const missing = pool.commitments.filter((c) => !allShops.includes(c.shopId));
      if (missing.length) return fail(db, `Every shop needs a driver. Missing: ${missing.map((m) => m.shopName).join(", ")}.`);
      if (new Set(allShops).size !== allShops.length) return fail(db, "A shop is on two trips. Each shop must be on exactly one trip.");
      const driverIds = action.trips.map((t) => t.driverId);
      if (new Set(driverIds).size !== driverIds.length) return fail(db, "Each trip needs a different driver.");

      let drafts = [];
      for (const t of action.trips) {
        const driver = db.drivers.find((d) => d.id === t.driverId);
        if (!driver) return fail(db, "Driver not found");
        const busy = db.trips.find((x) => x.driverId === driver.id && x.date === action.date && x.status !== "completed");
        if (busy) return fail(db, `${driver.name} already has a trip on ${action.date}. Pick another driver or another day.`);
        const stops = t.shopIds.map((id) => ({ shop: db.shops.find((s) => s.id === id)!, qty: pool.commitments.find((c) => c.shopId === id)!.qty }));
        const draft = buildTrip({ deal: pool, wholesaler: ws, driver, stops, date: action.date, startTime: action.startTime });
        if (draft.loadKg > driver.capacityKg) return fail(db, `${driver.name}'s ${driver.vehicle} carries ${driver.capacityKg} kg but this trip is ${draft.loadKg} kg. Choose a bigger vehicle or split the trip.`);
        drafts.push(draft);
      }
      drafts = splitFees(pool, drafts);
      const now = new Date().toISOString();
      const trips: Trip[] = drafts.map(({ warnings, ...d }) => ({ ...d, id: uid("trip"), dealId: pool.id, status: "assigned", paidBy: "pot", createdAt: now }));
      let p = withEvent({ ...pool, status: "scheduled", tripIds: trips.map((t) => t.id) }, `Booked ${trips.length} driver${trips.length === 1 ? "" : "s"} for ${action.date}: ${trips.map((t) => `${t.driverName} (${t.stops.length} shops)`).join(", ")}.`, action.adminName);
      let next: SharedDB = { ...replacePool(db, p), trips: [...db.trips, ...trips] };
      next = notify(next, [
        ...trips.flatMap((t) =>
          t.stops.map((s) => ({
            toRole: "owner" as const,
            toId: s.shopId,
            dealId: pool.id,
            tripId: t.id,
            text: `Delivery booked: ${s.qty} × ${pool.productName} on ${t.date}, between ${s.window}, with ${t.driverName} (${t.vehicle}). Please open the deal and tap "I'll be there". Your delivery code is on the deal page — give it to the driver only after you've counted your stock.`,
          }))
        ),
        ...trips.map((t) => ({
          toRole: "driver" as const,
          toId: t.driverId,
          dealId: pool.id,
          tripId: t.id,
          text: `New trip on ${t.date}: collect ${t.stops.reduce((s, x) => s + x.qty, 0)} ${units(pool.unitLabel)} (${t.loadKg} kg) at ${t.pickup.name} between ${t.pickup.window}, then ${t.stops.length} stops. You're paid ${formatCents(t.feeCents)}, stop by stop. Open the trip and tap "Accept this trip".`,
        })),
      ]);
      meta.tripIds = trips.map((t) => t.id);
      return { db: next, meta };
    }

    case "ADMIN_REBOOK": {
      const trip = db.trips.find((t) => t.id === action.tripId);
      if (!trip) return fail(db, "Trip not found");
      const stop = trip.stops.find((s) => s.shopId === action.shopId);
      if (!stop || stop.status !== "returned") return fail(db, "Only stock that went back to the wholesaler can be rebooked.");
      const driver = db.drivers.find((d) => d.id === action.driverId);
      if (!driver) return fail(db, "Choose a driver.");
      const weight = stop.weightKg;
      if (weight > driver.capacityKg) return fail(db, `${driver.name}'s ${driver.vehicle} can't carry ${weight} kg.`);
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      const newTrip: Trip = {
        id: uid("trip"),
        dealId: trip.dealId,
        driverId: driver.id,
        driverName: driver.name,
        vehicle: `${driver.vehicle} · ${driver.plate}`,
        capacityKg: driver.capacityKg,
        date: action.date,
        startTime: action.window.split(" – ")[0],
        pickup: { ...trip.pickup, window: "before the delivery window" },
        stops: [{ ...stop, status: "pending", window: action.window, feeCents: 0, paid: true, attempts: stop.attempts + 1, confirmed: false, missReason: undefined, returnedAt: undefined, nextRun: undefined }],
        loadKg: weight,
        status: "assigned",
        feeCents: REBOOK_TRIP_FEE_CENTS,
        paidBy: "kasieco",
        rebookOf: trip.id,
        createdAt: new Date().toISOString(),
      };
      let next: SharedDB = {
        ...db,
        trips: [...db.trips.map((t) => (t.id === trip.id ? setStop(t, stop.shopId, { status: "rebooked", rebookedTripId: newTrip.id }) : t)), newTrip],
      };
      next = replacePool(next, withEvent({ ...pool, tripIds: [...pool.tripIds, newTrip.id] }, `Rebooked ${stop.shopName} with ${driver.name} on ${action.date}, ${action.window}.`, action.adminName));
      next = notify(next, [
        { toRole: "owner", toId: stop.shopId, dealId: trip.dealId, tripId: newTrip.id, text: `New delivery time: ${stop.qty} × ${pool.productName} on ${action.date}, ${action.window}, with ${driver.name}. Please tap "I'll be there" on the deal page.` },
        { toRole: "driver", toId: driver.id, dealId: trip.dealId, tripId: newTrip.id, text: `Re-delivery on ${action.date}: collect ${stop.qty} ${units(pool.unitLabel, stop.qty)} for ${stop.shopName} at ${trip.pickup.name}, deliver ${action.window}. MzansiConnect pays ${formatCents(REBOOK_TRIP_FEE_CENTS)}.` },
      ], action.adminName, "admin");
      meta.tripId = newTrip.id;
      return { db: next, meta };
    }

    case "ADMIN_MARK_COLLECTED": {
      const trip = db.trips.find((t) => t.id === action.tripId);
      const stop = trip?.stops.find((s) => s.shopId === action.shopId);
      if (!trip || !stop || stop.status !== "returned") return fail(db, "This stock isn't waiting at the wholesaler.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      if (pool.deliveryCodes[stop.shopId] !== action.code.trim() && pool.backupCodes[stop.shopId] !== action.code.trim())
        return fail(db, "That code is wrong. Ask the owner to read the code from their MzansiConnect deal page.");
      let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? setStop(t, stop.shopId, { status: "delivered", deliveredAt: new Date().toISOString(), handedTo: "wholesaler-pickup" }) : t)) };
      next = replacePool(next, withEvent(pool, `${stop.shopName} collected ${stop.qty} ${units(pool.unitLabel, stop.qty)} at ${trip.pickup.name} (code checked).`, action.adminName));
      next = notify(next, [{ toRole: "owner", toId: stop.shopId, dealId: pool.id, text: `Collected: ${stop.qty} × ${pool.productName} at ${trip.pickup.name}. Thank you!` }]);
      next = finishDealIfDone(next, pool.id);
      return { db: next, meta };
    }

    // ---------------- shop owners: delivery choices ----------------

    case "OWNER_SET_PREFS": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      const c = pool?.commitments.find((x) => x.shopId === action.shopId);
      if (!pool || !c) return fail(db, "You're not in this deal.");
      const onVehicle = db.trips.some((t) => t.dealId === pool.id && t.status !== "assigned" && t.status !== "accepted" && t.stops.some((s) => s.shopId === action.shopId && s.status === "pending"));
      if (onVehicle) return fail(db, "The driver is already on the way, so your choices can't change now. Message MzansiConnect if something is wrong.");
      const err = checkPrefs(db, action.shopId, action.prefs);
      if (err) return fail(db, err);
      let p: Pool = { ...pool, commitments: pool.commitments.map((x) => (x.shopId === action.shopId ? { ...x, prefs: { ...action.prefs, agreedAt: new Date().toISOString() } } : x)) };
      p = withBackupCode(p, action.shopId, action.prefs.backupName);
      return { db: replacePool(db, withEvent(p, `${c.shopName} updated their delivery choices.`, c.shopName)), meta };
    }

    case "OWNER_CONFIRM": {
      const trip = db.trips.find((t) => t.dealId === action.dealId && t.status !== "completed" && t.stops.some((s) => s.shopId === action.shopId && s.status === "pending"));
      if (!trip) return fail(db, "There's no booked delivery to confirm yet.");
      const stop = trip.stops.find((s) => s.shopId === action.shopId)!;
      let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? setStop(t, action.shopId, { confirmed: true }) : t)) };
      const pool = next.pools.find((p) => p.id === action.dealId)!;
      next = replacePool(next, withEvent(pool, `${stop.shopName} confirmed they'll be there ${trip.date}, ${stop.window}.`, stop.shopName));
      return { db: next, meta };
    }

    case "RATE_DEAL": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      const member = pool.commitments.find((c) => c.shopId === action.shopId);
      if (!member) return fail(db, "Only shops in this deal can rate it.");
      const arrived =
        pool.status === "delivered" || db.trips.some((t) => t.dealId === pool.id && t.stops.some((s) => s.shopId === action.shopId && s.status === "delivered"));
      if (!arrived) return fail(db, "You can rate this deal once your stock has arrived.");
      if (pool.ratings.some((r) => r.shopId === action.shopId)) return fail(db, "You've already rated this deal.");
      const stars = Math.round(action.stars);
      if (stars < 1 || stars > 5) return fail(db, "Choose 1 to 5 stars.");
      const rating: DealRating = {
        shopId: action.shopId,
        township: member.township,
        stars: stars as DealRating["stars"],
        comment: action.comment?.trim().slice(0, 200) || undefined,
        at: new Date().toISOString(),
      };
      return { db: replacePool(db, { ...pool, ratings: [...pool.ratings, rating] }), meta };
    }

    case "VIEW_DEAL": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool || !db.shops.some((s) => s.id === action.shopId)) return { db, meta };
      return { db: replacePool(db, { ...pool, views: { ...pool.views, [action.shopId]: new Date().toISOString() } }), meta };
    }

    case "ADMIN_SET_DEAL_PHOTO": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool) return fail(db, "Deal not found");
      if (action.photo && action.photo.length > 400_000) return fail(db, "That photo is too big — try a smaller one.");
      return { db: replacePool(db, { ...pool, photo: action.photo || undefined }), meta };
    }

    // ---------------- partner drop points ----------------

    case "PARTNER_SETTINGS": {
      const shop = verifiedShop(db, action.shopId);
      if (!shop) return fail(db, "Only verified shops can be drop points.");
      const cap = Math.round(action.capacityUnits);
      if (action.active && (cap < 1 || cap > 200)) return fail(db, "Choose how many units you can hold (1 to 200).");
      const holding = heldAt(db, shop.id);
      if (!action.active && holding > 0) return fail(db, `You're holding ${holding} units for neighbours. Hand them over first.`);
      const partner = { active: action.active, capacityUnits: cap || shop.partner?.capacityUnits || 10, dropCode: shop.partner?.dropCode || code4(), agreedAt: shop.partner?.agreedAt || new Date().toISOString() };
      return { db: { ...db, shops: db.shops.map((s) => (s.id === shop.id ? { ...s, partner } : s)) }, meta };
    }

    case "PARTNER_HANDOVER": {
      const trip = db.trips.find((t) => t.id === action.tripId);
      const stop = trip?.stops.find((s) => s.shopId === action.shopId);
      if (!trip || !stop || stop.status !== "at-partner" || stop.partnerShopId !== action.partnerShopId) return fail(db, "You're not holding this stock.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      const code = action.code.trim();
      const by = pool.deliveryCodes[stop.shopId] === code ? "owner" : pool.backupCodes[stop.shopId] === code ? "backup" : null;
      if (!by) return fail(db, "That code is wrong. Ask the owner to read their delivery code from the MzansiConnect deal page. Don't hand over until it matches.");
      let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? setStop(t, stop.shopId, { status: "delivered", deliveredAt: new Date().toISOString(), handedTo: "partner-pickup" }) : t)) };
      next = replacePool(next, withEvent(pool, `${stop.shopName} collected ${stop.qty} ${units(pool.unitLabel, stop.qty)} from ${stop.partnerShopName} (code checked${by === "backup" ? ", backup receiver" : ""}).`, stop.partnerShopName || "Partner shop"));
      next = notify(next, [
        { toRole: "owner", toId: stop.shopId, dealId: pool.id, text: `Collected: ${stop.qty} × ${pool.productName} from ${stop.partnerShopName}. Thank you!` },
        { toRole: "admin", toId: "admin", dealId: pool.id, text: `${stop.shopName} collected their ${pool.productName} from drop point ${stop.partnerShopName}.` },
      ]);
      next = finishDealIfDone(next, pool.id);
      return { db: next, meta };
    }

    // ---------------- drivers ----------------

    case "DRIVER_ACCEPT": {
      const trip = db.trips.find((t) => t.id === action.tripId && t.driverId === action.driverId);
      if (!trip) return fail(db, "Trip not found");
      if (trip.status !== "assigned") return fail(db, "This trip is already accepted.");
      let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? { ...t, status: "accepted" } : t)) };
      next = notify(next, [{ toRole: "admin", toId: "admin", dealId: trip.dealId, tripId: trip.id, text: `${trip.driverName} accepted the trip on ${trip.date} (${trip.stops.length} stop${trip.stops.length === 1 ? "" : "s"}).` }], trip.driverName, "driver");
      return { db: next, meta };
    }

    case "DRIVER_COLLECT": {
      const trip = db.trips.find((t) => t.id === action.tripId && t.driverId === action.driverId);
      if (!trip) return fail(db, "Trip not found");
      if (trip.status !== "accepted") return fail(db, trip.status === "assigned" ? "Accept the trip first." : "Stock already collected.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? { ...t, status: "collected" } : t)) };
      next = replacePool(next, withEvent({ ...pool, status: pool.status === "scheduled" ? "out-for-delivery" : pool.status }, `${trip.driverName} collected ${trip.loadKg} kg at ${trip.pickup.name}.`, trip.driverName));
      next = notify(next, [
        { toRole: "admin", toId: "admin", dealId: trip.dealId, tripId: trip.id, text: `${trip.driverName} collected the stock at ${trip.pickup.name} and is on the way.` },
        ...trip.stops.map((s, i) => ({
          toRole: "owner" as const,
          toId: s.shopId,
          dealId: trip.dealId,
          tripId: trip.id,
          text: `${trip.driverName} has collected your ${pool.productName} and is on the way. You are stop ${i + 1} of ${trip.stops.length}, expected ${s.window}. Have your delivery code ready.`,
        })),
      ], trip.driverName, "driver");
      return { db: next, meta };
    }

    case "DRIVER_DELIVER": {
      const trip = db.trips.find((t) => t.id === action.tripId && t.driverId === action.driverId);
      if (!trip) return fail(db, "Trip not found");
      if (trip.status !== "collected") return fail(db, "Collect the stock at the wholesaler first.");
      const stop = trip.stops.find((s) => s.shopId === action.shopId);
      if (!stop) return fail(db, "That shop isn't on this trip.");
      if (stop.status !== "pending") return fail(db, "This stop is already done.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      const code = action.code.trim();
      const by = pool.deliveryCodes[action.shopId] === code ? "owner" : pool.backupCodes[action.shopId] === code ? "backup" : null;
      if (!by)
        return fail(db, "That code is wrong. Ask the owner (or their backup receiver) to read the code from their MzansiConnect deal page. Don't hand over the stock until the code matches.");
      const backupName = pool.commitments.find((c) => c.shopId === stop.shopId)?.prefs?.backupName;
      let next = stopLeavesVehicle(db, trip.id, stop.shopId, { status: "delivered", deliveredAt: new Date().toISOString(), handedTo: by });
      let p = next.pools.find((x) => x.id === pool.id)!;
      next = replacePool(next, withEvent(p, `${stop.shopName} received ${stop.qty} ${units(pool.unitLabel, stop.qty)} (code checked${by === "backup" ? `, handed to backup receiver ${backupName}` : ""}).`, trip.driverName));
      next = notify(next, [
        { toRole: "owner", toId: stop.shopId, dealId: pool.id, tripId: trip.id, text: `Delivered: ${stop.qty} × ${pool.productName} handed over at ${new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}${by === "backup" ? ` to ${backupName}` : ""}. Thank you for buying together!` },
      ], trip.driverName, "driver");
      next = finishDealIfDone(next, pool.id);
      return { db: next, meta };
    }

    case "DRIVER_MISSED": {
      const trip = db.trips.find((t) => t.id === action.tripId && t.driverId === action.driverId);
      if (!trip) return fail(db, "Trip not found");
      if (trip.status !== "collected") return fail(db, "Collect the stock first.");
      const stop = trip.stops.find((s) => s.shopId === action.shopId);
      if (!stop || stop.status !== "pending") return fail(db, "This stop is already done.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      const prefs = pool.commitments.find((c) => c.shopId === stop.shopId)?.prefs;
      const reason = action.reason.trim() || "Nobody could receive the stock";

      if (action.action === "retry-later") {
        if (prefs?.ifMissed !== "retry-later") return fail(db, "This owner didn't choose 'come back later today'. Follow their choice.");
        if (stop.attempts >= 2) return fail(db, "You've already come back once. Take it back to the wholesaler.");
        const moved = { ...stop, attempts: stop.attempts + 1, missReason: reason };
        let next: SharedDB = { ...db, trips: db.trips.map((t) => (t.id === trip.id ? { ...t, stops: [...t.stops.filter((s) => s.shopId !== stop.shopId), moved] } : t)) };
        next = chargeRedeliveryIfOwed(next, pool, stop, reason);
        next = replacePool(next, withEvent(next.pools.find((x) => x.id === pool.id)!, `${trip.driverName} missed ${stop.shopName} (${reason}) and will come back at the end of the route.`, trip.driverName));
        next = notify(next, [
          { toRole: "owner", toId: stop.shopId, dealId: pool.id, tripId: trip.id, text: `${trip.driverName} came by but couldn't hand over your stock (${reason}). As you asked, they'll come back later today after the other stops. Please be there with your code.` },
          { toRole: "admin", toId: "admin", dealId: pool.id, tripId: trip.id, text: `${trip.driverName} missed ${stop.shopName} (${reason}). Coming back later today, as the owner chose.` },
        ], trip.driverName, "driver");
        return { db: next, meta };
      }

      // return to the wholesaler
      const nextRun = prefs?.ifMissed !== "collect";
      let next = stopLeavesVehicle(db, trip.id, stop.shopId, { status: "returned", returnedAt: new Date().toISOString(), missReason: reason, nextRun });
      next = chargeRedeliveryIfOwed(next, pool, stop, reason);
      next = replacePool(next, withEvent(next.pools.find((x) => x.id === pool.id)!, `${trip.driverName} couldn't deliver to ${stop.shopName} (${reason}); stock goes back to ${trip.pickup.name} today.`, trip.driverName));
      next = notify(next, [
        {
          toRole: "owner",
          toId: stop.shopId,
          dealId: pool.id,
          tripId: trip.id,
          text: nextRun
            ? `${trip.driverName} couldn't hand over your stock (${reason}). It's safe back at ${trip.pickup.name}. MzansiConnect will book a new time and message you.`
            : `${trip.driverName} couldn't hand over your stock (${reason}). As you chose, it's waiting for you at ${trip.pickup.name}, ${trip.pickup.address}. Bring your delivery code.`,
        },
        { toRole: "admin", toId: "admin", dealId: pool.id, tripId: trip.id, text: `Couldn't deliver to ${stop.shopName} (${stop.township}): ${reason}. Stock going back to ${trip.pickup.name}. ${nextRun ? "Rebook a new time on the deal page." : "The owner will collect it there."}` },
      ], trip.driverName, "driver");
      return { db: next, meta };
    }

    case "DRIVER_LEAVE_AT_PARTNER": {
      const trip = db.trips.find((t) => t.id === action.tripId && t.driverId === action.driverId);
      if (!trip) return fail(db, "Trip not found");
      if (trip.status !== "collected") return fail(db, "Collect the stock first.");
      const stop = trip.stops.find((s) => s.shopId === action.shopId);
      if (!stop || stop.status !== "pending") return fail(db, "This stop is already done.");
      const pool = db.pools.find((p) => p.id === trip.dealId)!;
      const prefs = pool.commitments.find((c) => c.shopId === stop.shopId)?.prefs;
      if (prefs?.ifMissed !== "partner" || !prefs.partnerShopId) return fail(db, "This owner didn't choose a partner shop. Follow their choice.");
      const partner = db.shops.find((s) => s.id === prefs.partnerShopId);
      if (!partner?.partner?.active) return fail(db, "That partner shop isn't taking drop-offs right now. Take the stock back to the wholesaler.");
      if (partner.partner.dropCode !== action.code.trim()) return fail(db, `That's not ${partner.name}'s drop code. Ask them for the code on their MzansiConnect "Drop point" page.`);
      if (heldAt(db, partner.id) + stop.qty > partner.partner.capacityUnits) return fail(db, `${partner.name} doesn't have space for ${stop.qty} more units. Take the stock back to the wholesaler.`);
      const reason = action.reason.trim() || "Nobody could receive the stock";
      const fee = stop.qty * PARTNER_FEE_PER_UNIT_CENTS;
      let next = stopLeavesVehicle(db, trip.id, stop.shopId, { status: "at-partner", atPartnerAt: new Date().toISOString(), partnerShopId: partner.id, partnerShopName: partner.name, missReason: reason });
      next = chargeRedeliveryIfOwed(next, pool, stop, reason);
      next = addFee(next, { kind: "drop-point", shopId: stop.shopId, shopName: stop.shopName, dealId: pool.id, amountCents: fee, toShopId: partner.id, toShopName: partner.name, note: `${partner.name} held your ${pool.productName} (${stop.qty} × R5)` });
      next = replacePool(next, withEvent(next.pools.find((x) => x.id === pool.id)!, `${trip.driverName} missed ${stop.shopName} (${reason}) and left the stock at ${partner.name}, as the owner chose (drop code checked).`, trip.driverName));
      next = notify(next, [
        { toRole: "owner", toId: stop.shopId, dealId: pool.id, tripId: trip.id, text: `${trip.driverName} couldn't find you (${reason}), so your ${stop.qty} × ${pool.productName} is at ${partner.name}, as you chose. Collect it within 72 hours — show them your delivery code. Their ${formatCents(fee)} fee is on your Payments page.` },
        { toRole: "owner", toId: partner.id, dealId: pool.id, tripId: trip.id, text: `You're holding ${stop.qty} ${units(pool.unitLabel, stop.qty)} of ${pool.productName} for ${stop.shopName}. Keep it sealed. Hand it over only when they give the right code. You earn ${formatCents(fee)}, paid to your bank by TradeSafe.` },
        { toRole: "admin", toId: "admin", dealId: pool.id, tripId: trip.id, text: `${stop.shopName} missed (${reason}); stock left at drop point ${partner.name}.` },
      ], trip.driverName, "driver");
      return { db: next, meta };
    }

    // ---------------- messages ----------------

    case "SEND_MESSAGES": {
      const msgs = action.messages.filter((m) => m.text.trim());
      if (!msgs.length) return fail(db, "Write a message first.");
      return { db: notify(db, msgs.map((m) => ({ ...m, text: m.text.trim(), dealId: action.dealId, tripId: action.tripId })), action.fromName, action.fromRole), meta: { sent: msgs.length } };
    }

    case "MARK_READ":
      return { db: { ...db, messages: db.messages.map((m) => (m.toRole === action.toRole && m.toId === action.toId ? { ...m, read: true } : m)) }, meta };

    // ---------------- demo helpers ----------------

    case "SIMULATE_JOIN":
    case "SIMULATE_FILL": {
      let next = db;
      let pool = next.pools.find((p) => p.id === action.dealId);
      if (!pool || pool.status !== "open") return fail(db, "This deal isn't open.");
      const joined: string[] = [];
      const candidates = next.shops.filter((s) => s.verificationStatus === "verified" && s.id !== action.excludeShopId).sort(() => Math.random() - 0.5);
      for (const shop of candidates) {
        pool = next.pools.find((p) => p.id === action.dealId)!;
        if (pool.status !== "open") break;
        const left = pool.minQty - totalQtyOf(pool);
        if (left <= 0) break;
        const want = action.type === "SIMULATE_FILL" ? Math.min(left, Math.max(2, Math.ceil(pool.minQty / 6))) : Math.min(left, 2 + Math.floor(Math.random() * 5));
        const r = reduce(next, { type: "JOIN_DEAL", dealId: pool.id, shopId: shop.id, qty: want });
        if (r.meta.error) continue;
        next = r.db;
        joined.push(shop.name);
        if (action.type === "SIMULATE_JOIN") break;
      }
      if (!joined.length) return fail(db, "No more shops could join.");
      meta.joined = joined;
      return { db: next, meta };
    }

    case "SIMULATE_PAY": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool || pool.status !== "target-reached") return fail(db, "This deal isn't waiting for payments.");
      const methods = ["eft", "eft", "card", "cash"] as const;
      let next = db;
      let n = 0;
      for (const m of memberPositions(pool)) {
        if (m.dueCents <= 0 || m.shopId === action.excludeShopId) continue;
        const r = reduce(next, { type: "PAY_DEAL", dealId: pool.id, shopId: m.shopId, method: methods[n % methods.length] });
        if (r.meta.error) continue;
        next = r.db;
        n++;
      }
      if (!n) return fail(db, "Nobody left to pay.");
      meta.paid = n;
      return { db: next, meta };
    }

    case "SIMULATE_DEADLINE": {
      const pool = db.pools.find((p) => p.id === action.dealId);
      if (!pool || pool.status !== "target-reached") return fail(db, "This deal isn't waiting for payments.");
      return { db: replacePool(db, withEvent({ ...pool, paymentDueAt: new Date(Date.now() - 60000).toISOString() }, "Demo: the 48-hour payment window ended.", "Demo")), meta };
    }

    case "RESET_DEMO":
      return { db, meta }; // handled by the API route (needs the seed)

    // ---------------- exchange ----------------

    case "CREATE_LISTING":
      if (!verifiedShop(db, action.listing.shopId)) return fail(db, "Shop is not verified yet");
      return { db: { ...db, listings: [action.listing, ...db.listings] }, meta };

    case "START_THREAD":
      if (!verifiedShop(db, action.thread.shopBId)) return fail(db, "Shop is not verified yet");
      return { db: { ...db, threads: [...db.threads, action.thread] }, meta };

    case "SEND_MESSAGE":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  messages: [
                    ...t.messages,
                    { id: uid("msg"), fromShopId: action.fromShopId, text: action.text, createdAt: new Date().toISOString() },
                  ],
                }
              : t
          ),
        },
        meta,
      };

    case "SEND_OFFER":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  offers: [
                    ...t.offers.map((o) => (o.status === "pending" ? { ...o, status: "declined" as const } : o)),
                    {
                      id: uid("offer"),
                      fromShopId: action.fromShopId,
                      offerGive: action.offerGive,
                      offerReceive: action.offerReceive,
                      cashAdjustment: action.cashAdjustment,
                      giveValue: action.giveValue,
                      receiveValue: action.receiveValue,
                      status: "pending",
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : t
          ),
        },
        meta,
      };

    case "RESPOND_OFFER":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  offers: t.offers.map((o) =>
                    o.id === action.offerId ? { ...o, status: action.accept ? "accepted" : "declined" } : o
                  ),
                }
              : t
          ),
        },
        meta,
      };

    case "CONFIRM_HANDOVER":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) => {
            if (t.id !== action.threadId) return t;
            const confirmedBy = Array.from(new Set([...t.confirmedBy, action.shopId]));
            const both = confirmedBy.includes(t.shopAId) && confirmedBy.includes(t.shopBId);
            return { ...t, confirmedBy, status: both ? "completed" : t.status };
          }),
        },
        meta,
      };

    case "BOOK_COURIER": {
      const thread = db.threads.find((t) => t.id === action.threadId);
      if (!thread) return fail(db, "Conversation not found");
      if (![thread.shopAId, thread.shopBId].includes(action.shopId)) return fail(db, "Only the two shops in this deal can book transport.");
      if (!thread.offers.some((o) => o.status === "accepted")) return fail(db, "Agree on an offer first, then book transport.");
      if (thread.status === "completed") return fail(db, "This exchange is already completed.");
      if (db.courierJobs.some((j) => j.threadId === thread.id && j.status !== "cancelled")) return fail(db, "Transport is already booked for this exchange.");
      if (![thread.shopAId, thread.shopBId].includes(action.fromShopId)) return fail(db, "Choose which shop the goods leave from.");
      if (!COURIER_WINDOWS.includes(action.window)) return fail(db, "Choose a time window.");
      const today = new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.day) || action.day < today) return fail(db, "Choose today or a later day.");
      if (new Date(action.day + "T12:00:00").getDay() === 0) return fail(db, "Drivers don't run on Sundays. Choose Monday to Saturday.");
      const me = verifiedShop(db, action.shopId);
      const themId = action.shopId === thread.shopAId ? thread.shopBId : thread.shopAId;
      const them = verifiedShop(db, themId);
      if (!me || !them) return fail(db, "Both shops must be verified to book a driver.");
      const from = action.fromShopId === me.id ? me : them;
      const to = from.id === me.id ? them : me;
      const km = roadKm(from, to);
      const { feeCents, tooFar } = courierQuote(km, action.twoWay);
      if (tooFar) return fail(db, `The shops are ${km} km apart. Shop-to-shop runs go up to ${COURIER_MAX_KM} km.`);
      if (!action.goodsOut.trim()) return fail(db, "Say what goods the driver collects.");
      const driver = nearestFreeDriver(db.drivers, db.courierJobs, from);
      if (!driver) return fail(db, "No driver is free right now. Try again later.");
      const legs: CourierLeg[] = [{ fromShopId: from.id, fromShopName: from.name, toShopId: to.id, toShopName: to.name, goods: action.goodsOut.trim(), code: code4(), status: "waiting" }];
      if (action.twoWay) {
        let back = code4();
        while (back === legs[0].code) back = code4();
        legs.push({ fromShopId: to.id, fromShopName: to.name, toShopId: from.id, toShopName: from.name, goods: action.goodsBack?.trim() || "Goods in return", code: back, status: "waiting" });
      }
      const job: CourierJob = {
        id: uid("run"),
        ref: `RUN-${Math.floor(10000 + Math.random() * 90000)}`,
        threadId: thread.id,
        bookedByShopId: me.id,
        shopIds: [thread.shopAId, thread.shopBId],
        legs,
        distanceKm: km,
        feeCents,
        payer: action.payer,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        vehicle: driver.vehicle,
        plate: driver.plate,
        status: "awaiting-payment",
        day: action.day,
        window: action.window,
        createdAt: new Date().toISOString(),
      };
      let next: SharedDB = { ...db, courierJobs: [...db.courierJobs, job] };
      const shares = courierShares(feeCents, action.payer, me.id, them.id);
      for (const share of shares) {
        const shop = share.shopId === me.id ? me : them;
        next = addFee(next, { kind: "courier", shopId: shop.id, shopName: shop.name, courierJobId: job.id, amountCents: share.cents, note: `Transport ${from.name} → ${to.name}${action.twoWay ? " and back" : ""} (${job.ref})` });
      }
      next = notify(next, [{
        toRole: "owner",
        toId: them.id,
        text: `${me.name} booked a MzansiConnect driver to move your exchange goods (${from.name} → ${to.name}${action.twoWay ? " and back" : ""}).${shares.some((share) => share.shopId === them.id) ? ` Your share is ${formatCents(shares.find((share) => share.shopId === them.id)!.cents)} — pay it on the Payments page.` : ` ${me.name} is paying the fee.`}`,
      }]);
      meta.jobId = job.id;
      meta.feeCents = feeCents;
      return { db: next, meta };
    }

    case "CANCEL_COURIER": {
      const job = db.courierJobs.find((j) => j.id === action.jobId);
      if (!job) return fail(db, "Booking not found");
      if (!job.shopIds.includes(action.shopId)) return fail(db, "Only the two shops can cancel this run.");
      if (!["awaiting-payment", "assigned", "accepted"].includes(job.status)) return fail(db, job.status === "cancelled" ? "Already cancelled." : "The driver already has the goods, so the run can't be cancelled now.");
      const byName = db.shops.find((s) => s.id === action.shopId)?.name ?? "A shop";
      let payments = db.payments;
      const refunds: { shopId: string; cents: number }[] = [];
      const fees = db.fees.map((fee) => {
        if (fee.courierJobId !== job.id) return fee;
        if (fee.status === "paid") {
          refunds.push({ shopId: fee.shopId, cents: fee.amountCents });
          payments = appendPayment(payments, { shopId: fee.shopId, type: "courier-refund", amountCents: fee.amountCents, courierJobId: job.id, feeId: fee.id, note: `Refund: transport ${job.ref} cancelled` });
        }
        return fee.status === "due" ? { ...fee, status: "cancelled" as const } : fee;
      });
      let next: SharedDB = { ...replaceJob(db, { ...job, status: "cancelled" }), payments, fees };
      next = notify(next, [
        ...job.shopIds.map((id) => {
          const refund = refunds.find((item) => item.shopId === id);
          return { toRole: "owner" as const, toId: id, text: `${byName} cancelled the transport (${job.ref}).${refund ? ` TradeSafe is refunding your ${formatCents(refund.cents)} (usually 1–3 working days).` : ""}` };
        }),
        ...(job.status !== "awaiting-payment" ? [{ toRole: "driver" as const, toId: job.driverId, text: `The shop-to-shop run ${job.ref} was cancelled by ${byName}. You don't need to go.` }] : []),
      ]);
      meta.refunds = refunds.length;
      return { db: next, meta };
    }

    case "COURIER_ACCEPT": {
      const job = db.courierJobs.find((j) => j.id === action.jobId && j.driverId === action.driverId);
      if (!job) return fail(db, "Run not found");
      if (job.status !== "assigned") return fail(db, job.status === "awaiting-payment" ? "Wait until the shops have paid the fee." : "This run is already accepted.");
      const next = replaceJob(db, { ...job, status: "accepted" });
      return { db: notify(next, job.shopIds.map((id) => ({ toRole: "owner" as const, toId: id, text: `${job.driverName} accepted your transport run (${job.ref}) for ${job.window}.` })), job.driverName, "driver"), meta };
    }

    case "COURIER_COLLECT": {
      const job = db.courierJobs.find((j) => j.id === action.jobId && j.driverId === action.driverId);
      if (!job) return fail(db, "Run not found");
      if (!["accepted", "on-the-way"].includes(job.status)) return fail(db, job.status === "assigned" ? "Accept the run first." : "This run can't be collected now.");
      const leg = job.legs[action.leg];
      if (!leg) return fail(db, "Leg not found");
      if (leg.status !== "waiting") return fail(db, "Already collected.");
      if (action.leg > 0 && job.legs[action.leg - 1].status !== "delivered") return fail(db, "Deliver the first load before collecting the return load.");
      const legs = job.legs.map((item, index) => index === action.leg ? { ...item, status: "collected" as const, collectedAt: new Date().toISOString() } : item);
      const next = replaceJob(db, { ...job, legs, status: "on-the-way" });
      return { db: notify(next, [{ toRole: "owner", toId: leg.toShopId, text: `${job.driverName} collected ${leg.goods} at ${leg.fromShopName} and is on the way to you. Have your 4-digit code ready.` }], job.driverName, "driver"), meta };
    }

    case "COURIER_DELIVER": {
      const job = db.courierJobs.find((j) => j.id === action.jobId && j.driverId === action.driverId);
      if (!job) return fail(db, "Run not found");
      const leg = job.legs[action.leg];
      if (!leg) return fail(db, "Leg not found");
      if (leg.status !== "collected") return fail(db, leg.status === "waiting" ? "Collect the goods first." : "Already delivered.");
      if (action.code.trim() !== leg.code) return fail(db, `That code is wrong. Ask ${leg.toShopName} to read the code from their Willing buyer & seller chat. Don't hand over the goods until it matches.`);
      const now = new Date().toISOString();
      const legs = job.legs.map((item, index) => index === action.leg ? { ...item, status: "delivered" as const, deliveredAt: now } : item);
      const done = legs.every((item) => item.status === "delivered");
      let next = replaceJob(db, { ...job, legs, status: done ? "delivered" : "on-the-way", deliveredAt: done ? now : undefined, driverPaid: done || undefined });
      next = {
        ...next,
        threads: next.threads.map((thread) => {
          if (thread.id !== job.threadId) return thread;
          const confirmedBy = Array.from(new Set([...thread.confirmedBy, leg.toShopId]));
          const both = confirmedBy.includes(thread.shopAId) && confirmedBy.includes(thread.shopBId);
          return { ...thread, confirmedBy, status: both ? "completed" as const : thread.status };
        }),
      };
      if (done) next = { ...next, payments: appendPayment(next.payments, { shopId: "", driverId: job.driverId, type: "courier-payout", amountCents: job.feeCents, courierJobId: job.id, note: `${job.driverName}: shop-to-shop run ${job.ref}` }) };
      next = notify(next, [
        { toRole: "owner", toId: leg.toShopId, text: `Delivered: ${leg.goods} from ${leg.fromShopName} handed over (code checked).` },
        { toRole: "owner", toId: leg.fromShopId, text: `${leg.toShopName} received ${leg.goods}.` },
        ...(done ? [{ toRole: "driver" as const, toId: job.driverId, text: `Run ${job.ref} done. TradeSafe is paying you ${formatCents(job.feeCents)}.` }] : []),
      ], job.driverName, "driver");
      meta.done = done;
      return { db: next, meta };
    }

    // ---------------- training & compliance ----------------

    case "REGISTER_TRAINING":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId && !s.attendees.some((a) => a.shopId === action.shopId)
              ? {
                  ...s,
                  attendees: [
                    ...s.attendees,
                    { shopId: action.shopId, shopName: action.shopName, registeredAt: new Date().toISOString(), attended: false },
                  ],
                }
              : s
          ),
        },
        meta,
      };

    case "CANCEL_TRAINING_REGISTRATION":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId ? { ...s, attendees: s.attendees.filter((a) => a.shopId !== action.shopId) } : s
          ),
        },
        meta,
      };

    case "MARK_ATTENDANCE":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId
              ? { ...s, attendees: s.attendees.map((a) => (a.shopId === action.shopId ? { ...a, attended: action.attended } : a)) }
              : s
          ),
        },
        meta,
      };

    case "CREATE_TRAINING_SESSION":
      return { db: { ...db, trainingSessions: [...db.trainingSessions, action.session] }, meta };

    case "SUBMIT_VERIFICATION_DOCS": {
      const request = {
        id: uid("vr"),
        shopId: action.shopId,
        shopName: action.shopName,
        method: "document" as const,
        documents: action.documents,
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
      };
      meta.requestId = request.id;
      return {
        db: {
          ...db,
          verificationRequests: [request, ...db.verificationRequests],
          shops: db.shops.map((s) =>
            s.id === action.shopId ? { ...s, verificationStatus: "pending", verificationMethod: "document" } : s
          ),
        },
        meta,
      };
    }

    case "DECIDE_VERIFICATION": {
      const request = db.verificationRequests.find((r) => r.id === action.requestId);
      if (!request) return fail(db, "Request not found");
      const approved = action.decision === "approved";
      return {
        db: {
          ...db,
          verificationRequests: db.verificationRequests.map((r) =>
            r.id === action.requestId
              ? { ...r, status: action.decision, note: action.note, decidedBy: action.decidedBy, decidedAt: new Date().toISOString() }
              : r
          ),
          shops: db.shops.map((s) =>
            s.id === request.shopId
              ? {
                  ...s,
                  verificationStatus: approved ? "verified" : "rejected",
                  verified: approved,
                  verifiedAt: approved ? new Date().toISOString() : s.verifiedAt,
                }
              : s
          ),
        },
        meta,
      };
    }

    case "COMPLETE_COURSE": {
      const passed = action.score >= action.passMark;
      meta.passed = passed;
      if (!passed) return { db, meta };
      const certificate = {
        id: uid("cert"),
        shopId: action.shopId,
        shopName: action.shopName,
        courseId: action.courseId,
        courseTitle: action.courseTitle,
        score: action.score,
        certificateNumber: `KE-CC-${Math.floor(100000 + Math.random() * 899999)}`,
        issuedAt: new Date().toISOString(),
        issuedWith: action.issuedWith,
      };
      meta.certificateId = certificate.id;
      return {
        db: {
          ...db,
          certificates: [certificate, ...db.certificates],
          shops: db.shops.map((s) =>
            s.id === action.shopId
              ? { ...s, verificationStatus: "verified", verified: true, verificationMethod: "course", verifiedAt: new Date().toISOString() }
              : s
          ),
        },
        meta,
      };
    }

    // ---------------- funding marketplace ----------------

    case "SET_FUNDING_INTEREST": {
      const rest = db.fundingInterests.filter(
        (i) => !(i.shopId === action.shopId && i.opportunityId === action.opportunityId)
      );
      return {
        db: {
          ...db,
          fundingInterests: action.status
            ? [...rest, { shopId: action.shopId, opportunityId: action.opportunityId, status: action.status, updatedAt: new Date().toISOString() }]
            : rest,
        },
        meta,
      };
    }

    case "SAVE_FUNDING_PROFILE":
      return {
        db: {
          ...db,
          fundingProfiles: [...db.fundingProfiles.filter((p) => p.shopId !== action.profile.shopId), action.profile],
        },
        meta,
      };

    case "POST_FUNDING":
      return { db: { ...db, funding: [action.opportunity, ...db.funding] }, meta };

    default:
      return { db, meta };
  }
}
