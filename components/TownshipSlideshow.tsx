"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { MapPin } from "lucide-react";
import { TOWNSHIP_SLIDES } from "@/lib/townships";
import TuckShopIllustration from "./TuckShopIllustration";

const INTERVAL = 6000;

/** Full-bleed, crossfading township photos with a slow zoom. Falls back to an illustration if a photo can't load. */
export default function TownshipSlideshow({ children }: { children?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const paused = hovering || focused || reduceMotion;
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const n = TOWNSHIP_SLIDES.length;

  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), INTERVAL);
    return () => clearInterval(t);
  }, [paused, go]);

  // warm the browser cache for the next slide
  useEffect(() => {
    const next = TOWNSHIP_SLIDES[(index + 1) % n];
    const img = new Image();
    img.src = next.src;
  }, [index, n]);

  const slide = TOWNSHIP_SLIDES[index];
  const allFailed = Object.keys(failed).length === n;

  return (
    <section
      className="relative isolate overflow-hidden rounded-[2rem] bg-ink"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovering(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setFocused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Townships across South Africa"
    >
      <div className="absolute inset-0 -z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            {failed[index] ? (
              <div className="flex h-full w-full items-end justify-end bg-gradient-to-br from-ember via-[#d98a5f] to-leaf pr-[4%]">
                <TuckShopIllustration className="hidden h-[78%] w-auto lg:block" />
              </div>
            ) : (
              <motion.img
                src={slide.src}
                alt={`${slide.township}, ${slide.province}`}
                className="h-full w-full object-cover"
                initial={{ scale: 1.08 }}
                animate={{ scale: reduceMotion ? 1.08 : 1 }}
                transition={{ duration: INTERVAL / 1000 + 1.5, ease: "linear" }}
                onError={() => setFailed((f) => ({ ...f, [index]: true }))}
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {/* legibility: dark on the left where the text sits, clear on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/45 to-ink/5" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/70 to-transparent" />
      </div>

      <div className="relative min-h-[520px] px-5 pb-40 pt-8 sm:px-10 sm:pb-24 sm:pt-14 lg:min-h-[580px]">{children}</div>

      {/* caption + controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 px-5 pb-4 sm:px-10 sm:pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-white"
            aria-live="polite"
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin size={14} className="text-ember" /> {slide.township}, {slide.province}
            </p>
            <p className="text-xs text-white/70">{slide.caption}</p>
            {!failed[index] && !allFailed && (
              <a href={slide.creditUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/45 underline-offset-2 hover:underline">
                {slide.credit}
              </a>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-1 pb-1">
          {TOWNSHIP_SLIDES.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.township}`}
              aria-current={i === index}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span className={clsx("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-ember" : "w-1.5 bg-white/40 hover:bg-white/70")} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
