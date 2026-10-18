"use client";

import { useState } from "react";
import { useStore, useMe } from "@/lib/store";
import { COMPLIANCE_DOC_LABEL } from "@/lib/types";
import { STATUS_STYLE, statusLabel } from "@/lib/compliance";
import PostOpportunityForm from "@/components/PostOpportunityForm";
import { ShieldCheck, CheckCircle2, XCircle, Clock, GraduationCap } from "lucide-react";

export default function VerifyPage() {
  const { state, dispatch } = useStore();
  const me = useMe();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = state.verificationRequests.filter((r) => r.status === "pending");
  const decided = state.verificationRequests
    .filter((r) => r.status !== "pending")
    .sort((a, b) => (a.decidedAt! < b.decidedAt! ? 1 : -1));

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setBusyId(requestId);
    await dispatch({
      type: "DECIDE_VERIFICATION",
      requestId,
      decision,
      note: notes[requestId] || "",
      decidedBy: me?.name ?? "Verifier",
    });
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-ink">
          <ShieldCheck size={20} className="text-ember-dark" /> Verification queue
        </h1>
        <p className="text-sm text-ink/50">Awaiting your decision.</p>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-ink">Compliance register</h2>
        <p className="text-xs text-ink/45">Every shop and its status.</p>
        <div className="mt-3 divide-y divide-ink/5">
          {state.shops.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{s.name}</span>
                <span className="text-xs text-ink/40">
                  {s.township} · {s.verificationMethod === "course" ? "via compliance course" : s.verificationMethod === "document" ? "via documents" : "not started"}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.verificationStatus]}`}>{statusLabel(s.verificationStatus)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {pending.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink/45">Nothing waiting for review right now.</div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{r.shopName}</p>
                <p className="flex items-center gap-1 text-xs text-ink/40">
                  <Clock size={11} /> Submitted {new Date(r.submittedAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Pending</span>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-ink/5 pt-3 text-sm">
              {r.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-ink/65">
                  <span>{COMPLIANCE_DOC_LABEL[d.docType]}</span>
                  <span className="text-xs text-ink/40">
                    {d.fileName}
                    {d.referenceNumber ? ` · Ref: ${d.referenceNumber}` : ""}
                  </span>
                </div>
              ))}
            </div>

            <textarea
              value={notes[r.id] || ""}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              placeholder="Note for the owner (required if rejecting)"
              rows={2}
              className="input mt-3 resize-none text-sm"
            />

            <div className="mt-3 flex gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => decide(r.id, "approved")}
                className="btn-dark flex-1 py-2.5 text-sm"
              >
                <CheckCircle2 size={14} /> Approve
              </button>
              <button
                disabled={busyId === r.id || !notes[r.id]?.trim()}
                onClick={() => decide(r.id, "rejected")}
                className="btn-outline flex-1 py-2.5 text-sm"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {state.certificates.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
            <GraduationCap size={16} className="text-leaf" /> Auto-verified via the compliance course
          </h2>
          <div className="card divide-y divide-ink/5 p-2">
            {state.certificates.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                <span className="text-ink/70">{c.shopName}</span>
                <span className="text-xs text-ink/40">
                  {c.certificateNumber} · {Math.round(c.score * 100)}% · {new Date(c.issuedAt).toLocaleDateString("en-ZA")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {decided.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold text-ink">Decision history</h2>
          <div className="card divide-y divide-ink/5 p-2">
            {decided.map((r) => (
              <div key={r.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink/70">{r.shopName}</span>
                  <span className={r.status === "approved" ? "text-xs font-semibold text-leaf" : "text-xs font-semibold text-red-500"}>
                    {r.status}
                  </span>
                </div>
                {r.note && <p className="mt-1 text-xs text-ink/40">{r.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      <PostOpportunityForm />

      <button
        onClick={() => {
          if (confirm("Reset the demo?")) dispatch({ type: "RESET_DEMO" });
        }}
        className="text-xs text-ink/40 underline hover:text-ink/70"
      >
        Reset demo data
      </button>
    </div>
  );
}
