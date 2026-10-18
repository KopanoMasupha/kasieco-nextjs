"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Timer, Users } from "lucide-react";
import { Pool } from "@/lib/types";
import { totalQtyOf } from "@/lib/pot";
import { ago, momentum } from "@/lib/products";
import { units } from "@/lib/units";

const shortUnit = (label: string) => label.split(" (")[0];
const DOT = ["#E85D2B", "#2F6D4F", "#4C6EF5", "#C4471C", "#0B3D3A", "#B8862B"];

/** Live countdown to a deal's closing time. Real deadline, ticking every second. */
export function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, d, h, m, s, now };
}

/**
 * Social proof, scarcity and a deadline — all real: who's in (by township only,
 * names stay private), how many units are left, when the last shop joined, and
 * the closing time.
 */
export default function DealSocialProof({ pool, myShopId }: { pool: Pool; myShopId?: string }) {
  const qty = totalQtyOf(pool);
  const left = Math.max(0, pool.minQty - qty);
  const others = pool.commitments.filter((c) => c.shopId !== myShopId);
  const townships = Array.from(new Set(pool.commitments.map((c) => c.township)));
  const recent = pool.commitments.slice().sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 4);
  const { d, h, m, s, ms, now } = useCountdown(pool.closesAt);
  const scarce = left > 0 && left / pool.minQty <= 0.35;
  const two = (n: number) => String(n).padStart(2, "0");
  const mo = momentum(pool, now);

  return (
    <div className="space-y-4">
      {/* who's in */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {pool.commitments.slice(0, 5).map((c, i) => (
            <span
              key={c.shopId}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white"
              style={{ background: DOT[i % DOT.length] }}
              title={`A shop in ${c.township}`}
            >
              {c.shopId === myShopId ? "You" : c.township.slice(0, 2)}
            </span>
          ))}
          {pool.commitments.length > 5 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink/10 text-[11px] font-bold text-ink/70">+{pool.commitments.length - 5}</span>
          )}
        </div>
        <p className="min-w-0 text-sm leading-snug text-ink/70">
          <strong className="text-ink">
            {pool.commitments.length} shop{pool.commitments.length === 1 ? "" : "s"}
          </strong>{" "}
          from {townships.slice(0, 2).join(" & ")}
          {townships.length > 2 ? ` + ${townships.length - 2} more` : ""} {pool.commitments.length === 1 ? "is" : "are"} in
          {recent[0] && <span className="block text-xs text-ink/45">Last reserved {ago(recent[0].joinedAt, now)}</span>}
        </p>
      </div>

      {/* momentum: real reservations and real views in the last day */}
      {pool.status === "open" && (mo.reserved24h > 0 || mo.viewers24h > 1) && (
        <p className="flex flex-wrap items-center gap-x-1.5 rounded-xl2 bg-ember/[0.07] px-3 py-2 text-xs text-ink/70">
          <Flame size={13} className="text-ember" />
          {mo.reserved24h > 0 && (
            <span>
              <strong className="text-ink">{mo.reserved24h} {units(shortUnit(pool.unitLabel), mo.reserved24h)}</strong> reserved in the last 24 h
            </span>
          )}
          {mo.reserved24h > 0 && mo.viewers24h > 1 && <span className="text-ink/30">·</span>}
          {mo.viewers24h > 1 && (
            <span>
              viewed by <strong className="text-ink">{mo.viewers24h} shops</strong> today
            </span>
          )}
        </p>
      )}

      {/* scarcity + deadline */}
      {pool.status === "open" && (
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl2 px-3 py-2.5 ${scarce ? "bg-ember/10" : "bg-sand-50"}`}>
            <p className={`flex items-center gap-1 text-[11px] font-semibold ${scarce ? "text-ember-dark" : "text-ink/50"}`}>
              {scarce ? <Flame size={12} /> : <Users size={12} />} {scarce ? "Going fast" : "Still open"}
            </p>
            <p className="num mt-0.5 text-lg font-bold text-ink">
              {left} <span className="text-sm font-medium text-ink/55">{units(shortUnit(pool.unitLabel), left)} left</span>
            </p>
          </div>
          <div className="rounded-xl2 bg-sand-50 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-ink/50">
              <Timer size={12} /> Closes in
            </p>
            <p className="num mt-0.5 text-lg font-bold text-ink" aria-live="off">
              {ms <= 0 ? "Closed" : d > 0 ? `${d}d ${two(h)}:${two(m)}:${two(s)}` : `${two(h)}:${two(m)}:${two(s)}`}
            </p>
          </div>
        </div>
      )}

      {/* live activity */}
      {recent.length > 0 && (
        <div>
          <p className="eyebrow mb-1.5">Recent activity</p>
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {recent.map((c) => (
                <motion.li
                  key={c.shopId + c.joinedAt}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs odd:bg-sand-50"
                >
                  <span className="min-w-0 truncate text-ink/70">
                    <span className="font-semibold text-ink">{c.shopId === myShopId ? "You" : `A shop in ${c.township}`}</span> reserved {c.qty} {units(shortUnit(pool.unitLabel), c.qty)}
                  </span>
                  <span className="shrink-0 text-ink/40">{ago(c.joinedAt, now)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {others.length === 0 && <p className="text-xs text-ink/45">Be the first shop to reserve.</p>}
        </div>
      )}
    </div>
  );
}
