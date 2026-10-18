/**
 * Delivery planner ("AI assistant" for admins). Rule-based and explainable:
 * 1. Put each shop in its township group.
 * 2. Join nearby groups into one trip while the load fits a vehicle and the
 *    route can finish in daylight.
 * 3. Give each trip the smallest free vehicle that can carry it.
 * 4. Order the stops nearest-first from the wholesaler and work out a
 *    30-minute delivery window for every shop, checked against its opening hours.
 */
import { Deal, Driver, Shop, Trip, TripStop, Wholesaler } from "./types";
import { distanceKm } from "./geo";
import { allocate } from "./pot";
import { units } from "./units";

const ROAD_FACTOR = 1.35; // roads are longer than straight lines
const SPEED_KMH = 35; // township traffic
const LOADING_MIN = 30;
const UNLOAD_MIN = 15;
const MERGE_KM = 18; // groups closer than this can share a trip
const LATEST_FINISH = 17 * 60; // be done before shops get busy at dusk

export type DraftTrip = Omit<Trip, "id" | "status" | "createdAt" | "feeCents" | "dealId" | "paidBy" | "rebookOf"> & { warnings: string[]; feeCents: number };

export interface PlanResult {
  trips: DraftTrip[];
  notes: string[];
  warnings: string[];
  ok: boolean;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toClock = (mins: number) => {
  const m = Math.round(mins / 5) * 5;
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const driveMin = (km: number) => (km * ROAD_FACTOR * 60) / SPEED_KMH;

interface StopInput {
  shop: Shop;
  qty: number;
}

/**
 * When a shop can receive: its opening hours, narrowed by the owner's choice of
 * morning (window must end by 12:00) or afternoon (not before 12:00).
 */
function receivingHours(deal: Deal, shop: Shop) {
  let open = shop.openTime ? toMin(shop.openTime) : 0;
  let close = shop.closeTime ? toMin(shop.closeTime) : 24 * 60;
  const pref = deal.commitments.find((c) => c.shopId === shop.id)?.prefs?.time;
  if (pref === "afternoon") open = Math.max(open, 12 * 60);
  if (pref === "morning") close = Math.min(close, 12 * 60);
  return { open, close, pref };
}

/**
 * Stop order: always go next to the shop we can hand over to soonest — the
 * nearest one that will already be open when we get there. A shop that opens
 * late naturally moves down the route instead of the driver waiting outside.
 */
function orderStops(deal: Deal, from: { lat: number; lng: number }, stops: StopInput[], startMin: number): StopInput[] {
  const left = [...stops];
  const out: StopInput[] = [];
  let here = from;
  let clock = startMin + LOADING_MIN;
  while (left.length) {
    const ready = (x: StopInput) => Math.max(clock + driveMin(distanceKm(here.lat, here.lng, x.shop.lat, x.shop.lng)), receivingHours(deal, x.shop).open);
    left.sort((a, b) => ready(a) - ready(b));
    const next = left.shift()!;
    clock = ready(next) + UNLOAD_MIN;
    out.push(next);
    here = next.shop;
  }
  return out;
}

/** Turn an ordered list of stops + a driver into a trip with windows and warnings. */
export function buildTrip(args: {
  deal: Deal;
  wholesaler: Wholesaler;
  driver: Driver;
  stops: StopInput[];
  date: string;
  startTime: string;
  reorder?: boolean;
}): DraftTrip {
  const { deal, wholesaler, driver, date, startTime } = args;
  const stops = args.reorder === false ? args.stops : orderStops(deal, wholesaler, args.stops, toMin(startTime));
  const warnings: string[] = [];
  const start = toMin(startTime);
  let clock = start + LOADING_MIN;
  let here: { lat: number; lng: number } = wholesaler;
  let totalKm = 0;

  const tripStops: TripStop[] = stops.map(({ shop, qty }) => {
    const km = distanceKm(here.lat, here.lng, shop.lat, shop.lng);
    totalKm += km;
    clock += driveMin(km);
    const { open, close, pref } = receivingHours(deal, shop);
    clock = Math.max(clock, open); // never hand over before the shop opens (or before 12:00 for "afternoon")
    const arrive = clock;
    clock += UNLOAD_MIN;
    here = shop;
    if (arrive + 30 > close)
      warnings.push(
        pref === "morning" && close === 12 * 60
          ? `${shop.name} asked for a morning delivery, but the window ends ${toClock(arrive + 30)}. Start earlier or move this stop up the route.`
          : `${shop.name} closes at ${shop.closeTime} but the delivery window ends ${toClock(arrive + 30)}. Start earlier or give this stop to another driver.`
      );
    return {
      shopId: shop.id,
      shopName: shop.name,
      township: shop.township,
      lat: shop.lat,
      lng: shop.lng,
      qty,
      weightKg: Math.round(qty * deal.unitWeightKg),
      window: `${toClock(arrive)} – ${toClock(arrive + 30)}`,
      status: "pending",
      feeCents: 0,
      attempts: 1,
    };
  });

  const loadKg = tripStops.reduce((s, t) => s + t.weightKg, 0);
  if (loadKg > driver.capacityKg) warnings.push(`Too heavy: ${loadKg} kg on a ${driver.vehicle} that carries ${driver.capacityKg} kg.`);
  if (clock > LATEST_FINISH) warnings.push(`This route finishes about ${toClock(clock)}, after 17:00. Start earlier or split it between two drivers.`);

  return {
    driverId: driver.id,
    driverName: driver.name,
    vehicle: `${driver.vehicle} · ${driver.plate}`,
    capacityKg: driver.capacityKg,
    date,
    startTime,
    pickup: {
      name: wholesaler.name,
      address: wholesaler.address,
      lat: wholesaler.lat,
      lng: wholesaler.lng,
      window: `${toClock(start)} – ${toClock(start + LOADING_MIN)}`,
    },
    stops: tripStops,
    loadKg,
    warnings: totalKm ? warnings : warnings,
    feeCents: 0,
  };
}

/** Split the deal's delivery money across trips by weight carried. */
export function splitFees(deal: Deal, trips: DraftTrip[]): DraftTrip[] {
  const fees = allocate(deal.deliveryFeeCents, trips.map((t) => Math.max(1, t.loadKg)));
  // then each trip's pay across its stops, so the driver is paid stop by stop
  return trips.map((t, i) => {
    const perStop = allocate(fees[i], t.stops.map((s) => Math.max(1, s.weightKg)));
    return { ...t, feeCents: fees[i], stops: t.stops.map((s, j) => ({ ...s, feeCents: perStop[j] })) };
  });
}

export function planDelivery(args: {
  deal: Deal;
  shops: Shop[];
  drivers: Driver[];
  wholesaler: Wholesaler;
  busyDriverIds: Set<string>;
  date: string;
  startTime: string;
}): PlanResult {
  const { deal, shops, wholesaler, date, startTime } = args;
  const notes: string[] = [];
  const warnings: string[] = [];
  const free = args.drivers.filter((d) => !args.busyDriverIds.has(d.id));

  const inputs: StopInput[] = deal.commitments
    .map((c) => ({ shop: shops.find((s) => s.id === c.shopId)!, qty: c.qty }))
    .filter((x) => x.shop);
  const totalKg = inputs.reduce((s, x) => s + x.qty * deal.unitWeightKg, 0);
  notes.push(`${inputs.length} shops, ${inputs.reduce((s, x) => s + x.qty, 0)} ${units(deal.unitLabel)}, about ${Math.round(totalKg)} kg to move from ${wholesaler.name.replace(/\.$/, "")}.`);

  // 1. township groups, nearest group first
  const groups = new Map<string, StopInput[]>();
  for (const x of inputs) groups.set(x.shop.township, [...(groups.get(x.shop.township) || []), x]);
  const centre = (g: StopInput[]) => ({ lat: g.reduce((s, x) => s + x.shop.lat, 0) / g.length, lng: g.reduce((s, x) => s + x.shop.lng, 0) / g.length });
  const clusters = Array.from(groups.entries())
    .map(([township, g]) => ({ township, stops: g, c: centre(g), kg: g.reduce((s, x) => s + x.qty * deal.unitWeightKg, 0) }))
    .sort((a, b) => distanceKm(wholesaler.lat, wholesaler.lng, a.c.lat, a.c.lng) - distanceKm(wholesaler.lat, wholesaler.lng, b.c.lat, b.c.lng));
  notes.push(`Shops are in ${clusters.length} area${clusters.length === 1 ? "" : "s"}: ${clusters.map((c) => `${c.township} (${c.stops.length})`).join(", ")}.`);

  const biggest = Math.max(0, ...free.map((d) => d.capacityKg));
  if (!free.length) {
    return { trips: [], notes, warnings: ["No driver is free on this day. Pick another date or finish a driver's current trip first."], ok: false };
  }

  // 2. merge neighbouring groups while the load fits the biggest free vehicle
  const groupsOfTrips: { names: string[]; stops: StopInput[]; kg: number; c: { lat: number; lng: number } }[] = [];
  for (const cl of clusters) {
    const last = groupsOfTrips[groupsOfTrips.length - 1];
    if (last && distanceKm(last.c.lat, last.c.lng, cl.c.lat, cl.c.lng) <= MERGE_KM && last.kg + cl.kg <= biggest) {
      notes.push(`${cl.township} is ${distanceKm(last.c.lat, last.c.lng, cl.c.lat, cl.c.lng).toFixed(0)} km from ${last.names.join(" & ")}, so they share one trip.`);
      last.names.push(cl.township);
      last.stops.push(...cl.stops);
      last.kg += cl.kg;
      last.c = cl.c;
    } else {
      if (last) notes.push(`${cl.township} is too far from ${last.names.join(" & ")} (or the load is too big), so it gets its own trip.`);
      groupsOfTrips.push({ names: [cl.township], stops: [...cl.stops], kg: cl.kg, c: cl.c });
    }
  }

  // split any group that is heavier than the biggest free vehicle
  const finalGroups: typeof groupsOfTrips = [];
  for (const g of groupsOfTrips) {
    if (g.kg <= biggest) {
      finalGroups.push(g);
      continue;
    }
    notes.push(`${g.names.join(" & ")} needs ${Math.round(g.kg)} kg moved — more than the biggest free vehicle (${biggest} kg) — so it's split.`);
    let cur: StopInput[] = [];
    let kg = 0;
    for (const s of g.stops) {
      const w = s.qty * deal.unitWeightKg;
      if (kg + w > biggest && cur.length) {
        finalGroups.push({ names: g.names, stops: cur, kg, c: g.c });
        cur = [];
        kg = 0;
      }
      cur.push(s);
      kg += w;
    }
    if (cur.length) finalGroups.push({ names: g.names, stops: cur, kg, c: g.c });
  }

  // 2b. fewer trips where possible: join two groups if one vehicle can carry both
  // and the joined route still has no problems (opening hours, finish by 17:00)
  const bigDriver = free.slice().sort((a, b) => b.capacityKg - a.capacityKg)[0];
  for (let changed = true; changed && finalGroups.length > 1; ) {
    changed = false;
    const pairs: { i: number; j: number; d: number }[] = [];
    for (let i = 0; i < finalGroups.length; i++)
      for (let j = i + 1; j < finalGroups.length; j++)
        pairs.push({ i, j, d: distanceKm(finalGroups[i].c.lat, finalGroups[i].c.lng, finalGroups[j].c.lat, finalGroups[j].c.lng) });
    pairs.sort((a, b) => a.d - b.d);
    for (const { i, j } of pairs) {
      const a = finalGroups[i];
      const b = finalGroups[j];
      if (a.kg + b.kg > biggest) continue;
      const test = buildTrip({ deal, wholesaler, driver: bigDriver, stops: [...a.stops, ...b.stops], date, startTime });
      if (test.warnings.length) continue;
      const finish = test.stops[test.stops.length - 1].window.split(" – ")[1];
      notes.push(`${a.names.join(" & ")} and ${b.names.join(" & ")} can share one vehicle: ${Math.round(a.kg + b.kg)} kg fits, and the last shop is reached by ${finish}. One trip instead of two saves a driver and fuel.`);
      const kg = a.kg + b.kg;
      const merged = { names: Array.from(new Set([...a.names, ...b.names])), stops: [...a.stops, ...b.stops], kg, c: { lat: (a.c.lat * a.kg + b.c.lat * b.kg) / kg, lng: (a.c.lng * a.kg + b.c.lng * b.kg) / kg } };
      finalGroups.splice(j, 1);
      finalGroups.splice(i, 1, merged);
      changed = true;
      break;
    }
  }

  // 3. smallest free vehicle that fits, heaviest trip picks first
  const pool = [...free];
  const order = finalGroups.map((g, i) => ({ g, i })).sort((a, b) => b.g.kg - a.g.kg);
  const assigned: { i: number; driver: Driver }[] = [];
  for (const { g, i } of order) {
    const fits = pool.filter((d) => d.capacityKg >= g.kg).sort((a, b) => a.capacityKg - b.capacityKg || distanceKm(a.lat, a.lng, g.c.lat, g.c.lng) - distanceKm(b.lat, b.lng, g.c.lat, g.c.lng));
    const driver = fits[0];
    if (!driver) {
      warnings.push(`No free vehicle can carry the ${Math.round(g.kg)} kg for ${g.names.join(" & ")}. Free up a bigger vehicle or deliver on another day.`);
      continue;
    }
    pool.splice(pool.indexOf(driver), 1);
    assigned.push({ i, driver });
    notes.push(`${driver.name}'s ${driver.vehicle} (${driver.capacityKg} kg) takes ${g.names.join(" & ")} — ${Math.round(g.kg)} kg, ${Math.round((g.kg / driver.capacityKg) * 100)}% full.`);
  }

  // 4. build the trips
  let trips = assigned
    .sort((a, b) => a.i - b.i)
    .map(({ i, driver }) => buildTrip({ deal, wholesaler, driver, stops: finalGroups[i].stops, date, startTime }));
  trips = splitFees(deal, trips);
  trips.forEach((t) => warnings.push(...t.warnings.map((w) => `${t.driverName}: ${w}`)));
  if (!warnings.length) notes.push("Every stop lands inside the shop's opening hours and every vehicle is within its weight limit.");

  return { trips, notes, warnings, ok: assigned.length === finalGroups.length };
}
