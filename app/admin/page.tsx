"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { UserCheck, Warehouse, BellRing, Hourglass } from "lucide-react";
import { ArrowRight, BadgeCheck, ClipboardCheck, PackageCheck, Truck, AlertTriangle, ShieldCheck, Plus, RotateCcw, Loader2, Wallet, MessageSquare, Users } from "lucide-react";
import { useStore, useLiveRefresh, useMe, useInbox } from "@/lib/store";
import { formatCents, memberPositions, potBalance, totalQtyOf } from "@/lib/pot";
import { reconcile } from "@/lib/reconcile";
import { DEAL_STEPS, ADMIN_ROLE_LABEL } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";

export default function AdminOverview() {
  useLiveRefresh(4000);
  const { state, dispatch, loading } = useStore();
  const me = useMe();
  const inbox = useInbox();
  const [resetting, setResetting] = useState(false);

  if (loading && !state.pools.length) return <PageSkeleton />;

  const by = (s: string) => state.pools.filter((p) => p.status === s);
  const pendingApprovals = state.approvals.filter((a) => a.status === "pending");
  const toApprove = pendingApprovals.filter((a) => a.requestedById !== me?.id);
  const iAsked = pendingApprovals.filter((a) => a.requestedById === me?.id);
  const deal = (id: string) => state.pools.find((x) => x.id === id)!;
  const returned = state.trips.flatMap((t) => t.stops.filter((s) => s.status === "returned").map((s) => ({ t, s })));
  const overdue = state.trips.flatMap((t) => t.stops.filter((s) => s.status === "at-partner" && s.atPartnerAt && Date.now() - new Date(s.atPartnerAt).getTime() > 72 * 3600000).map((s) => ({ t, s })));
  const soon = new Date(Date.now() + 36 * 3600000).toISOString().slice(0, 10);
  const unconfirmed = state.trips
    .filter((t) => (t.status === "assigned" || t.status === "accepted") && t.date <= soon)
    .map((t) => ({ t, n: t.stops.filter((s) => s.status === "pending" && !s.confirmed).length }))
    .filter((x) => x.n > 0);
  type Todo = { p: (typeof state.pools)[number]; icon: any; label: string; why: string; job: "money" | "dispatch" };
  const todo: Todo[] = [
    ...toApprove.map((a) => ({ p: deal(a.dealId), icon: UserCheck, label: `Approve (${a.requestedByName} asked)`, why: a.summary, job: "money" as const })),
    ...by("target-reached").map((p) => {
      const pos = memberPositions(p);
      const paid = pos.filter((m) => m.dueCents === 0).length;
      const allPaid = paid === pos.length;
      const late = !allPaid && !!p.paymentDueAt && new Date(p.paymentDueAt).getTime() < Date.now();
      return {
        p,
        icon: allPaid ? ClipboardCheck : late ? AlertTriangle : BellRing,
        label: allPaid ? "Check the payments" : late ? "Release unpaid spots" : "Waiting for payments",
        why: `${paid} of ${pos.length} paid · ${formatCents(potBalance(p.ledger))} in TradeSafe escrow`,
        job: "money" as const,
      };
    }),
    ...by("payment-confirmed")
      .filter((p) => !pendingApprovals.some((a) => a.dealId === p.id))
      .map((p) => ({ p, icon: PackageCheck, label: "Request order approval", why: `Pay ${p.supplierName}`, job: "money" as const })),
    ...by("ordered").map((p) => ({ p, icon: Truck, label: "Book drivers", why: `${p.poNumber} · ${p.commitments.length} shops`, job: "dispatch" as const })),
    ...returned
      .filter(({ s }) => s.nextRun)
      .map(({ t, s }) => ({ p: deal(t.dealId), icon: RotateCcw, label: `Rebook ${s.shopName}`, why: `Missed (${s.missReason}) · at ${t.pickup.name}`, job: "dispatch" as const })),
    ...returned
      .filter(({ s }) => !s.nextRun)
      .map(({ t, s }) => ({ p: deal(t.dealId), icon: Warehouse, label: `${s.shopName} to collect`, why: `At ${t.pickup.name}`, job: "dispatch" as const })),
    ...overdue.map(({ t, s }) => ({ p: deal(t.dealId), icon: AlertTriangle, label: `Over 72 h at ${s.partnerShopName}`, why: `${s.shopName} · call them`, job: "dispatch" as const })),
    ...unconfirmed.map(({ t, n }) => ({ p: deal(t.dealId), icon: BellRing, label: `${n} shop${n === 1 ? "" : "s"} haven't confirmed`, why: `${t.date} · ${t.driverName} · send a reminder`, job: "dispatch" as const })),
  ];
  const r = reconcile(state.payments, state.pools, state.fees);
  const activeTrips = state.trips.filter((t) => t.status !== "completed");

  async function reset() {
    if (!window.confirm("Reset the demo to its starting data?")) return;
    setResetting(true);
    await dispatch({ type: "RESET_DEMO" });
    setResetting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/50">
            Sawubona, {me?.name.split(" ")[0]} · {me?.adminRole ? ADMIN_ROLE_LABEL[me.adminRole] : "Admin"}
            {me?.townships?.length ? ` · ${me.townships.join(", ")}` : ""}
          </p>
          <h1 className="text-3xl font-bold text-ink">Today</h1>
        </div>
        <Link href="/admin/deals/new" className="btn-ember px-5 py-3 text-sm">
          <Plus size={15} /> New deal
        </Link>
      </div>

      {/* to-do */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          Needs you
          {todo.length > 0 && <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">{todo.length}</span>}
        </h2>
        {iAsked.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink/60">
            <Hourglass size={13} /> You asked for {iAsked.length} approval{iAsked.length === 1 ? "" : "s"}; waiting for the other admin.
          </p>
        )}
        {todo.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-leaf">
            <BadgeCheck size={16} /> All clear.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todo.map((x, i) => (
              <li key={i}>
                <Link href={`/admin/deals/${x.p.id}`} className="flex items-center gap-3 rounded-xl2 bg-sand-50 p-3 hover:bg-sand-100">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember-dark">
                    <x.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {x.label}: {x.p.productName}
                    </span>
                    <span className={clsx("mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold", me?.adminRole === x.job ? "bg-ember/10 text-ember-dark" : "bg-ink/5 text-ink/50")}>
                      {me?.adminRole === x.job ? "YOUR JOB" : `${ADMIN_ROLE_LABEL[x.job].toUpperCase()} — YOU CAN COVER`}
                    </span>
                    <span className="block truncate text-xs text-ink/55">{x.why}</span>
                  </span>
                  <span className="btn-dark shrink-0 px-3 py-2 text-xs">
                    Open <ArrowRight size={13} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* pipeline */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Deals by step</h2>
          <ul className="space-y-1.5">
            {DEAL_STEPS.map((s) => {
              const list = by(s.status);
              return (
                <li key={s.status} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-3 py-2 text-sm">
                  <span className="text-ink/70">{s.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs text-ink/45">{list.map((p) => p.productName.split(" ").slice(0, 2).join(" ")).join(", ")}</span>
                    <span className={clsx("flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-bold", list.length ? "bg-ink text-white" : "bg-ink/5 text-ink/35")}>{list.length}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href="/admin/deals" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
            All deals <ArrowRight size={14} />
          </Link>
        </section>

        {/* money */}
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <Wallet size={16} /> Where every rand is · TradeSafe
          </h2>

          <dl className="space-y-1 text-sm">
            {[
              ["Held in TradeSafe escrow", r.inEscrow],
              ["Released to wholesalers", r.toWholesalers],
              ["Released to drivers", r.toDrivers],
              ["Released to drop points", r.toDropPoints],
              ["Refunded to shops", r.refunded],
              ["Re-delivery fees (extra trips)", r.redeliveryFees],
              ["MzansiConnect fee (our only income)", r.fees],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-ink/60">{k}</dt>
                <dd className="tabular-nums text-ink">{formatCents(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink/10 pt-1.5 font-bold">
              <dt>In escrow + released</dt>
              <dd className="tabular-nums">{formatCents(r.inEscrow + r.released)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Paid in by shops</dt>
              <dd className="tabular-nums">{formatCents(r.collected)}</dd>
            </div>
          </dl>
          <p className={clsx("mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", r.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600")}>
            <ShieldCheck size={15} /> {r.ok ? "Balanced — matches TradeSafe's records." : `Out by ${formatCents(Math.abs(r.collected - r.inEscrow - r.released))}. Check the deals.`}
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
            <Truck size={16} /> Drivers on the road ({activeTrips.length})
          </h2>
          <ul className="space-y-2">
            {activeTrips.map((t) => {
              const deal = state.pools.find((p) => p.id === t.dealId);
              const done = t.stops.filter((s) => s.status === "delivered").length;
              return (
                <li key={t.id}>
                  <Link href={`/admin/deals/${t.dealId}`} className="flex items-center gap-3 rounded-xl bg-sand-50 p-3 text-sm hover:bg-sand-100">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">
                        {t.driverName} · {deal?.productName}
                      </span>
                      <span className="text-xs text-ink/50">
                        {t.date} · {t.status === "assigned" ? "waiting for driver to accept" : t.status === "accepted" ? "accepted, not collected yet" : `on the road — ${done} of ${t.stops.length} delivered`}
                      </span>
                    </span>
                    <ArrowRight size={14} className="text-ink/30" />
                  </Link>
                </li>
              );
            })}
            {activeTrips.length === 0 && <li className="text-sm text-ink/45">No trips right now.</li>}
          </ul>
          <Link href="/admin/drivers" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
            <Users size={14} /> All drivers
          </Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
            <MessageSquare size={16} /> Messages {inbox.unread > 0 && <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">{inbox.unread} new</span>}
          </h2>
          <ul className="space-y-2">
            {inbox.list.slice(0, 4).map((m) => (
              <li key={m.id} className={clsx("rounded-xl px-3 py-2 text-sm", m.read ? "bg-sand-50" : "bg-white")}>
                <p className="text-ink/80">{m.text}</p>
                <p className="text-[11px] text-ink/40">
                  {m.fromName} · {new Date(m.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
            {inbox.list.length === 0 && <li className="text-sm text-ink/45">No messages yet.</li>}
          </ul>
          <Link href="/inbox" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
            All messages <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      <section className="rounded-xl2 border border-dashed border-ink/15 bg-sand-50 p-4 text-sm">
        <p className="font-semibold text-ink/70">Demo tools</p>
        <p className="mt-0.5 text-xs text-ink/50">
          {state.pools.length} deals · {state.pools.reduce((s, p) => s + totalQtyOf(p), 0)} units sold · {state.shops.length} shops · {state.drivers.length} drivers
        </p>
        <button onClick={reset} disabled={resetting} className="btn-outline mt-2 px-4 py-2 text-xs">
          {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Reset the demo
        </button>
      </section>
    </div>
  );
}
