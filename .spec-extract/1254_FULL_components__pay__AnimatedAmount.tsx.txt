"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatCents } from "@/lib/pot";

/**
 * A rand amount that counts up (or down) to its new value instead of jumping,
 * and briefly shows "+R…" when it grows — e.g. when one of your deals fills
 * and its payment is added to Due now.
 */
export default function AnimatedAmount({ cents, className, showDelta = true }: { cents: number; className?: string; showDelta?: boolean }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(cents);
  const [delta, setDelta] = useState<{ id: number; cents: number } | null>(null);
  const prev = useRef(cents);
  const first = useRef(true);

  useEffect(() => {
    const from = prev.current;
    prev.current = cents;
    if (first.current) {
      first.current = false;
      setShown(cents);
      return;
    }
    if (from === cents) return;
    if (showDelta && cents > from) setDelta({ id: Date.now(), cents: cents - from });
    if (reduce) {
      setShown(cents);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from + (cents - from) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents, reduce, showDelta]);

  useEffect(() => {
    if (!delta) return;
    const t = setTimeout(() => setDelta(null), 5000);
    return () => clearTimeout(t);
  }, [delta]);

  return (
    <span className="relative inline-flex items-baseline gap-2">
      <span className={className}>{formatCents(shown)}</span>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="num rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-ember-dark shadow-sm"
          >
            +{formatCents(delta.cents)}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
