"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, Send, ArrowRight } from "lucide-react";
import { useStore, useMe, useInbox, useLiveRefresh } from "@/lib/store";
import SignIn from "@/components/SignIn";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  useLiveRefresh(4000);
  const { state, dispatch } = useStore();
  const me = useMe();
  const inbox = useInbox();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  // opening the inbox marks everything as read (after a moment, so new ones still flash)
  useEffect(() => {
    if (!inbox.toRole || !inbox.unread) return;
    const t = setTimeout(() => dispatch({ type: "MARK_READ", toRole: inbox.toRole!, toId: inbox.toId! }), 1500);
    return () => clearTimeout(t);
  }, [inbox.unread, inbox.toRole, inbox.toId, dispatch]);

  if (!me) return <SignIn redirect={false} title="Sign in to see your messages" />;

  const dealLink = (dealId?: string) => {
    if (!dealId) return null;
    if (me.role === "owner") return `/owner/pools/${dealId}`;
    if (me.role === "admin") return `/admin/deals/${dealId}`;
    return null;
  };

  async function sendToAdmin() {
    if (!text.trim()) return;
    const shop = state.shops.find((s) => s.id === me!.shopId);
    await dispatch({
      type: "SEND_MESSAGES",
      fromRole: me!.role,
      fromName: shop ? `${shop.name} (${me!.name})` : me!.name,
      messages: [{ toRole: "admin", toId: "admin", text }],
    });
    setText("");
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-ink">
          <Bell size={22} className="text-ember-dark" /> Messages
        </h1>
        <p className="text-sm text-ink/55">
          {me.role === "admin"
            ? "From deals, drivers and owners."
            : "Deal and delivery updates."}
        </p>
      </div>

      {me.role !== "admin" && (
        <div className="card space-y-2 p-4">
          <label htmlFor="msg-admin" className="label">
            Send a message to MzansiConnect
          </label>
          <textarea id="msg-admin" rows={2} value={text} onChange={(e) => setText(e.target.value)} className="input resize-none" placeholder="e.g. I'll only be at the shop after 11:00 tomorrow" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink/45">{sent ? "Sent. The MzansiConnect team will reply here." : "The MzansiConnect team reads every message."}</p>
            <button onClick={sendToAdmin} disabled={!text.trim()} className="btn-dark px-4 py-2 text-sm">
              <Send size={14} /> Send to MzansiConnect
            </button>
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {inbox.list.map((m) => {
          const link = dealLink(m.dealId);
          return (
            <li key={m.id} className={clsx("card p-4", !m.read && "ring-1 ring-ember/40")}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-ink/50">
                  {!m.read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-ember align-middle" aria-label="new" />}
                  From {m.fromName}
                </p>
                <p className="shrink-0 text-[11px] text-ink/40">{when(m.createdAt)}</p>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/80">{m.text}</p>
              {link && (
                <Link href={link} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ember-dark">
                  Open the deal <ArrowRight size={12} />
                </Link>
              )}
              {me.role === "driver" && m.tripId && (
                <Link href={`/driver/trips/${m.tripId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ember-dark">
                  Open the trip <ArrowRight size={12} />
                </Link>
              )}
            </li>
          );
        })}
        {inbox.list.length === 0 && <li className="card p-6 text-center text-sm text-ink/45">No messages yet.</li>}
      </ol>
    </div>
  );
}
