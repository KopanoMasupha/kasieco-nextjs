"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! Ask me about bulk-buy pots, exchange, verification, funding or what customers can do." },
  ]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "I couldn't answer just now. Please try again.");
      setMessages((current) => [...current, { role: "assistant", text: result.answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "I couldn't answer just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <section aria-label="KasiEco help" className="mb-3 flex h-[min(480px,70vh)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div><p className="text-sm font-semibold">KasiEco help</p><p className="text-[11px] text-white/60">Answers about this prototype</p></div>
            <button onClick={() => setOpen(false)} aria-label="Close help" className="rounded-full p-1 hover:bg-white/10"><X size={17} /></button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {messages.map((message, index) => (
              <p key={`${index}-${message.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === "user" ? "ml-auto bg-ink text-white" : "bg-sand-50 text-ink/75"}`}>{message.text}</p>
            ))}
            {busy && <p className="text-xs text-ink/40">Checking…</p>}
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-ink/5 p-3">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} placeholder="Ask a question…" className="input py-2 text-xs" />
            <button disabled={busy || !question.trim()} className="btn-ember shrink-0 px-3" aria-label="Send question"><Send size={14} /></button>
          </form>
        </section>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close help bot" : "Open help bot"} className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-ember text-white shadow-lg hover:bg-ember-dark">
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
