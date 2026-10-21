"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Handshake, Scale, Send, X } from "lucide-react";
import { useStore, useLiveRefresh } from "@/lib/store";
import { fairUnitPrice } from "@/lib/exchange";
import { formatRand } from "@/lib/pricing";
import CourierCard from "@/components/exchange/CourierCard";

function FairnessBadge({ give, receive, cash }: { give: number; receive: number; cash: number }) {
  // from the sender's point of view: what goes out (goods + cash) vs what comes in
  const out = give + Math.max(0, cash);
  const into = receive + Math.max(0, -cash);
  const gap = out - into;
  const base = Math.max(out, into, 1);
  const fair = Math.abs(gap) / base <= 0.05;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", fair ? "bg-leaf/10 text-leaf" : "bg-amber-100 text-amber-700")}>
      <Scale size={12} />
      {fair ? "Balanced" : gap > 0 ? `Sender gives ${formatRand(gap)} more` : `Sender gets ${formatRand(-gap)} more`}
    </span>
  );
}

export default function ThreadPage({ params }: { params: { threadId: string } }) {
  useLiveRefresh(3000);
  const { state, dispatch } = useStore();
  const thread = state.threads.find((t) => t.id === params.threadId);
  const [text, setText] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [giveItem, setGiveItem] = useState("");
  const [giveQty, setGiveQty] = useState(1);
  const [getItem, setGetItem] = useState("");
  const [getQty, setGetQty] = useState(1);
  const [cash, setCash] = useState<string>("");
  const bottom = useRef<HTMLDivElement>(null);

  const verifiedIds = useMemo(() => new Set(state.shops.filter((s) => s.verificationStatus === "verified").map((s) => s.id)), [state.shops]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [thread?.messages.length, thread?.offers.length]);

  if (!thread) return notFound();

  const shopA = state.shops.find((s) => s.id === thread.shopAId);
  const shopB = state.shops.find((s) => s.id === thread.shopBId);
  const me = state.shops.find((s) => s.id === state.myShopId);
  const isParticipant = !!me && (me.id === thread.shopAId || me.id === thread.shopBId);
  const other = isParticipant ? (me!.id === thread.shopAId ? shopB : shopA) : undefined;
  const listing = state.listings.find((l) => l.id === thread.listingId);

  const myItems = me ? state.goods.filter((g) => g.shopId === me.id).map((g) => g.name) : [];
  const theirItems = other
    ? Array.from(new Set([...state.goods.filter((g) => g.shopId === other.id).map((g) => g.name), ...(listing && listing.shopId === other.id ? [listing.item] : [])]))
    : [];

  const priceOf = (name: string, ownerId?: string) => {
    if (!name) return 0;
    const avg = fairUnitPrice(name, state.goods, verifiedIds);
    if (avg !== null) return avg;
    const own = state.goods.find((g) => g.shopId === ownerId && g.name === name);
    const fromListing = listing && listing.item === name ? listing.price : null;
    return own?.price ?? fromListing ?? 0;
  };
  const giveValue = giveQty * priceOf(giveItem, me?.id);
  const getValue = getQty * priceOf(getItem, other?.id);
  const suggestedCash = Math.round((getValue - giveValue) * 100) / 100;
  const cashNum = cash === "" ? suggestedCash : parseFloat(cash) || 0;

  function send() {
    if (!text.trim() || !me) return;
    dispatch({ type: "SEND_MESSAGE", threadId: thread!.id, fromShopId: me.id, text: text.trim() });
    setText("");
  }

  function openOffer() {
    setGiveItem(myItems[0] ?? "");
    setGetItem(listing && listing.shopId === other?.id ? listing.item : theirItems[0] ?? "");
    setGiveQty(1);
    setGetQty(listing && listing.shopId === other?.id ? Math.min(listing.qty, 4) : 1);
    setCash("");
    setShowOffer(true);
  }

  function sendOffer() {
    if (!me || (!giveItem && cashNum <= 0) || !getItem) return;
    dispatch({
      type: "SEND_OFFER",
      threadId: thread!.id,
      fromShopId: me.id,
      offerGive: giveItem ? `${giveQty} × ${giveItem}` : "Cash only",
      offerReceive: `${getQty} × ${getItem}`,
      cashAdjustment: cashNum,
      giveValue: giveItem ? giveValue : 0,
      receiveValue: getValue,
    });
    setShowOffer(false);
  }

  const acceptedOffer = [...thread.offers].reverse().find((o) => o.status === "accepted");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/owner/exchange" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> Exchange
      </Link>
      <div className="card p-4">
        <p className="text-xs font-medium text-ink/40">Exchange conversation{listing ? ` · about ${listing.item}` : ""}</p>
        <h1 className="font-bold text-ink">
          {shopA?.name} <ArrowLeftRight size={14} className="mx-1 inline text-ink/30" /> {shopB?.name}
        </h1>
        {!isParticipant && (
          <p className="mt-1 text-xs text-ember-dark">
            Only {shopA?.name} and {shopB?.name} can chat here.
          </p>
        )}
        {thread.status === "completed" && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-leaf">
            <CheckCircle2 size={15} /> Exchange completed and recorded
          </p>
        )}
      </div>

      <div className="card flex h-[440px] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {[...thread.messages.map((m) => ({ kind: "msg" as const, at: m.createdAt, m })), ...thread.offers.map((o) => ({ kind: "offer" as const, at: o.createdAt, o }))]
            .sort((a, b) => (a.at < b.at ? -1 : 1))
            .map((entry) => {
              if (entry.kind === "msg") {
                const m = entry.m;
                const mine = m.fromShopId === me?.id;
                const from = state.shops.find((s) => s.id === m.fromShopId);
                return (
                  <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={clsx("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-ink text-white" : "bg-sand-50 text-ink")}>
                      {!mine && <p className="mb-0.5 text-[10px] font-semibold text-ink/40">{from?.name}</p>}
                      {m.text}
                    </div>
                  </div>
                );
              }
              const o = entry.o;
              const from = state.shops.find((s) => s.id === o.fromShopId);
              const canRespond = isParticipant && o.fromShopId !== me?.id && o.status === "pending";
              return (
                <div key={o.id} className="rounded-2xl border border-ember/25 bg-ember/5 p-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-ember-dark">
                      <Handshake size={13} /> Offer from {from?.name}
                    </p>
                    {o.giveValue !== undefined && o.receiveValue !== undefined && (
                      <FairnessBadge give={o.giveValue} receive={o.receiveValue} cash={o.cashAdjustment} />
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-ink/75">
                    <div className="rounded-xl bg-sand-50 p-2.5">
                      <p className="text-[10px] font-semibold text-ink/40">{from?.name} gives</p>
                      <p className="font-medium">{o.offerGive}</p>
                      {o.giveValue !== undefined && <p className="text-xs text-ink/45">worth ~{formatRand(o.giveValue)}</p>}
                      {o.cashAdjustment > 0 && <p className="text-xs font-semibold text-ink">+ {formatRand(o.cashAdjustment)} cash</p>}
                    </div>
                    <div className="rounded-xl bg-sand-50 p-2.5">
                      <p className="text-[10px] font-semibold text-ink/40">and receives</p>
                      <p className="font-medium">{o.offerReceive}</p>
                      {o.receiveValue !== undefined && <p className="text-xs text-ink/45">worth ~{formatRand(o.receiveValue)}</p>}
                      {o.cashAdjustment < 0 && <p className="text-xs font-semibold text-ink">+ {formatRand(-o.cashAdjustment)} cash</p>}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold capitalize text-ink/45">{o.status}</p>
                  {canRespond && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => dispatch({ type: "RESPOND_OFFER", threadId: thread.id, offerId: o.id, accept: true })} className="btn-dark px-3 py-1.5 text-xs">
                        Accept
                      </button>
                      <button onClick={() => dispatch({ type: "RESPOND_OFFER", threadId: thread.id, offerId: o.id, accept: false })} className="btn-outline px-3 py-1.5 text-xs">
                        Decline
                      </button>
                      <button onClick={openOffer} className="btn-outline px-3 py-1.5 text-xs">
                        Counter-offer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          {thread.messages.length === 0 && thread.offers.length === 0 && <p className="text-center text-sm text-ink/35">Say hello to start the conversation.</p>}
          <div ref={bottom} />
        </div>

        {isParticipant && thread.status === "open" && (
          <div className="mt-3 border-t border-ink/5 pt-3">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Write a message…"
                className="input flex-1 text-sm"
                aria-label="Message"
              />
              <button onClick={send} className="btn-dark h-10 w-10 shrink-0 !p-0" aria-label="Send">
                <Send size={15} />
              </button>
              <button onClick={openOffer} className="btn-ember shrink-0 px-3.5 py-2.5 text-xs">
                <Handshake size={13} /> Make offer
              </button>
            </div>
          </div>
        )}
      </div>

      {showOffer && me && other && (
        <div className="glass-strong space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Build a fair offer</h2>
            <button onClick={() => setShowOffer(false)} className="rounded-full p-1 text-ink/40 hover:bg-white" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl2 bg-sand-50 p-3">
              <p className="label">You give</p>
              <select value={giveItem} onChange={(e) => setGiveItem(e.target.value)} className="input text-sm">
                <option value="">Nothing — cash only</option>
                {myItems.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              {giveItem && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <input type="number" min={1} value={giveQty} onChange={(e) => setGiveQty(Math.max(1, parseInt(e.target.value) || 1))} className="input w-20 py-1.5" aria-label="Quantity to give" />
                  <span className="text-ink/50">≈ {formatRand(giveValue)}</span>
                </div>
              )}
            </div>
            <div className="rounded-xl2 bg-sand-50 p-3">
              <p className="label">You get from {other.name}</p>
              <select value={getItem} onChange={(e) => setGetItem(e.target.value)} className="input text-sm">
                {theirItems.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <input type="number" min={1} value={getQty} onChange={(e) => setGetQty(Math.max(1, parseInt(e.target.value) || 1))} className="input w-20 py-1.5" aria-label="Quantity to receive" />
                <span className="text-ink/50">≈ {formatRand(getValue)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-ink/60">Cash to balance (R)</span>
              <input
                type="number"
                step="0.5"
                value={cash === "" ? suggestedCash : cash}
                onChange={(e) => setCash(e.target.value)}
                className="input w-28 py-1.5"
                aria-label="Cash adjustment"
              />
            </label>
            <span className="text-xs text-ink/45">
              {suggestedCash > 0 ? `Suggested: you add ${formatRand(suggestedCash)}` : suggestedCash < 0 ? `Suggested: they add ${formatRand(-suggestedCash)}` : "Even swap"}
              {" · positive = you pay, negative = they pay"}
            </span>
            <FairnessBadge give={giveItem ? giveValue : 0} receive={getValue} cash={cashNum} />
          </div>
          <p className="text-[11px] text-ink/45">Based on average kasi shelf prices.</p>
          <button onClick={sendOffer} className="btn-ember w-full py-2.5 text-sm">
            Send offer
          </button>
        </div>
      )}

      {isParticipant && acceptedOffer && me && other && <CourierCard thread={thread} me={me} other={other} accepted={acceptedOffer} />}

      {isParticipant && acceptedOffer && thread.status === "open" && (
        <div className="card p-4">
          <p className="text-sm font-medium text-ink">
            Accepted. Confirm once goods change hands{state.courierJobs.some((job) => job.threadId === thread.id && job.status !== "cancelled") ? " (a driver delivery confirms it for the receiving shop)" : ""}.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink/50">
            <span>
              {shopA?.name}: {thread.confirmedBy.includes(thread.shopAId) ? "confirmed ✓" : "not yet"}
            </span>
            <span>
              {shopB?.name}: {thread.confirmedBy.includes(thread.shopBId) ? "confirmed ✓" : "not yet"}
            </span>
          </div>
          {!thread.confirmedBy.includes(me!.id) && (
            <button onClick={() => dispatch({ type: "CONFIRM_HANDOVER", threadId: thread.id, shopId: me!.id })} className="btn-ember mt-3 w-full py-2.5 text-sm">
              Confirm hand-over
            </button>
          )}
        </div>
      )}
    </div>
  );
}
