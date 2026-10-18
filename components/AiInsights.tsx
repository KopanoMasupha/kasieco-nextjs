"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Sparkles, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { AiReport, StockInsight } from "@/lib/types";
import { Skeleton } from "./Skeleton";

function exchangeLink(i: StockInsight) {
  const p = new URLSearchParams({
    prefillType: i.status === "overstock" ? "have" : "need",
    prefillItem: i.name,
    prefillQty: String(i.status === "overstock" ? Math.max(1, Math.floor(i.stockQty / 2)) : Math.max(4, i.unitsSoldRecent)),
  });
  return `/owner/exchange?${p.toString()}`;
}

/** Stock assistant: reads the owner's sales log and stock, flags what needs action. */
export default function AiInsights({ shopId, refreshKey = 0 }: { shopId: string; refreshKey?: number }) {
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopId }) })
      .then((r) => r.json())
      .then((data) => !cancelled && setReport(data))
      .catch(() => !cancelled && setReport(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [shopId, refreshKey]);

  const flagged = report?.insights.filter((i) => i.status !== "healthy") ?? [];

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
          <Sparkles size={15} />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Stock assistant</h2>
          <p className="text-xs text-ink/45">Reads your sales log and stock counts</p>
        </div>
      </div>

      {loading && !report && (
        <div className="mt-4 space-y-2" aria-label="Loading insights">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-3 h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {report && (
        <div className={clsx("transition-opacity", loading && "opacity-60")}>
          <p className="mt-3 text-sm leading-relaxed text-ink/75">{report.narrative}</p>
          {report.narrativeSource === "template" && (
            <p className="mt-1 text-[11px] text-ink/35">Written from your sales data</p>
          )}
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {flagged.map((i) => (
              <div key={i.goodId} className="rounded-xl2 bg-sand-50 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {i.status === "low" ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-ember" />}
                  {i.name}
                  <span className="ml-auto text-[11px] font-medium text-ink/40">
                    {i.stockQty === 0 ? "sold out" : i.daysOfCover === null ? "no sales this week" : `${Math.round(i.daysOfCover)} days left`}
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink/55">{i.suggestion}</p>
                <Link href={exchangeLink(i)} className="mt-2 inline-block text-xs font-semibold text-ember-dark">
                  {i.status === "overstock" ? (i.matchShopName ? `Offer it to ${i.matchShopName} →` : "Post it on Willing buyer & seller →") : "Ask nearby shops on Willing buyer & seller →"}
                </Link>
              </div>
            ))}
            {flagged.length === 0 && (
              <p className="flex items-center gap-1.5 text-sm text-leaf">
                <CheckCircle2 size={15} /> Nothing needs attention right now.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
