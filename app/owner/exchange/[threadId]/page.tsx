"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useStore } from "@/lib/store";
import { CheckCircle2, Handshake, Send, ArrowLeftRight } from "lucide-react";
import clsx from "clsx";

export default function ThreadPage({ params }: { params: { threadId: string } }) {
  const { state, dispatch } = useStore();
  const thread = state.threads.find((t) => t.id === params.threadId);
  const [text, setText] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [give, setGive] = useState("");
  const [receive, setReceive] = useState("");
  const [cash, setCash] = useState("0");

  if (!thread) return notFound();

  const shopA = state.shops.find((s) => s.id === thread.shopAId);
  const shopB = state.shops.find((s) => s.id === thread.shopBId);
  const me = state.shops.find((s) => s.id === state.myShopId);
  const isParticipant = me && (me.id === thread.shopAId || me.id === thread.shopBId);
  const other = isParticipant ? (me!.id === thread.shopAId ? shopB : shopA) : undefined;

  function send() {
    if (!text.trim() || !me) return;
    dispatch({ type: "SEND_MESSAGE", threadId: thread!.id, fromShopId: me.id, text: text.trim() });
    setText("");
  }

  function sendOffer() {
    if (!give.trim() || !receive.trim() || !me) return;
    dispatch({
      type: "SEND_OFFER",
      threadId: thread!.id,
      fromShopId: me.id,
      offerGive: give.trim(),
      offerReceive: receive.trim(),
      cashAdjustment: parseFloat(cash) || 0,
    });
    setGive("");
    setReceive("");
    setCash("0");
    setShowOffer(false);
  }

  const pendingOffer = [...thread.offers].reverse().find((o) => o.status === "pending");
  const acceptedOffer = [...thread.offers].reverse().find((o) => o.status === "accepted");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card p-4">
        <p className="text-xs font-medium text-ink/40">Exchange conversation</p>
        <h1 className="font-bold text-ink">
          {shopA?.name} <ArrowLeftRight size={14} className="mx-1 inline text-ink/30" /> {shopB?.name}
        </h1>
        {!isParticipant && (
          <p className="mt-1 text-xs text-ember-dark">
            Switch "Acting as" to {shopA?.name} or {shopB?.name} to take part in this chat.
          </p>
        )}
        {thread.status === "completed" && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-leaf">
            <CheckCircle2 size={15} /> Exchange completed and recorded
          </p>
        )}
      </div>

      <div className="card flex h-[380px] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {thread.messages.map((m) => {
            const mine = m.fromShopId === me?.id;
            const fromShop = state.shops.find((s) => s.id === m.fromShopId);
            return (
              <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-ink text-white" : "bg-sand-100 text-ink"
                  )}
                >
                  {!mine && <p className="mb-0.5 text-[10px] font-semibold text-ink/40">{fromShop?.name}</p>}
                  {m.text}
                </div>
              </div>
            );
          })}

          {thread.offers.map((o) => {
            const fromShop = state.shops.find((s) => s.id === o.fromShopId);
            const canRespond = isParticipant && o.fromShopId !== me?.id && o.status === "pending";
            return (
              <div key={o.id} className="rounded-2xl border border-ember/25 bg-ember/5 p-3.5 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ember-dark">
                  <Handshake size={13} /> Offer from {fromShop?.name}
                </p>
                <p className="mt-1 text-ink/75">
                  Gives <span className="font-medium">{o.offerGive}</span> for{" "}
                  <span className="font-medium">{o.offerReceive}</span>
                  {o.cashAdjustment ? ` + R${o.cashAdjustment}` : ""}
                </p>
                <p className="mt-1 text-xs font-semibold capitalize text-ink/40">{o.status}</p>
                {canRespond && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => dispatch({ type: "RESPOND_OFFER", threadId: thread.id, offerId: o.id, accept: true })}
                      className="btn-dark px-3 py-1.5 text-xs"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => dispatch({ type: "RESPOND_OFFER", threadId: thread.id, offerId: o.id, accept: false })}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {thread.messages.length === 0 && thread.offers.length === 0 && (
            <p className="text-center text-sm text-ink/35">Say hello to start the conversation.</p>
          )}
        </div>

        {isParticipant && thread.status === "open" && (
          <div className="mt-3 border-t border-ink/5 pt-3">
            {showOffer ? (
              <div className="space-y-2 rounded-xl2 border border-ink/10 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="You give" value={give} onChange={(e) => setGive(e.target.value)} className="input text-sm" />
                  <input placeholder="You receive" value={receive} onChange={(e) => setReceive(e.target.value)} className="input text-sm" />
                </div>
                <input
                  placeholder="Cash to add (0 for a straight swap)"
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="input text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowOffer(false)} className="btn-outline flex-1 py-2 text-xs">
                    Cancel
                  </button>
                  <button onClick={sendOffer} className="btn-ember flex-1 py-2 text-xs">
                    Send offer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Write a message…"
                  className="input flex-1 text-sm"
                />
                <button onClick={send} className="btn-dark h-10 w-10 !p-0 shrink-0">
                  <Send size={15} />
                </button>
                <button onClick={() => setShowOffer(true)} className="btn-outline shrink-0 px-3 py-2.5 text-xs">
                  Offer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isParticipant && acceptedOffer && thread.status === "open" && (
        <div className="card p-4">
          <p className="text-sm font-medium text-ink">
            Offer accepted. Once you've handed over the goods, confirm below.
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-ink/50">
            <span>{shopA?.name}: {thread.confirmedBy.includes(thread.shopAId) ? "confirmed ✓" : "not yet"}</span>
            <span>{shopB?.name}: {thread.confirmedBy.includes(thread.shopBId) ? "confirmed ✓" : "not yet"}</span>
          </div>
          {!thread.confirmedBy.includes(me!.id) && (
            <button
              onClick={() => dispatch({ type: "CONFIRM_HANDOVER", threadId: thread.id, shopId: me!.id })}
              className="btn-ember mt-3 w-full py-2.5 text-sm"
            >
              Confirm hand-over
            </button>
          )}
        </div>
      )}
    </div>
  );
}
