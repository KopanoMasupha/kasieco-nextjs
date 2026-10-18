/**
 * Payments through TradeSafe, our escrow partner. There is no wallet:
 * shops reserve units for free while a deal fills, then pay their share at the
 * final price straight into TradeSafe escrow. MzansiConnect never holds shops'
 * money — it only records what TradeSafe did, and only ever receives its fee.
 */
import { Fee, PaymentTx, Pool } from "./types";
import { formatCents, memberPositions, paymentRef } from "./pot";

export function appendPayment(txs: PaymentTx[], tx: Omit<PaymentTx, "id" | "createdAt" | "ref"> & { ref?: string; createdAt?: string }): PaymentTx[] {
  const ref = tx.ref || paymentRef();
  return [...txs, { ...tx, ref, id: `pay-${ref}-${tx.type}`, createdAt: tx.createdAt || new Date().toISOString() }];
}

export const paymentsFor = (txs: PaymentTx[], shopId: string) => txs.filter((t) => t.shopId === shopId).slice().reverse();

export const PAYMENT_TX_LABEL: Record<PaymentTx["type"], string> = {
  "deal-payment": "Paid into escrow",
  "fee-payment": "Fee paid",
  refund: "Refunded to your bank",
  "fee-payout": "Drop-point earnings paid to your bank",
};

export const isMoneyIn = (t: PaymentTx) => t.type === "refund" || t.type === "fee-payout"; // money coming back to the shop

/** Deals that are full and waiting for this shop's payment. */
export function dealsToPay(pools: Pool[], shopId: string) {
  return pools
    .filter((p) => p.status === "target-reached")
    .map((p) => ({ pool: p, pos: memberPositions(p).find((m) => m.shopId === shopId) }))
    .filter((x): x is { pool: Pool; pos: NonNullable<typeof x.pos> } => !!x.pos && x.pos.dueCents > 0);
}

export const feesDue = (fees: Fee[], shopId: string) => fees.filter((f) => f.shopId === shopId && f.status === "due");

/** Everything this shop must pay right now: deal shares + fees. */
export function amountDue(pools: Pool[], fees: Fee[], shopId: string) {
  return dealsToPay(pools, shopId).reduce((s, x) => s + x.pos.dueCents, 0) + feesDue(fees, shopId).reduce((s, f) => s + f.amountCents, 0);
}

/** Money this shop has in escrow right now (paid, not yet released to the wholesaler and drivers). */
export function heldInEscrow(pools: Pool[], shopId: string) {
  return pools
    .filter((p) => ["open", "target-reached", "payment-confirmed"].includes(p.status))
    .reduce((s, p) => s + (memberPositions(p).find((m) => m.shopId === shopId)?.paidCents ?? 0), 0);
}

export const earnedAsDropPoint = (txs: PaymentTx[], shopId: string) => txs.filter((t) => t.shopId === shopId && t.type === "fee-payout").reduce((s, t) => s + t.amountCents, 0);

export function hoursLeft(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 3600000);
}

export function dueText(iso?: string) {
  const h = hoursLeft(iso);
  if (h === null) return "";
  if (h <= 0) return "payment time is up";
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left to pay` : `${h}h left to pay`;
}

export const describe = (t: PaymentTx) => `${isMoneyIn(t) ? "+" : "−"}${formatCents(t.amountCents)}`;
