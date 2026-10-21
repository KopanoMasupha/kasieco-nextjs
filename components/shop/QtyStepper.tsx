"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";

/** − 4 + stepper with 44px touch targets. */
export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const btn = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-full border border-ink/[0.12] bg-white" role="group" aria-label={label}>
      <button type="button" className={clsx("flex items-center justify-center rounded-full text-ink/70 hover:bg-sand-100 disabled:opacity-30", btn)} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="One less">
        <Minus size={15} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className={clsx("num bg-transparent text-center font-bold text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", size === "sm" ? "w-8 text-sm" : "w-10 text-base")}
        aria-label={label}
      />
      <button type="button" className={clsx("flex items-center justify-center rounded-full text-ink/70 hover:bg-sand-100 disabled:opacity-30", btn)} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="One more">
        <Plus size={15} />
      </button>
    </div>
  );
}

