"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, Loader2, Navigation, Truck, PackageCheck, Send, Clock, Weight, PartyPopper } from "lucide-react";
import StopCard from "@/components/driver/StopCard";
import { useStore, useLiveRefresh, useMyDriver } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { TripStop } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";
import { units } from "@/lib/units";

const directions = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
const QUICK = ["I'm at the wholesaler now", "I'm running about 30 minutes late", "My vehicle has a problem", "The wholesaler is short on stock"];

export default function DriverTripPage({ params }: { params: { id: string } }) {
  useLiveRefresh(4000);
  const { state, dispatch, loading } = useStore();
  const driver = useMyDriver();
  const trip = state.trips.find((t) => t.id === params.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  if (!trip || !driver) {
    if (loading) return <PageSkeleton />;
    return (
      <div className="card p-6 text-sm">
        Trip not found.{" "}
        <Link href="/driver" className="font-semibold text-ember-dark">
          Back to my trips
        </Link>
      </div>
    );
  }
  if (trip.driverId !== driver.id) return <div className="card p-6 text-sm">This trip belongs to another driver.</div>;

  const deal = state.pools.find((p) => p.id === trip.dealId);
  const delivered = trip.stops.filter((s) => s.status !== "pending").length;
  const nextStop = trip.stops.find((s) => s.status === "pending");
  const allLoaded = trip.stops.every((s) => loaded[s.shopId]);
  const pct = Math.round((trip.loadKg / trip.capacityKg) * 100);

  async function act(key: string, action: any) {
    setBusy(key);
    setError("");
    const meta = await dispatch(action);
    setBusy(null);
    if (meta.error) setError(meta.error);
    return meta;
  }

  async function sendMsg(text: string) {
    if (!text.trim()) return;
    setBusy("msg");
    await dispatch({ type: "SEND_MESSAGES", fromRole: "driver", fromName: driver!.name, dealId: trip!.dealId, tripId: trip!.id, messages: [{ toRole: "admin", toId: "admin", text: `${trip!.driverName}: ${text.trim()}` }] });
    setBusy(null);
    setMsg("");
    setSent(true);
  }

  const stepNo = trip.status === "assigned" ? 1 : trip.status === "accepted" ? 2 : trip.status === "collected" ? 3 : 4;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/driver" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> My trips
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-ink">{new Date(trip.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</h1>
        <p className="text-sm text-ink/55">
          {deal?.productName} · {trip.stops.length} shop{trip.stops.length === 1 ? "" : "s"} ·{" "}
          {trip.paidBy === "kasieco" ? `re-delivery — MzansiConnect pays you ${formatCents(trip.feeCents)}` : `you earn ${formatCents(trip.feeCents)}, paid stop by stop`}
        </p>
      </div>

      {/* step bar */}
      <ol className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
        {["Accept", "Collect", "Deliver", "Done"].map((l, i) => (
          <li key={l} className={clsx("rounded-xl py-2 font-semibold", i + 1 < stepNo ? "bg-leaf text-white" : i + 1 === stepNo ? "bg-ember text-white" : "bg-ink/5 text-ink/40")}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>

      {error && <p className="rounded-xl2 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      {/* STEP 1 — accept */}
      {trip.status === "assigned" && (
        <section className="card space-y-3 border-ember/30 p-5">
          <h2 className="text-lg font-bold text-ink">New trip</h2>
          <TripFacts trip={trip} pct={pct} />
          <button onClick={() => act("accept", { type: "DRIVER_ACCEPT", tripId: trip.id, driverId: driver.id })} disabled={!!busy} className="btn-ember w-full py-4 text-base">
            {busy === "accept" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Accept this trip
          </button>
        </section>
      )}

      {/* STEP 2 — collect */}
      {trip.status === "accepted" && (
        <section className="card space-y-3 border-ember/30 p-5">
          <h2 className="text-lg font-bold text-ink">Step 2: Collect the stock</h2>
          <div className="rounded-xl2 bg-sand-50 p-3 text-sm">
            <p className="font-semibold text-ink">{trip.pickup.name}</p>
            <p className="text-ink/60">{trip.pickup.address}</p>
            <p className="mt-1 flex items-center gap-1 text-ink/70">
              <Clock size={13} /> Be there {trip.pickup.window}
              {deal?.poNumber && (
                <>
                  {" "}
                  · quote order <strong className="font-mono">{deal.poNumber}</strong>
                </>
              )}
            </p>
            <a href={directions(trip.pickup.lat, trip.pickup.lng)} target="_blank" rel="noreferrer" className="btn-outline mt-2 px-3 py-2 text-xs">
              <Navigation size={13} /> Directions
            </a>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-ink">Tick each load:</p>
            <ul className="space-y-1.5">
              {trip.stops.map((s, i) => (
                <li key={s.shopId}>
                  <label className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", loaded[s.shopId] ? "border-leaf/30 bg-leaf/5" : "border-ink/10 bg-sand-50")}>
                    <input type="checkbox" className="h-5 w-5" checked={!!loaded[s.shopId]} onChange={(e) => setLoaded((l) => ({ ...l, [s.shopId]: e.target.checked }))} />
                    <span className="flex-1">
                      <strong>
                        {s.qty} {units(deal?.unitLabel ?? "unit", s.qty)}
                      </strong>{" "}
                      for stop {i + 1}, {s.shopName}
                    </span>
                    <span className="text-xs text-ink/45">{s.weightKg} kg</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <LoadBar loadKg={trip.loadKg} capacityKg={trip.capacityKg} pct={pct} />
          <button onClick={() => act("collect", { type: "DRIVER_COLLECT", tripId: trip.id, driverId: driver.id })} disabled={!!busy || !allLoaded} className="btn-ember w-full py-4 text-base">
            {busy === "collect" ? <Loader2 size={17} className="animate-spin" /> : <PackageCheck size={17} />} Collected — start route
          </button>
          {!allLoaded && <p className="text-center text-xs text-ink/45">Tick every line above first.</p>}
        </section>
      )}

      {/* STEP 3 — deliver */}
      {trip.status === "collected" && (
        <section className="space-y-3">
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink">
              Deliveries · {delivered}/{trip.stops.length}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/5">
              <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${(delivered / trip.stops.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink/55">Count → get code → hand over.</p>
          </div>
          {trip.stops.map((s, i) => (
            <StopCard key={s.shopId} stop={s} n={i + 1} isNext={nextStop?.shopId === s.shopId} trip={trip} deal={deal} />
          ))}
        </section>
      )}

      {/* DONE */}
      {trip.status === "completed" && (
        <section className="card flex items-center gap-4 border-leaf/30 p-5">
          <PartyPopper size={30} className="shrink-0 text-leaf" />
          <div>
            <p className="text-lg font-bold text-ink">Trip done</p>
            <p className="text-sm text-ink/60">
              Nothing is left on your vehicle: {trip.stops.filter((s) => s.status === "delivered").length} delivered
              {trip.stops.some((s) => s.status === "at-partner") ? `, ${trip.stops.filter((s) => s.status === "at-partner").length} left at a partner shop` : ""}
              {trip.stops.some((s) => s.status === "returned" || s.status === "rebooked") ? `, ${trip.stops.filter((s) => s.status === "returned" || s.status === "rebooked").length} taken back to the wholesaler` : ""}. You were paid {formatCents(trip.feeCents)}
              {trip.paidBy === "kasieco" ? " by MzansiConnect" : ""}.
            </p>
          </div>
        </section>
      )}

      {/* talk to admin */}
      <section className="card p-5">
        <h2 className="font-semibold text-ink">Talk to MzansiConnect</h2>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button key={q} onClick={() => sendMsg(q)} disabled={busy === "msg"} className="rounded-full bg-sand-50 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-sand-100">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg(msg)} placeholder="Type a message to the admin…" className="input py-2.5 text-sm" aria-label="Message to admin" />
          <button onClick={() => sendMsg(msg)} disabled={busy === "msg" || !msg.trim()} className="btn-dark shrink-0 px-4 text-sm" aria-label="Send">
            {busy === "msg" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {sent && <p className="mt-2 text-xs font-semibold text-leaf">Sent to the admin.</p>}
      </section>
    </div>
  );
}

function LoadBar({ loadKg, capacityKg, pct }: { loadKg: number; capacityKg: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-ink/55">
        <span className="flex items-center gap-1">
          <Weight size={12} /> Load {loadKg} kg — your vehicle carries {capacityKg} kg
        </span>
        <span className={clsx("font-semibold", pct > 100 ? "text-red-600" : "text-leaf")}>{pct > 100 ? "Too heavy!" : `${pct}% full — safe`}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/5">
        <div className={clsx("h-full rounded-full", pct > 100 ? "bg-red-500" : "bg-leaf")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function TripFacts({ trip, pct }: { trip: any; pct: number }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl2 bg-sand-50 p-3">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <Truck size={14} /> Collect at {trip.pickup.name}, {trip.pickup.window}
        </p>
        <p className="text-xs text-ink/55">{trip.pickup.address}</p>
      </div>
      <ol className="space-y-1.5">
        {trip.stops.map((s: TripStop, i: number) => (
          <li key={s.shopId} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/5 text-[11px] font-bold text-ink/60">{i + 1}</span>
            <span className="flex-1">
              {s.shopName} <span className="text-xs text-ink/45">· {s.township}</span>
              {s.confirmed && <span className="ml-1 text-[10px] font-bold text-leaf">✓ confirmed</span>}
            </span>
            <span className="text-xs font-semibold text-ink/70">{s.window}</span>
          </li>
        ))}
      </ol>
      <LoadBar loadKg={trip.loadKg} capacityKg={trip.capacityKg} pct={pct} />
    </div>
  );
}
