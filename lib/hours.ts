import { Shop } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Uses South African time regardless of where the viewer's device is set. */
function nowInSA() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: DAY_NAMES.indexOf(get("weekday")), mins: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isOpenNow(shop: Shop): boolean {
  if (!shop.openTime || !shop.closeTime || !shop.openDays) return false;
  const { day, mins } = nowInSA();
  return shop.openDays.includes(day) && mins >= minutes(shop.openTime) && mins < minutes(shop.closeTime);
}

export function daysLabel(days: number[] | undefined): string {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "every day";
  const sorted = [...days].sort();
  if (sorted.join() === "1,2,3,4,5,6") return "Mon – Sat";
  if (sorted.join() === "1,2,3,4,5") return "Mon – Fri";
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

export function hoursLabel(shop: Shop): string {
  if (!shop.openTime) return shop.hours;
  return `${shop.openTime} – ${shop.closeTime}, ${daysLabel(shop.openDays)}`;
}

export function stockLevel(qty: number): { label: string; tone: "in" | "low" | "out" } {
  if (qty <= 0) return { label: "Sold out", tone: "out" };
  if (qty <= 5) return { label: `Only ${qty} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}
