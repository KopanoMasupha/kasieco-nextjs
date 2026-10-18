"use client";

import { useState } from "react";
import Link from "next/link";
import PhotoPicker from "@/components/shop/PhotoPicker";
import clsx from "clsx";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardCheck,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  MapPin,
  UserPlus,
  Users,
  Ban,
  AlertTriangle,
  RotateCcw,
  PartyPopper,
  Send,
  Clock,
} from "lucide-react";
import { useStore, useLiveRefresh, useMe } from "@/lib/store";
import { formatCents, goodsTotal, potBalance, totalQtyOf, memberPositions, auditPot, serviceTotal } from "@/lib/pot";
import { PAYMENT_METHOD_LABEL, Pool, Trip } from "@/lib/types";
import { dueText } from "@/lib/payments";
import { DraftKind } from "@/lib/messageDrafts";
import DealTracker from "@/components/deal/DealTracker";
import PotMeter from "@/components/pot/PotMeter";
import LedgerFeed from "@/components/pot/LedgerFeed";
import LedgerProof from "@/components/pot/LedgerProof";
import DeliveryPlanner from "@/components/admin/DeliveryPlanner";
import MessageAssistant from "@/components/admin/MessageAssistant";
import RouteSketch from "@/components/admin/RouteSketch";
import ApprovalPanel from "@/components/admin/ApprovalPanel";
import { myStop, prefsSummary, STOP_LABEL, missedText, lowerFirst } from "@/lib/delivery";
import { PageSkeleton } from "@/components/Skeleton";
import { units } from "@/lib/units";

const SUGGESTED: Partial<Record<Pool["status"], DraftKind>> = {
  ordered: "order-placed",
  scheduled: "driver-brief",
  "out-for-delivery": "reminder",
};

export default function DealControlRoom({ params }: { params: { id: string } }) {
  useLiveRefresh(3000);
  const { state, dispatch, loading } = useStore();
  const me = useMe();
  const adminName = me?.name.split(" (")[0] ?? "Admin";
  const deal = state.pools.find((p) => p.id === params.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  if (!deal) {
    if (loading) return <PageSkeleton />;
    return (
      <div className="card p-6 text-sm">
        Deal not found.{" "}
        <Link href="/admin/deals" className="font-semibold text-ember-dark">
          Back to deals
        </Link>
      </div>
    );
  }

  const wholesaler = state.wholesalers.find((w) => w.id === deal.wholesalerId);
  const trips = state.trips.filter((t) => t.dealId === deal.id);
  const qty = totalQtyOf(deal);
  const positions = memberPositions(deal);
  const audit = auditPot(deal);

  async function run(key: string, action: any, ok: string) {
    setBusy(key);
    setNotice(null);
    const meta = await dispatch(action);
    setBusy(null);
    setNotice(meta.error ? { ok: false, text: meta.error } : { ok: true, text: typeof ok === "function" ? (ok as any)(meta) : ok.replace("{joined}", (meta.joined || []).length).replace("{po}", meta.poNumber || "") });
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/deals" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> All deals
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <PhotoPicker compact size={64} name={deal.productName} value={deal.photo} onChange={(photo) => dispatch({ type: "ADMIN_SET_DEAL_PHOTO", dealId: deal.id, photo })} />
          <div className="min-w-0">
          <h1 className="text-3xl font-bold text-ink">{deal.productName}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/55">
            <span className="flex items-center gap-1 font-medium text-leaf">
              <BadgeCheck size={14} /> {deal.supplierName}
            </span>
            <span>
              {qty} of {deal.minQty} {units(deal.unitLabel)} reserved
            </span>
            <span>{deal.commitments.length} shops</span>
            {deal.poNumber && <span className="font-mono text-xs">Order {deal.poNumber}</span>}
          </p>
          </div>
        </div>
        <span className="rounded-full bg-ink/5 px-3 py-1.5 font-mono text-xs text-ink/60">Escrow {formatCents(potBalance(deal.ledger))}</span>
      </div>

      <section className="card p-5">
        <DealTracker status={deal.status} audience="admin" />
      </section>

      {notice && <p className={clsx("rounded-xl2 px-4 py-3 text-sm font-medium", notice.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600")}>{notice.text}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          {/* ---------- NEXT STEP ---------- */}
          {deal.status === "open" && (
            <section className="card grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <PotMeter pool={deal} />
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-ink">Filling up</h2>
                <p className="text-sm text-ink/60">
                  {deal.minQty - qty} left · closes {new Date(deal.closesAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long" })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button disabled={!!busy} onClick={() => run("join", { type: "SIMULATE_JOIN", dealId: deal.id }, "A shop joined.")} className="btn-outline px-4 py-2.5 text-sm">
                    {busy === "join" ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Demo: shop joins
                  </button>
                  <button disabled={!!busy} onClick={() => run("fill", { type: "SIMULATE_FILL", dealId: deal.id }, "{joined} shops joined. Target reached.")} className="btn-dark px-4 py-2.5 text-sm">
                    {busy === "fill" ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Demo: fill deal
                  </button>
                </div>
                <details className="rounded-xl bg-sand-50 p-3 text-sm" open={state.approvals.some((a) => a.dealId === deal.id && a.kind === "cancel-deal" && a.status === "pending")}>
                  <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-red-600">
                    <Ban size={14} /> {potBalance(deal.ledger) > 0 ? "Cancel & refund" : "Close without filling"}
                  </summary>
                  <div className="mt-3">
                    <ApprovalPanel deal={deal} kind="cancel-deal" askLabel={potBalance(deal.ledger) > 0 ? `Request cancel · refund ${formatCents(potBalance(deal.ledger))}` : "Close deal — nobody has paid"} help={potBalance(deal.ledger) > 0 ? "TradeSafe refunds every shop that paid." : "Shops only reserved, so no money moves and no second admin is needed."} />
                  </div>
                </details>
              </div>
            </section>
          )}

          {deal.status === "target-reached" && (() => {
            const unpaid = positions.filter((m) => m.dueCents > 0);
            const windowOver = !!deal.paymentDueAt && new Date(deal.paymentDueAt).getTime() < Date.now();
            const allPaid = unpaid.length === 0;
            return (
              <StepCard
                icon={allPaid ? ClipboardCheck : Clock}
                step={1}
                title={allPaid ? "Check payments" : `Waiting for payments · ${positions.length - unpaid.length} of ${positions.length}`}
                help={allPaid ? "Every shop paid into TradeSafe escrow. Check, then confirm." : windowOver ? "The 48-hour window is over. Release unpaid spots — the waitlist moves up." : `${dueText(deal.paymentDueAt)}. Shops pay into TradeSafe escrow.`}
              >
                <PaymentCheck deal={deal} />
                {allPaid ? (
                  <>
                    <div className={clsx("mt-3 rounded-xl px-3 py-2 text-sm font-semibold", audit.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600")}>
                      {audit.ok ? `✓ ${formatCents(potBalance(deal.ledger))} in escrow = goods + transport + fee` : "✗ Ledger check failed — do not confirm."}
                    </div>
                    <button disabled={!!busy || !audit.ok} onClick={() => run("confirm", { type: "ADMIN_CONFIRM_PAYMENTS", dealId: deal.id, adminName }, "Payments confirmed.")} className="btn-ember mt-3 w-full py-3.5 text-sm">
                      {busy === "confirm" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirm payments
                    </button>
                  </>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      disabled={!!busy || !windowOver}
                      onClick={() => run("release", { type: "ADMIN_RELEASE_UNPAID", dealId: deal.id, adminName }, ((m: any) => `Released ${m.released} unpaid spot${m.released === 1 ? "" : "s"}${m.promoted ? `; ${m.promoted} from the waitlist moved up` : ""}${m.reopened ? ". Deal is filling again." : "."}`) as any)}
                      className="btn-ember px-4 py-2.5 text-sm"
                      title={windowOver ? "" : "Available once the 48-hour window ends"}
                    >
                      {busy === "release" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Release unpaid spots
                    </button>
                    <button disabled={!!busy} onClick={() => run("pay", { type: "SIMULATE_PAY", dealId: deal.id }, "Remaining shops paid.")} className="btn-outline px-4 py-2.5 text-sm">
                      Demo: everyone pays
                    </button>
                    {!windowOver && (
                      <button disabled={!!busy} onClick={() => run("deadline", { type: "SIMULATE_DEADLINE", dealId: deal.id }, "The 48-hour window is over.")} className="btn-outline px-4 py-2.5 text-sm">
                        Demo: 48 hours pass
                      </button>
                    )}
                  </div>
                )}
              </StepCard>
            );
          })()}

          {deal.status === "payment-confirmed" && wholesaler && (
            <StepCard icon={PackageCheck} step={2} title={`Order from ${wholesaler.name}`} help="Transport and fee stay in the pot until delivery.">
              <dl className="grid gap-2 rounded-xl2 bg-sand-50 p-4 text-sm sm:grid-cols-2">
                <Item k="Wholesaler" v={wholesaler.name} />
                <Item k="Phone" v={wholesaler.phone} />
                <Item k="Pickup address" v={wholesaler.address} />
                <Item k="Order" v={`${qty} ${units(deal.unitLabel, qty)}`} />
                <Item k="Unit price" v={formatCents(goodsTotal(deal) / qty)} />
                <Item k="Pay wholesaler" v={formatCents(goodsTotal(deal))} strong />
                <Item k="Kept: drivers" v={formatCents(deal.deliveryFeeCents)} />
                <Item k="Kept: fee" v={formatCents(serviceTotal(deal))} />
              </dl>
              <div className="mt-3">
                <ApprovalPanel
                  deal={deal}
                  kind="place-order"
                  askLabel={`Request approval · pay ${formatCents(goodsTotal(deal))}`}
                  help="Once approved, the order is placed and shops are told."
                />
              </div>
            </StepCard>
          )}

          {deal.status === "ordered" && wholesaler && <DeliveryPlanner deal={deal} wholesaler={wholesaler} shops={state.shops} drivers={state.drivers} allTrips={state.trips} />}

          {trips.length > 0 && <TripsTracker deal={deal} trips={trips} adminName={adminName} />}

          {deal.status === "delivered" && (
            <section className="card flex items-center gap-4 border-leaf/30 p-5">
              <PartyPopper size={28} className="shrink-0 text-leaf" />
              <div className="text-sm">
                <p className="text-lg font-bold text-ink">Deal complete</p>
                <p className="text-ink/60">
                  {deal.commitments.length} shops delivered · everyone paid · pot {formatCents(potBalance(deal.ledger))}
                </p>
              </div>
            </section>
          )}

          {/* ---------- WHO BOUGHT WHAT, WHERE ---------- */}
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Shops ({deal.commitments.length})</h2>
            <div className="space-y-2">
              {deal.commitments.map((c) => {
                const shop = state.shops.find((s) => s.id === c.shopId);
                const pos = positions.find((p) => p.shopId === c.shopId);
                const found = myStop(trips, deal.id, c.shopId);
                const stop = found?.stop;
                return (
                  <div key={c.shopId} className="grid gap-2 rounded-xl2 bg-sand-50 p-3 text-sm sm:grid-cols-[1.4fr_1.4fr_auto]">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{c.shopName}</p>
                      <p className="text-xs text-ink/55">{shop?.ownerName}</p>
                      {shop?.phone && (
                        <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-ember-dark">
                          <Phone size={11} /> {shop.phone}
                        </a>
                      )}
                    </div>
                    <div className="min-w-0 text-xs text-ink/60">
                      <p className="flex items-center gap-1 font-semibold text-ink/80">
                        <MapPin size={11} /> {c.township}
                      </p>
                      <p>{shop?.address ?? "—"} · {shop?.openTime ?? "?"}–{shop?.closeTime ?? "?"}</p>
                      <p className="mt-1 text-ink/70">
                        {prefsSummary(c.prefs, state.shops, shop)}
                        {c.prefs?.backupName && <> · backup {c.prefs.backupName}</>}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-base font-bold text-ink">
                        {c.qty} <span className="text-xs font-normal text-ink/45">units</span>
                      </p>
                      <p className="text-ink/60">paid {formatCents(pos?.paidCents ?? 0)}</p>
                      {stop && (
                        <p className={clsx("font-semibold", stop.status === "delivered" ? "text-leaf" : stop.status === "pending" ? "text-ink/60" : "text-amber-700")}>
                          {stop.status === "pending" ? stop.window : STOP_LABEL[stop.status]}
                        </p>
                      )}
                      {stop?.status === "pending" && (
                        <p className={clsx("text-[11px] font-bold", stop.confirmed ? "text-leaf" : "text-amber-700")}>{stop.confirmed ? "✓ confirmed" : "not confirmed yet"}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {deal.commitments.length === 0 && <p className="text-sm text-ink/45">No shops yet.</p>}
            </div>
          </section>
        </div>

        {/* ---------- SIDE: messages + money ---------- */}
        <aside className="min-w-0 space-y-4">
          {deal.commitments.length > 0 && <MessageAssistant deal={deal} trips={trips} wholesaler={wholesaler} suggested={SUGGESTED[deal.status]} />}
          <section className="card p-5">
            <h2 className="font-semibold text-ink">Escrow · TradeSafe</h2>
            <p className="mb-2 text-xs text-ink/45">
              Balance {formatCents(potBalance(deal.ledger))} · {deal.ledger.length} entries
            </p>
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <LedgerFeed pool={deal} />
            </div>
          </section>
          <LedgerProof pool={deal} />
          <section className="card p-4 text-xs text-ink/60">
            <p className="mb-1.5 font-semibold text-ink/70">Deal history</p>
            <ol className="space-y-1.5">
              {deal.events
                .slice()
                .reverse()
                .map((e, i) => (
                  <li key={i}>
                    {e.text} <span className="text-ink/35">· {e.by} · {new Date(e.at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StepCard({ icon: Icon, step, title, help, children }: { icon: any; step: number; title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="card border-ember/30 p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ember text-white">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-semibold text-ember-dark">Step {step} of 3 — your turn</p>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-sm text-ink/55">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Item({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{k}</dt>
      <dd className={clsx(strong ? "text-lg font-extrabold text-ink" : "font-medium text-ink/80")}>{v}</dd>
    </div>
  );
}

/** Each shop's payment into TradeSafe escrow, matched to TradeSafe's own record by reference. */
function PaymentCheck({ deal }: { deal: Pool }) {
  const { state } = useStore();
  const positions = memberPositions(deal);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs text-ink/45">
            <th className="pb-2 font-medium">Shop</th>
            <th className="pb-2 text-right font-medium">Units</th>
            <th className="pb-2 text-right font-medium">Share</th>
            <th className="pb-2 text-right font-medium">Paid</th>
            <th className="pb-2 pl-3 font-medium">TradeSafe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {deal.commitments.map((c) => {
            const contribs = deal.ledger.filter((t) => t.type === "contribution" && t.shopId === c.shopId);
            const paidIn = contribs.reduce((s, t) => s + t.amountCents, 0);
            const tsRefs = new Set(state.payments.filter((w) => w.shopId === c.shopId && w.dealId === deal.id && w.type === "deal-payment").map((w) => w.ref));
            const matched = contribs.length > 0 && contribs.every((t) => tsRefs.has(t.ref));
            const pos = positions.find((p) => p.shopId === c.shopId)!;
            const method = contribs[0]?.method;
            return (
              <tr key={c.shopId}>
                <td className="py-2 pr-2">
                  <span className="font-medium text-ink">{c.shopName}</span>
                  <span className="block font-mono text-[10px] text-ink/40">
                    {contribs.map((t) => t.ref).join(", ")}
                    {method ? ` · ${PAYMENT_METHOD_LABEL[method]}` : ""}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{c.qty}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums">{formatCents(pos.owedCents)}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right font-semibold tabular-nums">{paidIn ? formatCents(paidIn) : "—"}</td>
                <td className="py-2 pl-3">
                  {matched && pos.dueCents === 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-leaf">
                      <CheckCircle2 size={13} /> In escrow
                    </span>
                  ) : paidIn === 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <Clock size={13} /> Not paid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                      <XCircle size={13} /> Mismatch
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {deal.waitlist.length > 0 && (
        <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink/60">
          <strong className="text-ink/80">Waitlist:</strong> {deal.waitlist.map((w) => `${w.shopName} (${w.qty})`).join(", ")} — next in line if a spot is released.
        </p>
      )}
    </div>
  );
}

const WINDOWS = ["08:00 – 08:30", "09:00 – 09:30", "10:00 – 10:30", "11:00 – 11:30", "12:00 – 12:30", "13:00 – 13:30", "14:00 – 14:30", "15:00 – 15:30", "16:00 – 16:30"];

const isoDay = (offset: number) => {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Live view of every trip on the deal, plus what to do with any missed stop. */
function TripsTracker({ deal, trips, adminName }: { deal: Pool; trips: Trip[]; adminName: string }) {
  const { state, dispatch } = useStore();
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const wholesaler = state.wholesalers.find((w) => w.id === deal.wholesalerId);

  async function sendDriver(t: Trip) {
    const text = (msg[t.id] || "").trim();
    if (!text) return;
    setBusy(t.id);
    const meta = await dispatch({ type: "SEND_MESSAGES", fromRole: "admin", fromName: adminName, dealId: deal.id, tripId: t.id, messages: [{ toRole: "driver", toId: t.driverId, text }] });
    setBusy(null);
    if (!meta.error) setMsg((m) => ({ ...m, [t.id]: "" }));
    setNotice(meta.error ?? `Message sent to ${t.driverName}.`);
  }

  const sketchTrips = trips.filter((t) => !t.rebookOf);
  return (
    <section className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <Truck size={18} className="text-ember" /> Deliveries
      </h2>
      {wholesaler && sketchTrips.length > 0 && <RouteSketch pickup={wholesaler} trips={sketchTrips} height={220} />}
      {notice && <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink/70">{notice}</p>}
      {trips.map((t) => {
        const driver = state.drivers.find((d) => d.id === t.driverId);
        const done = t.stops.filter((s) => s.status !== "pending").length;
        return (
          <div key={t.id} className={clsx("rounded-xl2 border bg-sand-50 p-4", t.rebookOf ? "border-amber-300" : "border-ink/10")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">
                  {t.rebookOf && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">RE-DELIVERY</span>}
                  {t.driverName} · {t.vehicle}
                </p>
                <p className="text-xs text-ink/55">
                  {t.date} · collect {t.pickup.window} · {t.loadKg} of {t.capacityKg} kg · {t.paidBy === "kasieco" ? `MzansiConnect pays ${formatCents(t.feeCents)}` : `earns ${formatCents(t.feeCents)}, per stop`}
                </p>
                {driver && (
                  <a href={`tel:${driver.phone.replace(/\s/g, "")}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-ember-dark">
                    <Phone size={11} /> {driver.phone}
                  </a>
                )}
              </div>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  t.status === "completed" ? "bg-leaf/10 text-leaf" : t.status === "collected" ? "bg-ember/10 text-ember-dark" : "bg-ink/5 text-ink/60"
                )}
              >
                {t.status === "assigned" ? "Waiting for driver to accept" : t.status === "accepted" ? "Accepted — going to collect" : t.status === "collected" ? `On the road · ${done}/${t.stops.length} done` : "Finished · nothing left on the vehicle"}
              </span>
            </div>
            <ol className="mt-3 space-y-2">
              {t.stops.map((s, i) => (
                <li key={s.shopId} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        s.status === "delivered" ? "bg-leaf text-white" : s.status === "pending" ? "bg-ink/5 text-ink/50" : "bg-amber-500 text-white"
                      )}
                    >
                      {s.status === "delivered" ? <CheckCircle2 size={13} /> : s.status === "pending" ? i + 1 : "!"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-ink">{s.shopName}</span>{" "}
                      <span className="text-xs text-ink/45">
                        {s.township} · {s.qty} units · {s.window}
                        {s.status === "pending" && (s.confirmed ? " · ✓ confirmed" : " · not confirmed")}
                      </span>
                    </span>
                    <span className={clsx("text-right text-xs font-semibold", s.status === "delivered" ? "text-leaf" : s.status === "pending" ? "text-ink/40" : "text-amber-700")}>
                      {s.status === "delivered"
                        ? `${s.handedTo === "backup" ? "To backup · " : s.handedTo === "partner-pickup" ? "Collected from partner · " : s.handedTo === "wholesaler-pickup" ? "Collected at wholesaler · " : "Code checked · "}${s.deliveredAt ? new Date(s.deliveredAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : ""}`
                        : s.status === "at-partner"
                        ? `At ${s.partnerShopName}`
                        : s.status === "pending"
                        ? "Waiting"
                        : STOP_LABEL[s.status]}
                    </span>
                  </div>
                  {s.status === "at-partner" && (
                    <p className="ml-8 mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                      Missed ({s.missReason}). Left at drop point {s.partnerShopName} {s.atPartnerAt ? `on ${new Date(s.atPartnerAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""} — the owner chose this. They collect it with their code within 72 hours.
                    </p>
                  )}
                  {s.status === "returned" && <MissedStop deal={deal} trip={t} stopShopId={s.shopId} adminName={adminName} onDone={setNotice} />}
                  {s.status === "rebooked" && <p className="ml-8 mt-1 text-xs text-ink/50">Missed ({s.missReason}) — rebooked on a re-delivery trip below.</p>}
                </li>
              ))}
            </ol>
            {t.status !== "completed" && (
              <div className="mt-3 flex gap-2">
                <input
                  value={msg[t.id] ?? ""}
                  onChange={(e) => setMsg((m) => ({ ...m, [t.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && sendDriver(t)}
                  placeholder={`Message ${t.driverName.split(" ")[0]}…`}
                  className="input py-2 text-sm"
                  aria-label={`Message ${t.driverName}`}
                />
                <button onClick={() => sendDriver(t)} disabled={busy === t.id || !(msg[t.id] || "").trim()} className="btn-dark shrink-0 px-3 text-sm" aria-label="Send">
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** A stop that went back to the wholesaler: rebook it, or record that the owner collected it. */
function MissedStop({ deal, trip, stopShopId, adminName, onDone }: { deal: Pool; trip: Trip; stopShopId: string; adminName: string; onDone: (t: string) => void }) {
  const { state, dispatch } = useStore();
  const stop = trip.stops.find((s) => s.shopId === stopShopId)!;
  const prefs = deal.commitments.find((c) => c.shopId === stop.shopId)?.prefs;
  const shop = state.shops.find((s) => s.id === stop.shopId);
  const busyIds = new Set(state.trips.filter((t) => t.status !== "completed").map((t) => t.driverId));
  const free = state.drivers.filter((d) => d.capacityKg >= stop.weightKg);
  // first day on or after tomorrow that the owner said they can receive
  const firstOk = [1, 2, 3, 4, 5, 6, 7].map(isoDay).find((d) => (prefs?.days ?? [1, 2, 3, 4, 5]).includes(new Date(d + "T12:00:00").getDay())) ?? isoDay(1);
  const [driverId, setDriverId] = useState((free.find((d) => !busyIds.has(d.id)) ?? free[0])?.id ?? "");
  const [date, setDate] = useState(firstOk);
  const [window, setWindow] = useState(prefs?.time === "afternoon" ? WINDOWS[5] : WINDOWS[2]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dayOk = (prefs?.days ?? [1, 2, 3, 4, 5]).includes(new Date(date + "T12:00:00").getDay());

  async function go(action: any, ok: string) {
    setBusy(true);
    setError("");
    const meta = await dispatch(action);
    setBusy(false);
    if (meta.error) setError(meta.error);
    else onDone(ok);
  }

  return (
    <div className="ml-8 mt-1.5 space-y-2 rounded-lg bg-amber-50 p-2.5 text-xs">
      <p className="flex items-center gap-1 font-semibold text-amber-900">
        <AlertTriangle size={12} /> Missed ({stop.missReason}). Stock is back at {trip.pickup.name}. Owner's choice: {lowerFirst(missedText(prefs, state.shops, shop))}.
      </p>
      {stop.nextRun ? (
        <div className="flex flex-wrap items-end gap-2">
          <label>
            <span className="block text-ink/55">Driver</span>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="input !w-auto py-1 text-xs">
              {free.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.vehicle}
                  {busyIds.has(d.id) ? " (has a trip)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-ink/55">Day</span>
            <input type="date" value={date} min={isoDay(0)} onChange={(e) => setDate(e.target.value)} className="input !w-auto py-1 text-xs" />
          </label>
          <label>
            <span className="block text-ink/55">Time</span>
            <select value={window} onChange={(e) => setWindow(e.target.value)} className="input !w-auto py-1 text-xs">
              {WINDOWS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => go({ type: "ADMIN_REBOOK", tripId: trip.id, shopId: stop.shopId, adminName, driverId, date, window }, "Rebooked. Owner and driver told.")}
            disabled={busy || !driverId}
            className="btn-dark px-3 py-1.5 text-xs"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Rebook & tell both
          </button>
          {!dayOk && <p className="w-full text-amber-800">Not one of the owner's days ({prefsSummary(prefs, state.shops, shop).split(" · ")[0]}).</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink/60">Owner's code:</span>
          <input inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="input !w-24 py-1 text-center font-mono text-xs tracking-widest" aria-label="Owner's code" />
          <button onClick={() => go({ type: "ADMIN_MARK_COLLECTED", tripId: trip.id, shopId: stop.shopId, adminName, code }, "Collected.")} disabled={busy || code.length !== 4} className="btn-dark px-3 py-1.5 text-xs">
            Collected
          </button>
          <span className="text-ink/40">(demo {deal.deliveryCodes[stop.shopId]})</span>
        </div>
      )}
      {error && <p className="rounded bg-white px-2 py-1 text-red-600">{error}</p>}
    </div>
  );
}
