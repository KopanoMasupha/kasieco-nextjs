"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fundingFit } from "@/lib/funding";
import { FundingApplication } from "@/lib/types";
import { BadgeCheck, ExternalLink, Wallet } from "lucide-react";

type ApplicationStatus = FundingApplication["status"];

export default function FundingPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((item) => item.id === state.myShopId);
  const profile = state.fundingProfiles.find((item) => item.shopId === shop?.id);
  const applications = state.fundingApplications.filter((item) => item.shopId === shop?.id);
  const [draft, setDraft] = useState({
    age: profile?.age ?? 25,
    monthsTrading: profile?.monthsTrading ?? 12,
    cipc: profile?.cipc ?? false,
    tradingPermit: profile?.tradingPermit ?? false,
    womanOwned: profile?.womanOwned ?? false,
  });
  const [saved, setSaved] = useState(!!profile);
  const [error, setError] = useState("");
  const programmes = useMemo(() =>
    [...state.fundingProgrammes].sort((a, b) => {
      const order = { fit: 0, check: 1, "not-fit": 2 } as const;
      if (!profile || !shop) return 0;
      return order[fundingFit(a, profile, shop.verificationStatus === "verified").status] -
        order[fundingFit(b, profile, shop.verificationStatus === "verified").status];
    }),
  [state.fundingProgrammes, profile, shop]);

  if (!shop) return <p className="card p-5">Register your shop to explore funding programmes.</p>;

  async function saveProfile() {
    if (!shop) return;
    const result = await dispatch({ type: "SAVE_FUNDING_PROFILE", profile: { shopId: shop.id, ...draft } });
    if (result.error) setError(result.error);
    else {
      setSaved(true);
      setError("");
    }
  }

  async function setStatus(programmeId: string, status: ApplicationStatus) {
    if (!shop) return;
    const result = await dispatch({
      type: "SET_FUNDING_APPLICATION",
      application: {
        id: "",
        shopId: shop.id,
        programmeId,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
    if (result.error) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><Wallet size={20} className="text-ember-dark" /> Funding marketplace</h1>
        <p className="mt-1 text-sm text-ink/50">Explore possible support, check your readiness, then confirm current details with the official programme.</p>
      </header>
      {error && <p role="alert" className="card border-red-200 p-3 text-sm text-red-700">{error}</p>}
      <section className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold text-ink">Your eligibility pre-check</h2>
          <p className="text-xs text-ink/45">Answer once. This is guidance, not an approval or guarantee.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink/65">Owner age<input type="number" min={0} value={draft.age} onChange={(event) => { setDraft({ ...draft, age: Number(event.target.value) }); setSaved(false); }} className="input mt-1" /></label>
          <label className="text-sm text-ink/65">Months trading<input type="number" min={0} value={draft.monthsTrading} onChange={(event) => { setDraft({ ...draft, monthsTrading: Number(event.target.value) }); setSaved(false); }} className="input mt-1" /></label>
          <label className="flex items-center gap-2 text-sm text-ink/65"><input type="checkbox" checked={draft.cipc} onChange={(event) => { setDraft({ ...draft, cipc: event.target.checked }); setSaved(false); }} /> CIPC registered</label>
          <label className="flex items-center gap-2 text-sm text-ink/65"><input type="checkbox" checked={draft.tradingPermit} onChange={(event) => { setDraft({ ...draft, tradingPermit: event.target.checked }); setSaved(false); }} /> Municipal trading permit</label>
          <label className="flex items-center gap-2 text-sm text-ink/65"><input type="checkbox" checked={draft.womanOwned} onChange={(event) => { setDraft({ ...draft, womanOwned: event.target.checked }); setSaved(false); }} /> Woman-owned business</label>
        </div>
        <button onClick={saveProfile} className="btn-dark px-4 py-2.5 text-sm">{profile || saved ? "Save eligibility answers" : "Check eligibility"}</button>
      </section>
      <div className="space-y-3">
        {programmes.map((programme) => {
          const fit = profile ? fundingFit(programme, profile, shop.verificationStatus === "verified") : null;
          const application = applications.find((item) => item.programmeId === programme.id);
          const isSoon = programme.deadline && Date.parse(programme.deadline) > Date.now() &&
            Date.parse(programme.deadline) < Date.now() + 7 * 24 * 60 * 60 * 1000;
          return (
            <article key={programme.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{programme.name}</h2>
                  <p className="text-xs text-ink/45">{programme.provider} · {programme.type}</p>
                </div>
                {fit && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fit.status === "fit" ? "bg-leaf/10 text-leaf" : fit.status === "check" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-600"}`}>
                  {fit.status === "fit" ? "Looks like a fit" : fit.status === "check" ? "Check first" : "Not a fit"}
                </span>}
                {isSoon && <span className="rounded-full bg-ember/10 px-2.5 py-1 text-xs font-semibold text-ember-dark">Closes within 7 days</span>}
              </div>
              <p className="mt-3 text-sm text-ink/65">{programme.summary}</p>
              {fit && <p className="mt-2 text-xs text-ink/50">{fit.note}</p>}
              {programme.deadline && <p className="mt-2 text-xs text-ink/50">Published deadline: {new Date(programme.deadline).toLocaleDateString("en-ZA")}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href={programme.officialUrl} target="_blank" rel="noreferrer" className="btn-outline px-3 py-2 text-xs">Confirm on official site <ExternalLink size={13} /></a>
                <select aria-label={`Application status for ${programme.name}`} value={application?.status ?? ""} onChange={(event) => event.target.value && setStatus(programme.id, event.target.value as ApplicationStatus)} className="input w-auto py-2 text-xs">
                  <option value="">Track application…</option>
                  <option value="saved">Saved</option>
                  <option value="preparing">Preparing documents</option>
                  <option value="applied">Applied</option>
                </select>
                {application && <span className="text-xs text-ink/45">Status: {application.status}</span>}
              </div>
            </article>
          );
        })}
      </div>
      <p className="flex items-center gap-1 text-xs text-ink/35"><BadgeCheck size={13} /> Programme details and eligibility change; verify dates and terms with the listed provider before applying.</p>
    </div>
  );
}
