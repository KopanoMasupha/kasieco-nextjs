/**
 * Delivery helpers shared by owners, drivers, partner shops and admins:
 * partner shops nearby, how much they hold, plain-words summaries of an
 * owner's delivery choices, and the "delivered by" promise.
 */
import { DAY_SHORT, DeliveryPrefs, MISSED_CHOICES, PARTNER_RADIUS_KM, Pool, Shop, Trip, TripStop } from "./types";
import { distanceKm, formatDistance } from "./geo";

export function heldUnits(trips: Trip[], partnerShopId: string) {
  return trips.flatMap((t) => t.stops).filter((s) => s.status === "at-partner" && s.partnerShopId === partnerShopId).reduce((n, s) => n + s.qty, 0);
}

/** Verified drop-point shops within walking distance, nearest first. */
export function partnersNear(shops: Shop[], trips: Trip[], me: Shop) {
  return shops
    .filter((s) => s.id !== me.id && s.partner?.active && s.verificationStatus === "verified")
    .map((s) => ({ shop: s, km: distanceKm(me.lat, me.lng, s.lat, s.lng), free: s.partner!.capacityUnits - heldUnits(trips, s.id) }))
    .filter((x) => x.km <= PARTNER_RADIUS_KM)
    .sort((a, b) => a.km - b.km);
}

export function daysText(days: number[]) {
  const d = [...days].sort();
  if (d.join() === "1,2,3,4,5") return "Mon–Fri";
  if (d.join() === "1,2,3,4,5,6") return "Mon–Sat";
  return d.map((x) => DAY_SHORT[x]).join(", ");
}

export const TIME_TEXT: Record<DeliveryPrefs["time"], string> = { morning: "mornings", afternoon: "afternoons", any: "any time" };

export const lowerFirst = (t: string) => (/^I['’ ]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

export function missedText(prefs: DeliveryPrefs | undefined, shops: Shop[], me?: Shop) {
  if (!prefs) return "Bring it on the next delivery run";
  if (prefs.ifMissed === "partner") {
    const p = shops.find((s) => s.id === prefs.partnerShopId);
    const km = p && me ? ` (${formatDistance(distanceKm(me.lat, me.lng, p.lat, p.lng))})` : "";
    return `Leave it at ${p?.name ?? "my partner shop"}${km}`;
  }
  return MISSED_CHOICES.find((c) => c.id === prefs.ifMissed)!.title;
}

export function prefsSummary(prefs: DeliveryPrefs | undefined, shops: Shop[], me?: Shop) {
  if (!prefs) return "Mon–Fri · any time · if missed: next run";
  return `${daysText(prefs.days)} · ${TIME_TEXT[prefs.time]} · if missed: ${lowerFirst(missedText(prefs, shops, me))}`;
}

/** The date by which every shop should have its stock (only known once the deal is full). */
export function deliverBy(pool: Pool): Date | null {
  if (!pool.targetReachedAt) return null;
  return new Date(new Date(pool.targetReachedAt).getTime() + pool.deliveryWithinDays * 86400000);
}

export const prettyDay = (d: Date | string) =>
  (typeof d === "string" ? new Date(d + (d.length === 10 ? "T12:00:00" : "")) : d).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

export const STOP_LABEL: Record<TripStop["status"], string> = {
  pending: "On the way",
  delivered: "Delivered",
  "at-partner": "At partner shop",
  returned: "Back at wholesaler",
  rebooked: "Rebooked",
};

/** The latest stop for a shop in a deal (a rebooked trip replaces the first one). */
export function myStop(trips: Trip[], dealId: string, shopId: string): { trip: Trip; stop: TripStop } | null {
  const all = trips
    .filter((t) => t.dealId === dealId)
    .flatMap((t) => t.stops.filter((s) => s.shopId === shopId).map((s) => ({ trip: t, stop: s })))
    .filter((x) => x.stop.status !== "rebooked");
  return all[all.length - 1] ?? null;
}
