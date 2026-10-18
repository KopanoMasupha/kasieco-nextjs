"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Sparkles, Truck, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Plus, CalendarDays } from "lucide-react";
import { Deal, Driver, Shop, Trip, Wholesaler, DAY_SHORT } from "@/lib/types";
import { daysText, deliverBy } from "@/lib/delivery";
import { planDelivery, buildTrip, splitFees, DraftTrip } from "@/lib/planner";
import { formatCents } from "@/lib/pot";
import { useStore, useMe } from "@/lib/store";
import RouteSketch, { TRIP_COLOURS } from "./RouteSketch";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * AI delivery planner. Suggests trips (who drives, which shops, in which
 * order, at what time) and explains why. The admin can swap drivers or move a
 * shop to another trip; every change is re-checked for weight and time.
 */
export default function DeliveryPlanner({ deal, wholesaler, shops, drivers, allTrips }: { deal: Deal; wholesaler: Wholesaler; shops: Shop[]; drivers: Driver[]; allTrips: Trip[] }) {
  const { dispatch } = useStore();
  const me = useMe();
  // suggest the first day (from tomorrow) that suits the most shops' chosen delivery days
  const suggested = useMemo(() => {
    let best = addDays(todayISO(), 1);
    let bestN = -1;
    for (let i = 1; i <= 7; i++) {
      const d = addDays(todayISO(), i);
      const wd = new Date(d + "T12:00:00").getDay();
      if (wd === 0) continue;
      const n = deal.commitments.filter((c) => (c.prefs?.days ?? [1, 2, 3, 4, 5]).includes(wd)).length;
      if (n > bestN) {
        best = d;
        bestN = n;
      }
    }
    return { date: best, n: bestN };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);
  const [date, setDate] = useState(suggested.date);
  const [startTime, setStartTime] = useState("08:00");
  const [version, setVersion] = useState(0);
  const [assign, setAssign] = useState<Record<string, number>>({});
  const [driverFor, setDriverFor] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const busyIds = useMemo(() => new Set(allTrips.filter((t) => t.date === date && t.status !== "completed").map((t) => t.driverId)), [allTrips, date]);

  // the AI's suggestion
  const plan = useMemo(
    () => planDelivery({ deal, shops, drivers, wholesaler, busyDriverIds: busyIds, date, startTime }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deal.id, deal.commitments.length, date, startTime, version, busyIds.size]
  );

  // start from the suggestion whenever it changes
  useEffect(() => {
    const a: Record<string, number> = {};
    plan.trips.forEach((t, i) => t.stops.forEach((s) => (a[s.shopId] = i)));
    setAssign(a);
    setDriverFor(plan.trips.map((t) => t.driverId));
    setError("");
  }, [plan]);

  // the plan as edited by the admin
  const edited: DraftTrip[] = useMemo(() => {
    const out: DraftTrip[] = [];
    driverFor.forEach((driverId, i) => {
      const driver = drivers.find((d) => d.id === driverId);
      const stops = deal.commitments.filter((c) => assign[c.shopId] === i).map((c) => ({ shop: shops.find((s) => s.id === c.shopId)!, qty: c.qty }));
      if (!driver || !stops.length) return;
      out.push(buildTrip({ deal, wholesaler, driver, stops, date, startTime }));
    });
    return splitFees(deal, out);
  }, [driverFor, assign, deal, shops, drivers, wholesaler, date, startTime]);

  const unassigned = deal.commitments.filter((c) => assign[c.shopId] === undefined || !driverFor[assign[c.shopId]]);
  const dupDriver = new Set(driverFor.filter(Boolean)).size !== driverFor.filter(Boolean).length;
  const weekday = new Date(date + "T12:00:00").getDay();
  const dayClash = deal.commitments.filter((c) => !(c.prefs?.days ?? [1, 2, 3, 4, 5]).includes(weekday));
  const by = deliverBy(deal);
  const late = by && new Date(date + "T23:59:00") > by;
  const softWarnings = [
    ...(weekday === 0 ? ["Deliveries run Monday to Saturday."] : []),
    ...dayClash.map((c) => `${c.shopName} said they can't receive on ${DAY_SHORT[weekday]}s (they chose ${daysText(c.prefs!.days)}). Pick another day, or call them first.`),
    ...(late && by ? [`This is after the promised delivery date (${by.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}). Tell the shops why, or pick an earlier day.`] : []),
  ];
  const problems = [
    ...edited.flatMap((t) => t.warnings.map((w) => `${t.driverName}: ${w}`)),
    ...(unassigned.length ? [`No driver yet for: ${unassigned.map((u) => u.shopName).join(", ")}.`] : []),
    ...(dupDriver ? ["Same driver on two trips."] : []),
  ];
  const heavy = edited.some((t) => t.loadKg > t.capacityKg);
  const changed = JSON.stringify(edited.map((t) => [t.driverId, t.stops.map((s) => s.shopId)])) !== JSON.stringify(plan.trips.map((t) => [t.driverId, t.stops.map((s) => s.shopId)]));

  function addTrip() {
    const free = drivers.find((d) => !busyIds.has(d.id) && !driverFor.includes(d.id));
    if (!free) return setError("No free drivers this day.");
    setDriverFor((d) => [...d, free.id]);
  }

  async function confirm() {
    setBusy(true);
    setError("");
    const meta = await dispatch({
      type: "ADMIN_ASSIGN_TRIPS",
      dealId: deal.id,
      adminName: me?.name.split(" (")[0] ?? "Admin",
      date,
      startTime,
      trips: edited.map((t) => ({ driverId: t.driverId, shopIds: t.stops.map((s) => s.shopId) })),
    });
    setBusy(false);
    if (meta.error) setError(meta.error);
  }

  const totalKg = deal.commitments.reduce((s, c) => s + c.qty * deal.unitWeightKg, 0);

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Sparkles size={18} className="text-ember" /> Plan delivery
        </h2>
        <p className="text-sm text-ink/55">
          AI-planned · {Math.round(totalKg)} kg · edit anything before booking.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="label flex items-center gap-1">
            <CalendarDays size={13} /> Delivery day
          </span>
          <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className="input !w-auto" />
        </label>
        <label className="text-sm">
          <span className="label">Start time</span>
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input !w-auto">
            {["06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "10:00", "11:00", "12:00"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setVersion((v) => v + 1)} className="btn-outline px-4 py-2.5 text-sm" title="Re-plan">
          <RefreshCw size={14} /> {changed ? "Undo" : "Re-plan"}
        </button>
      </div>

      <p className="text-xs text-ink/55">
        Suggested day: <strong>{new Date(suggested.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</strong> — {suggested.n} of {deal.commitments.length} shops can receive that day
        {by ? <> · promised by {by.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</> : null}. Morning and afternoon choices are built into each shop's time slot.
      </p>
      {softWarnings.length > 0 && (
        <ul className="space-y-1 rounded-xl2 bg-amber-50 p-3 text-xs text-amber-900">
          {softWarnings.map((w, i) => (
            <li key={i} className="flex gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl2 bg-ink/[0.03] p-3 text-sm">
        <p className="mb-1 text-xs font-semibold text-ink/50">Why the planner chose this</p>
        <ul className="list-disc space-y-0.5 pl-5 text-ink/70">
          {plan.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      {edited.length > 0 && <RouteSketch pickup={{ ...wholesaler }} trips={edited} />}

      <div className="grid gap-3 xl:grid-cols-2">
        {driverFor.map((driverId, i) => {
          const t = edited.find((x) => x.driverId === driverId && x.stops.some((s) => assign[s.shopId] === i));
          const colour = TRIP_COLOURS[edited.indexOf(t!) >= 0 ? edited.indexOf(t!) % TRIP_COLOURS.length : 0];
          const driver = drivers.find((d) => d.id === driverId);
          const pct = t && driver ? Math.round((t.loadKg / driver.capacityKg) * 100) : 0;
          return (
            <div key={i} className="rounded-xl2 border border-ink/10 bg-sand-50 p-4" style={{ borderLeft: `4px solid ${colour}` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  <Truck size={15} /> Trip {i + 1}
                </p>
                <label className="text-xs">
                  <span className="sr-only">Driver for trip {i + 1}</span>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverFor((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
                    className="input !w-auto py-1.5 text-xs"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} disabled={busyIds.has(d.id)}>
                        {d.name} · {d.vehicle} ({d.capacityKg} kg){busyIds.has(d.id) ? " — busy this day" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {t ? (
                <>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-ink/55">
                      <span>
                        Load {t.loadKg} kg of {t.capacityKg} kg
                      </span>
                      <span className={clsx("font-semibold", pct > 100 ? "text-red-600" : "text-leaf")}>{pct > 100 ? "TOO HEAVY" : `${pct}% full`}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                      <div className={clsx("h-full rounded-full", pct > 100 ? "bg-red-500" : "bg-leaf")} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-ink/55">
                    Collect at {t.pickup.name}, {t.pickup.window} · driver earns {formatCents(t.feeCents)}
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {t.stops.map((s, si) => (
                      <li key={s.shopId} className="flex items-center gap-2 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: colour }}>
                          {si + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{s.shopName}</span>
                          <span className="text-xs text-ink/45">
                            {s.township} · {s.qty} units · {s.weightKg} kg · <strong className="text-ink/70">{s.window}</strong>
                          </span>
                        </span>
                        {driverFor.length > 1 && (
                          <select
                            value={i}
                            onChange={(e) => setAssign((a) => ({ ...a, [s.shopId]: +e.target.value }))}
                            className="input !w-auto shrink-0 py-1 text-[11px]"
                            aria-label={`Move ${s.shopName} to another trip`}
                          >
                            {driverFor.map((_, j) => (
                              <option key={j} value={j}>
                                {j === i ? "Keep" : `Move to trip ${j + 1}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="mt-2 text-xs text-ink/45">No shops yet.</p>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addTrip} className="btn-outline px-4 py-2 text-sm">
        <Plus size={14} /> Add another driver
      </button>

      {problems.length > 0 ? (
        <ul className="space-y-1.5 rounded-xl2 bg-amber-50 p-3 text-sm text-amber-800">
          {problems.map((p, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-xl2 bg-leaf/10 p-3 text-sm font-medium text-leaf">
          <CheckCircle2 size={16} /> All shops covered, loads fit, slots in opening hours.
        </p>
      )}
      {plan.warnings.length > 0 && !plan.ok && <p className="text-xs text-red-600">{plan.warnings[0]}</p>}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button onClick={confirm} disabled={busy || heavy || unassigned.length > 0 || dupDriver || !edited.length} className="btn-ember w-full py-3.5 text-sm">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Book these {edited.length} driver{edited.length === 1 ? "" : "s"}
      </button>
      {heavy && <p className="text-center text-xs text-red-600">A vehicle is overloaded.</p>}
    </section>
  );
}
