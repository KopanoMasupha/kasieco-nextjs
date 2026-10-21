"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Bot, Send, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { SUGGESTIONS, HelpLink } from "@/lib/helpbot";

interface Msg {
  role: "user" | "assistant";
  content: string;
  links?: HelpLink[];
}

export default function HelpBot() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Sawubona! Ask me anything about MzansiConnect." },
  ]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy]);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: state.role, messages: next.slice(1).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.text, links: data.links }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Couldn't connect. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[900] flex h-12 w-12 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-ink text-white shadow-xl transition-transform hover:scale-105"
        aria-label={open ? "Close helper" : "Ask the MzansiConnect helper"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Bot size={24} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="glass-strong fixed bottom-24 right-4 z-[900] flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden"
            role="dialog"
            aria-label="MzansiConnect helper"
          >
            <div className="flex items-center gap-2 border-b border-ink/5 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember text-white">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">MzansiConnect helper</p>
                <p className="text-[11px] text-ink/45">How MzansiConnect works</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {msgs.map((m, i) => (
                <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={clsx("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", m.role === "user" ? "bg-ink text-white" : "bg-sand-50 text-ink")}>
                    {m.content}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-full bg-ember/10 px-2.5 py-1 text-xs font-semibold text-ember-dark">
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex gap-1 px-2" aria-label="Typing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink/30" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              )}
              {msgs.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="chip px-3 py-1.5 text-xs">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={end} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2 border-t border-ink/5 p-3"
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" className="input py-2 text-sm" aria-label="Your question" />
              <button type="submit" disabled={busy || !input.trim()} className="btn-dark h-10 w-10 shrink-0 !p-0" aria-label="Send">
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
