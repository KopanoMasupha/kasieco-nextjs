/**
 * Platform-wide money check for admins, matched against TradeSafe's records:
 * every rand shops paid in must be either still in escrow (a deal's pot) or
 * released — to a wholesaler, a driver, a drop point, back to the shop as a
 * refund, or MzansiConnect's own service fee. MzansiConnect never holds the rest.
 */
import { Fee, PaymentTx, Pool } from "./types";
import { potBalance } from "./pot";

export interface Reconciliation {
  collected: number; // everything shops paid into TradeSafe
  inEscrow: number; // still held against deals or shop-to-shop transport
  toWholesalers: number;
  toDrivers: number;
  fees: number; // MzansiConnect's service fee — the only money we receive
  refunded: number;
  courierRefunds: number;
  toDropPoints: number;
  courierDriverPayouts: number;
  redeliveryFees: number; // re-delivery fees cover the extra trip
  released: number;
  potsMatch: boolean; // each pot's payments and refunds match TradeSafe's record line for line
  ok: boolean;
}

export function reconcile(payments: PaymentTx[], pools: Pool[], fees: Fee[]): Reconciliation {
  const sum = (f: (t: PaymentTx) => boolean) => payments.filter(f).reduce((s, t) => s + t.amountCents, 0);
  const collected = sum((t) => t.type === "deal-payment" || t.type === "fee-payment");
  const refunded = sum((t) => t.type === "refund");
  const courierRefunds = sum((t) => t.type === "courier-refund");
  const toDropPoints = sum((t) => t.type === "fee-payout");
  const courierDriverPayouts = sum((t) => t.type === "courier-payout");
  const courierHeld = sum((t) => t.type === "fee-payment" && fees.find((f) => f.id === t.feeId)?.kind === "courier") - courierRefunds - courierDriverPayouts;
  const redeliveryFees = sum((t) => t.type === "fee-payment" && fees.find((f) => f.id === t.feeId)?.kind === "redelivery");
  const out = (type: string) => pools.reduce((s, p) => s + p.ledger.filter((t) => t.type === type).reduce((a, t) => a + t.amountCents, 0), 0);
  const inEscrow = pools.reduce((s, p) => s + potBalance(p.ledger), 0) + courierHeld;
  const toWholesalers = out("payout-supplier");
  const toDrivers = out("payout-driver") + courierDriverPayouts;
  const platform = out("payout-platform");
  const released = toWholesalers + toDrivers + platform + refunded + courierRefunds + toDropPoints + redeliveryFees;
  const potsMatch = out("contribution") === sum((t) => t.type === "deal-payment") && out("refund") === refunded;
  return { collected, inEscrow, toWholesalers, toDrivers, fees: platform, refunded, courierRefunds, toDropPoints, courierDriverPayouts, redeliveryFees, released, potsMatch, ok: potsMatch && collected === inEscrow + released };
}
