"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Eye, KeyRound, Loader2, MapPin, Navigation, Phone, RotateCcw, Store, Warehouse } from "lucide-react";
import { Pool, Trip, TripStop, REDELIVERY_FEE_CENTS } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { units } from "@/lib/units";
import { missedText, lowerFirst } from "@/lib/delivery";
import { distanceKm, formatDistance } from "@/lib/geo";

const directions = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const FAIL_REASONS = ["Owner is not there", "Shop is closed", "Can't find the shop", "Owner gave a wrong code", "Owner doesn't want the stock", "I ran out of time"];

/**
 * One stop on the driver's route. Hand over with the owner's (or backup
 * person's) code — or, if nobody can receive, follow exactly what the owner
 * chose: come back later, leave it at their partner shop, or take it back.
 */
export default function StopCard({ stop, n, isNext, trip, deal }: { stop: TripStop; n: number; isNext: boolean; trip: Trip; deal?: Pool }) {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === stop.shopId);
  const prefs = deal?.commitments.find((c) => c.shopId === stop.shopId)?.prefs;
  const partner = prefs?.ifMissed === "partner" ? state.shops.find((s) => s.id === prefs.partnerShopId) : undefined;
  const unit = deal?.unitLabel ?? "unit";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [dropCode, setDropCode] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [openChoice, setOpen] = useState<boolean | null>(null);
  const open = openChoice ?? isNext; // the next stop is always open
  const ownerFault = /not there|closed|doesn't want/i.test(reason);
  const returnIsMain = !prefs || prefs.ifMissed === "next-run" || prefs.ifMissed === "collect" || (prefs.ifMissed === "retry-later" && stop.attempts >= 2);

  async function send(action: any) {
    setBusy(true);
    setError("");
    const meta = await dispatch(action);
    setBusy(false);
    if (meta.error) setError(meta.error);
    else {
      setFailing(false);
      setCode("");
    }
  }

  if (stop.status !== "pending") {
    const text =
      stop.status === "delivered"
        ? `Handed over ${stop.deliveredAt ? new Date(stop.deliveredAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : ""} · code checked${stop.handedTo === "backup" ? ` · to ${prefs?.backupName}` : ""}`
        : stop.status === "at-partner"
        ? `Missed (${stop.missReason}) · left at ${stop.partnerShopName}, drop code checked`
        : `Missed (${stop.missReason}) · taken back to the wholesaler`;
    return (
      <div className={clsx("card flex items-center gap-3 p-4 text-sm", stop.status === "delivered" ? "opacity-70" : "border-amber-300")}>
        <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white", stop.status === "delivered" ? "bg-leaf" : "bg-amber-500")}>
          {stop.status === "delivered" ? <CheckCircle2 size={16} /> : stop.status === "at-partner" ? <Store size={15} /> : <Warehouse size={15} />}
        </span>
        <span className="flex-1">
          <span className="font-semibold text-ink">{stop.shopName}</span>
          <span className="block text-xs text-ink/50">{text}</span>
        </span>
        {stop.feeCents > 0 && <span className="text-xs font-semibold text-leaf">+{formatCents(stop.feeCents)}</span>}
      </div>
    );
  }

  return (
    <div className={clsx("card p-4", isNext ? "border-ember/40 shadow-lg" : "")}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold", isNext ? "bg-ember text-white" : "bg-ink/5 text-ink/50")}>{n}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {isNext && <span className="mr-1 text-xs font-bold text-ember-dark">NEXT ·</span>}
            {stop.shopName}
            {stop.attempts > 1 && <span className="ml-1 text-xs font-bold text-amber-700">(2nd try)</span>}
          </span>
          <span className="text-xs text-ink/55">
            {stop.township} · {stop.window} · {stop.qty} {units(unit, stop.qty)}
          </span>
        </span>
        <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", stop.confirmed ? "bg-leaf/10 text-leaf" : "bg-amber-100 text-amber-800")}>{stop.confirmed ? "✓ CONFIRMED" : "NOT CONFIRMED"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl2 bg-sand-50 p-3 text-sm">
            <p className="text-ink/70">
              Owner: <strong>{shop?.ownerName}</strong>
              {prefs?.backupName && (
                <>
                  {" "}
                  · may also receive: <strong>{prefs.backupName}</strong> {prefs.backupPhone && <span className="text-xs">({prefs.backupPhone})</span>}
                </>
              )}
            </p>
            <p className="flex items-start gap-1 text-ink/60">
              <MapPin size={13} className="mt-0.5 shrink-0" /> {shop?.address ?? stop.township}
            </p>
            <p className="mt-1 text-xs text-ink/55">
              If nobody can receive: <strong className="text-ink/75">{missedText(prefs, state.shops, shop)}</strong>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={directions(stop.lat, stop.lng)} target="_blank" rel="noreferrer" className="btn-outline px-3 py-2 text-xs">
                <Navigation size={13} /> Directions
              </a>
              {shop?.phone && (
                <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="btn-outline px-3 py-2 text-xs">
                  <Phone size={13} /> Call the owner
                </a>
              )}
            </div>
          </div>

          {!failing ? (
            <>
              <label className="block">
                <span className="label flex items-center gap-1">
                  <KeyRound size={13} /> Count, then enter their code
                </span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setError("");
                  }}
                  placeholder="• • • •"
                  className="input text-center font-mono text-2xl tracking-[0.5em]"
                  aria-label={`Delivery code for ${stop.shopName}`}
                />
                {prefs?.backupName && <span className="mt-1 block text-[11px] text-ink/45">{prefs.backupName}'s code also works.</span>}
              </label>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button onClick={() => send({ type: "DRIVER_DELIVER", tripId: trip.id, driverId: trip.driverId, shopId: stop.shopId, code })} disabled={busy || code.length !== 4} className="btn-ember w-full py-3.5 text-sm">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Hand over {stop.qty} {units(unit, stop.qty)}
              </button>
              <button onClick={() => setFailing(true)} className="flex w-full items-center justify-center gap-1.5 py-1 text-sm font-medium text-red-600">
                <AlertTriangle size={14} /> Can't deliver
              </button>
              {deal && (
                <div className="rounded-lg border border-dashed border-ink/15 px-3 py-2 text-xs text-ink/50">
                  {showDemo ? (
                    <span>
                      Code <strong className="font-mono text-ink">{deal.deliveryCodes[stop.shopId]}</strong>{" "}
                      <button className="underline" onClick={() => setCode(deal.deliveryCodes[stop.shopId])}>
                        fill it in
                      </button>
                      {deal.backupCodes?.[stop.shopId] && (
                        <>
                          {" "}
                          · backup <strong className="font-mono text-ink">{deal.backupCodes[stop.shopId]}</strong>
                        </>
                      )}
                    </span>
                  ) : (
                    <button onClick={() => setShowDemo(true)} className="flex items-center gap-1">
                      <Eye size={12} /> Demo: show code
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 rounded-xl2 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">What happened?</p>
              <div className="flex flex-wrap gap-1.5">
                {FAIL_REASONS.map((r) => (
                  <button key={r} onClick={() => setReason(r)} className={clsx("rounded-full px-3 py-1.5 text-xs font-medium", reason === r ? "bg-red-600 text-white" : "bg-white text-ink/70")}>
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold text-red-700">Owner chose: {lowerFirst(missedText(prefs, state.shops, shop))}</p>
              {stop.confirmed && ownerFault && (
                <p className="rounded-lg bg-white px-3 py-2 text-xs text-ink/70">They confirmed, so a {formatCents(REDELIVERY_FEE_CENTS)} fee applies.</p>
              )}

              {prefs?.ifMissed === "retry-later" && stop.attempts < 2 && (
                <button onClick={() => send({ type: "DRIVER_MISSED", tripId: trip.id, driverId: trip.driverId, shopId: stop.shopId, reason, action: "retry-later" })} disabled={busy} className="btn-dark w-full py-3 text-sm">
                  <RotateCcw size={14} /> Come back later today
                </button>
              )}

              {prefs?.ifMissed === "partner" && partner && (
                <div className="space-y-2 rounded-xl bg-white p-3 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-ink">
                    <Store size={14} /> Leave it at {partner.name}
                  </p>
                  <p className="text-xs text-ink/60">
                    {partner.address} · {formatDistance(distanceKm(stop.lat, stop.lng, partner.lat, partner.lng))} · count with {partner.ownerName}, get drop code
                  </p>
                  <a href={directions(partner.lat, partner.lng)} target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">
                    <Navigation size={12} /> Directions
                  </a>
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={dropCode}
                      onChange={(e) => setDropCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Drop code"
                      className="input max-w-[150px] text-center font-mono tracking-[0.3em]"
                      aria-label={`${partner.name} drop code`}
                    />
                    <button onClick={() => send({ type: "DRIVER_LEAVE_AT_PARTNER", tripId: trip.id, driverId: trip.driverId, shopId: stop.shopId, reason, code: dropCode })} disabled={busy || dropCode.length !== 4} className="btn-dark flex-1 px-3 text-sm">
                      Leave it here
                    </button>
                  </div>
                  {showDemo && partner.partner ? (
                    <p className="text-[11px] text-ink/45">
                      Drop code <span className="font-mono">{partner.partner.dropCode}</span> ·{" "}
                      <button className="underline" onClick={() => setDropCode(partner.partner!.dropCode)}>
                        fill it in
                      </button>
                    </p>
                  ) : (
                    <button onClick={() => setShowDemo(true)} className="text-[11px] text-ink/45 underline">
                      Demo: show the drop code
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => send({ type: "DRIVER_MISSED", tripId: trip.id, driverId: trip.driverId, shopId: stop.shopId, reason, action: "return" })}
                disabled={busy}
                className={clsx("w-full py-3 text-sm", returnIsMain ? "btn-dark" : "btn-outline")}
              >
                <Warehouse size={14} />{" "}
                {prefs?.ifMissed === "collect"
                  ? "Take it back to the wholesaler"
                  : prefs?.ifMissed === "partner"
                  ? "Partner closed? Take it back to the wholesaler"
                  : prefs?.ifMissed === "retry-later" && stop.attempts < 2
                  ? "Or take it back to the wholesaler"
                  : "Take it back to the wholesaler"}
              </button>
              <p className="text-[11px] text-ink/50">No code, no hand-over.</p>
              {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-red-600">{error}</p>}
              <button onClick={() => setFailing(false)} className="w-full text-center text-sm text-ink/50 underline">
                Back — the owner is here after all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
