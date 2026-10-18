"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, KeyRound, Loader2, PackageCheck, Pencil, Store, Truck, UserRound, Warehouse, X } from "lucide-react";
import { Pool, Shop } from "@/lib/types";
import { useStore } from "@/lib/store";
import { deliverBy, myStop, prefsSummary, prettyDay } from "@/lib/delivery";
import { distanceKm, formatDistance } from "@/lib/geo";
import { units } from "@/lib/units";
import DeliveryChoices, { PrefsDraft, DEFAULT_DRAFT, draftProblem } from "./DeliveryChoices";

/**
 * Everything an owner needs about their delivery for one deal: codes, the
 * booked day and slot, "I'll be there", what happens if they miss it, and
 * where their stock is if they did.
 */
export default function MyDeliveryCard({ pool, shop }: { pool: Pool; shop: Shop }) {
  const { state, dispatch } = useStore();
  const mine = pool.commitments.find((c) => c.shopId === shop.id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!mine || pool.status === "cancelled") return null;

  const found = myStop(state.trips, pool.id, shop.id);
  const trip = found?.trip;
  const stop = found?.stop;
  const code = pool.deliveryCodes[shop.id];
  const backupCode = pool.backupCodes?.[shop.id];
  const by = deliverBy(pool);
  const onVehicle = !!stop && stop.status === "pending" && trip?.status === "collected";
  const canEdit = !stop || (stop.status === "pending" && !onVehicle);
  const partner = stop?.partnerShopId ? state.shops.find((s) => s.id === stop.partnerShopId) : undefined;
  const wholesaler = state.wholesalers.find((w) => w.id === pool.wholesalerId);

  async function confirm() {
    setBusy(true);
    setError("");
    const meta = await dispatch({ type: "OWNER_CONFIRM", dealId: pool.id, shopId: shop.id });
    setBusy(false);
    if (meta.error) setError(meta.error);
  }

  let status: React.ReactNode;
  if (!stop) {
    status =
      pool.status === "open" ? (
        <p className="text-ink/60">Booked on one of your days once the deal fills.</p>
      ) : (
        <p className="text-ink/60">Booking a driver{by ? <> · <strong>by {prettyDay(by)}</strong></> : ""}</p>
      );
  } else if (stop.status === "delivered") {
    status = (
      <p className="flex items-center gap-1.5 font-semibold text-leaf">
        <CheckCircle2 size={15} />
        {stop.handedTo === "partner-pickup" ? `Collected from ${stop.partnerShopName}` : stop.handedTo === "wholesaler-pickup" ? `Collected at ${trip?.pickup.name}` : stop.handedTo === "backup" ? `Received by ${mine.prefs?.backupName ?? "your backup person"}` : "Delivered"}
        {stop.deliveredAt ? ` · ${new Date(stop.deliveredAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </p>
    );
  } else if (stop.status === "at-partner") {
    const km = partner ? distanceKm(shop.lat, shop.lng, partner.lat, partner.lng) : 0;
    status = (
      <div className="space-y-1 rounded-xl bg-amber-50 p-3 text-amber-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <Store size={15} /> Collect at {stop.partnerShopName}
        </p>
        <p className="text-sm">
          {partner?.address} · {formatDistance(km)}{stop.atPartnerAt ? ` · by ${prettyDay(new Date(new Date(stop.atPartnerAt).getTime() + 3 * 86400000))}` : ""}
        </p>
      </div>
    );
  } else if (stop.status === "returned") {
    status = stop.nextRun ? (
      <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 p-3 text-amber-900">
        <Warehouse size={15} className="mt-0.5 shrink-0" /> Missed ({stop.missReason}). Stock is safe at {trip?.pickup.name} — we're rebooking.
      </p>
    ) : (
      <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 p-3 text-amber-900">
        <Warehouse size={15} className="mt-0.5 shrink-0" /> Collect at {wholesaler?.name}, {wholesaler?.address}.
      </p>
    );
  } else {
    status = (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-ink/80">
          <Truck size={15} className="text-ember" /> {trip && prettyDay(trip.date)} · <strong>{stop.window}</strong>
        </p>
        <p className="text-ink/60">
          {trip?.driverName} · {trip?.vehicle}{onVehicle ? <> · <span className="font-semibold text-ember-dark">on the way</span></> : ""}
        </p>
        {stop.attempts > 1 && <p className="text-xs font-semibold text-amber-700">Second try, after the other stops.</p>}
        {stop.confirmed ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
            <CheckCircle2 size={15} /> Confirmed
          </p>
        ) : (
          <button onClick={confirm} disabled={busy} className="btn-ember w-full py-3 text-sm sm:w-auto sm:px-6">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} I'll be there
          </button>
        )}
      </div>
    );
  }

  return (
    <section className={clsx("card space-y-4 p-5", stop?.status === "delivered" ? "border-leaf/30" : "border-ember/30")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <PackageCheck size={18} className="text-ember" /> Your delivery · {mine.qty} {units(pool.unitLabel, mine.qty)}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          <div className="rounded-xl2 bg-ink p-4 text-center text-white">
            <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-white/60">
              <KeyRound size={12} /> Delivery code
            </p>
            <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.25em]">{code ?? "----"}</p>
          </div>
          {backupCode && (
            <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] text-ink/50">
                <UserRound size={11} /> {mine.prefs?.backupName}
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-ink">{backupCode}</p>
            </div>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {status}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="rounded-xl bg-sand-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-ink/60">

                {prefsSummary(mine.prefs, state.shops, shop)}
                {mine.prefs?.backupName && <> · backup: {mine.prefs.backupName}</>}
              </p>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ember-dark shadow-sm">
                  <Pencil size={11} /> Change
                </button>
              )}
            </div>
            {!canEdit && stop?.status === "pending" && <p className="mt-1 text-[11px] text-ink/45">Locked — driver on the way.</p>}
          </div>
          <p className="text-xs text-ink/50">Count your stock first, then give the code.</p>
        </div>
      </div>

      {editing && <EditChoices pool={pool} shop={shop} onClose={() => setEditing(false)} />}
    </section>
  );
}

function EditChoices({ pool, shop, onClose }: { pool: Pool; shop: Shop; onClose: () => void }) {
  const { dispatch } = useStore();
  const p = pool.commitments.find((c) => c.shopId === shop.id)?.prefs;
  const [draft, setDraft] = useState<PrefsDraft>(p ? { days: p.days, time: p.time, ifMissed: p.ifMissed, partnerShopId: p.partnerShopId, backupName: p.backupName, backupPhone: p.backupPhone } : DEFAULT_DRAFT);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const qty = pool.commitments.find((c) => c.shopId === shop.id)?.qty ?? 1;

  async function save() {
    const problem = draftProblem(draft, agreed);
    if (problem) return setError(problem);
    setBusy(true);
    const meta = await dispatch({ type: "OWNER_SET_PREFS", dealId: pool.id, shopId: shop.id, prefs: draft });
    setBusy(false);
    if (meta.error) return setError(meta.error);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Change delivery choices">
      <div className="glass-strong max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none !bg-white p-5 sm:rounded-b-xl2">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-ink">Delivery choices</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink/40 hover:bg-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <DeliveryChoices shop={shop} value={draft} onChange={(v) => { setDraft(v); setError(""); }} agreed={agreed} onAgree={setAgreed} units={qty} />
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button onClick={save} disabled={busy} className="btn-ember mt-4 w-full py-3.5 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save
        </button>
      </div>
    </div>
  );
}

