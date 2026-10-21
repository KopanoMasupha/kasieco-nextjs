import { distanceKm } from "./geo";
import {
  COURIER_BASE_CENTS,
  COURIER_MAX_KM,
  COURIER_MIN_CENTS,
  COURIER_PER_KM_CENTS,
  COURIER_TWO_WAY_FACTOR,
  CourierJob,
  CourierPayer,
  Driver,
  Shop,
} from "./types";

export const roadKm = (a: Pick<Shop, "lat" | "lng">, b: Pick<Shop, "lat" | "lng">) =>
  Math.round(distanceKm(a.lat, a.lng, b.lat, b.lng) * 1.3 * 10) / 10;

export function courierQuote(km: number, twoWay: boolean) {
  const raw = (COURIER_BASE_CENTS + COURIER_PER_KM_CENTS * km) * (twoWay ? COURIER_TWO_WAY_FACTOR : 1);
  const feeCents = Math.max(COURIER_MIN_CENTS, Math.ceil(raw / 500) * 500);
  return { feeCents, tooFar: km > COURIER_MAX_KM };
}

export function courierShares(feeCents: number, payer: CourierPayer, meId: string, themId: string) {
  if (payer === "me") return [{ shopId: meId, cents: feeCents }];
  if (payer === "them") return [{ shopId: themId, cents: feeCents }];
  const half = Math.ceil(feeCents / 2);
  return [
    { shopId: meId, cents: half },
    { shopId: themId, cents: feeCents - half },
  ];
}

export function nearestFreeDriver(drivers: Driver[], jobs: CourierJob[], from: Pick<Shop, "lat" | "lng">) {
  const busy = new Set(jobs.filter((job) => !["delivered", "cancelled"].includes(job.status)).map((job) => job.driverId));
  const ranked = [...drivers].sort((a, b) => distanceKm(a.lat, a.lng, from.lat, from.lng) - distanceKm(b.lat, b.lng, from.lat, from.lng));
  return ranked.find((driver) => !busy.has(driver.id)) ?? ranked[0];
}

export const COURIER_STATUS_TEXT: Record<CourierJob["status"], string> = {
  "awaiting-payment": "Waiting for the fee to be paid",
  assigned: "Driver booked",
  accepted: "Driver on the way to collect",
  "on-the-way": "Goods on the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
