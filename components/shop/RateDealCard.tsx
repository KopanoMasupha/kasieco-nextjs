"use client";

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { Pool } from "@/lib/types";
import { useStore } from "@/lib/store";

const WORDS = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

/** After the stock arrives: one tap to rate. These ratings are the stars other shops see. */
export default function RateDealCard({ pool, shopId }: { pool: Pool; shopId: string }) {
  const { dispatch } = useStore();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = pool.ratings.find((r) => r.shopId === shopId);

  if (mine)
    return (
      <section className="card flex items-center gap-3 p-4 text-sm">
        <CheckCircle2 size={18} className="shrink-0 text-leaf" />
        <p className="text-ink/70">
          You rated this deal <strong className="text-ink">{mine.stars} stars</strong>. Thanks — other shops see it on {pool.supplierName}'s deals.
        </p>
      </section>
    );

  async function send() {
    setBusy(true);
    const meta = await dispatch({ type: "RATE_DEAL", dealId: pool.id, shopId, stars, comment });
    setBusy(false);
    if (meta.error) setError(meta.error);
  }

  const shown = hover || stars;
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-ink">How was this deal?</h2>
      <p className="text-sm text-ink/55">Your rating helps other kasi shops choose. Only shops that received stock can rate.</p>
      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setStars(i)} onMouseEnter={() => setHover(i)} className="rounded p-0.5" aria-label={`${i} star${i > 1 ? "s" : ""}`}>
            <Star size={30} className={clsx(i <= shown ? "text-[#F2A93B]" : "text-ink/15")} fill="currentColor" strokeWidth={0} />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-ink/60">{WORDS[shown]}</span>
      </div>
      {stars > 0 && (
        <div className="mt-3 space-y-2">
          <label className="label" htmlFor="rate-comment">
            Anything other shops should know? <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <input id="rate-comment" className="input" maxLength={200} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Arrived on time, cases sealed" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} onClick={send} className="btn-ember px-5 py-2.5 text-sm">
            Post my rating
          </button>
        </div>
      )}
    </section>
  );
}
