"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { Pool } from "@/lib/types";
import { computeShares, formatCents, potBalance, totalQtyOf } from "@/lib/pot";

/**
 * A three-legged potjie pot that fills as shops pay in.
 * Fill height = units pledged ÷ minimum order; the number is the cash in escrow.
 */
export default function PotMeter({ pool, size = "lg" }: { pool: Pool; size?: "sm" | "lg" }) {
  const clip = useId().replace(/:/g, "");
  const qty = totalQtyOf(pool);
  const ratio = Math.min(1, qty / pool.minQty);
  // while filling, nothing is paid — show the value reserved; after that, what TradeSafe holds
  const reservedValue = computeShares(pool, pool.commitments).reduce((s, x) => s + x.owedCents, 0);
  const balance = pool.status === "open" && potBalance(pool.ledger) === 0 ? reservedValue : potBalance(pool.ledger);
  const reached = qty >= pool.minQty;

  // inside of the pot body spans y=60..196 in the viewBox
  const top = 60;
  const bottom = 196;
  const fillY = bottom - (bottom - top) * ratio;

  const w = size === "lg" ? 220 : 104;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" width={w} height={w} role="img" aria-label={`Pot ${Math.round(ratio * 100)}% full, ${formatCents(balance)} in escrow`}>
        <defs>
          <clipPath id={clip}>
            <path d="M40 70 Q40 200 120 204 Q200 200 200 70 Z" />
          </clipPath>
          <linearGradient id={`${clip}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={reached ? "#3F8A65" : "#F07A4A"} />
            <stop offset="1" stopColor={reached ? "#2F6D4F" : "#C4471C"} />
          </linearGradient>
        </defs>

        {/* legs */}
        <path d="M70 196 L58 228" stroke="#171310" strokeWidth="9" strokeLinecap="round" />
        <path d="M170 196 L182 228" stroke="#171310" strokeWidth="9" strokeLinecap="round" />
        <path d="M120 204 L120 232" stroke="#171310" strokeWidth="9" strokeLinecap="round" />

        {/* empty interior */}
        <path d="M40 70 Q40 200 120 204 Q200 200 200 70 Z" fill="#3a332e" />

        {/* the money level */}
        <g clipPath={`url(#${clip})`}>
          <motion.rect
            x="30"
            width="180"
            height="160"
            fill={`url(#${clip}-fill)`}
            initial={false}
            animate={{ y: fillY }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
          />
          <motion.path
            d="M30 0 Q60 -8 90 0 T150 0 T210 0 V10 H30 Z"
            fill="rgba(255,255,255,0.25)"
            initial={false}
            animate={{ y: fillY - 4, x: [0, -20, 0] }}
            transition={{ y: { type: "spring", stiffness: 60, damping: 14 }, x: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
          />
        </g>

        {/* body outline + rim + handles */}
        <path d="M40 70 Q40 200 120 204 Q200 200 200 70" fill="none" stroke="#171310" strokeWidth="10" />
        <rect x="28" y="58" width="184" height="16" rx="8" fill="#171310" />
        <path d="M28 80 Q8 84 14 104" fill="none" stroke="#171310" strokeWidth="8" strokeLinecap="round" />
        <path d="M212 80 Q232 84 226 104" fill="none" stroke="#171310" strokeWidth="8" strokeLinecap="round" />

        <text x="120" y="140" textAnchor="middle" fontSize="26" fontWeight="800" fill="#FBF7F1" fontFamily="ui-sans-serif, system-ui">
          {formatCents(balance)}
        </text>
        <text x="120" y="162" textAnchor="middle" fontSize="12" fontWeight="600" fill="rgba(251,247,241,0.8)" fontFamily="ui-sans-serif, system-ui">
          {pool.status === "open" ? "reserved" : pool.status === "target-reached" || pool.status === "payment-confirmed" ? "in escrow" : pool.status === "cancelled" ? "closed" : pool.status === "delivered" ? "settled" : "for delivery"}
        </text>
      </svg>
      {size === "lg" && (
        <p className="mt-1 text-xs font-medium text-ink/50">
          {qty} of {pool.minQty} reserved {reached ? "· full" : ""}
        </p>
      )}
    </div>
  );
}
