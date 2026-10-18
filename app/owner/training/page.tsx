"use client";

import ComplianceTabs from "@/components/ComplianceTabs";

import { useStore } from "@/lib/store";
import { TRAINING_TOPIC_LABEL } from "@/lib/types";
import { CalendarDays, MapPin, Users, Store, CheckCircle2, Landmark } from "lucide-react";
import Link from "next/link";

export default function TrainingPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const sessions = [...state.trainingSessions].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ComplianceTabs />
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-ink">
          <Landmark size={20} className="text-ember-dark" /> Training
        </h1>
        <p className="text-sm text-ink/50">
          Free, in person · W&amp;R SETA and Sefa
        </p>
      </div>

      <div className="space-y-3">
        {sessions.map((s) => {
          const isPast = new Date(s.date) < new Date();
          const registered = s.attendees.some((a) => a.shopId === shop.id);
          const attendedRecord = s.attendees.find((a) => a.shopId === shop.id);
          const full = s.attendees.length >= s.capacity;

          return (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ember-dark">
                    {TRAINING_TOPIC_LABEL[s.topic]}
                  </p>
                  <h2 className="mt-0.5 font-semibold text-ink">{s.title}</h2>
                  <p className="text-xs text-ink/40">{s.provider}</p>
                </div>
                {attendedRecord?.attended && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">
                    <CheckCircle2 size={12} /> Attended
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/50">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  {new Date(s.date).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {s.venue}, {s.township}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {s.attendees.length}/{s.capacity} registered
                </span>
              </div>

              {s.notes && <p className="mt-2 rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink/60">{s.notes}</p>}

              {!isPast && (
                <div className="mt-4">
                  {registered ? (
                    <button
                      onClick={() => dispatch({ type: "CANCEL_TRAINING_REGISTRATION", sessionId: s.id, shopId: shop.id })}
                      className="btn-outline w-full py-2.5 text-sm"
                    >
                      Cancel my spot
                    </button>
                  ) : (
                    <button
                      disabled={full}
                      onClick={() =>
                        dispatch({ type: "REGISTER_TRAINING", sessionId: s.id, shopId: shop.id, shopName: shop.name })
                      }
                      className="btn-dark w-full py-2.5 text-sm"
                    >
                      {full ? "Session full" : "Register my shop"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
