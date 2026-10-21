/**
 * End-to-end test of the MzansiConnect money + delivery flow, run straight against
 * the server's reducer (no server or browser needed):
 *
 *   npx tsx scripts/test-flow.ts
 *
 * Covers: sign-in, registration quiz, reserving units (no money moves),
 * auto-close with a locked price, paying into TradeSafe escrow, the 48-hour
 * payment window, releasing unpaid spots to the waitlist, admin payment check,
 * order, driver booking with capacity checks, delivery codes, missed deliveries,
 * drop-point and re-delivery fees, driver payouts, the pot ending at R0,
 * cancel-with-refunds, and a platform-wide reconciliation of every rand.
 */
import { buildSeed } from "../lib/server/seedDb";
import { reduce } from "../lib/server/reducer";
import { publicState, SharedDB } from "../lib/server/db";
import { ServerAction } from "../lib/server/actions";
import { COURIER_WINDOWS } from "../lib/types";
import { auditPot, potBalance, quoteJoin, totalQtyOf, memberPositions, goodsTotal, formatCents } from "../lib/pot";
import { amountDue } from "../lib/payments";
import { reconcile } from "../lib/reconcile";
import { planDelivery } from "../lib/planner";
import { courierQuote, roadKm } from "../lib/courier";

let db: SharedDB = buildSeed();
let fails = 0;
let passes = 0;

function check(label: string, cond: boolean, extra = "") {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? `  [${extra}]` : ""}`);
}
function act(a: ServerAction) {
  const r = reduce(db, a);
  if (!r.meta.error) db = r.db;
  return r.meta;
}
const deal = (id: string) => db.pools.find((p) => p.id === id)!;
const shop = (id: string) => db.shops.find((s) => s.id === id)!;
const ADMIN = "Test Admin";

console.log("\n— Seed —");
check("every seeded deal passes the ledger proof", db.pools.every((p) => auditPot(p).ok), db.pools.filter((p) => !auditPot(p).ok).map((p) => p.productName).join(","));
check("platform reconciliation balances on the seed", reconcile(db.payments, db.pools, db.fees).ok);
check("shops in open deals have paid nothing yet", db.pools.filter((p) => p.status === "open").every((p) => potBalance(p.ledger) === 0));
check("PINs never reach the browser", publicState(db).users.every((u) => !("pin" in u)));

console.log("\n— Sign in —");
const owner = db.users.find((u) => u.role === "owner" && shop(u.shopId!).verificationStatus === "verified")!;
check("owner signs in with phone + PIN", act({ type: "SIGN_IN", phone: owner.phone, pin: "1234" }).role === "owner");
check("wrong PIN is refused", !!act({ type: "SIGN_IN", phone: owner.phone, pin: "9999" }).error);
check("admin 1 signs in", act({ type: "SIGN_IN", phone: "060 100 0001", pin: "1234" }).role === "admin");
check("admin 2 signs in", act({ type: "SIGN_IN", phone: "060 100 0003", pin: "1234" }).role === "admin");
check("driver signs in", act({ type: "SIGN_IN", phone: "081 400 1002", pin: "1234" }).role === "driver");
check("registering a phone that's already used is refused", !!act({ type: "REGISTER_SHOP", shop: { ...shop(owner.shopId!), id: "dup" }, pin: "1111" }).error);
{
  const course = db.courses[0];
  const right = Object.fromEntries(course.quiz.map((q) => [q.id, q.correctIndex]));
  const wrong = Object.fromEntries(course.quiz.map((q) => [q.id, (q.correctIndex + 1) % q.options.length]));
  const fresh = (id: string, phone: string) => ({ ...shop(owner.shopId!), id, phone, name: "Quiz Test Spaza" });
  check("registering without the quiz is refused", !!act({ type: "REGISTER_SHOP", shop: fresh("q0", "061 000 0001"), pin: "1111" }).error);
  check("registering with a failed quiz is refused", !!act({ type: "REGISTER_SHOP", shop: fresh("q1", "061 000 0002"), pin: "1111", quiz: { courseId: course.id, answers: wrong } }).error);
  const ok = act({ type: "REGISTER_SHOP", shop: fresh("q2", "061 000 0003"), pin: "1111", quiz: { courseId: course.id, answers: right } });
  check("passing the quiz registers a verified shop with a certificate", !ok.error && shop("q2").verificationStatus === "verified" && db.certificates.some((c) => c.shopId === "q2"));
}

console.log("\n— Reserving units (no money moves) —");
const A = owner.shopId!;
const paidBy = (shopId: string) => db.payments.filter((t) => t.shopId === shopId && t.type === "deal-payment").reduce((s, t) => s + t.amountCents, 0);
const open = db.pools.find((p) => p.status === "open" && !p.commitments.some((c) => c.shopId === A))!;
check("there is an open deal the shop hasn't joined", !!open, open?.productName);
const unverified = db.shops.find((s) => s.verificationStatus !== "verified")!;
check("an unverified shop can't join", !!act({ type: "JOIN_DEAL", dealId: open.id, shopId: unverified.id, qty: 1 }).error);
const q = quoteJoin(open, shop(A), 2);
check("the quote shows what the shop will pay at the final price", q.estimateCents > 0 && q.finalUnitCents <= q.unitCentsAfter);
const paidBefore = paidBy(A);
const join = act({ type: "JOIN_DEAL", dealId: open.id, shopId: A, qty: 2 });
check("reserving succeeds", !join.error, join.error);
check("no money moves when reserving", paidBy(A) === paidBefore && potBalance(deal(open.id).ledger) === 0);
check("the shop gets a 4-digit delivery code", /^\d{4}$/.test(deal(open.id).deliveryCodes[A] || ""));
check("paying before the deal is full is refused", !!act({ type: "PAY_DEAL", dealId: open.id, shopId: A, method: "eft" }).error);
check("can't reserve more than the units left", !!act({ type: "JOIN_DEAL", dealId: open.id, shopId: A, qty: open.minQty }).error);
check("ledger proof still passes", auditPot(deal(open.id)).ok);

console.log("\n— Deal fills → price locks, 48 hours to pay —");
const fill = act({ type: "SIMULATE_FILL", dealId: open.id, excludeShopId: A });
check("simulated shops fill the deal", !fill.error, fill.error);
let d = deal(open.id);
check("deal closes itself at the target", d.status === "target-reached" && totalQtyOf(d) === d.minQty);
check("price is locked at the lowest tier", d.priceLockedCents === Math.round(d.tiers[d.tiers.length - 1].price * 100));
check("a 48-hour payment window is open", !!d.paymentDueAt && Math.abs(new Date(d.paymentDueAt).getTime() - Date.now() - 48 * 3600000) < 60000);
check("every shop is told what to pay", d.commitments.every((c) => db.messages.some((m) => m.toId === c.shopId && m.dealId === d.id && /Please pay/.test(m.text))));
check("admin can't confirm before everyone pays", !!act({ type: "ADMIN_CONFIRM_PAYMENTS", dealId: d.id, adminName: ADMIN }).error);
const due = memberPositions(d).find((m) => m.shopId === A)!.dueCents;
const pay = act({ type: "PAY_DEAL", dealId: d.id, shopId: A, method: "eft" });
check("the shop pays its share into TradeSafe escrow", !pay.error && pay.paidCents === due && potBalance(deal(d.id).ledger) === due, pay.error);
check("TradeSafe's record and the pot share the reference", db.payments.some((t) => t.ref === pay.ref && t.shopId === A) && deal(d.id).ledger.some((t) => t.ref === pay.ref));
check("paying twice is refused", !!act({ type: "PAY_DEAL", dealId: d.id, shopId: A, method: "eft" }).error);
const waiter = db.shops.find((s) => s.verificationStatus === "verified" && !d.commitments.some((c) => c.shopId === s.id))!;
if (waiter) check(`${waiter.name} joins the waitlist`, !!act({ type: "JOIN_DEAL", dealId: d.id, shopId: waiter.id, qty: 1 }).waitlisted && deal(d.id).waitlist.length === 1);
check("releasing unpaid spots is refused while shops still have time", !!act({ type: "ADMIN_RELEASE_UNPAID", dealId: d.id, adminName: ADMIN }).error);
// one shop doesn't pay; the rest do
const noShow = memberPositions(deal(d.id)).find((m) => m.dueCents > 0)!;
act({ type: "SIMULATE_PAY", dealId: d.id, excludeShopId: noShow.shopId });
check("everyone else pays", memberPositions(deal(d.id)).filter((m) => m.dueCents > 0).length === 1);
check("each payment is exactly that shop's share", auditPot(deal(d.id)).ok);
act({ type: "SIMULATE_DEADLINE", dealId: d.id });
const rel = act({ type: "ADMIN_RELEASE_UNPAID", dealId: d.id, adminName: ADMIN });
d = deal(d.id);
check("after 48 hours the unpaid spot is released — no money taken", !rel.error && rel.released === 1 && !d.commitments.some((c) => c.shopId === noShow.shopId), rel.error);
check("the shop that didn't pay is told", db.messages.some((m) => m.toId === noShow.shopId && /released/.test(m.text)));
if (rel.reopened) {
  check("not enough on the waitlist → the deal reopens with the price kept", d.status === "open" && !!d.priceLockedCents);
  act({ type: "SIMULATE_FILL", dealId: d.id, excludeShopId: noShow.shopId });
  d = deal(d.id);
  check("…and fills again, opening a new payment window", d.status === "target-reached");
} else check("the waitlist takes the spot and a new payment window opens", d.status === "target-reached" && (rel.promoted ?? 0) > 0);
act({ type: "SIMULATE_PAY", dealId: d.id });
d = deal(d.id);
check("now every shop has paid exactly the final price", memberPositions(d).every((m) => m.paidCents === m.owedCents));
check("nobody overpaid, so there are no refunds", !d.ledger.some((t) => t.type === "rebate" || t.type === "refund"));
check("admin is told everyone has paid", db.messages.some((m) => m.toRole === "admin" && m.dealId === d.id && /have paid/.test(m.text)));
check("ledger proof passes", auditPot(d).ok);

console.log("\n— Admin: confirm, then two admins to pay the wholesaler —");
const A1 = "user-admin";
const A2 = "user-admin-2";
check("can't ask to place the order before confirming payments", !!act({ type: "ADMIN_REQUEST_APPROVAL", kind: "place-order", dealId: d.id, adminId: A1 }).error);
check("admin can't book drivers before ordering", !!act({ type: "ADMIN_ASSIGN_TRIPS", dealId: d.id, adminName: ADMIN, date: "2030-01-01", startTime: "08:00", trips: [] }).error);
check("confirm payments", !act({ type: "ADMIN_CONFIRM_PAYMENTS", dealId: d.id, adminName: ADMIN }).error && deal(d.id).status === "payment-confirmed");
const req1 = act({ type: "ADMIN_REQUEST_APPROVAL", kind: "place-order", dealId: d.id, adminId: A1 });
check("admin 1 asks to pay the wholesaler", !req1.error && db.approvals.some((x) => x.id === req1.approvalId && x.status === "pending"));
check("asking twice is refused while one is waiting", !!act({ type: "ADMIN_REQUEST_APPROVAL", kind: "place-order", dealId: d.id, adminId: A1 }).error);
check("admin 1 can't approve their own request", !!act({ type: "ADMIN_DECIDE_APPROVAL", approvalId: req1.approvalId, adminId: A1, approve: true }).error && deal(d.id).status === "payment-confirmed");
check("a non-admin can't approve", !!act({ type: "ADMIN_DECIDE_APPROVAL", approvalId: req1.approvalId, adminId: `user-${A}`, approve: true }).error);
check("admin 2 can say no — nothing is paid", !act({ type: "ADMIN_DECIDE_APPROVAL", approvalId: req1.approvalId, adminId: A2, approve: false, note: "Check the PO price first" }).error && deal(d.id).status === "payment-confirmed" && !deal(d.id).ledger.some((t) => t.type === "payout-supplier"));
const req2 = act({ type: "ADMIN_REQUEST_APPROVAL", kind: "place-order", dealId: d.id, adminId: A1 });
const order = act({ type: "ADMIN_DECIDE_APPROVAL", approvalId: req2.approvalId, adminId: A2, approve: true });
d = deal(d.id);
check("admin 2 approves: order placed with a PO number", !order.error && d.status === "ordered" && !!d.poNumber, d.poNumber);
check("wholesaler paid units × final price", d.ledger.filter((t) => t.type === "payout-supplier").reduce((s, t) => s + t.amountCents, 0) === goodsTotal(d));
check("every owner is told the order is placed", d.commitments.every((c) => db.messages.some((m) => m.toId === c.shopId && m.dealId === d.id && /Order placed/.test(m.text))));
check("ledger proof passes after paying the wholesaler", auditPot(d).ok);

console.log("\n— Delivery choices —");
const far = db.shops.find((s) => s.id === "shop-ayanda")!;
check("a partner shop more than 2 km away is refused", !!act({ type: "OWNER_SET_PREFS", dealId: d.id, shopId: A, prefs: { days: [1, 2], time: "any", ifMissed: "partner", partnerShopId: "shop-butchery" } }).error);
check("choosing no days is refused", !!act({ type: "OWNER_SET_PREFS", dealId: d.id, shopId: A, prefs: { days: [], time: "any", ifMissed: "next-run" } }).error);
check("owner adds a backup receiver → gets a separate backup code", !act({ type: "OWNER_SET_PREFS", dealId: d.id, shopId: A, prefs: { days: [1, 2, 3, 4, 5], time: "any", ifMissed: "next-run", backupName: "Lerato", backupPhone: "071 555 0123" } }).error && /^\d{4}$/.test(deal(d.id).backupCodes[A] || "") && deal(d.id).backupCodes[A] !== deal(d.id).deliveryCodes[A]);
void far;
// make one seeded shop "bring it on the next run" so every path is tested every time
check("owner changes their 'if I'm not there' choice before the trip", !act({ type: "OWNER_SET_PREFS", dealId: d.id, shopId: "shop-kgomotso", prefs: { days: [1, 2, 3, 4, 5], time: "any", ifMissed: "next-run" } }).error);
d = deal(d.id);

console.log("\n— Admin: book drivers —");
const date = "2030-03-04";
const allShops = d.commitments.map((c) => c.shopId);
const totalKg = d.commitments.reduce((s, c) => s + c.qty * d.unitWeightKg, 0);
const small = db.drivers.slice().sort((a, b) => a.capacityKg - b.capacityKg)[0];
if (totalKg > small.capacityKg)
  check(`overloading ${small.vehicle} (${small.capacityKg} kg) with ${Math.round(totalKg)} kg is refused`, !!act({ type: "ADMIN_ASSIGN_TRIPS", dealId: d.id, adminName: ADMIN, date, startTime: "08:00", trips: [{ driverId: small.id, shopIds: allShops }] }).error);
check("leaving a shop out is refused", !!act({ type: "ADMIN_ASSIGN_TRIPS", dealId: d.id, adminName: ADMIN, date, startTime: "08:00", trips: [{ driverId: "drv-naledi", shopIds: allShops.slice(1) }] }).error);
const wholesaler = db.wholesalers.find((w) => w.id === d.wholesalerId)!;
const plan = planDelivery({ deal: d, shops: db.shops, drivers: db.drivers, wholesaler, busyDriverIds: new Set(), date, startTime: "08:00" });
check("AI planner covers every shop", plan.ok && plan.trips.flatMap((t) => t.stops).length === allShops.length, plan.notes.join(" | "));
check("AI planner never overloads a vehicle", plan.trips.every((t) => t.loadKg <= t.capacityKg));
const afternoon = d.commitments.filter((c) => c.prefs?.time === "afternoon").map((c) => c.shopId);
check("'afternoon' shops get a slot after 12:00", plan.trips.flatMap((t) => t.stops).filter((s) => afternoon.includes(s.shopId)).every((s) => s.window >= "12:00"));
const book = act({ type: "ADMIN_ASSIGN_TRIPS", dealId: d.id, adminName: ADMIN, date, startTime: "08:00", trips: plan.trips.map((t) => ({ driverId: t.driverId, shopIds: t.stops.map((s) => s.shopId) })) });
d = deal(d.id);
check("trips booked, deal scheduled", !book.error && d.status === "scheduled", book.error);
const trips = db.trips.filter((t) => t.dealId === d.id);
check("driver pay adds up to the delivery budget", trips.reduce((s, t) => s + t.feeCents, 0) === d.deliveryFeeCents);
check("…and is split stop by stop", trips.every((t) => t.stops.reduce((s, x) => s + x.feeCents, 0) === t.feeCents));
check("every shop gets its time slot by message", allShops.every((id) => db.messages.some((m) => m.toId === id && m.dealId === d.id && /Delivery booked/.test(m.text))));
check("every driver gets the trip by message", trips.every((t) => db.messages.some((m) => m.toRole === "driver" && m.toId === t.driverId && m.tripId === t.id)));

console.log("\n— Drivers deliver —");
const tripOf = (shopId: string) => db.trips.find((t) => t.dealId === d.id && t.stops.some((s) => s.shopId === shopId && s.status === "pending"))!;
const t0 = trips[0];
check("can't deliver before collecting", !!act({ type: "DRIVER_DELIVER", tripId: t0.id, driverId: t0.driverId, shopId: t0.stops[0].shopId, code: d.deliveryCodes[t0.stops[0].shopId] }).error);
check("can't collect before accepting", !!act({ type: "DRIVER_COLLECT", tripId: t0.id, driverId: t0.driverId }).error);
check("another driver can't accept someone else's trip", !!act({ type: "DRIVER_ACCEPT", tripId: t0.id, driverId: "nobody" }).error);
// one shop with "next run" confirms it will be there
const nextRunShop = d.commitments.find((c) => c.shopId === "shop-kgomotso")!;
check("owner taps 'I'll be there'", !act({ type: "OWNER_CONFIRM", dealId: d.id, shopId: nextRunShop.shopId }).error && tripOf(nextRunShop.shopId).stops.find((s) => s.shopId === nextRunShop.shopId)!.confirmed === true);
for (const t of trips) {
  act({ type: "DRIVER_ACCEPT", tripId: t.id, driverId: t.driverId });
  act({ type: "DRIVER_COLLECT", tripId: t.id, driverId: t.driverId });
}
check("deal is out for delivery once collected", deal(d.id).status === "out-for-delivery");
check("choices can't change once the stock is on the vehicle", !!act({ type: "OWNER_SET_PREFS", dealId: d.id, shopId: A, prefs: { days: [1], time: "any", ifMissed: "next-run" } }).error);
const potBefore0 = potBalance(deal(d.id).ledger);

// A: wrong code, then the backup receiver's code
{
  const t = tripOf(A);
  const wrong = ["0000", "1111", "2222"].find((c) => c !== d.deliveryCodes[A] && c !== d.backupCodes[A])!;
  check("a wrong delivery code is refused", !!act({ type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: A, code: wrong }).error);
  check("the backup receiver's code works", !act({ type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: A, code: d.backupCodes[A] }).error && db.trips.find((x) => x.id === t.id)!.stops.find((s) => s.shopId === A)!.handedTo === "backup");
  const stopFee = t.stops.find((s) => s.shopId === A)!.feeCents;
  check("the driver is paid for that stop straight away", potBalance(deal(d.id).ledger) === potBefore0 - stopFee);
}

// partner drop-off
const partnerC = d.commitments.find((c) => c.prefs?.ifMissed === "partner");
if (partnerC) {
  const t = tripOf(partnerC.shopId);
  const partner = shop(partnerC.prefs!.partnerShopId!);
  check("retry-later is refused when the owner chose a partner shop", !!act({ type: "DRIVER_MISSED", tripId: t.id, driverId: t.driverId, shopId: partnerC.shopId, reason: "Owner is not there", action: "retry-later" }).error);
  // the simulated fill can give this shop more units than the partner has room for — first prove the space check, then make room
  if (partnerC.qty > partner.partner!.capacityUnits)
    check("a partner shop without enough space is refused", !!act({ type: "DRIVER_LEAVE_AT_PARTNER", tripId: t.id, driverId: t.driverId, shopId: partnerC.shopId, reason: "Owner is not there", code: partner.partner!.dropCode }).error);
  act({ type: "PARTNER_SETTINGS", shopId: partner.id, active: true, capacityUnits: 60 });
  check("the partner's wrong drop code is refused", !!act({ type: "DRIVER_LEAVE_AT_PARTNER", tripId: t.id, driverId: t.driverId, shopId: partnerC.shopId, reason: "Owner is not there", code: "0000" }).error);
  check(`stock left at ${partner.name} with its drop code`, !act({ type: "DRIVER_LEAVE_AT_PARTNER", tripId: t.id, driverId: t.driverId, shopId: partnerC.shopId, reason: "Owner is not there", code: partner.partner!.dropCode }).error);
  const fee = db.fees.find((f) => f.kind === "drop-point" && f.shopId === partnerC.shopId && f.dealId === d.id && f.status === "due")!;
  check("a R5-a-unit drop-point fee is added to what the owner owes", !!fee && fee.amountCents === partnerC.qty * 500 && fee.toShopId === partner.id);
  const pf = act({ type: "PAY_FEE", feeId: fee.id, shopId: partnerC.shopId, method: "eft" });
  check("owner pays it through TradeSafe; the drop point is paid exactly that", !pf.error && db.payments.some((t) => t.shopId === partner.id && t.type === "fee-payout" && t.amountCents === fee.amountCents));
  check("a paid fee can't be paid twice", !!act({ type: "PAY_FEE", feeId: fee.id, shopId: partnerC.shopId, method: "eft" }).error);
  check("a partner can't stop being a drop point while holding stock", !!act({ type: "PARTNER_SETTINGS", shopId: partner.id, active: false, capacityUnits: 0 }).error);
  check("the partner can't hand over without the owner's code", !!act({ type: "PARTNER_HANDOVER", partnerShopId: partner.id, tripId: t.id, shopId: partnerC.shopId, code: "0000" }).error);
  check("owner collects from the partner with their code", !act({ type: "PARTNER_HANDOVER", partnerShopId: partner.id, tripId: t.id, shopId: partnerC.shopId, code: d.deliveryCodes[partnerC.shopId] }).error);
}

// retry later on the same route
const retryC = d.commitments.find((c) => c.prefs?.ifMissed === "retry-later");
if (retryC) {
  const t = tripOf(retryC.shopId);
  check("leaving at a partner is refused when the owner didn't choose it", !!act({ type: "DRIVER_LEAVE_AT_PARTNER", tripId: t.id, driverId: t.driverId, shopId: retryC.shopId, reason: "x", code: "5150" }).error);
  check("driver comes back later today (moved to the end of the route)", !act({ type: "DRIVER_MISSED", tripId: t.id, driverId: t.driverId, shopId: retryC.shopId, reason: "Shop is closed", action: "retry-later" }).error && db.trips.find((x) => x.id === t.id)!.stops.slice(-1)[0].shopId === retryC.shopId);
  check("…but only once", !!act({ type: "DRIVER_MISSED", tripId: t.id, driverId: t.driverId, shopId: retryC.shopId, reason: "Shop is closed", action: "retry-later" }).error);
}

// confirmed but absent → back to the wholesaler, re-delivery fee, rebook on a new trip
{
  const t = tripOf(nextRunShop.shopId);
  check("missed after confirming → stock goes back to the wholesaler", !act({ type: "DRIVER_MISSED", tripId: t.id, driverId: t.driverId, shopId: nextRunShop.shopId, reason: "Owner is not there", action: "return" }).error);
  check("the agreed R30 re-delivery fee is added to what the owner owes", db.fees.some((f) => f.kind === "redelivery" && f.shopId === nextRunShop.shopId && f.amountCents === 3000 && f.status === "due"));
  check("admin and owner are told", db.messages.some((m) => m.toRole === "admin" && /Couldn't deliver/.test(m.text)) && db.messages.some((m) => m.toId === nextRunShop.shopId && /couldn't hand over/.test(m.text)));
  const rb = act({ type: "ADMIN_REBOOK", tripId: t.id, shopId: nextRunShop.shopId, adminName: ADMIN, driverId: "drv-naledi", date: "2030-03-05", window: "10:00 – 10:30" });
  check("admin rebooks it on a new trip paid by MzansiConnect", !rb.error && db.trips.find((x) => x.id === rb.tripId)!.paidBy === "kasieco");
  check("can't rebook the same stock twice", !!act({ type: "ADMIN_REBOOK", tripId: t.id, shopId: nextRunShop.shopId, adminName: ADMIN, driverId: "drv-naledi", date: "2030-03-05", window: "10:00 – 10:30" }).error);
  const nt = db.trips.find((x) => x.id === rb.tripId)!;
  act({ type: "DRIVER_ACCEPT", tripId: nt.id, driverId: nt.driverId });
  act({ type: "DRIVER_COLLECT", tripId: nt.id, driverId: nt.driverId });
  check("the rebooked delivery is handed over", !act({ type: "DRIVER_DELIVER", tripId: nt.id, driverId: nt.driverId, shopId: nextRunShop.shopId, code: d.deliveryCodes[nextRunShop.shopId] }).error);
}

for (const t of db.trips.filter((x) => x.dealId === d.id)) for (const s of t.stops) if (s.status === "pending") act({ type: "DRIVER_DELIVER", tripId: t.id, driverId: t.driverId, shopId: s.shopId, code: d.deliveryCodes[s.shopId] });
d = deal(d.id);
check("every trip completed — nothing left on a vehicle", db.trips.filter((t) => t.dealId === d.id).every((t) => t.status === "completed"));
check("drivers paid exactly the delivery budget, once per stop", d.ledger.filter((t) => t.type === "payout-driver").reduce((s, t) => s + t.amountCents, 0) === d.deliveryFeeCents);
check("deal delivered and the pot is exactly R0", d.status === "delivered" && potBalance(d.ledger) === 0, formatCents(potBalance(d.ledger)));
check("ledger proof passes at the end", auditPot(d).ok);

console.log("\n— Cancelling —");
const other = db.pools.find((p) => p.status === "open" && p.commitments.length > 0)!;
if (other) {
  const cr = act({ type: "ADMIN_REQUEST_APPROVAL", kind: "cancel-deal", dealId: other.id, adminId: A2 });
  check("a deal nobody has paid for closes with one admin — nothing to refund", !cr.error && cr.cancelledDirectly && deal(other.id).status === "cancelled" && !db.payments.some((t) => t.dealId === other.id));
}
const paying = db.pools.find((p) => p.status === "target-reached")!;
if (paying) {
  const payers = memberPositions(paying).filter((m) => m.paidCents > 0).map((m) => ({ id: m.shopId, cents: m.paidCents }));
  const cr = act({ type: "ADMIN_REQUEST_APPROVAL", kind: "cancel-deal", dealId: paying.id, adminId: A2 });
  check("cancelling a deal with money in escrow needs a second admin", !cr.error && !cr.cancelledDirectly && deal(paying.id).status === "target-reached");
  check("admin 1 approves the cancel", !act({ type: "ADMIN_DECIDE_APPROVAL", approvalId: cr.approvalId, adminId: A1, approve: true }).error);
  check("TradeSafe refunds every shop exactly what it paid", payers.every((p) => db.payments.some((t) => t.type === "refund" && t.shopId === p.id && t.dealId === paying.id && t.amountCents === p.cents)));
  check("cancelled pot is at R0", potBalance(deal(paying.id).ledger) === 0);
  check("can't cancel twice", !!act({ type: "ADMIN_REQUEST_APPROVAL", kind: "cancel-deal", dealId: paying.id, adminId: A2 }).error);
}


console.log("\n— Ratings and views (real social proof) —");
{
  const saved = db;
  db = buildSeed(); // fresh copy: earlier sections filled or cancelled every open deal
  const done = db.pools.find((p) => p.status === "delivered" && p.ratings.length < p.commitments.length)!;
  const rated = new Set(done.ratings.map((x) => x.shopId));
  const rater = done.commitments.find((c) => !rated.has(c.shopId))!;
  const outsider = db.shops.find((s) => !done.commitments.some((c) => c.shopId === s.id))!;
  const open = db.pools.find((p) => p.status === "open")!;
  check("seeded ratings come only from shops in delivered deals", db.pools.every((p) => p.ratings.every((x) => p.commitments.some((c) => c.shopId === x.shopId))));
  check("a shop outside the deal can't rate it", !!act({ type: "RATE_DEAL", dealId: done.id, shopId: outsider.id, stars: 5 }).error);
  check("can't rate before your stock arrives", !!act({ type: "RATE_DEAL", dealId: open.id, shopId: open.commitments[0].shopId, stars: 5 }).error);
  check("stars must be 1 to 5", !!act({ type: "RATE_DEAL", dealId: done.id, shopId: rater.shopId, stars: 9 }).error);
  check("a shop in a delivered deal can rate it", !act({ type: "RATE_DEAL", dealId: done.id, shopId: rater.shopId, stars: 4, comment: "Good" }).error && deal(done.id).ratings.some((x) => x.shopId === rater.shopId && x.stars === 4));
  check("only one rating per shop per deal", !!act({ type: "RATE_DEAL", dealId: done.id, shopId: rater.shopId, stars: 5 }).error);
  const viewer = db.shops.find((s) => !(s.id in deal(open.id).views))!;
  act({ type: "VIEW_DEAL", dealId: open.id, shopId: viewer.id });
  check("opening a deal records a real view", viewer.id in deal(open.id).views);
  check("reserving counts as viewing", open.commitments.every((c) => c.shopId in deal(open.id).views));
  db = saved;
}

console.log("\n— Shop-to-shop transport —");
{
  const verified = db.shops.filter((s) => s.verificationStatus === "verified");
  const a = verified[0];
  const b = verified.filter((s) => s.id !== a.id).sort((x, y) => roadKm(a, x) - roadKm(a, y))[0];
  const listingId = db.listings[0]?.id ?? "l-test";
  const threadId = "th-courier-test";
  act({ type: "START_THREAD", thread: { id: threadId, listingId, shopAId: a.id, shopBId: b.id, messages: [], offers: [], confirmedBy: [], status: "open", createdAt: new Date().toISOString() } });
  const day = (() => { const d = new Date(); d.setDate(d.getDate() + 1); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const book = (extra: Partial<Extract<ServerAction, { type: "BOOK_COURIER" }>> = {}) =>
    act({ type: "BOOK_COURIER", threadId, shopId: b.id, fromShopId: b.id, twoWay: true, payer: "split", day, window: COURIER_WINDOWS[1], goodsOut: "4 × Coca-Cola 2L", goodsBack: "2 × Maize meal 10kg", ...extra });
  check("can't book transport before an offer is accepted", !!book().error);
  act({ type: "SEND_OFFER", threadId, fromShopId: b.id, offerGive: "4 × Coca-Cola 2L", offerReceive: "2 × Maize meal 10kg", cashAdjustment: 0 });
  const offer = db.threads.find((t) => t.id === threadId)!.offers[0];
  act({ type: "RESPOND_OFFER", threadId, offerId: offer.id, accept: true });
  check("an outsider can't book transport", !!act({ type: "BOOK_COURIER", threadId, shopId: verified.find((s) => s.id !== a.id && s.id !== b.id)!.id, fromShopId: b.id, twoWay: false, payer: "me", day, window: COURIER_WINDOWS[0], goodsOut: "x" }).error);
  check("no runs on Sundays", !!book({ day: (() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return d.toISOString().slice(0, 10); })() }).error);
  const res = book();
  const job = () => db.courierJobs.find((j) => j.id === res.jobId)!;
  const km = roadKm(b, a);
  check("booking quotes the fee by distance, both ways", !res.error && job().feeCents === courierQuote(km, true).feeCents && job().legs.length === 2, `${km} km → ${formatCents(job().feeCents)}`);
  check("only one live booking per exchange", !!book().error);
  const shares = db.fees.filter((f) => f.courierJobId === res.jobId);
  check("split 50/50 gives each shop a share that adds up", shares.length === 2 && shares.reduce((n, f) => n + f.amountCents, 0) === job().feeCents);
  check("each share shows up in what the shop owes", shares.every((f) => amountDue(db.pools, db.fees, f.shopId) >= f.amountCents));
  check("the driver can't accept before the fee is paid", !!act({ type: "COURIER_ACCEPT", jobId: res.jobId, driverId: job().driverId }).error);
  act({ type: "PAY_FEE", feeId: shares[0].id, shopId: shares[0].shopId, method: "eft" });
  check("still waiting while one share is unpaid", job().status === "awaiting-payment");
  const paid = act({ type: "PAY_FEE", feeId: shares[1].id, shopId: shares[1].shopId, method: "card" });
  check("both shares paid: the driver is booked and told", paid.booked === true && job().status === "assigned" && db.messages.some((m) => m.toRole === "driver" && m.toId === job().driverId && /shop-to-shop run/.test(m.text)));
  const driverId = job().driverId;
  check("another driver can't take the run", !!act({ type: "COURIER_ACCEPT", jobId: res.jobId, driverId: db.drivers.find((d) => d.id !== driverId)!.id }).error);
  act({ type: "COURIER_ACCEPT", jobId: res.jobId, driverId });
  check("can't deliver before collecting", !!act({ type: "COURIER_DELIVER", jobId: res.jobId, driverId, leg: 0, code: job().legs[0].code }).error);
  act({ type: "COURIER_COLLECT", jobId: res.jobId, driverId, leg: 0 });
  check("can't collect the return load before the first drop", !!act({ type: "COURIER_COLLECT", jobId: res.jobId, driverId, leg: 1 }).error);
  check("a wrong code doesn't hand over", !!act({ type: "COURIER_DELIVER", jobId: res.jobId, driverId, leg: 0, code: job().legs[0].code === "0000" ? "1111" : "0000" }).error);
  check("can't cancel once the goods are on the vehicle", !!act({ type: "CANCEL_COURIER", jobId: res.jobId, shopId: a.id }).error);
  act({ type: "COURIER_DELIVER", jobId: res.jobId, driverId, leg: 0, code: job().legs[0].code });
  check("the receiver's code confirms its side of the exchange", db.threads.find((t) => t.id === threadId)!.confirmedBy.includes(a.id) && job().status === "on-the-way");
  act({ type: "COURIER_COLLECT", jobId: res.jobId, driverId, leg: 1 });
  act({ type: "COURIER_DELIVER", jobId: res.jobId, driverId, leg: 1, code: job().legs[1].code });
  check("both legs delivered: exchange completed", job().status === "delivered" && db.threads.find((t) => t.id === threadId)!.status === "completed");
  check("the driver is paid the whole fee by TradeSafe", db.payments.some((t) => t.type === "courier-payout" && t.courierJobId === res.jobId && t.amountCents === job().feeCents && t.driverId === driverId));

  const c = verified.filter((s) => s.id !== a.id && s.id !== b.id).sort((x, y) => roadKm(a, x) - roadKm(a, y))[0];
  const secondThreadId = "th-courier-cancel";
  act({ type: "START_THREAD", thread: { id: secondThreadId, listingId, shopAId: a.id, shopBId: c.id, messages: [], offers: [], confirmedBy: [], status: "open", createdAt: new Date().toISOString() } });
  act({ type: "SEND_OFFER", threadId: secondThreadId, fromShopId: a.id, offerGive: "Cash only", offerReceive: "6 × Sugar 2kg", cashAdjustment: 120 });
  act({ type: "RESPOND_OFFER", threadId: secondThreadId, offerId: db.threads.find((t) => t.id === secondThreadId)!.offers[0].id, accept: true });
  const second = act({ type: "BOOK_COURIER", threadId: secondThreadId, shopId: a.id, fromShopId: c.id, twoWay: false, payer: "me", day, window: COURIER_WINDOWS[0], goodsOut: "6 × Sugar 2kg" });
  const fee = db.fees.find((f) => f.courierJobId === second.jobId)!;
  check("'I pay' puts the whole fee on the booking shop", !second.error && fee.shopId === a.id && fee.amountCents === courierQuote(roadKm(c, a), false).feeCents);
  act({ type: "PAY_FEE", feeId: fee.id, shopId: a.id, method: "eft" });
  const cancelled = act({ type: "CANCEL_COURIER", jobId: second.jobId, shopId: c.id });
  check("cancelling before collection refunds what was paid", !cancelled.error && cancelled.refunds === 1 && db.payments.some((t) => t.type === "courier-refund" && t.courierJobId === second.jobId && t.amountCents === fee.amountCents));
  check("after a cancel the exchange can book again", !act({ type: "BOOK_COURIER", threadId: secondThreadId, shopId: a.id, fromShopId: c.id, twoWay: false, payer: "them", day, window: COURIER_WINDOWS[2], goodsOut: "6 × Sugar 2kg" }).error);
}

console.log("\n— Reconcile with TradeSafe —");
for (const f of db.fees.filter((x) => x.status === "due")) act({ type: "PAY_FEE", feeId: f.id, shopId: f.shopId, method: "eft" });
const r = reconcile(db.payments, db.pools, db.fees);
check("every rand paid in is in escrow or released", r.ok, `${formatCents(r.collected)} collected = ${formatCents(r.inEscrow)} in escrow + ${formatCents(r.released)} released`);
check("pots match TradeSafe's record line for line", r.potsMatch);
check("MzansiConnect only ever received its service fee", r.fees === db.pools.reduce((s, p) => s + p.ledger.filter((t) => t.type === "payout-platform").reduce((a, t) => a + t.amountCents, 0), 0));
check("every deal passes the ledger proof", db.pools.every((p) => auditPot(p).ok));

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
