"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  Landmark,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Bookmark,
  ChevronDown,
  Store,
  UserCog,
  Info,
} from "lucide-react";
import { useStore, useMyShop } from "@/lib/store";
import { FUNDING_KIND_LABEL, FundingInterestStatus, FundingKind, FundingProfile } from "@/lib/types";
import { checkEligibility, daysUntil } from "@/lib/funding";

const STATUS_LABEL: Record<FundingInterestStatus, string> = { saved: "Saved", preparing: "Preparing documents", applied: "Applied" };
const KINDS: (FundingKind | "all")[] = ["all", "grant", "blended", "loan", "training", "mentorship"];

function ProfileForm({ profile, onSave }: { profile: FundingProfile; onSave: (p: FundingProfile) => void }) {
  const [p, setP] = useState(profile);
  useEffect(() => setP(profile), [profile]);
  const yn = (key: "hasCipc" | "hasTradingPermit" | "womanOwned", label: string) => (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-1.5">
        {[true, false].map((v) => (
          <button key={String(v)} onClick={() => setP({ ...p, [key]: v })} className={clsx("chip px-3 py-1.5 text-xs", p[key] === v && "chip-active")}>
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">Quick check</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Your age</span>
          <input type="number" min={16} max={100} value={p.ownerAge ?? ""} onChange={(e) => setP({ ...p, ownerAge: e.target.value ? parseInt(e.target.value) : undefined })} className="input" />
        </label>
        <label>
          <span className="label">Months trading</span>
          <input type="number" min={0} value={p.tradingMonths ?? ""} onChange={(e) => setP({ ...p, tradingMonths: e.target.value ? parseInt(e.target.value) : undefined })} className="input" />
        </label>
        {yn("hasCipc", "Registered with CIPC?")}
        {yn("hasTradingPermit", "Municipal trading permit?")}
        {yn("womanOwned", "Woman-owned?")}
      </div>
      <button onClick={() => onSave(p)} className="btn-dark w-full py-2.5 text-sm">
        Save and check my matches
      </button>
    </div>
  );
}

export default function FundingPage() {
  const { state, dispatch } = useStore();
  const shop = useMyShop();
  const [kind, setKind] = useState<FundingKind | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState(false);

  if (!shop) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
      </div>
    );
  }

  const profile = state.fundingProfiles.find((p) => p.shopId === shop.id);
  const interests = state.fundingInterests.filter((i) => i.shopId === shop.id);
  const statusOf = (id: string) => interests.find((i) => i.opportunityId === id)?.status;

  const ops = state.funding
    .filter((o) => kind === "all" || o.kind === kind)
    .filter((o) => !o.deadline || new Date(o.deadline).getTime() > Date.now())
    .map((o) => ({ o, elig: checkEligibility(o, shop, profile) }))
    .sort((a, b) => {
      const rank = { likely: 0, check: 1, no: 2 };
      const da = daysUntil(a.o.deadline) ?? 999;
      const db = daysUntil(b.o.deadline) ?? 999;
      return rank[a.elig.level] - rank[b.elig.level] || da - db;
    });
  const tracked = state.funding.filter((o) => statusOf(o.id));

  const setInterest = (opportunityId: string, status: FundingInterestStatus | null) =>
    dispatch({ type: "SET_FUNDING_INTEREST", shopId: shop.id, opportunityId, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-ink">
            <Landmark size={22} className="text-ember-dark" /> Funding & support
          </h1>
          <p className="max-w-2xl text-sm text-ink/55">Grants, loans and programmes — see what fits.</p>
        </div>
        <button onClick={() => setEditProfile((v) => !v)} className="btn-outline px-4 py-2.5 text-sm">
          <UserCog size={15} /> {profile ? "Edit answers" : "Check eligibility"}
        </button>
      </div>

      {(editProfile || !profile) && (
        <ProfileForm
          profile={profile ?? { shopId: shop.id }}
          onSave={async (p) => {
            await dispatch({ type: "SAVE_FUNDING_PROFILE", profile: { ...p, shopId: shop.id } });
            setEditProfile(false);
          }}
        />
      )}

      {tracked.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">My applications</h2>
          <div className="space-y-2">
            {tracked.map((o) => {
              const st = statusOf(o.id)!;
              return (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 bg-sand-50 p-3 text-sm">
                  <span className="font-medium text-ink">{o.name}</span>
                  <div className="flex gap-1.5">
                    {(["saved", "preparing", "applied"] as FundingInterestStatus[]).map((s) => (
                      <button key={s} onClick={() => setInterest(o.id, s)} className={clsx("chip px-2.5 py-1 text-xs", st === s && "chip-active")}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button onClick={() => setInterest(o.id, null)} className="chip px-2.5 py-1 text-xs text-ink/45">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={clsx("chip", kind === k && "chip-active")}>
            {k === "all" ? "Everything" : FUNDING_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {ops.map(({ o, elig }) => {
          const left = daysUntil(o.deadline);
          const expanded = open === o.id;
          const st = statusOf(o.id);
          return (
            <article key={o.id} className="card overflow-hidden">
              <button onClick={() => setOpen(expanded ? null : o.id)} className="flex w-full items-start gap-4 p-5 text-left" aria-expanded={expanded}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-semibold text-ink/60">{FUNDING_KIND_LABEL[o.kind]}</span>
                    {left !== null && left <= 7 && (
                      <span className="flex items-center gap-1 rounded-full bg-ember px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        <CalendarClock size={11} /> {left === 0 ? "Closes today" : `Closes in ${left} day${left === 1 ? "" : "s"}`}
                      </span>
                    )}
                    {left === null && <span className="text-[11px] font-medium text-ink/40">Open — apply any time</span>}
                    {st && <span className="rounded-full bg-leaf/10 px-2.5 py-0.5 text-[11px] font-semibold text-leaf">{STATUS_LABEL[st]}</span>}
                  </div>
                  <h3 className="mt-1.5 font-bold text-ink">{o.name}</h3>
                  <p className="text-xs text-ink/45">{o.provider}</p>
                  <p className="mt-2 text-sm text-ink/65">{o.summary}</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{o.amountText}</p>
                </div>
                <div className="hidden w-48 shrink-0 sm:block">
                  <div
                    className={clsx(
                      "rounded-xl2 p-3 text-xs",
                      elig.level === "likely" && "bg-leaf/10 text-leaf",
                      elig.level === "check" && "bg-amber-100/80 text-amber-800",
                      elig.level === "no" && "bg-ink/5 text-ink/50"
                    )}
                  >
                    <p className="flex items-center gap-1 font-semibold">
                      {elig.level === "likely" ? <CheckCircle2 size={13} /> : elig.level === "check" ? <AlertCircle size={13} /> : <XCircle size={13} />}
                      {elig.level === "likely" ? "Looks like a fit" : elig.level === "check" ? "Check first" : "Not a fit"}
                    </p>
                    <p className="mt-1 leading-snug">{elig.reasons[0]}</p>
                  </div>
                </div>
                <ChevronDown size={18} className={clsx("mt-1 shrink-0 text-ink/30 transition-transform", expanded && "rotate-180")} />
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-5 border-t border-ink/5 p-5 md:grid-cols-3">
                      <div>
                        <h4 className="text-xs font-semibold text-ink/45">What you get</h4>
                        <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                          {o.offers.map((x) => (
                            <li key={x} className="flex gap-2">
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-leaf" />
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-ink/45">Who can apply</h4>
                        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-ink/70">
                          {o.eligibility.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                        {o.priority && <p className="mt-2 text-xs text-ink/50">{o.priority}</p>}
                        <div className="mt-3 rounded-xl bg-sand-50 p-3 text-xs sm:hidden">
                          <p className="font-semibold">{elig.level === "likely" ? "Looks like a fit" : elig.level === "check" ? "Check first" : "Not a fit"}</p>
                          {elig.reasons.map((r) => (
                            <p key={r}>{r}</p>
                          ))}
                        </div>
                        {elig.reasons.length > 1 && (
                          <ul className="mt-3 hidden space-y-1 text-xs text-amber-800 sm:block">
                            {elig.reasons.map((r) => (
                              <li key={r}>• {r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-ink/45">How to apply</h4>
                        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-ink/70">
                          {o.howToApply.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ol>
                        {o.contact && <p className="mt-2 text-xs text-ink/50">{o.contact}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-ink/5 px-5 py-4">
                      <a href={o.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-ember px-4 py-2.5 text-sm">
                        Official site <ExternalLink size={13} />
                      </a>
                      {!st ? (
                        <button onClick={() => setInterest(o.id, "saved")} className="btn-outline px-4 py-2.5 text-sm">
                          <Bookmark size={14} /> Track this
                        </button>
                      ) : (
                        <button onClick={() => setInterest(o.id, st === "saved" ? "preparing" : "applied")} className="btn-outline px-4 py-2.5 text-sm" disabled={st === "applied"}>
                          {st === "applied" ? "Applied ✓" : st === "saved" ? "I'm preparing documents" : "Mark as applied"}
                        </button>
                      )}
                      {o.criteria.requiresVerified && shop.verificationStatus !== "verified" && (
                        <Link href="/owner/compliance" className="text-sm font-semibold text-ember-dark underline">
                          Get verified first
                        </Link>
                      )}
                      <p className="ml-auto flex items-center gap-1 text-[11px] text-ink/40">
                        <Info size={12} /> Details checked {new Date(o.lastChecked).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · posted
                        by {o.postedBy}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
        {ops.length === 0 && <div className="card p-6 text-sm text-ink/50">Nothing in this category right now.</div>}
      </div>
    </div>
  );
}
