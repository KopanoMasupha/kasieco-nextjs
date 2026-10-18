"use client";

import { useState } from "react";
import { Megaphone, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FUNDING_KIND_LABEL, FundingKind } from "@/lib/types";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Lets a government verifier or programme partner advertise an opportunity on the funding marketplace. */
export default function PostOpportunityForm() {
  const { dispatch } = useStore();
  const [f, setF] = useState({
    name: "",
    provider: "",
    kind: "grant" as FundingKind,
    amountText: "",
    summary: "",
    offers: "",
    eligibility: "",
    howToApply: "",
    applyUrl: "",
    deadline: "",
    requiresVerified: true,
  });
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.name.trim() && f.provider.trim() && f.summary.trim() && /^https?:\/\//.test(f.applyUrl.trim());

  async function submit() {
    if (!valid) return;
    await dispatch({
      type: "POST_FUNDING",
      opportunity: {
        id: `fund-${Date.now()}`,
        name: f.name.trim(),
        provider: f.provider.trim(),
        kind: f.kind,
        amountText: f.amountText.trim() || "See the official site",
        summary: f.summary.trim(),
        offers: lines(f.offers),
        eligibility: lines(f.eligibility),
        criteria: { requiresVerified: f.requiresVerified },
        howToApply: lines(f.howToApply).length ? lines(f.howToApply) : ["Apply on the official site."],
        applyUrl: f.applyUrl.trim(),
        deadline: f.deadline ? new Date(f.deadline + "T23:59:00+02:00").toISOString() : null,
        lastChecked: new Date().toISOString().slice(0, 10),
        postedBy: `${f.provider.trim()} (via verifier portal)`,
      },
    });
    setDone(true);
    setF({ name: "", provider: "", kind: "grant", amountText: "", summary: "", offers: "", eligibility: "", howToApply: "", applyUrl: "", deadline: "", requiresVerified: true });
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <Megaphone size={16} className="text-ember-dark" /> Advertise a funding opportunity
      </h2>
      <p className="text-xs text-ink/50">It appears on every shop owner's Funding page straight away.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Programme name" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="input" placeholder="Provider (e.g. Dept. of Small Business Development)" value={f.provider} onChange={(e) => set("provider", e.target.value)} />
        <select className="input" value={f.kind} onChange={(e) => set("kind", e.target.value)}>
          {Object.entries(FUNDING_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Amount (e.g. Up to R50 000)" value={f.amountText} onChange={(e) => set("amountText", e.target.value)} />
        <input className="input" placeholder="Official link (https://…)" value={f.applyUrl} onChange={(e) => set("applyUrl", e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-ink/60">
          Closing date
          <input type="date" className="input" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </label>
      </div>
      <textarea className="input resize-none" rows={2} placeholder="One or two sentences on what it is" value={f.summary} onChange={(e) => set("summary", e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-3">
        <textarea className="input resize-none text-sm" rows={3} placeholder="What owners get (one per line)" value={f.offers} onChange={(e) => set("offers", e.target.value)} />
        <textarea className="input resize-none text-sm" rows={3} placeholder="Who can apply (one per line)" value={f.eligibility} onChange={(e) => set("eligibility", e.target.value)} />
        <textarea className="input resize-none text-sm" rows={3} placeholder="How to apply (one step per line)" value={f.howToApply} onChange={(e) => set("howToApply", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink/65">
        <input type="checkbox" className="h-4 w-4 accent-ember" checked={f.requiresVerified} onChange={(e) => set("requiresVerified", e.target.checked)} />
        Only for shops verified on MzansiConnect
      </label>
      <button disabled={!valid} onClick={submit} className="btn-dark w-full py-2.5 text-sm">
        Publish to the funding marketplace
      </button>
      {done && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-leaf">
          <CheckCircle2 size={15} /> Published — owners can see it now.
        </p>
      )}
    </section>
  );
}
