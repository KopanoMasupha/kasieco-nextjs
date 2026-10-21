"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, KeyRound, MapPin, PackageCheck, Repeat, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { CourierJob } from "@/lib/types";

export default function CourierRunCard({ job, driverId }: { job: CourierJob; driverId: string }) {
  const { state, dispatch } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = job.legs.findIndex((leg) => leg.status !== "delivered");
  const leg = active >= 0 ? job.legs[active] : null;
  const done = job.status === "delivered";

  async function run(action: Parameters<typeof dispatch>[0]) {
    setBusy(true);
    setError("");
    const result = await dispatch(action);
    setBusy(false);
    if (result.error) setError(result.error);
    else setCode("");
  }

  return (
    <div className={clsx("card space-y-3 p-4", job.status === "assigned" && "border-ember/40")} data-testid="courier-run">
      <div className="flex items-start gap-3">
        <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", done ? "bg-leaf/10 text-leaf" : "bg-[#0B3D3A] text-white")}>
          {done ? <CheckCircle2 size={20} /> : job.legs.length > 1 ? <Repeat size={20} /> : <Truck size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Shop-to-shop run · {new Date(job.day + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</p>
          <p className="text-xs text-ink/55">{job.window} · {job.distanceKm} km{job.legs.length > 1 ? " each way" : ""} · pays {formatCents(job.feeCents)} · {job.ref}</p>
          <p className={clsx("mt-0.5 text-xs font-semibold", job.status === "assigned" ? "text-ember-dark" : done ? "text-leaf" : "text-ink/70")}>
            {job.status === "assigned" ? "New — accept to confirm" : done ? "Finished — TradeSafe has paid you" : job.status === "accepted" ? "Accepted — go and collect" : job.status === "on-the-way" ? "On the road" : "Waiting for the fee to be paid"}
          </p>
        </div>
      </div>

      <ol className="space-y-1.5 text-sm">
        {job.legs.map((item, index) => {
          const from = state.shops.find((shop) => shop.id === item.fromShopId);
          const to = state.shops.find((shop) => shop.id === item.toShopId);
          return (
            <li key={index} className={clsx("rounded-xl px-3 py-2", index === active && !done && "bg-sand-50")}>
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                {item.status === "delivered" ? <CheckCircle2 size={14} className="text-leaf" /> : <MapPin size={14} className="text-ink/35" />}
                {item.fromShopName} <ArrowRight size={12} className="text-ink/35" /> {item.toShopName}
              </p>
              <p className="ml-5 text-xs text-ink/50">{item.goods}{from && to ? ` · ${from.address ?? from.township} → ${to.address ?? to.township}` : ""}</p>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="flex flex-wrap items-center gap-2">
          {job.status === "assigned" && <button disabled={busy} onClick={() => run({ type: "COURIER_ACCEPT", jobId: job.id, driverId })} className="btn-ember min-h-11 px-4 text-sm">Accept run</button>}
          {leg && ["accepted", "on-the-way"].includes(job.status) && leg.status === "waiting" && (
            <button disabled={busy} onClick={() => run({ type: "COURIER_COLLECT", jobId: job.id, driverId, leg: active })} className="btn-dark min-h-11 px-4 text-sm">
              <PackageCheck size={15} /> Collected at {leg.fromShopName}
            </button>
          )}
          {leg?.status === "collected" && (
            <>
              <label className="relative">
                <span className="sr-only">Code from {leg.toShopName}</span>
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="4-digit code" className="input min-h-11 w-36 py-2.5 pl-8 text-sm" />
              </label>
              <button disabled={busy || code.length !== 4} onClick={() => run({ type: "COURIER_DELIVER", jobId: job.id, driverId, leg: active, code })} className="btn-ember min-h-11 px-4 text-sm">
                Hand over to {leg.toShopName}
              </button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
