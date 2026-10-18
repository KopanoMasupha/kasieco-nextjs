"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * The sign-in scene: kasi shops send money into one shared pot, the pot fills,
 * the price drops, and a bakkie drives the stock out. Loops quietly; stills for reduced motion.
 */
const SHOPS = [
  { x: 70, y: 92, c: "#E85D2B" },
  { x: 330, y: 80, c: "#2F6D4F" },
  { x: 40, y: 228, c: "#F2B33D" },
  { x: 362, y: 214, c: "#3A7BD5" },
  { x: 108, y: 330, c: "#2F6D4F" },
  { x: 296, y: 334, c: "#E85D2B" },
];
const POT = { x: 200, y: 206 };
const PRICES = ["R345", "R330", "R318", "R305", "R295"];

function Shop({ x, y, c, i, still }: { x: number; y: number; c: string; i: number; still: boolean }) {
  return (
    <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 220, damping: 16 }} style={{ transformOrigin: `${x}px ${y}px` }}>
      {/* tiny shopfront: roof stripe, body, door */}
      <rect x={x - 17} y={y - 14} width={34} height={28} rx={5} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeOpacity={0.22} />
      <rect x={x - 17} y={y - 14} width={34} height={7} rx={3} fill={c} />
      <rect x={x - 4} y={y + 1} width={8} height={13} rx={1.5} fill="#fff" fillOpacity={0.55} />
      {!still && (
        <motion.circle cx={x} cy={y} r={20} fill="none" stroke={c} strokeWidth={1.5} initial={{ opacity: 0.6, scale: 0.8 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }} style={{ transformOrigin: `${x}px ${y}px` }} />
      )}
    </motion.g>
  );
}

export default function SignInScene() {
  const still = !!useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setStep((s) => (s + 1) % PRICES.length), 1500);
    return () => clearInterval(t);
  }, [still]);

  const fill = still ? 0.7 : 0.25 + (step / (PRICES.length - 1)) * 0.65; // pot level follows the price steps
  const potTop = 172;
  const potBottom = 250;
  const level = potBottom - (potBottom - potTop) * fill;

  return (
    <svg viewBox="0 0 400 420" className="h-full w-full" role="img" aria-label="Shops pooling money into one pot, the price dropping, and a bakkie delivering">
      <defs>
        <pattern id="si-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#fff" fillOpacity="0.07" />
        </pattern>
        <clipPath id="si-pot">
          <path d={`M152 ${potTop} Q152 262 200 264 Q248 262 248 ${potTop} Z`} />
        </clipPath>
        <linearGradient id="si-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F07A4A" />
          <stop offset="1" stopColor="#C4471C" />
        </linearGradient>
        <radialGradient id="si-glow">
          <stop offset="0" stopColor="#E85D2B" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E85D2B" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="420" fill="url(#si-dots)" />
      <circle cx={POT.x} cy={POT.y} r="120" fill="url(#si-glow)" />

      {/* money lines: shop → pot */}
      {SHOPS.map((s, i) => (
        <g key={`l${i}`}>
          <line x1={s.x} y1={s.y} x2={POT.x} y2={POT.y} stroke="#fff" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="4 6" className={still ? "" : "si-flow"} />
          {!still && (
            <motion.circle
              r="4.5"
              fill="#F2B33D"
              stroke="#171310"
              strokeWidth="1.5"
              initial={{ cx: s.x, cy: s.y, opacity: 0 }}
              animate={{ cx: [s.x, POT.x], cy: [s.y, POT.y - 10], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, delay: 0.6 + i * 0.5, ease: "easeIn" }}
            />
          )}
        </g>
      ))}

      {SHOPS.map((s, i) => (
        <Shop key={`s${i}`} {...s} i={i} still={still} />
      ))}

      {/* the potjie pot */}
      <g>
        <path d="M172 262 L164 284 M228 262 L236 284 M200 266 L200 288" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.9" />
        <path d={`M152 ${potTop} Q152 262 200 264 Q248 262 248 ${potTop} Z`} fill="#3a332e" />
        <g clipPath="url(#si-pot)">
          <motion.rect x="140" width="120" height="120" fill="url(#si-fill)" initial={false} animate={{ y: level }} transition={{ type: "spring", stiffness: 60, damping: 14 }} />
          {!still && (
            <motion.path d="M140 0 Q155 -5 170 0 T200 0 T230 0 T260 0 V6 H140 Z" fill="#fff" fillOpacity="0.25" initial={false} animate={{ y: level - 3, x: [0, -14, 0] }} transition={{ y: { type: "spring", stiffness: 60, damping: 14 }, x: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }} />
          )}
        </g>
        <path d={`M152 ${potTop} Q152 262 200 264 Q248 262 248 ${potTop}`} fill="none" stroke="#fff" strokeWidth="5" strokeOpacity="0.9" />
        <rect x="144" y={potTop - 8} width="112" height="10" rx="5" fill="#fff" fillOpacity="0.9" />
        <path d={`M144 ${potTop + 6} Q132 ${potTop + 9} 135 ${potTop + 22} M256 ${potTop + 6} Q268 ${potTop + 9} 265 ${potTop + 22}`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.9" />
      </g>

      {/* the price ticks down as the pot fills */}
      <g transform={`translate(${POT.x} 128)`}>
        <rect x="-46" y="-19" width="92" height="34" rx="17" fill="#fff" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.text
            key={step}
            textAnchor="middle"
            y="4"
            fontSize="17"
            fontWeight="800"
            fill="#171310"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {PRICES[still ? 2 : step]}
          </motion.text>
        </AnimatePresence>
        <path d="M34 -2 l5 6 l5 -6" stroke="#2F6D4F" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4 0)" />
      </g>

      {/* road + bakkie */}
      <line x1="0" y1="396" x2="400" y2="396" stroke="#fff" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="10 8" className={still ? "" : "si-road"} />
      <motion.g initial={{ x: -70 }} animate={still ? { x: 160 } : { x: [-70, 420] }} transition={still ? {} : { duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}>
        <g transform="translate(0 366)">
          <rect x="0" y="6" width="34" height="18" rx="3" fill="#E85D2B" />
          <path d="M34 10 h10 l8 8 v6 h-18 z" fill="#fff" />
          <rect x="37" y="12" width="7" height="5" rx="1" fill="#171310" fillOpacity="0.6" />
          <circle cx="10" cy="26" r="5" fill="#171310" stroke="#fff" strokeWidth="2" />
          <circle cx="42" cy="26" r="5" fill="#171310" stroke="#fff" strokeWidth="2" />
          <text x="17" y="19" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" style={{ fontFamily: "var(--font-display)" }}>
            4065
          </text>
        </g>
      </motion.g>
    </svg>
  );
}
