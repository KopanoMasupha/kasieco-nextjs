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
  const [giveGoodId, setGiveGoodId] = useState("");
  const [receiveGoodId, setReceiveGoodId] = useState("");
  const [giveQty, setGiveQty] = useState(1);
  const [receiveQty, setReceiveQty] = useState(1);

  if (!thread) return notFound();

  const shopA = state.shops.find((s) => s.id === thread.shopAId);
  const shopB = state.shops.find((s) => s.id === thread.shopBId);
  const me = state.shops.find((s) => s.id === state.myShopId);
  const isParticipant = me && (me.id === thread.shopAId || me.id === thread.shopBId);
  const other = isParticipant ? (me!.id === thread.shopAId ? shopB : shopA) : undefined;
  const giveGoods = state.goods.filter((good) => good.shopId === me?.id && !good.hidden && good.stockQty > 0);
  const receiveGoods = state.goods.filter((good) => good.shopId === other?.id && !good.hidden && good.stockQty > 0);
  const selectedGive = giveGoods.find((good) => good.id === giveGoodId) ?? giveGoods[0];
  const selectedReceive = receiveGoods.find((good) => good.id === receiveGoodId) ?? receiveGoods[0];
  const shelfPrices = (goodId?: string) => {
    const item = state.goods.find((good) => good.id === goodId);
    if (!item) return 0;
    const comparable = state.goods.filter((good) =>
      !good.hidden && good.name.toLowerCase() === item.name.toLowerCase() &&
      state.shops.some((shop) => shop.id === good.shopId && shop.verificationStatus === "verified")
    );
    return comparable.length ? comparable.reduce((sum, good) => sum + good.price, 0) / comparable.length : item.price;
  };
  const suggestedGiveValue = selectedGive ? shelfPrices(selectedGive.id) * giveQty : 0;
  const suggestedReceiveValue = selectedReceive ? shelfPrices(selectedReceive.id) * receiveQty : 0;
  const suggestedCash = Math.round(suggestedGiveValue - suggestedReceiveValue);

  function send() {
    if (!text.trim() || !me) return;
    dispatch({ type: "SEND_MESSAGE", threadId: thread!.id, fromShopId: me.id, text: text.trim() });
    setText("");
  }

  function sendOffer() {
    if (!selectedGive || !selectedReceive || !me) return;
    dispatch({
      type: "SEND_OFFER",
      threadId: thread!.id,
      fromShopId: me.id,
      giveGoodId: selectedGive.id,
      giveQty,
      receiveGoodId: selectedReceive.id,
      receiveQty,
      offerGive: `${giveQty} × ${selectedGive.name}`,
      offerReceive: `${receiveQty} × ${selectedReceive.name}`,
      cashAdjustment: suggestedCash,
    });
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
                  {o.cashAdjustment ? ` · ${o.cashAdjustment > 0 ? "receiver pays" : "sender pays"} R${Math.abs(o.cashAdjustment)}` : ""}
                </p>
                {typeof o.giveValueCents === "number" && typeof o.receiveValueCents === "number" && (
                  <p className="mt-1 text-xs text-ink/50">
                    Shelf value: R{(o.giveValueCents / 100).toFixed(2)} vs R{(o.receiveValueCents / 100).toFixed(2)} · {Math.abs(o.giveValueCents - o.receiveValueCents) / Math.max(o.giveValueCents, o.receiveValueCents, 1) <= 0.05 ? "Balanced" : o.giveValueCents > o.receiveValueCents ? `Sender gives R${((o.giveValueCents - o.receiveValueCents) / 100).toFixed(2)} more` : `Receiver gives R${((o.receiveValueCents - o.giveValueCents) / 100).toFixed(2)} more`}
                  </p>
                )}
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
                <p className="text-xs text-ink/50">Choose stock at each shop's actual shelf price. Similar items use the average verified-shop price.</p>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="Goods you give" value={selectedGive?.id ?? ""} onChange={(event) => setGiveGoodId(event.target.value)} className="input text-sm">
                    {giveGoods.map((good) => <option key={good.id} value={good.id}>{good.name} · R{good.price.toFixed(2)}</option>)}
                  </select>
                  <select aria-label="Goods you receive" value={selectedReceive?.id ?? ""} onChange={(event) => setReceiveGoodId(event.target.value)} className="input text-sm">
                    {receiveGoods.map((good) => <option key={good.id} value={good.id}>{good.name} · R{good.price.toFixed(2)}</option>)}
                  </select>
                  <input aria-label="Quantity to give" type="number" min={1} max={selectedGive?.stockQty ?? 1} value={giveQty} onChange={(event) => setGiveQty(Math.max(1, Number(event.target.value)))} className="input text-sm" />
                  <input aria-label="Quantity to receive" type="number" min={1} max={selectedReceive?.stockQty ?? 1} value={receiveQty} onChange={(event) => setReceiveQty(Math.max(1, Number(event.target.value)))} className="input text-sm" />
                </div>
                <p className="rounded-lg bg-sand-50 p-2.5 text-xs text-ink/65">
                  Suggested cash top-up: {suggestedCash === 0 ? "R0.00" : suggestedCash > 0 ? `receiver adds R${suggestedCash.toFixed(2)}` : `sender adds R${Math.abs(suggestedCash).toFixed(2)}`}
                  {" · "}{Math.abs(suggestedGiveValue - suggestedReceiveValue) / Math.max(suggestedGiveValue, suggestedReceiveValue, 1) <= 0.05 ? "Balanced (within 5%)" : "Not balanced yet"}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowOffer(false)} className="btn-outline flex-1 py-2 text-xs">
                    Cancel
                  </button>
                  <button disabled={!selectedGive || !selectedReceive} onClick={sendOffer} className="btn-ember flex-1 py-2 text-xs">
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
