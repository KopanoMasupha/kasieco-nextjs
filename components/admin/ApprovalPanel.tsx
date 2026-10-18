"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Hourglass, Loader2, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { ApprovalKind, Pool } from "@/lib/types";
import { useStore, useMe } from "@/lib/store";
import { formatCents } from "@/lib/pot";

/**
 * Two-person rule for money leaving a deal. One admin asks; a different admin
 * sees exactly what will be paid and approves or says no (with a reason).
 */
export default function ApprovalPanel({ deal, kind, askLabel, help }: { deal: Pool; kind: ApprovalKind; askLabel: string; help: string }) {
  const { state, dispatch } = useStore();
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const forDeal = state.approvals.filter((a) => a.dealId === deal.id && a.kind === kind);
  const pending = forDeal.find((a) => a.status === "pending");
  const lastNo = [...forDeal].reverse().find((a) => a.status === "rejected");
  const others = state.users.filter((u) => u.role === "admin" && u.id !== me?.id);

  async function run(action: any) {
    setBusy(true);
    setError("");
    const meta = await dispatch(action);
    setBusy(false);
    if (meta.error) setError(meta.error);
    else setNote("");
  }

  if (!me) return null;

  if (!pending)
    return (
      <div className="space-y-2">
        {lastNo && (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <XCircle size={15} className="mt-0.5 shrink-0" /> Last time {lastNo.decidedByName} said no{lastNo.note ? `: "${lastNo.note}"` : ""}. Fix that, then ask again.
          </p>
        )}
        <button onClick={() => run({ type: "ADMIN_REQUEST_APPROVAL", kind, dealId: deal.id, adminId: me.id })} disabled={busy} className="btn-ember w-full py-3.5 text-sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} {askLabel}
        </button>
        <p className="text-center text-xs text-ink/50">{help} Nothing is paid until {others.map((o) => o.name.split(" (")[0]).join(" or ") || "another admin"} approves.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    );

  const mine = pending.requestedById === me.id;
  return (
    <div className={clsx("space-y-3 rounded-xl2 border p-4", mine ? "border-ink/10 bg-sand-50" : "border-ember/40 bg-ember/5")}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        {mine ? <Hourglass size={15} className="text-ember" /> : <UserCheck size={15} className="text-ember" />}
        {mine ? `Waiting for a second admin to approve` : `${pending.requestedByName} asks you to approve`}
      </p>
      <div className="rounded-xl bg-white p-3 text-sm">
        <p className="font-semibold text-ink">{pending.summary}</p>
        <p className="text-xs text-ink/50">
          Amount: <strong>{formatCents(pending.amountCents)}</strong> · asked {new Date(pending.requestedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {mine ? (
        <p className="text-xs text-ink/55">
          Waiting for {others.map((o) => o.name.split(" (")[0]).join(" or ")}.
        </p>
      ) : (
        <>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (needed if you say no)" className="input text-sm" aria-label="Reason" />
          <div className="flex gap-2">
            <button onClick={() => run({ type: "ADMIN_DECIDE_APPROVAL", approvalId: pending.id, adminId: me.id, approve: true, note })} disabled={busy} className="btn-ember flex-1 py-3 text-sm">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
            </button>
            <button
              onClick={() => (note.trim() ? run({ type: "ADMIN_DECIDE_APPROVAL", approvalId: pending.id, adminId: me.id, approve: false, note }) : setError("Add a reason."))}
              disabled={busy}
              className="btn-outline px-4 py-3 text-sm text-red-600"
            >
              <XCircle size={14} /> Say no
            </button>
          </div>
        </>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
