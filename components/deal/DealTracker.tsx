"use client";

import clsx from "clsx";
import { Check, XCircle } from "lucide-react";
import { DEAL_STEPS, DealStatus } from "@/lib/types";

/** The seven steps of a deal, with the current one highlighted and explained. */
export default function DealTracker({ status, compact, audience = "owner" }: { status: DealStatus; compact?: boolean; audience?: "owner" | "admin" }) {
  if (status === "cancelled")
    return (
      <div className="flex items-center gap-2 rounded-xl2 bg-ink/5 p-3 text-sm text-ink/70">
        <XCircle size={16} /> Cancelled — everyone was refunded.
      </div>
    );
  const idx = DEAL_STEPS.findIndex((s) => s.status === status);
  return (
    <div>
      <ol className={clsx("flex items-start", compact ? "gap-1" : "gap-1.5")} aria-label="Deal progress">
        {DEAL_STEPS.map((s, i) => {
          const done = i < idx || status === "delivered";
          const current = i === idx && status !== "delivered";
          return (
            <li key={s.status} className="flex min-w-0 flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-leaf text-white",
                  current && "bg-ember text-white ring-4 ring-ember/20",
                  !done && !current && "bg-ink/5 text-ink/35"
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              {!compact && <span className={clsx("mt-1 text-[10px] leading-tight sm:text-[11px]", current ? "font-semibold text-ink" : "text-ink/45")}>{s.label}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
