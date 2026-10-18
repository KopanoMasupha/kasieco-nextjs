"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Sparkles, Send, Loader2, CheckCircle2, Truck, Store } from "lucide-react";
import { Deal, Trip, Wholesaler } from "@/lib/types";
import { DRAFT_KINDS, DraftKind, Draft, draftMessages } from "@/lib/messageDrafts";
import { useStore, useMe } from "@/lib/store";

/**
 * AI message assistant for admins. Pick what you want to say; it writes a
 * personal message for every shop (with their own time slot) or every driver
 * (with their own load and stops). Edit anything, untick anyone, then send.
 */
function resetKey(kind: string, deal: Deal, trips: Trip[], late: number, to: string, text: string) {
  return [kind, deal.id, deal.status, deal.poNumber, deal.commitments.length, trips.map((t) => t.id + t.status + t.stops.map((s) => s.window).join()).join("|"), late, to, text].join("¦");
}

export default function MessageAssistant({ deal, trips, wholesaler, suggested }: { deal: Deal; trips: Trip[]; wholesaler?: Wholesaler; suggested?: DraftKind }) {
  const { state, dispatch } = useStore();
  const me = useMe();
  const available = DRAFT_KINDS.filter((k) => {
    if (k.kind === "driver-brief" || k.kind === "running-late" || k.kind === "reminder" || k.kind === "delivery-booked") return trips.length > 0;
    if (k.kind === "order-placed") return !!deal.poNumber;
    return true;
  });
  const [kind, setKind] = useState<DraftKind>(suggested && available.some((k) => k.kind === suggested) ? suggested : available[0].kind);
  // when the deal moves to a new step, jump to the message that fits it
  useEffect(() => {
    if (suggested && available.some((k) => k.kind === suggested)) setKind(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested, deal.poNumber, trips.length]);
  const [late, setLate] = useState(30);
  const [customTo, setCustomTo] = useState<"owners" | "drivers">("owners");
  const [customText, setCustomText] = useState("");
  const [drafts, setDrafts] = useState<(Draft & { on: boolean })[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState("");

  const base = useMemo(() => {
    if (kind !== "custom") return draftMessages(kind, deal, trips, wholesaler, late);
    if (customTo === "drivers")
      return trips.map((t) => ({ toRole: "driver" as const, toId: t.driverId, toName: t.driverName, text: customText }));
    return deal.commitments.map((c) => ({ toRole: "owner" as const, toId: c.shopId, toName: c.shopName, text: customText }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey(kind, deal, trips, late, customTo, customText)]);

  // only rebuild the drafts when something meaningful changes — not on every live refresh,
  // so the admin's edits aren't wiped while they type
  useEffect(() => {
    setDrafts(base.map((d) => ({ ...d, on: true })));
    setSent(null);
    setError("");
  }, [base]);

  async function send() {
    const chosen = drafts.filter((d) => d.on && d.text.trim());
    if (!chosen.length) return setError("Tick at least one person and write a message.");
    setBusy(true);
    setError("");
    const meta = await dispatch({
      type: "SEND_MESSAGES",
      fromRole: "admin",
      fromName: me?.name.split(" (")[0] ?? "MzansiConnect",
      dealId: deal.id,
      messages: chosen.map((d) => ({ toRole: d.toRole, toId: d.toId, text: d.text })),
    });
    setBusy(false);
    if (meta.error) return setError(meta.error);
    setSent(meta.sent);
  }

  const help = DRAFT_KINDS.find((k) => k.kind === kind)?.help;
  const onCount = drafts.filter((d) => d.on).length;

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <Sparkles size={16} className="text-ember" /> Message assistant
      </h2>
      <p className="mt-0.5 text-xs text-ink/50">Pick a topic. Edit before sending.</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {available.map((k) => (
          <button
            key={k.kind}
            onClick={() => setKind(k.kind)}
            className={clsx("rounded-full px-3 py-1.5 text-xs font-semibold", kind === k.kind ? "bg-ink text-white" : "bg-sand-50 text-ink/65 hover:bg-sand-100")}
          >
            {k.audience === "drivers" ? <Truck size={11} className="mr-1 inline" /> : k.audience === "owners" ? <Store size={11} className="mr-1 inline" /> : null}
            {k.label}
          </button>
        ))}
      </div>
      {help && <p className="mt-2 text-xs text-ink/55">{help}</p>}

      {kind === "running-late" && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          How late?
          <select value={late} onChange={(e) => setLate(+e.target.value)} className="input !w-auto py-1.5">
            {[15, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === "custom" && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-1.5 text-xs">
            <span className="py-1.5 text-ink/55">Send to:</span>
            {(["owners", "drivers"] as const).map((t) => (
              <button key={t} disabled={t === "drivers" && !trips.length} onClick={() => setCustomTo(t)} className={clsx("rounded-full px-3 py-1.5 font-semibold", customTo === t ? "bg-ink text-white" : "bg-sand-50 text-ink/65")}>
                {t === "owners" ? `Shops (${deal.commitments.length})` : `Drivers (${trips.length})`}
              </button>
            ))}
          </div>
          <textarea rows={3} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Your message" className="input" />
        </div>
      )}

      {kind !== "custom" && (
        <ul className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {drafts.map((d, i) => (
            <li key={d.toId} className={clsx("rounded-xl border p-3", d.on ? "border-ink/10 bg-sand-50" : "border-dashed border-ink/10 opacity-50")}>
              <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink/70">
                <input type="checkbox" checked={d.on} onChange={(e) => setDrafts((all) => all.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                {d.toRole === "driver" ? <Truck size={12} /> : <Store size={12} />} To {d.toName}
              </label>
              <textarea
                rows={d.toRole === "driver" ? 6 : 3}
                value={d.text}
                onChange={(e) => setDrafts((all) => all.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                className="input text-sm"
                aria-label={`Message to ${d.toName}`}
              />
            </li>
          ))}
        </ul>
      )}
      {kind === "custom" && (
        <p className="mt-2 text-xs text-ink/50">
          Goes to: {drafts.map((d) => d.toName).join(", ") || "nobody yet"}
        </p>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {sent !== null ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
          <CheckCircle2 size={15} /> Sent {sent} message{sent === 1 ? "" : "s"}. They'll see it under the bell in MzansiConnect.
        </p>
      ) : (
        <button onClick={send} disabled={busy || onCount === 0} className="btn-ember mt-3 w-full py-3 text-sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />} Send to {onCount} {kind === "driver-brief" || (kind === "custom" && customTo === "drivers") ? "driver" : "shop"}
          {onCount === 1 ? "" : "s"}
        </button>
      )}
      {state.messages.length > 0 && <p className="mt-2 text-center text-[11px] text-ink/40">Sent to MzansiConnect inboxes.</p>}
    </section>
  );
}
