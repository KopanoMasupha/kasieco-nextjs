"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, Clock, HandCoins, KeyRound, Loader2, Lock, PackageOpen, Phone, ShieldAlert, Store } from "lucide-react";
import { useStore, useLiveRefresh, useMyShop } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { formatCents } from "@/lib/pot";
import { units } from "@/lib/units";
import { PARTNER_FEE_PER_UNIT_CENTS, PARTNER_RADIUS_KM, Trip, TripStop } from "@/lib/types";
import { heldUnits } from "@/lib/delivery";
import { earnedAsDropPoint } from "@/lib/payments";
import { PageSkeleton } from "@/components/Skeleton";

const RULES = [
  "I have a lockable storeroom.",
  "I never open, use or sell a neighbour's stock.",
  "I hand over only with the right code, within 72 hours.",
];

/** A shop that keeps neighbours' missed deliveries safe, for a small fee per unit. */
export default function DropPointPage() {
  useLiveRefresh(4000);
  const { state, dispatch, loading } = useStore();
  const shop = useMyShop();
  const [ticks, setTicks] = useState<boolean[]>(RULES.map(() => false));
  const [cap, setCap] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!shop) return loading ? <PageSkeleton /> : null;
  const partner = shop.partner;
  const active = !!partner?.active;
  const holding = state.trips.flatMap((t) => t.stops.filter((s) => s.status === "at-partner" && s.partnerShopId === shop.id).map((s) => ({ t, s })));
  const held = heldUnits(state.trips, shop.id);
  const earned = earnedAsDropPoint(state.payments, shop.id);

  async function save(nextActive: boolean) {
    setMsg(null);
    const capacityUnits = parseInt(cap || String(partner?.capacityUnits ?? 10));
    if (nextActive && !active && ticks.some((t) => !t)) return setMsg({ ok: false, text: "Tick all three first." });
    setBusy(true);
    const meta = await dispatch({ type: "PARTNER_SETTINGS", shopId: shop!.id, active: nextActive, capacityUnits });
    setBusy(false);
    if (meta.error) return setMsg({ ok: false, text: meta.error });
    setCap("");
    setMsg({ ok: true, text: nextActive ? (active ? "Saved." : "You're a drop point now.") : "Paused." });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Drop point</h1>
        <p className="text-sm text-ink/55">Hold missed deliveries for neighbours. Earn {formatCents(PARTNER_FEE_PER_UNIT_CENTS)} a unit.</p>
      </div>

      {!isVerified(shop) ? (
        <div className="card flex items-center gap-3 p-5 text-sm">
          <ShieldAlert size={18} className="text-ember" /> Only verified shops can be drop points.{" "}
          <Link href="/owner/compliance" className="font-semibold text-ember-dark underline">
            Get verified
          </Link>
        </div>
      ) : !active ? (
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">Become a drop point</h2>
          <ul className="grid gap-2 text-sm text-ink/70 sm:grid-cols-3">
            <li className="rounded-xl bg-sand-50 p-3">
              <Store size={16} className="mb-1 text-leaf" /> Shops within {PARTNER_RADIUS_KM} km
            </li>
            <li className="rounded-xl bg-sand-50 p-3">
              <HandCoins size={16} className="mb-1 text-leaf" /> {formatCents(PARTNER_FEE_PER_UNIT_CENTS)} a unit, paid on arrival
            </li>
            <li className="rounded-xl bg-sand-50 p-3">
              <Lock size={16} className="mb-1 text-leaf" /> Every hand-over uses a code
            </li>
          </ul>
          <fieldset className="space-y-2">
            <legend className="label">I promise:</legend>
            {RULES.map((r, i) => (
              <label key={i} className={clsx("flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm", ticks[i] ? "border-leaf/40 bg-leaf/5" : "border-ink/10 bg-white")}>
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={ticks[i]} onChange={(e) => setTicks((t) => t.map((x, j) => (j === i ? e.target.checked : x)))} />
                {r}
              </label>
            ))}
          </fieldset>
          <label className="block max-w-xs">
            <span className="label">Space (units)</span>
            <input type="number" min={1} max={200} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="10" className="input" />
          </label>
          {msg && <p className={clsx("rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600")}>{msg.text}</p>}
          <button onClick={() => save(true)} disabled={busy} className="btn-ember px-6 py-3 text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Become a drop point
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl2 bg-ink p-5 text-center text-white">
              <p className="flex items-center justify-center gap-1 text-xs text-white/60">
                <KeyRound size={12} /> Drop code
              </p>
              <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.25em]">{partner!.dropCode}</p>
              <p className="mt-1 text-[11px] text-white/55">Count first, then share.</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink/50">Holding</p>
              <p className="num font-display text-3xl font-bold text-ink">
                {held} <span className="text-base font-medium text-ink/45">/ {partner!.capacityUnits}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/5">
                <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, (held / partner!.capacityUnits) * 100)}%` }} />
              </div>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink/50">Earned</p>
              <p className="num font-display text-3xl font-bold text-leaf">{formatCents(earned)}</p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <PackageOpen size={16} /> Holding ({holding.length})
            </h2>
            <p className="mb-3 text-xs text-ink/50">Count with the owner, then enter their code.</p>
            <div className="space-y-3">
              {holding.map(({ t, s }) => (
                <HoldingRow key={t.id + s.shopId} trip={t} stop={s} partnerShopId={shop.id} />
              ))}
              {holding.length === 0 && <p className="rounded-xl bg-sand-50 p-4 text-sm text-ink/50">Nothing right now.</p>}
            </div>
          </section>

          <section className="card flex flex-wrap items-end gap-3 p-5">
            <label className="block">
              <span className="label">Space (units)</span>
              <input type="number" min={1} max={200} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={String(partner!.capacityUnits)} className="input !w-32" />
            </label>
            <button onClick={() => save(true)} disabled={busy || !cap} className="btn-dark px-4 py-2.5 text-sm">
              Save
            </button>
            <button onClick={() => save(false)} disabled={busy || held > 0} className="btn-outline px-4 py-2.5 text-sm" title={held > 0 ? "Hand over everything you're holding first" : ""}>
              Pause
            </button>
            {msg && <p className={clsx("w-full rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600")}>{msg.text}</p>}
          </section>
        </>
      )}
    </div>
  );
}

function HoldingRow({ trip, stop, partnerShopId }: { trip: Trip; stop: TripStop; partnerShopId: string }) {
  const { state, dispatch } = useStore();
  const deal = state.pools.find((p) => p.id === trip.dealId);
  const owner = state.shops.find((s) => s.id === stop.shopId);
  const backup = deal?.commitments.find((c) => c.shopId === stop.shopId)?.prefs?.backupName;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const since = stop.atPartnerAt ? new Date(stop.atPartnerAt) : new Date();
  const hoursLeft = Math.max(0, 72 - Math.floor((Date.now() - since.getTime()) / 3600000));

  async function handOver() {
    if (code.length !== 4) return setError("Enter 4 digits.");
    setBusy(true);
    setError("");
    const meta = await dispatch({ type: "PARTNER_HANDOVER", partnerShopId, tripId: trip.id, shopId: stop.shopId, code });
    setBusy(false);
    if (meta.error) setError(meta.error);
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">
            {stop.shopName} · {stop.qty} × {deal?.productName}
          </p>
          <p className="text-xs text-ink/55">
            {owner?.ownerName}
            {backup ? ` (or ${backup})` : ""} ·{" "}
            {owner?.phone && (
              <a href={`tel:${owner.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-0.5 font-medium text-ember-dark">
                <Phone size={10} /> {owner.phone}
              </a>
            )}
          </p>
        </div>
        <span className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", hoursLeft < 24 ? "bg-amber-100 text-amber-800" : "bg-ink/5 text-ink/60")}>
          <Clock size={11} /> {hoursLeft}h left
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          placeholder="Code"
          className="input max-w-[160px] text-center font-mono text-lg tracking-[0.3em]"
          aria-label={`Delivery code for ${stop.shopName}`}
        />
        <button onClick={handOver} disabled={busy || code.length !== 4} className="btn-ember px-4 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Hand over
        </button>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {deal && (
        <p className="mt-2 text-[11px] text-ink/40">
          {showDemo ? (
            <>
              Code <span className="font-mono">{deal.deliveryCodes[stop.shopId]}</span> ·{" "}
              <button className="underline" onClick={() => setCode(deal.deliveryCodes[stop.shopId])}>
                fill it in
              </button>
            </>
          ) : (
            <button className="underline" onClick={() => setShowDemo(true)}>
              Demo: show code
            </button>
          )}
        </p>
      )}
    </div>
  );
}
