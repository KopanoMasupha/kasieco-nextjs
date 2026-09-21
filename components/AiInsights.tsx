"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, TrendingDown, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { AiReport } from "@/lib/types";
import clsx from "clsx";

export default function AiInsights({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shopId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  function suggestListing(insight: NonNullable<AiReport["insights"]>[number]) {
    const params = new URLSearchParams({
      prefillType: "have",
      prefillItem: insight.name,
      prefillQty: String(Math.min(insight.stockQty, 10)),
    });
    router.push(`/owner/exchange?${params.toString()}`);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
          <Sparkles size={14} />
        </span>
        AI stock insights
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-ink/40">
          <Loader2 size={14} className="animate-spin" /> Looking at your recent sales…
        </div>
      )}

      {!loading && report && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{report.narrative}</p>
          {report.narrativeSource === "template" && (
            <p className="mt-1 text-[11px] text-ink/30">
              Generated from your stock data · connect an ANTHROPIC_API_KEY for a richer AI write-up
            </p>
          )}

          <div className="mt-4 space-y-2">
            {report.insights
              .filter((i) => i.status !== "healthy")
              .slice(0, 4)
              .map((i) => (
                <div key={i.goodId} className="flex items-center justify-between gap-3 rounded-xl border border-ink/5 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                      {i.status === "low" ? (
                        <TrendingUp size={13} className="shrink-0 text-red-500" />
                      ) : (
                        <TrendingDown size={13} className="shrink-0 text-ember" />
                      )}
                      {i.name}
                    </p>
                    <p className="truncate text-xs text-ink/45">{i.suggestion}</p>
                  </div>
                  {i.status === "overstock" && (
                    <button
                      onClick={() => suggestListing(i)}
                      className={clsx("shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white")}
                    >
                      List it <ArrowRight size={11} className="inline" />
                    </button>
                  )}
                </div>
              ))}
            {report.insights.every((i) => i.status === "healthy") && (
              <p className="text-sm text-ink/40">Nothing needs attention right now.</p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
