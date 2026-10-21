"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { X, CheckCircle2, Clock, Loader2, Lock, Minus, Plus, ShieldCheck, TrendingDown, PartyPopper, ShoppingCart } from "lucide-react";
import { Pool, Shop } from "@/lib/types";
import { formatCents, quoteJoin, toCents } from "@/lib/pot";
import { useStore } from "@/lib/store";
import { useCart } from "@/lib/cart";
import DeliveryChoices, { DEFAULT_DRAFT, PrefsDraft, draftProblem } from "./DeliveryChoices";
import { units } from "@/lib/units";
import ProductImage from "@/components/ProductImage";
import { itemsPerUnit, popularQty } from "@/lib/products";

type Stage = "form" | "choices" | "saving" | "done" | "error" | "added";

/** Reserve units in a wholesaler deal — free. Shops pay through TradeSafe only once the deal fills. */
export default function JoinDealModal({ pool, shop, onClose }: { pool: Pool; shop: Shop; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const cart = useCart();
  const full = pool.status === "target-reached";
  const remaining = full ? 99 : pool.minQty - pool.commitments.reduce((s, c) => s + c.qty, 0);
  const popular = popularQty(pool);
  const [qty, setQty] = useState(Math.min(popular ?? 5, Math.max(1, remaining)));
  const [stage, setStage] = useState<Stage>("form");
  const [result, setResult] = useState<{ target: boolean; waitlisted: boolean } | null>(null);
  const [error, setError] = useState("");
  const existing = pool.commitments.find((c) => c.shopId === shop.id)?.prefs;
  const lastUsed = [...state.pools].map((p) => p.commitments.find((c) => c.shopId === shop.id)?.prefs).find(Boolean);
  const seed = existing ?? lastUsed;
  const [prefs, setPrefs] = useState<PrefsDraft>(seed ? { days: seed.days, time: seed.time, ifMissed: seed.ifMissed, partnerShopId: seed.partnerShopId, backupName: seed.backupName, backupPhone: seed.backupPhone } : DEFAULT_DRAFT);
  const [agreed, setAgreed] = useState(!!existing);
  const [choiceError, setChoiceError] = useState("");

  const quote = useMemo(() => quoteJoin(pool, shop, Math.max(1, Math.min(qty, remaining))), [pool, shop, qty, remaining]);
  const priceDrops = !full && quote.unitCentsAfter < quote.unitCentsBefore;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stage !== "saving" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stage]);

  async function reserve() {
    setStage("saving");
    await new Promise((r) => setTimeout(r, 500));
    const meta = await dispatch({ type: "JOIN_DEAL", dealId: pool.id, shopId: shop.id, qty, prefs });
    if (meta.error) {
      setError(meta.error);
      setStage("error");
      return;
    }
    setResult({ target: !!meta.targetReached, waitlisted: !!meta.waitlisted });
    setStage("done");
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Reserve units">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass-strong max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none !bg-white p-5 sm:rounded-b-xl2">
        <div className="flex items-start justify-between gap-3">
          <ProductImage name={pool.productName} src={pool.photo} count={itemsPerUnit(pool.unitLabel)} size={52} rounded="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink/45">
              {pool.productName} · {pool.supplierName}
            </p>
            <h2 className="text-lg font-bold text-ink">{stage === "choices" ? "Delivery" : stage === "added" ? "Added to your cart" : full ? "Join the waitlist" : stage === "form" ? "How many?" : "Reserve"}</h2>
          </div>
          {stage !== "saving" && (
            <button onClick={onClose} className="rounded-full p-1.5 text-ink/40 hover:bg-sand-100" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {stage === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-4">
              <div>
                <p className="label">
                  {units(pool.unitLabel)} {!full && <span className="font-normal text-ink/45">· {remaining} left</span>}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-ink/10 bg-white">
                    <button className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One less">
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={remaining}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
                      className="w-14 bg-transparent text-center text-lg font-bold focus:outline-none"
                      aria-label="Units"
                    />
                    <button className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.min(remaining, q + 1))} aria-label="One more">
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-sm">
                    <span className="num block text-xs text-ink/40 line-through">{formatCents(toCents(pool.retailPrice))} alone</span>
                    <span className="num font-semibold text-leaf">{formatCents(quote.finalUnitCents)} each together</span>
                  </span>
                </div>
                {popular && !full && popular <= remaining && (
                  <button
                    type="button"
                    onClick={() => setQty(popular)}
                    className={clsx("mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", qty === popular ? "border-ink bg-ink text-white" : "border-ink/15 text-ink/70 hover:border-ink/30")}
                  >
                    Most shops take {popular}
                  </button>
                )}
                {priceDrops && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-leaf/10 px-3 py-2 text-xs font-medium text-leaf">
                    <TrendingDown size={13} /> Brings everyone closer to the lowest price
                  </p>
                )}
              </div>

              <div className="rounded-xl2 bg-sand-50 p-4 text-sm">
                <p className="eyebrow mb-2">You pay when it fills</p>
                <Row label={`Stock: ${quote.qtyAfter} × ${formatCents(quote.finalUnitCents)}`} value={formatCents(quote.share.goodsCents)} />
                <Row label="Delivery (about)" value={formatCents(quote.share.deliveryCents)} />
                <Row label={`Service fee ${Math.round(pool.serviceFeeRate * 100)}%`} value={formatCents(quote.share.serviceCents)} />
                <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-base font-bold text-ink">
                  <span>About</span>
                  <span className="num">{formatCents(quote.estimateCents)}</span>
                </div>
                {toCents(pool.retailPrice) > quote.finalUnitCents && (
                  <p className="mt-2 flex items-center justify-between text-xs font-semibold text-leaf">
                    <span>You save vs buying alone</span>
                    <span className="num">{formatCents((toCents(pool.retailPrice) - quote.finalUnitCents) * quote.qtyAfter)}</span>
                  </p>
                )}
                <p className="mt-3 flex items-center justify-between rounded-lg bg-leaf/10 px-3 py-2 text-xs font-semibold text-leaf">
                  <span>Pay today</span>
                  <span className="num">R0</span>
                </p>
              </div>

              <ul className="grid grid-cols-3 gap-2 text-center text-[11px] text-ink/60">
                <li className="rounded-lg bg-ink/[0.04] px-2 py-2"><Lock size={13} className="mx-auto mb-1 text-ink/50" />Free to reserve</li>
                <li className="rounded-lg bg-ink/[0.04] px-2 py-2"><ShieldCheck size={13} className="mx-auto mb-1 text-[#0B3D3A]" />Pay via TradeSafe</li>
                <li className="rounded-lg bg-ink/[0.04] px-2 py-2"><Clock size={13} className="mx-auto mb-1 text-ink/50" />48h to pay</li>
              </ul>

              {!full && (
                <button
                  onClick={() => {
                    cart.add(pool.id, qty);
                    setStage("added");
                  }}
                  className="btn-outline w-full py-3.5 text-sm"
                >
                  <ShoppingCart size={15} /> Add {qty} to cart
                </button>
              )}
              <button onClick={() => setStage("choices")} className="btn-ember w-full py-3.5 text-sm">
                Next
              </button>
            </motion.div>
          )}

          {stage === "added" && (
            <motion.div key="added" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3 text-center">
              <ShoppingCart size={30} className="mx-auto text-leaf" />
              <p className="text-sm text-ink/60">{qty} {units(pool.unitLabel, qty)} added. Nothing is reserved until you choose delivery and confirm.</p>
              <Link href="/owner/cart" onClick={onClose} className="btn-ember w-full py-3 text-sm">
                View cart
              </Link>
              <button onClick={onClose} className="w-full py-2 text-sm text-ink/50 underline">
                Keep browsing
              </button>
            </motion.div>
          )}

          {stage === "choices" && (
            <motion.div key="choices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4">
              <DeliveryChoices shop={shop} value={prefs} onChange={(v) => { setPrefs(v); setChoiceError(""); }} agreed={agreed} onAgree={(v) => { setAgreed(v); setChoiceError(""); }} units={quote.qtyAfter} />
              {choiceError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{choiceError}</p>}
              <button
                onClick={() => {
                  const problem = draftProblem(prefs, agreed);
                  if (problem) return setChoiceError(problem);
                  reserve();
                }}
                className="btn-ember w-full py-3.5 text-sm"
              >
                <Lock size={14} /> {full ? `Join waitlist for ${qty}` : `Reserve ${qty} — pay later`}
              </button>
              <button onClick={() => setStage("form")} className="w-full text-center text-sm text-ink/50 underline">
                Back
              </button>
            </motion.div>
          )}

          {stage === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col items-center gap-3 py-6 text-sm text-ink/70">
              <Loader2 size={26} className="animate-spin text-ember" />
              Reserving…
            </motion.div>
          )}

          {stage === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3 text-center">
              {result.target ? <PartyPopper size={30} className="mx-auto text-ember" /> : <CheckCircle2 size={30} className="mx-auto text-leaf" />}
              <p className="text-lg font-bold text-ink">{result.waitlisted ? "You're on the waitlist" : result.target ? "You filled the deal!" : "Reserved"}</p>
              <p className="text-sm text-ink/60">
                {result.waitlisted
                  ? "If a shop doesn't pay in time, its spot is yours."
                  : result.target
                  ? "The price is locked at the lowest tier. Pay your share with TradeSafe within 48 hours."
                  : "Nothing paid yet. We'll message you to pay when the deal fills."}
              </p>
              <button onClick={onClose} className="btn-dark px-5 py-2.5 text-sm">
                {result.target ? "Pay now" : "Done"}
              </button>
            </motion.div>
          )}

          {stage === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 space-y-3 text-center">
              <p className="rounded-xl bg-red-50 px-3 py-3 text-sm font-medium text-red-600">{error}</p>
              <button onClick={() => setStage("form")} className="btn-dark px-5 py-2.5 text-sm">
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5 text-ink/70">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
