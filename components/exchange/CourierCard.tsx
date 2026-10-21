"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Phone, Repeat, ShieldCheck, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { COURIER_WINDOWS, CourierPayer, ExchangeOffer, ExchangeThread, Shop } from "@/lib/types";
import { COURIER_STATUS_TEXT, courierQuote, courierShares, roadKm } from "@/lib/courier";

function upcomingDays(count = 6) {
  const days: string[] = [];
  const date = new Date();
  while (days.length < count) {
    if (date.getDay() !== 0) days.push(date.toISOString().slice(0, 10));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function CourierCard({ thread, me, other, accepted }: { thread: ExchangeThread; me: Shop; other: Shop; accepted: ExchangeOffer }) {
  const { state, dispatch } = useStore();
  const job = [...state.courierJobs].reverse().find((item) => item.threadId === thread.id && item.status !== "cancelled");
  const cancelled = state.courierJobs.some((item) => item.threadId === thread.id && item.status === "cancelled");
  const sender = accepted.fromShopId === me.id ? me : other;
  const senderHasGoods = accepted.offerGive !== "Cash only";
  const days = useMemo(() => upcomingDays(), []);
  const [fromId, setFromId] = useState(senderHasGoods ? sender.id : (sender.id === me.id ? other.id : me.id));
  const [twoWay, setTwoWay] = useState(senderHasGoods);
  const [day, setDay] = useState(days[1] ?? days[0]);
  const [timeWindow, setTimeWindow] = useState(COURIER_WINDOWS[1]);
  const [payer, setPayer] = useState<CourierPayer>("split");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const from = fromId === me.id ? me : other;
  const to = from.id === me.id ? other : me;
  const goodsFrom = (shopId: string) => shopId === sender.id ? accepted.offerGive : accepted.offerReceive;
  const km = roadKm(from, to);
  const { feeCents, tooFar } = courierQuote(km, twoWay);
  const myShare = courierShares(feeCents, payer, me.id, other.id).find((share) => share.shopId === me.id)?.cents ?? 0;

  async function submit(action: Parameters<typeof dispatch>[0]) {
    setBusy(true);
    setError("");
    const result = await dispatch(action);
    setBusy(false);
    if (result.error) setError(result.error);
    return !result.error;
  }

  async function book() {
    if (await submit({
      type: "BOOK_COURIER",
      threadId: thread.id,
      shopId: me.id,
      fromShopId: from.id,
      twoWay,
      payer,
      day,
      window: timeWindow,
      goodsOut: goodsFrom(from.id),
      goodsBack: twoWay ? goodsFrom(to.id) : undefined,
    })) setOpen(false);
  }

  if (job) {
    const shares = state.fees.filter((fee) => fee.courierJobId === job.id && fee.status !== "cancelled");
    const myFee = shares.find((fee) => fee.shopId === me.id);
    const canCancel = ["awaiting-payment", "assigned", "accepted"].includes(job.status);
    return (
      <section className="card space-y-4 p-5" data-testid="courier-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="eyebrow !text-ember-dark">Transport · {job.ref}</p>
            <h2 className="text-lg font-bold text-ink">{COURIER_STATUS_TEXT[job.status]}</h2>
            <p className="text-sm text-ink/55">{job.day} · {job.window} · {job.distanceKm} km · {formatCents(job.feeCents)}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#0B3D3A]/[0.07] px-2.5 py-1 text-xs font-semibold text-[#0B3D3A]">
            <ShieldCheck size={13} /> Fee held by TradeSafe
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3 text-sm">
          <Truck size={18} className="shrink-0 text-ink/60" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{job.driverName}</span>
            <span className="text-xs text-ink/55">{job.vehicle} · {job.plate}</span>
          </span>
          {job.status !== "awaiting-payment" && <a href={`tel:${job.driverPhone.replace(/\s/g, "")}`} className="btn-outline min-h-11 px-3 text-xs"><Phone size={13} /> Call</a>}
        </div>
        <ol className="space-y-2">
          {job.legs.map((leg, index) => (
            <li key={index} className="rounded-2xl border border-ink/[0.08] p-3 text-sm">
              <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                {leg.status === "delivered" ? <CheckCircle2 size={15} className="text-leaf" /> : <Truck size={15} className="text-ink/35" />}
                {leg.fromShopName} <ArrowRight size={13} className="text-ink/35" /> {leg.toShopName}
              </p>
              <p className="ml-6 text-xs text-ink/55">{leg.goods}</p>
              {leg.toShopId === me.id && leg.status !== "delivered" && (
                <p className="ml-6 mt-2 inline-flex items-center gap-2 rounded-xl bg-ember/10 px-3 py-2 text-ember-dark">
                  <KeyRound size={15} /> Your code: <span className="num font-display text-xl font-extrabold tracking-[0.2em]">{leg.code}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/[0.06] pt-3 text-xs text-ink/60">
          {shares.map((fee) => (
            <span key={fee.id} className={clsx("rounded-full px-2.5 py-1 font-semibold", fee.status === "paid" ? "bg-leaf/10 text-leaf" : "bg-ember/10 text-ember-dark")}>
              {fee.shopId === me.id ? "You" : fee.shopName}: {formatCents(fee.amountCents)} {fee.status === "paid" ? "paid" : "to pay"}
            </span>
          ))}
          <span className="flex-1" />
          {myFee?.status === "due" && <Link href="/owner/payments" className="btn-ember min-h-11 px-4 text-xs">Pay my share {formatCents(myFee.amountCents)}</Link>}
          {canCancel && (
            <button
              onClick={async () => {
                if (window.confirm(`Cancel transport ${job.ref}? Any share already paid is refunded by TradeSafe.`)) {
                  await submit({ type: "CANCEL_COURIER", jobId: job.id, shopId: me.id });
                }
              }}
              className="btn-outline min-h-11 px-3 text-xs text-red-600"
            >
              Cancel transport
            </button>
          )}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </section>
    );
  }

  if (thread.status !== "open") return null;
  if (!open) {
    const estimate = courierQuote(roadKm(me, other), false);
    return (
      <section className="card flex flex-wrap items-center gap-4 border-ember/30 p-5" data-testid="courier-card">
        <Truck size={24} className="shrink-0 text-ember" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">No bakkie? Book a MzansiConnect driver</p>
          <p className="text-sm text-ink/55">A local driver moves goods between your shops. From {formatCents(estimate.feeCents)} for {roadKm(me, other)} km.</p>
          {cancelled && <p className="text-xs text-ink/45">Your last booking was cancelled.</p>}
        </div>
        <button onClick={() => setOpen(true)} className="btn-ember min-h-11 px-5 text-sm">Book transport</button>
      </section>
    );
  }

  return (
    <section className="card space-y-5 p-5" data-testid="courier-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Truck size={18} className="text-ember" /> Book transport</h2>
          <p className="text-sm text-ink/55">The fee is held by TradeSafe until the receiving shop confirms delivery.</p>
        </div>
        <button onClick={() => setOpen(false)} className="min-h-11 min-w-11 rounded-full text-ink/50 hover:bg-sand-100" aria-label="Close">×</button>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">The goods go</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[me, other].map((shop) => {
            const receiver = shop.id === me.id ? other : me;
            return (
              <button key={shop.id} type="button" onClick={() => setFromId(shop.id)} className={clsx("min-h-14 rounded-2xl border p-3 text-left text-sm", fromId === shop.id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink")}>
                <span className="flex items-center gap-1.5 font-semibold">{shop.id === me.id ? "From my shop" : `From ${shop.name}`} <ArrowRight size={13} /> {receiver.id === me.id ? "my shop" : receiver.name}</span>
                <span className={clsx("text-xs", fromId === shop.id ? "text-white/70" : "text-ink/50")}>{goodsFrom(shop.id)}</span>
              </button>
            );
          })}
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-sand-50 px-3 py-2.5 text-sm">
          <input type="checkbox" checked={twoWay} onChange={(event) => setTwoWay(event.target.checked)} className="h-4 w-4 accent-[#E85D2B]" />
          <Repeat size={14} className="text-ink/50" />
          Both ways (a swap)
        </label>
      </fieldset>

      <fieldset>
        <legend className="label">Day</legend>
        <div className="flex flex-wrap gap-2">
          {days.map((value, index) => (
            <button key={value} type="button" onClick={() => setDay(value)} className={clsx("min-h-11 rounded-full border px-3.5 text-sm font-medium", day === value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70")}>
              {index === 0 && value === new Date().toISOString().slice(0, 10) ? "Today" : new Date(value + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Time</legend>
        <div className="flex flex-wrap gap-2">
          {COURIER_WINDOWS.map((value) => (
            <button key={value} type="button" onClick={() => setTimeWindow(value)} className={clsx("min-h-11 rounded-full border px-3.5 text-sm font-medium", timeWindow === value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70")}>{value}</button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Who pays the driver?</legend>
        <div className="grid grid-cols-3 gap-2">
          {([["me", "I pay"], ["split", "Split 50/50"], ["them", "They pay"]] as [CourierPayer, string][]).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setPayer(value)} className={clsx("min-h-11 truncate rounded-2xl border px-2 text-sm font-medium", payer === value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70")}>{label}</button>
          ))}
        </div>
        {payer === "them" && <p className="mt-1.5 text-xs text-ink/50">Agree this in the chat first. The driver is booked once they pay.</p>}
      </fieldset>

      <div className="space-y-1.5 rounded-2xl bg-sand-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-ink/60">{from.name} → {to.name}{twoWay ? " and back" : ""}</span><span className="num text-ink/60">{km} km</span></div>
        <div className="flex justify-between font-semibold text-ink"><span>Transport fee</span><span className="num">{formatCents(feeCents)}</span></div>
        <div className="flex justify-between font-bold text-ember-dark"><span>You pay</span><span className="num">{formatCents(myShare)}</span></div>
        <p className="text-[11px] text-ink/45">R40 call-out + R9 a km{twoWay ? ", ×1.6 for both ways" : ""}. The full fee goes to the driver.</p>
      </div>
      {tooFar && <p role="alert" className="text-sm text-ember-dark">These shops are {km} km apart. Shop-to-shop runs go up to 60 km.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button onClick={book} disabled={busy || tooFar} className="btn-ember min-h-12 w-full py-3 text-sm">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />} Book driver · {formatCents(feeCents)}
      </button>
    </section>
  );
}
