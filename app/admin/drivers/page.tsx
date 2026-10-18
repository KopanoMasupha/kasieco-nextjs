"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Phone, Truck, Send, Loader2, MapPin, Weight } from "lucide-react";
import { useStore, useLiveRefresh, useMe } from "@/lib/store";
import { formatCents } from "@/lib/pot";

export default function AdminDrivers() {
  useLiveRefresh(4000);
  const { state, dispatch } = useStore();
  const me = useMe();
  const [text, setText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function send(driverId: string) {
    const t = (text[driverId] || "").trim();
    if (!t) return;
    setBusy(driverId);
    const meta = await dispatch({ type: "SEND_MESSAGES", fromRole: "admin", fromName: me?.name.split(" (")[0] ?? "MzansiConnect", messages: [{ toRole: "driver", toId: driverId, text: t }] });
    setBusy(null);
    if (!meta.error) {
      setText((x) => ({ ...x, [driverId]: "" }));
      setSent(driverId);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Drivers</h1>

      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {state.drivers.map((d) => {
          const trips = state.trips.filter((t) => t.driverId === d.id);
          const active = trips.filter((t) => t.status !== "completed");
          const earned = trips.filter((t) => t.status === "completed").reduce((s, t) => s + t.feeCents, 0);
          const lastMsgs = state.messages.filter((m) => (m.toRole === "driver" && m.toId === d.id) || (m.toRole === "admin" && m.fromName === d.name)).slice(-2).reverse();
          return (
            <section key={d.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                    <Truck size={19} />
                  </span>
                  <div>
                    <p className="font-bold text-ink">{d.name}</p>
                    <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-xs font-medium text-ember-dark">
                      <Phone size={11} /> {d.phone}
                    </a>
                  </div>
                </div>
                <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", active.length ? "bg-ember/10 text-ember-dark" : "bg-leaf/10 text-leaf")}>
                  {active.length ? `${active.length} trip${active.length === 1 ? "" : "s"} booked` : "Free"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-sand-50 p-2">
                  <dt className="flex items-center gap-1 text-ink/45">
                    <Truck size={11} /> Vehicle
                  </dt>
                  <dd className="font-semibold text-ink">
                    {d.vehicle}
                    <span className="block font-mono text-[10px] font-normal text-ink/45">{d.plate}</span>
                  </dd>
                </div>
                <div className="rounded-xl bg-sand-50 p-2">
                  <dt className="flex items-center gap-1 text-ink/45">
                    <Weight size={11} /> Carries up to
                  </dt>
                  <dd className="text-base font-bold text-ink">{d.capacityKg.toLocaleString("en-ZA")} kg</dd>
                </div>
                <div className="rounded-xl bg-sand-50 p-2">
                  <dt className="flex items-center gap-1 text-ink/45">
                    <MapPin size={11} /> Based in
                  </dt>
                  <dd className="font-semibold text-ink">{d.baseTownship}</dd>
                </div>
              </dl>
              {active.map((t) => {
                const deal = state.pools.find((p) => p.id === t.dealId);
                return (
                  <Link key={t.id} href={`/admin/deals/${t.dealId}`} className="mt-2 block rounded-xl bg-sand-50 px-3 py-2 text-xs hover:bg-sand-100">
                    <span className="font-semibold text-ink">{deal?.productName}</span> · {t.date} · {t.stops.length} stops · {t.loadKg} kg ·{" "}
                    {t.status === "assigned" ? "not accepted yet" : t.status === "accepted" ? "accepted" : `${t.stops.filter((s) => s.status === "delivered").length}/${t.stops.length} delivered`}
                  </Link>
                );
              })}
              <p className="mt-2 text-xs text-ink/45">Paid so far: {formatCents(earned)}</p>
              {lastMsgs.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {lastMsgs.map((m) => (
                    <li key={m.id} className="truncate rounded-lg bg-ink/[0.03] px-2 py-1 text-ink/60">
                      <strong>{m.toRole === "admin" ? `${d.name.split(" ")[0]}:` : "You:"}</strong> {m.text}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <input value={text[d.id] ?? ""} onChange={(e) => setText((x) => ({ ...x, [d.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && send(d.id)} placeholder={`Message ${d.name.split(" ")[0]}…`} className="input py-2 text-sm" aria-label={`Message ${d.name}`} />
                <button onClick={() => send(d.id)} disabled={busy === d.id || !(text[d.id] || "").trim()} className="btn-dark shrink-0 px-3 text-sm" aria-label="Send">
                  {busy === d.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              {sent === d.id && <p className="mt-1 text-xs font-semibold text-leaf">Sent — it's in {d.name.split(" ")[0]}'s messages.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
