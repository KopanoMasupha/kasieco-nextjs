/**
 * Message assistant for admins: ready-to-send wording for each moment in a
 * deal, personalised per shop (their delivery window) and per driver (their
 * load and stops). Admins can edit any draft before sending.
 */
import { Deal, Trip, Wholesaler } from "./types";
import { formatCents, totalQtyOf } from "./pot";
import { units } from "./units";

export type DraftKind = "order-placed" | "delivery-booked" | "reminder" | "running-late" | "driver-brief" | "custom";

export const DRAFT_KINDS: { kind: DraftKind; label: string; audience: "owners" | "drivers" | "either"; help: string }[] = [
  { kind: "order-placed", label: "Order placed", audience: "owners", help: "Tell every shop the wholesaler has the order." },
  { kind: "delivery-booked", label: "Delivery booked", audience: "owners", help: "Each shop gets its own date, time slot and a reminder about its code." },
  { kind: "reminder", label: "Delivery reminder", audience: "owners", help: "Remind shops to be there with their delivery code." },
  { kind: "running-late", label: "Running late", audience: "owners", help: "Warn shops on a trip that the driver is behind." },
  { kind: "driver-brief", label: "Driver brief", audience: "drivers", help: "Pickup, load list and stops for each driver." },
  { kind: "custom", label: "Write my own", audience: "either", help: "Start from a blank message." },
];

const prettyDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

export interface Draft {
  toRole: "owner" | "driver";
  toId: string;
  toName: string;
  text: string;
}

function missedShort(deal: Deal, shopId: string) {
  const p = deal.commitments.find((c) => c.shopId === shopId)?.prefs;
  if (!p) return "back to wholesaler";
  return p.ifMissed === "retry-later" ? "come back later today" : p.ifMissed === "partner" ? "leave at their partner shop" : p.ifMissed === "collect" ? "back to wholesaler, owner collects" : "back to wholesaler, we rebook";
}

export function draftMessages(kind: DraftKind, deal: Deal, trips: Trip[], wholesaler?: Wholesaler, minutesLate = 30): Draft[] {
  const lot = `${deal.productName}`;
  const stopFor = (shopId: string) => {
    for (const t of trips) {
      const s = t.stops.find((x) => x.shopId === shopId);
      if (s) return { trip: t, stop: s };
    }
    return null;
  };

  if (kind === "driver-brief") {
    return trips.map((t) => ({
      toRole: "driver" as const,
      toId: t.driverId,
      toName: t.driverName,
      text:
        `Hi ${t.driverName.split(" ")[0]}, your MzansiConnect trip for ${prettyDate(t.date)}:\n` +
        `1. Collect at ${t.pickup.name}, ${t.pickup.address} between ${t.pickup.window}. Quote order ${deal.poNumber ?? "(PO on the trip page)"}.\n` +
        `2. Load: ${t.stops.reduce((s, x) => s + x.qty, 0)} ${units(deal.unitLabel)} of ${lot} — ${t.loadKg} kg on your ${t.vehicle} (max ${t.capacityKg} kg).\n` +
        `3. Stops in this order: ${t.stops.map((s, i) => `${i + 1}) ${s.shopName}, ${s.township}, ${s.qty} units, ${s.window}${s.confirmed ? " (confirmed)" : ""} — if missed: ${missedShort(deal, s.shopId)}`).join("; ")}.\n` +
        `At every shop count the stock with the owner (or their named backup person), then type their 4-digit code into the app. If nobody can receive, tap "Nobody can receive it" and do what the owner chose. Never leave stock without a code, and never keep stock on the vehicle overnight.`,
    }));
  }

  return deal.commitments.map((c) => {
    const first = c.shopName.split(" ")[0].replace(/'s$/, "");
    const st = stopFor(c.shopId);
    let text = "";
    switch (kind) {
      case "order-placed":
        text = `Good news ${first}: the ${lot} deal is ordered. MzansiConnect paid ${wholesaler?.name ?? deal.supplierName} for all ${totalQtyOf(deal)} ${units(deal.unitLabel)} (order ${deal.poNumber}). Your ${c.qty} are on it. We'll send your delivery day and time slot next.`;
        break;
      case "delivery-booked":
        text = st
          ? `Your ${c.qty} × ${lot} will be delivered on ${prettyDate(st.trip.date)} between ${st.stop.window} by ${st.trip.driverName} (${st.trip.vehicle}). Please be at the shop. Only give the driver your delivery code once you've counted your stock.`
          : `Your delivery for the ${lot} deal is being planned. We'll send your time slot soon.`;
        break;
      case "reminder":
        text = st
          ? `Reminder: ${st.trip.driverName} brings your ${c.qty} × ${lot} on ${prettyDate(st.trip.date)}, ${st.stop.window}.${st.stop.confirmed ? "" : ` Please open the deal in MzansiConnect and tap "I'll be there".`} Have your delivery code ready (it's on the deal page).`
          : `Reminder about your ${lot} deal — check the deal page in MzansiConnect for the latest.`;
        break;
      case "running-late":
        text = st
          ? `Sorry ${first}, ${st.trip.driverName} is running about ${minutesLate} minutes late. Your new time is roughly ${shiftWindow(st.stop.window, minutesLate)}. Your stock is safe on the vehicle.`
          : `Sorry, deliveries for the ${lot} deal are running late. We'll update you shortly.`;
        break;
      default:
        text = "";
    }
    return { toRole: "owner" as const, toId: c.shopId, toName: c.shopName, text };
  });
}

function shiftWindow(w: string, mins: number) {
  return w
    .split("–")
    .map((p) => {
      const [h, m] = p.trim().split(":").map(Number);
      const t = h * 60 + m + mins;
      return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    })
    .join(" – ");
}

export function moneyLine(cents: number) {
  return formatCents(cents);
}
