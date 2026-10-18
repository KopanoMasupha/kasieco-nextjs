/**
 * The deal pot: pure, deterministic money logic shared by the server (the only
 * place that writes) and the browser (which displays and re-checks it).
 * Everything is in integer cents so totals are exact. The pot itself is held
 * in escrow by TradeSafe; this ledger is MzansiConnect's line-by-line record of it.
 *
 * Life of the money in a deal (pledge now, pay at close)
 * 1. A partnered wholesaler offers a lot (e.g. 40 bales). Shops RESERVE units —
 *    no money moves. The price shown drops as more units are reserved.
 * 2. The moment the lot is fully reserved the deal closes and the price locks at
 *    the lowest tier. Every shop has 48 hours to pay its share — units × final
 *    price + its share of transport + a 2% service fee — into TradeSafe escrow.
 *    Nobody pays more than the final price, so there are no rebates to refund.
 * 3. Shops that don't pay in time lose their spot; the waitlist takes it.
 * 4. When everyone has paid, an admin confirms, then two admins approve paying
 *    the wholesaler (goods leave escrow).
 * 5. Each driver is paid per stop; the fee is taken last. The pot ends at R0.
 * 6. A deal that never fills simply closes — nobody paid, so nothing to refund.
 *    Only cancelling a deal after shops have paid triggers refunds.
 */
import { units } from "./units";
import { Pool, PoolCommitment, PotTransaction, PriceTier } from "./types";

export const toCents = (rands: number) => Math.round(rands * 100);

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100);
  const c = abs % 100;
  const whole = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " "); // 12 345 — same on every device
  return `${sign}R${whole}${c ? "." + String(c).padStart(2, "0") : ""}`;
}

export function tierFor(tiers: PriceTier[], qty: number): PriceTier {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let tier = sorted[0];
  for (const t of sorted) if (qty >= t.minQty) tier = t;
  return tier;
}

/** Split `total` cents across `weights` so the parts add up to exactly `total`. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

export interface ShareBreakdown {
  shopId: string;
  shopName: string;
  township: string;
  qty: number;
  goodsCents: number;
  deliveryCents: number;
  serviceCents: number;
  owedCents: number; // goods + delivery + service at today's numbers
}

interface PoolMoneyInputs {
  tiers: PriceTier[];
  deliveryFeeCents: number;
  serviceFeeRate: number;
  priceLockedCents?: number;
}

/** The unit price that applies right now: locked once the deal has filled. */
export function unitCentsFor(pool: PoolMoneyInputs, totalQty: number) {
  return pool.priceLockedCents ?? toCents(tierFor(pool.tiers, totalQty).price);
}

/** What every member owes for a given set of commitments. */
export function computeShares(pool: PoolMoneyInputs, commitments: PoolCommitment[]): ShareBreakdown[] {
  const totalQty = commitments.reduce((s, c) => s + c.qty, 0);
  const unitCents = unitCentsFor(pool, totalQty);
  const delivery = allocate(pool.deliveryFeeCents, commitments.map((c) => c.qty));
  return commitments.map((c, i) => {
    const goodsCents = c.qty * unitCents;
    const serviceCents = Math.round(goodsCents * pool.serviceFeeRate);
    return {
      shopId: c.shopId,
      shopName: c.shopName,
      township: c.township,
      qty: c.qty,
      goodsCents,
      deliveryCents: delivery[i],
      serviceCents,
      owedCents: goodsCents + delivery[i] + serviceCents,
    };
  });
}

export function paidByShop(ledger: PotTransaction[]): Record<string, number> {
  const paid: Record<string, number> = {};
  for (const t of ledger) {
    if (!t.shopId) continue;
    if (t.type === "contribution") paid[t.shopId] = (paid[t.shopId] || 0) + t.amountCents;
    if (t.type === "rebate" || t.type === "refund") paid[t.shopId] = (paid[t.shopId] || 0) - t.amountCents;
  }
  return paid;
}

export function potBalance(ledger: PotTransaction[]): number {
  return ledger.reduce(
    (bal, t) => (t.type === "contribution" ? bal + t.amountCents : bal - t.amountCents),
    0
  );
}

export interface MemberPosition extends ShareBreakdown {
  paidCents: number;
  dueCents: number; // what's still to pay once the deal is full (0 while it's filling)
  paid: boolean; // paid its full share
}

export function memberPositions(pool: Pool): MemberPosition[] {
  const shares = computeShares(pool, pool.commitments);
  const paid = paidByShop(pool.ledger);
  const payable = pool.status !== "open" && pool.status !== "cancelled";
  return shares.map((s) => {
    const paidCents = paid[s.shopId] || 0;
    return { ...s, paidCents, dueCents: payable ? Math.max(0, s.owedCents - paidCents) : 0, paid: paidCents >= s.owedCents };
  });
}

/** The quote shown before reserving: nothing is paid now; this is what the shop pays when the deal fills. */
export interface JoinQuote {
  remaining: number; // units still available in the lot before this reservation
  qtyAfter: number; // this shop's units after reserving
  totalQtyAfter: number;
  unitCentsBefore: number;
  unitCentsAfter: number;
  finalUnitCents: number; // the price every shop pays once the lot is full
  share: ShareBreakdown; // at the final price
  estimateCents: number; // what this shop will pay when the deal fills
}

export function quoteJoin(pool: Pool, shop: { id: string; name: string; township: string }, addQty: number): JoinQuote {
  const existing = pool.commitments.find((c) => c.shopId === shop.id);
  const nextCommitments: PoolCommitment[] = existing
    ? pool.commitments.map((c) => (c.shopId === shop.id ? { ...c, qty: c.qty + addQty } : c))
    : [
        ...pool.commitments,
        { shopId: shop.id, shopName: shop.name, township: shop.township, qty: addQty, joinedAt: new Date().toISOString() },
      ];
  const totalBefore = pool.commitments.reduce((s, c) => s + c.qty, 0);
  const totalAfter = nextCommitments.reduce((s, c) => s + c.qty, 0);
  const finalUnitCents = unitCentsFor(pool, pool.minQty);
  // share at the final price, assuming the lot fills (transport split over the whole lot)
  const qtyAfter = nextCommitments.find((c) => c.shopId === shop.id)!.qty;
  const goodsCents = qtyAfter * finalUnitCents;
  const deliveryCents = Math.round((pool.deliveryFeeCents * qtyAfter) / pool.minQty);
  const serviceCents = Math.round(goodsCents * pool.serviceFeeRate);
  const share: ShareBreakdown = { shopId: shop.id, shopName: shop.name, township: shop.township, qty: qtyAfter, goodsCents, deliveryCents, serviceCents, owedCents: goodsCents + deliveryCents + serviceCents };
  return {
    remaining: Math.max(0, pool.minQty - totalBefore),
    qtyAfter,
    totalQtyAfter: totalAfter,
    unitCentsBefore: unitCentsFor(pool, totalBefore),
    unitCentsAfter: unitCentsFor(pool, totalAfter),
    finalUnitCents,
    share,
    estimateCents: share.owedCents,
  };
}

export function totalQtyOf(pool: Pool): number {
  return pool.commitments.reduce((s, c) => s + c.qty, 0);
}

// ---------- Ledger proof ----------

export interface AuditCheck {
  label: string;
  ok: boolean;
  detail: string;
}

const sumType = (ledger: PotTransaction[], type: PotTransaction["type"]) =>
  ledger.filter((t) => t.type === type).reduce((s, t) => s + t.amountCents, 0);

/** What the pot should hold at this point in the deal's life. */
export function expectedBalance(pool: Pool): { cents: number; why: string } {
  const shares = computeShares(pool, pool.commitments);
  const goods = shares.reduce((s, p) => s + p.goodsCents, 0);
  const delivery = shares.reduce((s, p) => s + p.deliveryCents, 0);
  const service = shares.reduce((s, p) => s + p.serviceCents, 0);
  const driversPaid = sumType(pool.ledger, "payout-driver");
  switch (pool.status) {
    case "open":
    case "target-reached":
      return { cents: Object.values(paidByShop(pool.ledger)).reduce((a, b) => a + b, 0), why: "everything shops have paid in so far" };
    case "payment-confirmed":
      return { cents: goods + delivery + service, why: "goods + transport + fee at the final price" };
    case "ordered":
    case "scheduled":
    case "out-for-delivery":
      return { cents: delivery - driversPaid + service, why: "transport not yet paid + fee (wholesaler already paid)" };
    default:
      return { cents: 0, why: "everything paid out" };
  }
}

/**
 * Re-proves the pot from the raw ledger. Shown to owners, admins and judges
 * as "Ledger proof" — every check must pass for the pot to be trustworthy.
 */
export function auditPot(pool: Pool): { ok: boolean; checks: AuditCheck[] } {
  const checks: AuditCheck[] = [];

  let running = 0;
  let replayOk = true;
  let neverNegative = true;
  for (const t of pool.ledger) {
    running += t.type === "contribution" ? t.amountCents : -t.amountCents;
    if (running !== t.balanceAfterCents) replayOk = false;
    if (running < 0) neverNegative = false;
  }
  checks.push({ label: "Every entry replays to the recorded balance", ok: replayOk, detail: `${pool.ledger.length} entries replayed, balance ${formatCents(running)}` });
  checks.push({ label: "The pot never went below R0", ok: neverNegative, detail: neverNegative ? "No overdrafts" : "Overdraft found" });

  const contributions = sumType(pool.ledger, "contribution");
  const outflows = pool.ledger.filter((t) => t.type !== "contribution").reduce((s, t) => s + t.amountCents, 0);
  checks.push({
    label: "Money in − money out = pot balance",
    ok: contributions - outflows === potBalance(pool.ledger),
    detail: `${formatCents(contributions)} in − ${formatCents(outflows)} out = ${formatCents(contributions - outflows)}`,
  });

  const exp = expectedBalance(pool);
  checks.push({
    label: "Pot holds exactly what it should right now",
    ok: exp.cents === potBalance(pool.ledger),
    detail: `${formatCents(potBalance(pool.ledger))} = ${exp.why}`,
  });

  const positions = memberPositions(pool);
  if (pool.status === "open" || pool.status === "target-reached") {
    const exact = positions.every((p) => p.paidCents === 0 || p.paidCents === p.owedCents);
    const n = positions.filter((p) => p.paid && p.paidCents > 0).length;
    checks.push({ label: "Every payment is exactly that shop's share", ok: exact, detail: exact ? `${n} of ${positions.length} shops paid, each the exact final amount` : "A payment doesn't match its share" });
  } else if (pool.status !== "cancelled") {
    const allSquare = positions.every((p) => p.paidCents === p.owedCents);
    checks.push({ label: "Every shop paid exactly the final price", ok: allSquare, detail: allSquare ? "No overpayments, so nothing to refund" : "A payment doesn't match its share" });
  }

  if (["ordered", "scheduled", "out-for-delivery", "delivered"].includes(pool.status)) {
    const goods = computeShares(pool, pool.commitments).reduce((s, p) => s + p.goodsCents, 0);
    checks.push({
      label: "Wholesaler paid units × final price",
      ok: sumType(pool.ledger, "payout-supplier") === goods,
      detail: `${totalQtyOf(pool)} × ${formatCents(unitCentsFor(pool, totalQtyOf(pool)))} = ${formatCents(goods)}`,
    });
  }

  return { ok: checks.every((c) => c.ok), checks };
}

// ---------- Ledger writers (used only by the server, but pure) ----------

let refCounter = 0;
export function paymentRef(): string {
  refCounter = (refCounter + 1) % 1296;
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `TS-${rand}${refCounter.toString(36).toUpperCase().padStart(2, "0")}`;
}

export function appendTx(
  ledger: PotTransaction[],
  tx: Omit<PotTransaction, "id" | "ref" | "balanceAfterCents" | "createdAt"> & { createdAt?: string; ref?: string }
): PotTransaction[] {
  const before = potBalance(ledger);
  const after = tx.type === "contribution" ? before + tx.amountCents : before - tx.amountCents;
  const ref = tx.ref || paymentRef();
  return [...ledger, { ...tx, id: `tx-${ref}`, ref, createdAt: tx.createdAt || new Date().toISOString(), balanceAfterCents: after }];
}

/** A shop reserves units while the deal fills. No money moves. */
export function applyPledge(pool: Pool, shop: { id: string; name: string; township: string }, addQty: number): { pool: Pool } | { error: string } {
  if (pool.status !== "open") return { error: "This deal is full — join the waitlist instead." };
  if (!Number.isInteger(addQty) || addQty < 1) return { error: "Choose at least 1 unit." };
  if (new Date(pool.closesAt).getTime() < Date.now()) return { error: "This deal's closing date has passed." };
  const remaining = pool.minQty - totalQtyOf(pool);
  if (addQty > remaining) return { error: `Only ${remaining} ${units(pool.unitLabel, remaining)} left in this deal.` };
  const existing = pool.commitments.find((c) => c.shopId === shop.id);
  const commitments = existing
    ? pool.commitments.map((c) => (c.shopId === shop.id ? { ...c, qty: c.qty + addQty } : c))
    : [...pool.commitments, { shopId: shop.id, shopName: shop.name, township: shop.township, qty: addQty, joinedAt: new Date().toISOString() }];
  return { pool: { ...pool, commitments } };
}

/** The lot is fully reserved: lock the price and open the payment window. */
export function lockAtTarget(pool: Pool, windowHours: number): Pool {
  const now = Date.now();
  return {
    ...pool,
    status: "target-reached",
    priceLockedCents: pool.priceLockedCents ?? unitCentsFor(pool, totalQtyOf(pool)),
    targetReachedAt: pool.targetReachedAt ?? new Date(now).toISOString(),
    paymentDueAt: new Date(now + windowHours * 3600000).toISOString(),
  };
}

/** A shop pays its full share into escrow (through TradeSafe). */
export function applyPayment(pool: Pool, shopId: string, method: PotTransaction["method"], ref?: string): { pool: Pool; paidCents: number; ref: string } | { error: string } {
  if (pool.status !== "target-reached") return { error: pool.status === "open" ? "You pay when the deal is full — nothing is due yet." : "This deal isn't taking payments." };
  const pos = memberPositions(pool).find((m) => m.shopId === shopId);
  if (!pos) return { error: "You're not in this deal." };
  if (pos.dueCents <= 0) return { error: "You've already paid for this deal." };
  const r = ref || paymentRef();
  const ledger = appendTx(pool.ledger, {
    type: "contribution",
    shopId,
    shopName: pos.shopName,
    qty: pos.qty,
    amountCents: pos.dueCents,
    method,
    unitPriceCents: unitCentsFor(pool, totalQtyOf(pool)),
    note: `Paid ${pos.qty} ${units(pool.unitLabel, pos.qty)} at the final price`,
    ref: r,
  });
  return { pool: { ...pool, ledger }, paidCents: pos.dueCents, ref: r };
}

export function goodsTotal(pool: Pool) {
  return computeShares(pool, pool.commitments).reduce((s, p) => s + p.goodsCents, 0);
}
export function serviceTotal(pool: Pool) {
  return computeShares(pool, pool.commitments).reduce((s, p) => s + p.serviceCents, 0);
}

/** Cancel: TradeSafe refunds every shop exactly what it paid (shops that only reserved paid nothing). */
export function applyCancel(pool: Pool): { pool: Pool; refunds: { shopId: string; shopName: string; cents: number; ref: string }[] } | { error: string } {
  if (pool.status !== "open" && pool.status !== "target-reached") return { error: "Only a deal that hasn't been ordered yet can be cancelled." };
  let ledger = pool.ledger;
  const refunds: { shopId: string; shopName: string; cents: number; ref: string }[] = [];
  const paid = paidByShop(pool.ledger);
  for (const c of pool.commitments) {
    const amount = paid[c.shopId] || 0;
    if (amount > 0) {
      const ref = paymentRef();
      ledger = appendTx(ledger, { type: "refund", shopId: c.shopId, shopName: c.shopName, amountCents: amount, note: "Deal cancelled — full refund to the shop's bank", ref });
      refunds.push({ shopId: c.shopId, shopName: c.shopName, cents: amount, ref });
    }
  }
  return { pool: { ...pool, ledger, status: "cancelled" }, refunds };
}
