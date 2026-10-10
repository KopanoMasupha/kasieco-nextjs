import { Pool, PoolCommitment, PotLedgerEntry } from "./types";
import { uid } from "./id";
import { formatCents } from "./currency";

export interface PotShare {
  shopId: string;
  goodsCents: number;
  deliveryCents: number;
  feeCents: number;
  totalCents: number;
}

export interface PotQuote {
  unitPriceCents: number;
  shares: PotShare[];
  paymentCents: number;
}

export function cents(amount: number): number {
  return Math.round(amount * 100);
}

export function rand(amountCents: number): string {
  return formatCents(amountCents);
}

export function totalPoolQty(pool: Pool): number {
  return pool.commitments.reduce((sum, member) => sum + member.qty, 0);
}

export function priceForQty(pool: Pool, qty: number): number {
  const tiers = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);
  const eligible = tiers.filter((item) => item.minQty <= qty);
  const tier = eligible[eligible.length - 1];
  if (!tier) throw new Error(`Pool ${pool.id} has no price tier for ${qty} units`);
  return cents(tier.price);
}

function splitDelivery(pool: Pool, members: PoolCommitment[]): number[] {
  const delivery = pool.deliveryCents ?? 0;
  const qty = members.reduce((sum, member) => sum + member.qty, 0);
  if (qty === 0) return members.map(() => 0);

  const shares = members.map((member) => (delivery * member.qty) / qty);
  const result = shares.map(Math.floor);
  let remainder = delivery - result.reduce((sum, share) => sum + share, 0);
  const order = shares
    .map((share, index) => ({ index, fraction: share - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (remainder-- <= 0) break;
    result[item.index] += 1;
  }
  return result;
}

export function quoteForMembers(pool: Pool, members: PoolCommitment[]): PotShare[] {
  const unitPrice = priceForQty(
    pool,
    members.reduce((sum, member) => sum + member.qty, 0)
  );
  const deliveryShares = splitDelivery(pool, members);
  return members.map((member, index) => {
    const goodsCents = member.qty * unitPrice;
    const feeCents = Math.round(goodsCents * 0.02);
    const deliveryCents = deliveryShares[index];
    return {
      shopId: member.shopId,
      goodsCents,
      deliveryCents,
      feeCents,
      totalCents: goodsCents + deliveryCents + feeCents,
    };
  });
}

export function quoteJoin(pool: Pool, member: PoolCommitment): PotQuote {
  const shares = quoteForMembers(pool, [...pool.commitments, member]);
  const share = shares.find((item) => item.shopId === member.shopId);
  if (!share) throw new Error(`Could not calculate quote for shop ${member.shopId}`);
  return {
    unitPriceCents: priceForQty(pool, totalPoolQty(pool) + member.qty),
    shares,
    paymentCents: share.totalCents,
  };
}

export function ledgerEntry(
  pool: Pool,
  entry: Omit<PotLedgerEntry, "balanceCents" | "createdAt">,
  createdAt = new Date().toISOString()
): PotLedgerEntry {
  const balanceCents = (pool.balanceCents ?? 0) + entry.amountCents;
  if (balanceCents < 0) throw new Error(`Pot ${pool.id} would have a negative balance`);
  return { ...entry, balanceCents, createdAt };
}

export function seedPoolLedger(pool: Pool): Pool {
  if (pool.ledger) return pool;
  let initialized: Pool = {
    ...pool,
    commitments: [],
    ledger: [],
    balanceCents: 0,
    deliveryCents: pool.deliveryCents ?? 45000,
    ownerShopId: pool.ownerShopId ?? null,
  };
  const paidMembers = pool.commitments.filter((member) => member.paid);
  for (const [index, legacyMember] of paidMembers.entries()) {
    const member = { ...legacyMember, paidCents: 0 };
    const quote = quoteJoin(initialized, member);
    member.paidCents = quote.paymentCents;
    const entry = ledgerEntry(initialized, {
      id: uid("entry"),
      type: "contribution",
      shopId: member.shopId,
      amountCents: quote.paymentCents,
      reference: `KE-SEED-${pool.id}-${index + 1}`.toUpperCase(),
      method: "wallet",
    }, member.joinedAt);
    initialized = {
      ...initialized,
      commitments: [...initialized.commitments, member],
      ledger: [...initialized.ledger!, entry],
      balanceCents: entry.balanceCents,
      ownerShopId: initialized.ownerShopId ?? member.shopId,
    };
  }
  return initialized;
}

export function auditPot(pool: Pool): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let balance = 0;
  for (const entry of pool.ledger ?? []) {
    balance += entry.amountCents;
    if (balance < 0) errors.push(`Ledger balance fell below zero at ${entry.reference}`);
    if (balance !== entry.balanceCents) {
      errors.push(`Recorded balance does not match at ${entry.reference}`);
    }
  }
  if (balance !== (pool.balanceCents ?? balance)) {
    errors.push("Ledger balance does not match the pot balance");
  }
  const contributions = (pool.ledger ?? [])
    .filter((entry) => entry.type === "contribution")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const outflows = (pool.ledger ?? [])
    .filter((entry) => entry.type !== "contribution")
    .reduce((sum, entry) => sum - entry.amountCents, 0);
  if (contributions - outflows !== balance) {
    errors.push("Money in minus money out does not equal the pot balance");
  }
  const shares = quoteForMembers(pool, pool.commitments);
  const owed = shares.reduce((sum, share) => sum + share.totalCents, 0);
  const credits = shares.reduce((sum, share) => {
    const member = pool.commitments.find((item) => item.shopId === share.shopId);
    return sum + Math.max(0, (member?.paidCents ?? 0) - share.totalCents);
  }, 0);
  if (pool.status === "open" && owed + credits !== balance) {
    errors.push("Owed shares plus credits do not equal the pot balance");
  }
  for (const member of pool.commitments) {
    const paid = member.paidCents ?? 0;
    const share = quoteForMembers(pool, pool.commitments).find(
      (item) => item.shopId === member.shopId
    );
    if (share && paid < share.totalCents && pool.status === "open") {
      errors.push(`${member.shopName} owes more than they paid`);
    }
  }
  if (pool.status !== "open" && pool.status !== "delivering" && balance !== 0) {
    errors.push("A settled pot must have a zero balance");
  }
  return { valid: errors.length === 0, errors };
}
