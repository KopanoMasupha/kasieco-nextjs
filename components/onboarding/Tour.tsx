"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import clsx from "clsx";
import { useStore, useMe, useMyShop } from "@/lib/store";
import { OWNER_TOUR, TourContext, markTourDone, tourDone } from "@/lib/tour";
import Guide from "./Guide";

const PAD = 8; // space around the highlighted element
const CARD_W = 400;

/** The first visible element tagged data-tour="name" (nav links exist twice: sidebar + phone bar). */
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden") ?? null;
}

/**
 * Onboarding tour for shop owners. Starts by itself the first time an owner
 * signs in (once per account, remembered in this browser) and can be replayed
 * from the account menu. Thuli explains one feature per step; the feature is
 * lit up on the real page while everything else dims.
 */
export default function Tour() {
  const { state, loading } = useStore();
  const me = useMe();
  const shop = useMyShop();
  const router = useRouter();
  const routerRef = useRef(router); // stable across renders (the offline build's router isn't)
  routerRef.current = router;
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [searching, setSearching] = useState(false);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [cardH, setCardH] = useState(220);

  const ctx: TourContext = useMemo(() => ({ firstName: shop?.ownerName.split(" ")[0] ?? "there", pools: state.pools }), [shop?.ownerName, state.pools]);
  const step = OWNER_TOUR[i];
  const route = step ? (typeof step.route === "function" ? step.route(ctx) : step.route) : undefined;
  const title = step ? (typeof step.title === "function" ? step.title(ctx) : step.title) : "";
  const isOwner = me?.role === "owner";

  // auto-start once per owner account, on their home page
  useEffect(() => {
    if (loading || !isOwner || !me || active) return;
    if (pathname === "/owner" && !tourDone(me.id)) {
      setI(0);
      setActive(true);
    }
  }, [loading, isOwner, me, pathname, active]);

  // replay from anywhere
  useEffect(() => {
    const go = () => {
      setI(0);
      setActive(true);
    };
    window.addEventListener("mc:start-tour", go);
    return () => window.removeEventListener("mc:start-tour", go);
  }, []);

  const finish = useCallback(() => {
    if (me) markTourDone(me.id);
    setActive(false);
    setRect(null);
  }, [me]);

  // open the step's page, then find and frame its element
  useEffect(() => {
    if (!active || !step) return;
    if (route && pathname !== route) {
      setRect(null);
      setSearching(true);
      routerRef.current.push(route);
      return;
    }
    if (!step.target) {
      setRect(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let tries = 0;
    let cancelled = false;
    const look = () => {
      if (cancelled) return;
      const el = findTarget(step.target!);
      if (el) {
        const small = window.innerWidth < 640;
        const r0 = el.getBoundingClientRect();
        const inSticky = !!el.closest("header, aside");
        if (el.closest("header")) {
          // phone menu bar: bring the page to the top and slide the bar to this item
          window.scrollTo({ top: 0 });
          const bar = el.parentElement;
          if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
        }
        if (!inSticky) {
          // keep it clear of the card: near the top on phones, centred on computers
          const want = small ? 96 : Math.max(96, (window.innerHeight - r0.height) / 2 - 40);
          window.scrollTo({ top: window.scrollY + r0.top - want, behavior: "smooth" });
        }
        setTimeout(() => {
          if (cancelled) return;
          setRect(el.getBoundingClientRect());
          setSearching(false);
        }, inSticky ? 120 : 420);
      } else if (tries++ < 40) setTimeout(look, 100);
      else {
        setRect(null); // not on screen: explain it in the middle instead
        setSearching(false);
      }
    };
    look();
    return () => {
      cancelled = true;
    };
  }, [active, i, step, route, pathname]);

  // keep the frame glued to the element while scrolling / resizing
  useEffect(() => {
    if (!active) return;
    const update = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (step?.target && !searching) {
        const el = findTarget(step.target);
        if (el) setRect(el.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [active, step, searching]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  });

  // keyboard: → / Enter next, ← back, Esc skip
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((n) => Math.min(OWNER_TOUR.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  useEffect(() => {
    if (active && !searching) nextRef.current?.focus({ preventScroll: true });
  }, [active, i, searching]);

  if (!active || !step || !isOwner) return null;

  const last = i === OWNER_TOUR.length - 1;
  const small = vw < 640;
  const hole = rect && { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };

  // where the speech card goes (computers): beside sidebar items, else below or above the element
  let cardStyle: React.CSSProperties = {};
  if (!small) {
    const w = Math.min(CARD_W, vw - 32);
    if (hole) {
      const sideItem = hole.left < 250 && hole.width < 260;
      const tall = hole.height > vh * 0.45;
      if (tall) cardStyle = { right: 24, bottom: 24, width: w }; // big sections: keep their top visible
      else if (sideItem) cardStyle = { left: hole.left + hole.width + 16, top: Math.min(Math.max(16, hole.top - 40), vh - cardH - 16), width: w };
      else {
        const below = hole.top + hole.height + 16;
        const top = below + cardH < vh - 8 ? below : Math.max(16, hole.top - cardH - 16);
        cardStyle = { left: Math.min(Math.max(16, hole.left), vw - w - 16), top, width: w };
      }
    } else cardStyle = { left: (vw - w) / 2, top: Math.max(16, (vh - cardH) / 2), width: w };
  }

  return (
    <div className="fixed inset-0 z-[1200]" role="dialog" aria-modal="true" aria-label={`Tour step ${i + 1} of ${OWNER_TOUR.length}: ${title}`}>
      {/* dim everything; block clicks so the tour stays in step */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {hole ? (
        <motion.div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-ember"
          initial={false}
          animate={hole}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          style={{ boxShadow: "0 0 0 9999px rgba(23,19,16,0.62)" }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-ink/[0.62]" />
      )}

      <AnimatePresence mode="wait">
        {!searching && (
          <motion.div
            key={step.id}
            ref={cardRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className={clsx("absolute", small && "inset-x-3 bottom-3")}
            style={small ? undefined : cardStyle}
          >
            <div className="flex items-end gap-1">
              <Guide pose={step.pose} size={small ? 86 : 104} className="-mb-1 shrink-0 drop-shadow-lg" />
              <div className="relative min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-2xl">
                {/* speech-bubble tail pointing at Thuli */}
                <span className="absolute -left-2 bottom-8 h-4 w-4 rotate-45 bg-white" aria-hidden />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ember-dark">
                      Thuli · {i + 1} of {OWNER_TOUR.length}
                    </p>
                    <button onClick={finish} className="-mr-1 -mt-1 rounded-full p-1 text-ink/35 hover:bg-sand-100 hover:text-ink" aria-label="Skip the tour">
                      <X size={15} />
                    </button>
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold leading-snug text-ink">{title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{step.body}</p>

                  {/* progress */}
                  <div className="mt-3 flex gap-1" aria-hidden>
                    {OWNER_TOUR.map((s, n) => (
                      <span key={s.id} className={clsx("h-1 flex-1 rounded-full", n <= i ? "bg-ember" : "bg-ink/10")} />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {i === 0 ? (
                      <button onClick={finish} className="text-sm font-medium text-ink/50 hover:text-ink">
                        Skip tour
                      </button>
                    ) : (
                      <button onClick={() => setI(i - 1)} className="btn-outline px-3 py-2 text-sm" aria-label="Back">
                        <ArrowLeft size={14} />
                      </button>
                    )}
                    <div className="flex-1" />
                    {last && (
                      <button
                        onClick={() => {
                          finish();
                          router.push("/owner/pools");
                        }}
                        className="btn-outline px-4 py-2 text-sm"
                      >
                        See deals
                      </button>
                    )}
                    <button ref={nextRef} onClick={() => (last ? finish() : setI(i + 1))} className="btn-ember px-5 py-2 text-sm">
                      {i === 0 ? "Show me" : last ? "Done" : "Next"} {!last && <ArrowRight size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
