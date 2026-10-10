"use client";

import { useEffect, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import TuckShopIllustration from "@/components/TuckShopIllustration";
import { TOWNSHIP_SLIDES } from "@/lib/townships";

export default function TownshipSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const active = TOWNSHIP_SLIDES[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % TOWNSHIP_SLIDES.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused]);

  function go(next: number) {
    setIndex((next + TOWNSHIP_SLIDES.length) % TOWNSHIP_SLIDES.length);
    setImageFailed(false);
  }

  return (
    <section
      className="relative min-h-[320px] overflow-hidden rounded-3xl bg-ink"
      aria-label="Township slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {!imageFailed ? (
        <img
          key={active.src}
          src={active.src}
          alt={`${active.township}, ${active.province}`}
          className="absolute inset-0 h-full w-full animate-[township-zoom_6s_ease-in-out_forwards] object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-sand-100 p-6">
          <TuckShopIllustration className="max-h-full w-full" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white">
        <div>
          <p className="text-lg font-bold">{active.township}, {active.province}</p>
          {!imageFailed ? (
            <p className="mt-1 text-[10px] text-white/80">
              Photo: {active.credit} · <a className="underline" href={active.sourceUrl} target="_blank" rel="noreferrer">{active.license} · source</a>
            </p>
          ) : <p className="mt-1 text-[10px] text-white/80">Illustration fallback · photo unavailable</p>}
        </div>
        <div className="flex items-center gap-1.5" aria-label={`Slide ${index + 1} of ${TOWNSHIP_SLIDES.length}`}>
          <button type="button" onClick={() => go(index - 1)} className="rounded-full bg-black/35 p-2" aria-label="Previous township"><ChevronLeft size={16} /></button>
          {TOWNSHIP_SLIDES.map((slide, slideIndex) => (
            <button key={slide.township} type="button" onClick={() => go(slideIndex)} className={`h-2 rounded-full transition-all ${slideIndex === index ? "w-5 bg-white" : "w-2 bg-white/60"}`} aria-label={`Show ${slide.township}`} aria-current={slideIndex === index} />
          ))}
          <button type="button" onClick={() => go(index + 1)} className="rounded-full bg-black/35 p-2" aria-label="Next township"><ChevronRight size={16} /></button>
          <button type="button" onClick={() => setPaused((value) => !value)} className="rounded-full bg-black/35 p-2" aria-label={paused ? "Play slideshow" : "Pause slideshow"}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </div>
      <style jsx>{`@keyframes township-zoom { from { transform: scale(1); } to { transform: scale(1.08); } }`}</style>
    </section>
  );
}
