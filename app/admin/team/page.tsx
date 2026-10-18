"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, Hourglass, MapPin, Phone, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { useStore, useLiveRefresh, useMe } from "@/lib/store";
import { ADMIN_ROLE_LABEL } from "@/lib/types";
import { formatCents } from "@/lib/pot";
import { PageSkeleton } from "@/components/Skeleton";

const JOBS = {
  money: ["Publish wholesaler deals", "Check payments when a deal fills", "Ask for approval to pay wholesalers", "Approve the other admin's requests"],
  dispatch: ["Plan and book drivers", "Rebook missed deliveries", "Send reminders and updates", "Approve the other admin's requests"],
};

/** Who does what, the two-person rule, and a record of every approval. */
export default function AdminTeam() {
  useLiveRefresh(4000);
  const { state, loading } = useStore();
  const me = useMe();
  if (loading && !state.users.length) return <PageSkeleton />;

  const admins = state.users.filter((u) => u.role === "admin");
  const approvals = [...state.approvals].reverse();
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");
  const adminNames = admins.map((a) => a.name.split(" (")[0]);
  const log = state.pools
    .flatMap((p) => p.events.map((e) => ({ ...e, deal: p })))
    .filter((e) => adminNames.some((n) => e.by.includes(n)))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Admin team</h1>
        <p className="text-sm text-ink/55">Money only moves when both agree.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {admins.map((a) => (
          <div key={a.id} className={clsx("card p-5", a.id === me?.id && "border-ember/40")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                  <UserRound size={19} />
                </span>
                <div>
                  <p className="font-bold text-ink">
                    {a.name.split(" (")[0]} {a.id === me?.id && <span className="text-xs font-semibold text-ember-dark">(you)</span>}
                  </p>
                  <p className="text-xs font-semibold text-ink/60">{a.adminRole ? ADMIN_ROLE_LABEL[a.adminRole] : "Admin"}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-ink/50">
                <Phone size={11} /> {a.phone}
              </span>
            </div>
            {a.townships?.length ? (
              <p className="mt-3 flex items-center gap-1 text-xs text-ink/60">
                <MapPin size={12} /> Looks after: {a.townships.join(", ")}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm text-ink/70">
              {(a.adminRole ? JOBS[a.adminRole] : []).map((j) => (
                <li key={j} className="flex items-start gap-1.5">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-leaf" /> {j}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-[auto_1fr]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember text-white">
          <ShieldCheck size={22} />
        </span>
        <div className="text-sm text-ink/70">
          <p className="font-bold text-ink">The two-person rule</p>
          <p>One asks, a <strong>different</strong> admin approves. Every decision is logged.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
          <Hourglass size={16} /> Waiting ({pending.length})
        </h2>
        <ul className="space-y-2">
          {pending.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/deals/${a.dealId}`} className="flex items-center gap-3 rounded-xl2 bg-sand-50 p-3 text-sm hover:bg-sand-100">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{a.summary}</span>
                  <span className="text-xs text-ink/55">
                    Asked by {a.requestedByName} · {new Date(a.requestedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {a.requestedById === me?.id ? "waiting for the other admin" : <strong className="text-ember-dark">you can approve this</strong>}
                  </span>
                </span>
                <ArrowRight size={15} className="text-ink/30" />
              </Link>
            </li>
          ))}
          {pending.length === 0 && <li className="text-sm text-ink/45">Nothing waiting.</li>}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Approvals</h2>
          <ul className="space-y-2 text-sm">
            {decided.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2">
                {a.status === "approved" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />}
                <span>
                  <span className="text-ink/80">{a.summary}</span>
                  <span className="block text-xs text-ink/45">
                    {formatCents(a.amountCents)} · asked by {a.requestedByName} · {a.status === "approved" ? "approved" : "refused"} by {a.decidedByName}
                    {a.decidedAt ? `, ${new Date(a.decidedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                    {a.note ? ` — "${a.note}"` : ""}
                  </span>
                </span>
              </li>
            ))}
            {decided.length === 0 && <li className="text-ink/45">No decisions yet.</li>}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Recent activity</h2>
          <ul className="space-y-1.5 text-xs text-ink/65">
            {log.map((e, i) => (
              <li key={i}>
                <span className="font-semibold text-ink/80">{e.by}:</span> {e.text}{" "}
                <Link href={`/admin/deals/${e.deal.id}`} className="text-ember-dark underline">
                  {e.deal.productName}
                </Link>{" "}
                <span className="text-ink/35">· {new Date(e.at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
