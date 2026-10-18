"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Banknote, CheckCircle2, CreditCard, Landmark, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { PaymentMethodKind, PAYMENT_METHOD_LABEL } from "@/lib/types";
import { formatCents } from "@/lib/pot";

const METHODS: { id: PaymentMethodKind; icon: any; hint: string }[] = [
  { id: "eft", icon: Landmark, hint: "From your banking app" },
  { id: "card", icon: CreditCard, hint: "Debit or credit" },
  { id: "cash", icon: Banknote, hint: "Show a barcode at a shop till" },
];

/**
 * The TradeSafe escrow checkout (simulated in the prototype). The money goes to
 * TradeSafe's trust account — never to MzansiConnect — and is released only when
 * the deal is approved and the stock is delivered.
 */
export default function TradeSafeCheckout({
  amountCents,
  title,
  subtitle,
  onPay,
  onClose,
}: {
  amountCents: number;
  title: string;
  subtitle?: string;
  onPay: (method: PaymentMethodKind) => Promise<{ error?: string; ref?: string }>;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethodKind>("eft");
  const [stage, setStage] = useState<"choose" | "paying" | "done">("choose");
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stage !== "paying" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stage]);

  async function pay() {
    setError("");
    setStage("paying");
    await new Promise((r) => setTimeout(r, 1200)); // the bank confirms
    const meta = await onPay(method);
    if (meta.error) {
      setError(meta.error);
      setStage("choose");
      return;
    }
    setRef(meta.ref || "");
    setStage("done");
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Pay with TradeSafe">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* TradeSafe header */}
        <div className="flex items-center justify-between bg-[#0B3D3A] px-5 py-3.5 text-white">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} className="text-[#7BE0B5]" /> TradeSafe <span className="font-normal text-white/60">· escrow</span>
          </span>
          {stage !== "paying" && (
            <button onClick={onClose} className="rounded-full p-1 text-white/60 hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {stage === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 p-6 text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-white">
                <CheckCircle2 size={28} />
              </motion.span>
              <p className="font-display text-2xl font-bold text-ink">{formatCents(amountCents)} paid</p>
              <p className="text-sm text-ink/60">Held safely by TradeSafe. It's released only when your stock is delivered.</p>
              {ref && <p className="font-mono text-xs text-ink/45">Reference {ref}</p>}
              <button onClick={onClose} className="btn-dark mt-2 px-6 py-2.5 text-sm">
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div key="choose" className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium text-ink/45">{title}</p>
                <p className="num font-display text-4xl font-bold text-ink">{formatCents(amountCents)}</p>
                {subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}
              </div>

              <fieldset className="space-y-1.5" disabled={stage === "paying"}>
                <legend className="label">Pay with</legend>
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    aria-pressed={method === m.id}
                    className={clsx("flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors", method === m.id ? "border-[#0B3D3A] bg-[#0B3D3A]/[0.04]" : "border-ink/10 hover:bg-sand-50")}
                  >
                    <m.icon size={18} className="text-ink/60" />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">{PAYMENT_METHOD_LABEL[m.id]}</span>
                      <span className="text-[11px] text-ink/50">{m.hint}</span>
                    </span>
                    <span className={clsx("h-4 w-4 rounded-full border-2", method === m.id ? "border-[#0B3D3A] bg-[#0B3D3A] shadow-[inset_0_0_0_2px_white]" : "border-ink/20")} />
                  </button>
                ))}
              </fieldset>

              <ul className="space-y-1 rounded-xl bg-sand-50 p-3 text-xs text-ink/65">
                <li className="flex gap-2">
                  <Lock size={13} className="mt-0.5 shrink-0 text-[#0B3D3A]" /> Held in TradeSafe's trust account — not by MzansiConnect.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#0B3D3A]" /> Paid out only after the deal is approved and delivered.
                </li>
                <li className="flex gap-2">
                  <Banknote size={13} className="mt-0.5 shrink-0 text-[#0B3D3A]" /> If the deal is cancelled, it's refunded to the account you paid from.
                </li>
              </ul>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button onClick={pay} disabled={stage === "paying"} className="btn-pill w-full bg-[#0B3D3A] py-3.5 text-sm text-white hover:bg-[#082e2b] disabled:opacity-60">
                {stage === "paying" ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Waiting for your bank…
                  </>
                ) : (
                  <>
                    <Lock size={14} /> Pay {formatCents(amountCents)}
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-ink/40">Prototype: no real money moves.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
