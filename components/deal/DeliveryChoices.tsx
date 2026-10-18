"use client";

import clsx from "clsx";
import { CalendarDays, Clock, Store, UserRound, ShieldCheck, Check } from "lucide-react";
import { DAY_SHORT, DeliveryPrefs, MISSED_CHOICES, PARTNER_RADIUS_KM, REDELIVERY_FEE_CENTS, PARTNER_FEE_PER_UNIT_CENTS, Shop } from "@/lib/types";
import { useStore } from "@/lib/store";
import { partnersNear } from "@/lib/delivery";
import { formatDistance } from "@/lib/geo";
import { formatCents } from "@/lib/pot";

export type PrefsDraft = Omit<DeliveryPrefs, "agreedAt">;

export const DEFAULT_DRAFT: PrefsDraft = { days: [1, 2, 3, 4, 5], time: "any", ifMissed: "next-run" };

/** Is the draft complete enough to submit? Returns the first problem in plain words. */
export function draftProblem(d: PrefsDraft, agreed: boolean): string | null {
  if (!d.days.length) return "Pick at least one day.";
  if (d.ifMissed === "partner" && !d.partnerShopId) return "Pick a partner shop.";
  if (d.backupName?.trim() && !d.backupPhone?.trim()) return "Add your backup person's phone.";
  if (!agreed) return "Please agree to the delivery rules.";
  return null;
}

/**
 * The owner's delivery choices, in four plain questions:
 * which days, what time, what if I'm not there, and who else may receive.
 */
export default function DeliveryChoices({ shop, value, onChange, agreed, onAgree, units = 1 }: { shop: Shop; value: PrefsDraft; onChange: (v: PrefsDraft) => void; agreed: boolean; onAgree: (v: boolean) => void; units?: number }) {
  const { state } = useStore();
  const partners = partnersNear(state.shops, state.trips, shop);
  const set = (patch: Partial<PrefsDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label flex items-center gap-1.5">
          <CalendarDays size={14} /> Days
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((d) => {
            const on = value.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => set({ days: on ? value.days.filter((x) => x !== d) : [...value.days, d].sort() })}
                className={clsx("flex h-10 min-w-[52px] items-center justify-center gap-1 rounded-xl border px-2 text-sm font-semibold", on ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/60")}
              >
                {on && <Check size={12} />}
                {DAY_SHORT[d]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label flex items-center gap-1.5">
          <Clock size={14} /> Time
        </legend>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["morning", "Morning", "before 12:00"],
              ["afternoon", "Afternoon", "after 12:00"],
              ["any", "Any time", "open hours"],
            ] as const
          ).map(([id, t, sub]) => (
            <button key={id} type="button" aria-pressed={value.time === id} onClick={() => set({ time: id })} className={clsx("rounded-xl border px-2 py-2 text-center text-sm", value.time === id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70")}>
              <span className="block font-semibold">{t}</span>
              <span className={clsx("text-[11px]", value.time === id ? "text-white/70" : "text-ink/45")}>{sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label flex items-center gap-1.5">
          <Store size={14} /> If you're not there
        </legend>
        <div className="space-y-1.5">
          {MISSED_CHOICES.map((c) => {
            const disabled = c.id === "partner" && partners.length === 0;
            const on = value.ifMissed === c.id;
            return (
              <div key={c.id} className={clsx("rounded-xl border p-3", on ? "border-ember bg-ember/5" : "border-ink/10 bg-white", disabled && "opacity-50")}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="radio" name="ifMissed" className="mt-1" checked={on} disabled={disabled} onChange={() => set({ ifMissed: c.id, partnerShopId: c.id === "partner" ? value.partnerShopId ?? partners[0]?.shop.id : undefined })} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-sm font-semibold text-ink">{c.title}</span>
                      <span className="text-[11px] font-medium text-ink/50">{c.cost}</span>
                    </span>
                    <span className="block text-xs text-ink/55">{disabled ? `None within ${PARTNER_RADIUS_KM} km yet.` : c.help}</span>
                  </span>
                </label>
                {c.id === "partner" && on && (
                  <div className="mt-2 space-y-1 pl-6">
                    {partners.map((p) => (
                      <label key={p.shop.id} className={clsx("flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm", value.partnerShopId === p.shop.id ? "bg-white ring-2 ring-ember/40" : "bg-sand-50")}>
                        <span className="flex items-center gap-2">
                          <input type="radio" name="partner" checked={value.partnerShopId === p.shop.id} onChange={() => set({ partnerShopId: p.shop.id })} />
                          <span>
                            <span className="font-medium text-ink">{p.shop.name}</span>
                            <span className="block text-[11px] text-ink/45">
                              {formatDistance(p.km)} · {p.shop.address}
                            </span>
                          </span>
                        </span>
                        <span className={clsx("shrink-0 text-[11px] font-semibold", p.free >= units ? "text-leaf" : "text-ember-dark")}>{p.free >= units ? `${p.free} free` : "nearly full"}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label flex items-center gap-1.5">
          <UserRound size={14} /> Backup person <span className="font-normal text-ink/45">(optional)</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={value.backupName ?? ""} onChange={(e) => set({ backupName: e.target.value })} placeholder="Name" className="input" aria-label="Backup person's name" />
          <input value={value.backupPhone ?? ""} onChange={(e) => set({ backupPhone: e.target.value })} placeholder="Phone" inputMode="tel" className="input" aria-label="Backup person's phone" />
        </div>
        <p className="mt-1 text-[11px] text-ink/45">They get their own code.</p>
      </fieldset>

      <label className={clsx("flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs", agreed ? "border-leaf/40 bg-leaf/5" : "border-ink/10 bg-white")}>
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(e) => onAgree(e.target.checked)} />
        <span className="text-ink/70">
          <span className="flex items-center gap-1 font-semibold text-ink">
            <ShieldCheck size={13} /> I agree to the delivery rules
          </span>
          Confirmed but not there: {formatCents(REDELIVERY_FEE_CENTS)} fee. Partner shop: {formatCents(PARTNER_FEE_PER_UNIT_CENTS)} a unit. I count before I give my code.
        </span>
      </label>
    </div>
  );
}
