"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Truck, Weight, MapPin, CheckCircle2, Wallet } from "lucide-react";
import { useStore, useLiveRefresh, useMyDriver } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { Trip } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";

function tripStatusText(t: Trip) {
  const done = t.stops.filter((s) => s.status === "delivered").length;
  if (t.status === "assigned") return "New — tap to accept";
  if (t.status === "accepted") return "Accepted — go and collect";
  if (t.status === "collected") return `On the road · ${done}/${t.stops.length}`;
  return "Finished — you've been paid";
}

export default function DriverHome() {
  useLiveRefresh(4000);
  const { state, loading } = useStore();
  const driver = useMyDriver();
  if (!driver) return loading ? <PageSkeleton /> : null;

  const mine = state.trips.filter((t) => t.driverId === driver.id);
  const active = mine.filter((t) => t.status !== "completed").sort((a, b) => a.date.localeCompare(b.date));
  const done = mine.filter((t) => t.status === "completed");
  const earned = done.reduce((s, t) => s + t.feeCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink/50">Sawubona, {driver.name.split(" ")[0]}</p>
        <h1 className="text-3xl font-bold text-ink">My trips</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="flex items-center gap-1 text-xs text-ink/45">
            <Truck size={12} /> My vehicle
          </p>
          <p className="font-bold text-ink">{driver.vehicle}</p>
          <p className="font-mono text-xs text-ink/45">{driver.plate}</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1 text-xs text-ink/45">
            <Weight size={12} /> Carries up to
          </p>
          <p className="text-xl font-extrabold text-ink">{driver.capacityKg.toLocaleString("en-ZA")} kg</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1 text-xs text-ink/45">
            <Wallet size={12} /> Paid to me so far
          </p>
          <p className="text-xl font-extrabold text-leaf">{formatCents(earned)}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">Trips to do ({active.length})</h2>
        <div className="space-y-3">
          {active.map((t) => (
            <TripRow key={t.id} t={t} productName={state.pools.find((p) => p.id === t.dealId)?.productName} />
          ))}
          {active.length === 0 && <div className="card p-6 text-sm text-ink/50">No trips right now.</div>}
        </div>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-ink">Finished trips</h2>
          <div className="space-y-2">
            {done.map((t) => (
              <TripRow key={t.id} t={t} productName={state.pools.find((p) => p.id === t.dealId)?.productName} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TripRow({ t, productName }: { t: Trip; productName?: string }) {
  const towns = Array.from(new Set(t.stops.map((s) => s.township)));
  return (
    <Link href={`/driver/trips/${t.id}`} className={clsx("card flex items-center gap-4 p-4 hover:shadow-lg", t.status === "assigned" && "border-ember/40")}>
      <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", t.status === "completed" ? "bg-leaf/10 text-leaf" : "bg-ember text-white")}>
        {t.status === "completed" ? <CheckCircle2 size={20} /> : <Truck size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">
          {new Date(t.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })} · {productName}
        </span>
        <span className="flex flex-wrap gap-x-3 text-xs text-ink/55">
          <span>Start {t.startTime} at {t.pickup.name}</span>
          <span className="flex items-center gap-0.5">
            <MapPin size={11} /> {t.stops.length} shops in {towns.join(", ")}
          </span>
          <span>{t.loadKg} kg</span>
          <span>pays {formatCents(t.feeCents)}</span>
        </span>
        <span className={clsx("mt-1 block text-xs font-semibold", t.status === "assigned" ? "text-ember-dark" : t.status === "completed" ? "text-leaf" : "text-ink/70")}>{tripStatusText(t)}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-ink/30" />
    </Link>
  );
}
