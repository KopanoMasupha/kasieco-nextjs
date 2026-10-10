"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AiInsights() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
          <Sparkles size={14} />
        </span>
        Stock assistant
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/60">
        Record sales on My stock to estimate days of stock left and find nearby shops that may need your surplus.
      </p>
      <Link href="/owner/goods" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ember-dark">
        Go to My stock <ArrowRight size={13} />
      </Link>
    </div>
  );
}
