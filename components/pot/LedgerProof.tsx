"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Pool } from "@/lib/types";
import { auditPot } from "@/lib/pot";

/** Re-proves the pot from the raw ledger in the viewer's own browser. */
export default function LedgerProof({ pool }: { pool: Pool }) {
  const [open, setOpen] = useState(false);
  const audit = auditPot(pool);
  return (
    <div className={clsx("rounded-xl2 border p-4", audit.ok ? "border-leaf/25 bg-leaf/5" : "border-red-200 bg-red-50")}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open}>
        <span className={clsx("flex items-center gap-2 text-sm font-semibold", audit.ok ? "text-leaf" : "text-red-600")}>
          <ShieldCheck size={16} />
          {audit.ok ? "Every rand accounted for" : "Ledger check failed"}
        </span>
        <span className="flex items-center gap-1 text-xs text-ink/45">
          {audit.checks.filter((c) => c.ok).length}/{audit.checks.length}
          <ChevronDown size={14} className={clsx("transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {audit.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />}
              <span>
                <span className="font-medium text-ink">{c.label}</span>
                <span className="block text-xs text-ink/50">{c.detail}</span>
              </span>
            </li>
          ))}
          <li className="pt-1 text-[11px] text-ink/40">Recalculated in your browser.</li>
        </ul>
      )}
    </div>
  );
}
