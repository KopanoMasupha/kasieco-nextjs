"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Clock } from "lucide-react";
import { formatCountdown } from "@/lib/payments";

/** Re-render every second (one shared tick per component). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * A live payment countdown to a real deadline (the 48-hour window).
 * Turns urgent (red) in the last 12 hours.
 */
export default function Countdown({ iso, label = "left to pay", className, icon = true }: { iso: string; label?: string; className?: string; icon?: boolean }) {
  const now = useNow();
  const ms = new Date(iso).getTime() - now;
  const urgent = ms < 12 * 3600000;
  return (
    <span className={clsx("num inline-flex items-center gap-1 tabular-nums", urgent && "font-semibold", className)} data-urgent={urgent || undefined} aria-live="off">
      {icon && <Clock size={13} className="shrink-0" />}
      <span>{formatCountdown(ms)}</span>
      {ms > 0 && label && <span className="font-normal opacity-80">{label}</span>}
    </span>
  );
}
