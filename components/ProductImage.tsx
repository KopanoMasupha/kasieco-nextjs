"use client";

import clsx from "clsx";
import { ProductKind, productKind, splitSize } from "@/lib/products";
import { stockPhoto } from "@/lib/productPhotos";

/**
 * A clean drawn pack shot for any product, so owners and customers recognise
 * what they're buying at a glance (no brand logos — the product and its size).
 * Swap in a real photo later by passing `src`.
 */
export default function ProductImage({
  name,
  count = 1,
  size = 96,
  src,
  className,
  rounded = "rounded-xl2",
}: {
  name: string;
  count?: number; // items in the pack: >1 draws a stack with a "×12" badge
  size?: number | "fill";
  src?: string;
  className?: string;
  rounded?: string;
}) {
  const kind = productKind(name);
  const { name: label, size: amount } = splitSize(name);
  const theme = THEME[kind];
  const style = size === "fill" ? undefined : { width: size, height: size };
  // an uploaded photo wins; then a real product photo; then the drawn pack shot
  const photo = src ? { src, alt: "" } : stockPhoto(name);
  return (
    <div
      className={clsx("relative shrink-0 overflow-hidden", rounded, size === "fill" && "aspect-square w-full", className)}
      style={{ ...style, background: photo ? "#ffffff" : `radial-gradient(120% 90% at 50% 15%, #ffffff 0%, ${theme.bg} 70%)` }}
      role="img"
      aria-label={`${name}${count > 1 ? `, pack of ${count}` : ""}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" className={src ? "h-full w-full object-cover" : "h-full w-full object-contain p-[6%]"} />
      ) : (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <ellipse cx="60" cy="106" rx="34" ry="5" fill="#171310" opacity="0.08" />
          {count > 1 && (
            <>
              <g transform="translate(-14 -4)" opacity="0.35" className="[&_text]:hidden">
                <Art kind={kind} label={label} amount={amount} theme={theme} />
              </g>
              <g transform="translate(14 -4)" opacity="0.55" className="[&_text]:hidden">
                <Art kind={kind} label={label} amount={amount} theme={theme} />
              </g>
            </>
          )}
          <Art kind={kind} label={label} amount={amount} theme={theme} />
        </svg>
      )}
      {count > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" style={size !== "fill" && size < 64 ? { fontSize: 8 } : undefined}>
          ×{count}
        </span>
      )}
    </div>
  );
}

interface Theme {
  bg: string;
  pack: string;
  band: string;
  ink: string;
  accent: string;
}

const THEME: Record<ProductKind, Theme> = {
  maize: { bg: "#F6E7C4", pack: "#FFFDF7", band: "#E8A33A", ink: "#5B3A0E", accent: "#F2C14E" },
  oil: { bg: "#F7EBC0", pack: "#F4C430", band: "#2F6D4F", ink: "#FFFFFF", accent: "#E9B41C" },
  sugar: { bg: "#DDE8F6", pack: "#FFFFFF", band: "#2E5AAC", ink: "#FFFFFF", accent: "#9DB7E6" },
  rice: { bg: "#E3EEDC", pack: "#FBFAF3", band: "#3F7D4E", ink: "#FFFFFF", accent: "#D9D2B8" },
  flour: { bg: "#F4E1DC", pack: "#FFFFFF", band: "#B8432F", ink: "#FFFFFF", accent: "#E6C78B" },
  bread: { bg: "#F3E3CF", pack: "#C98A4B", band: "#8A5527", ink: "#FFFFFF", accent: "#E7B67A" },
  airtime: { bg: "#E1E4F7", pack: "#4C6EF5", band: "#FFFFFF", ink: "#FFFFFF", accent: "#91A7FF" },
  candles: { bg: "#F1ECE4", pack: "#FFFFFF", band: "#E85D2B", ink: "#171310", accent: "#F7B733" },
  soap: { bg: "#E2F0EF", pack: "#7CC4BA", band: "#FFFFFF", ink: "#0B3D3A", accent: "#B9E2DC" },
  kota: { bg: "#F5E3CE", pack: "#D99A55", band: "#C0392B", ink: "#FFFFFF", accent: "#F4D03F" },
  chips: { bg: "#F9E7C7", pack: "#C0392B", band: "#FFFFFF", ink: "#FFFFFF", accent: "#F4C542" },
  bunny: { bg: "#F5E3CE", pack: "#D99A55", band: "#C0392B", ink: "#FFFFFF", accent: "#E67E22" },
  tomato: { bg: "#F8DEDA", pack: "#E2412E", band: "#3F8E3A", ink: "#FFFFFF", accent: "#F06A55" },
  onion: { bg: "#EFE0D2", pack: "#B9814E", band: "#7A4A27", ink: "#FFFFFF", accent: "#D6A576" },
  spinach: { bg: "#DFEFD9", pack: "#3F8E3A", band: "#2B6A2A", ink: "#FFFFFF", accent: "#6DB45E" },
  wors: { bg: "#F2DCD6", pack: "#8E3B2A", band: "#5E2418", ink: "#FFFFFF", accent: "#B4553F" },
  chicken: { bg: "#F6E9D8", pack: "#FFFFFF", band: "#E85D2B", ink: "#FFFFFF", accent: "#F3C9A8" },
  mince: { bg: "#F4DDDD", pack: "#FFFFFF", band: "#B23A3A", ink: "#FFFFFF", accent: "#D45B5B" },
  generic: { bg: "#ECE6DC", pack: "#FFFFFF", band: "#171310", ink: "#FFFFFF", accent: "#DCCBAE" },
};

function short(label: string) {
  const w = label.replace(/\(.*\)/, "").trim().toUpperCase();
  return w.length > 11 ? w.split(" ").slice(-1)[0].slice(0, 11) : w;
}

function Art({ kind, label, amount, theme: t }: { kind: ProductKind; label: string; amount?: string; theme: Theme }) {
  const L = short(label);
  switch (kind) {
    case "maize":
    case "sugar":
    case "rice":
    case "flour":
    case "chicken":
      return <Sack t={t} L={kind === "chicken" ? "CHICKEN" : L} amount={amount} kind={kind} />;
    case "oil":
      return (
        <g>
          <rect x="52" y="14" width="16" height="9" rx="2" fill={t.band} />
          <path d="M53 23h14v8c0 3 9 7 9 16v50a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6V47c0-9 9-13 9-16z" fill={t.pack} />
          <path d="M53 23h14v8c0 3 9 7 9 16v50a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6V47c0-9 9-13 9-16z" fill="#fff" opacity="0.18" transform="translate(-3 0) scale(1.02 1)" />
          <rect x="47" y="31" width="5" height="60" rx="2.5" fill="#fff" opacity="0.35" />
          <rect x="42" y="58" width="36" height="26" rx="2" fill={t.band} />
          <text x="60" y="69" textAnchor="middle" fontSize="5.4" fontWeight="800" fill={t.ink} fontFamily="Bricolage Grotesque, system-ui">
            {L}
          </text>
          {amount && (
            <text x="60" y="79" textAnchor="middle" fontSize="7" fontWeight="700" fill={t.ink} opacity="0.9" fontFamily="Inter, system-ui">
              {amount}
            </text>
          )}
        </g>
      );
    case "bread":
      return (
        <g>
          <path d="M22 62c0-16 17-24 38-24s38 8 38 24v30a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill={t.pack} />
          <path d="M22 62c0-16 17-24 38-24s38 8 38 24" fill="none" stroke={t.band} strokeWidth="2" opacity="0.5" />
          <path d="M40 46c4 5 4 10 0 15M58 42c4 5 4 12 0 18M76 46c4 5 4 10 0 15" stroke={t.accent} strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="22" y="70" width="76" height="16" fill="#fff" opacity="0.9" />
          <text x="60" y="81" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={t.band} fontFamily="Bricolage Grotesque, system-ui">
            {L} {amount ?? ""}
          </text>
        </g>
      );
    case "airtime":
      return (
        <g>
          <rect x="26" y="28" width="68" height="66" rx="8" fill={t.pack} />
          <path d="M45 52a21 21 0 0 1 30 0M50 58a13 13 0 0 1 20 0" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <circle cx="60" cy="63" r="3" fill="#fff" />
          <text x="60" y="84" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, system-ui">
            {label.match(/R\d+/)?.[0] ?? "AIRTIME"}
          </text>
          <rect x="26" y="28" width="68" height="10" rx="4" fill="#fff" opacity="0.15" />
        </g>
      );
    case "candles":
      return (
        <g>
          {[42, 56, 70].map((x, i) => (
            <g key={x}>
              <rect x={x} y={44 + i * 3} width="9" height={56 - i * 3} rx="2" fill={t.pack} stroke="#171310" strokeOpacity="0.08" />
              <path d={`M${x + 4.5} ${32 + i * 3}c4 5 4 9 0 10c-4-1-4-5 0-10z`} fill={t.accent} />
              <path d={`M${x + 4.5} ${36 + i * 3}c2 3 2 5 0 6c-2-1-2-3 0-6z`} fill={t.band} />
            </g>
          ))}
          <rect x="36" y="76" width="48" height="12" rx="2" fill={t.band} />
          <text x="60" y="85" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, system-ui">
            CANDLES
          </text>
        </g>
      );
    case "soap":
      return (
        <g>
          <rect x="26" y="50" width="68" height="40" rx="16" fill={t.pack} />
          <rect x="34" y="56" width="52" height="12" rx="6" fill="#fff" opacity="0.4" />
          <text x="60" y="81" textAnchor="middle" fontSize="9" fontWeight="800" fill={t.ink} fontFamily="Bricolage Grotesque, system-ui">
            SOAP
          </text>
          {[[38, 40, 6], [52, 32, 4], [80, 38, 7]].map(([x, y, r]) => (
            <circle key={x} cx={x} cy={y} r={r} fill="none" stroke={t.pack} strokeWidth="2" opacity="0.8" />
          ))}
        </g>
      );
    case "kota":
    case "bunny":
      return (
        <g>
          <path d="M24 56h72v30a10 10 0 0 1-10 10H34a10 10 0 0 1-10-10z" fill={t.pack} />
          <rect x="30" y="46" width="60" height="10" rx="3" fill={t.accent} />
          <rect x="28" y="41" width="64" height="6" rx="3" fill={t.band} />
          <path d="M30 41c6-6 12-6 18 0s12 6 18 0 12-6 18 0" fill="#3F8E3A" />
          <rect x="24" y="56" width="72" height="6" fill="#000" opacity="0.08" />
          <text x="60" y="82" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, system-ui">
            {kind === "kota" ? "KOTA" : "BUNNY"}
          </text>
        </g>
      );
    case "chips":
      return (
        <g>
          {[40, 47, 54, 61, 68, 75].map((x, i) => (
            <rect key={x} x={x} y={26 + (i % 3) * 4} width="6" height="34" rx="2" fill={t.accent} transform={`rotate(${(i - 2.5) * 5} ${x} 60)`} />
          ))}
          <path d="M32 50h56l-8 46H40z" fill={t.pack} />
          <path d="M32 50h56l-1.5 8H33.5z" fill="#fff" opacity="0.25" />
          <text x="60" y="80" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, system-ui">
            CHIPS
          </text>
        </g>
      );
    case "tomato":
      return (
        <g>
          {[[44, 72, 20], [76, 74, 18], [60, 52, 18]].map(([x, y, r]) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r={r} fill={t.pack} />
              <circle cx={x - r / 3} cy={y - r / 3} r={r / 4} fill="#fff" opacity="0.3" />
              <path d={`M${x - 6} ${y - r + 2}l6 4 6-4-3 6h-6z`} fill={t.band} />
            </g>
          ))}
        </g>
      );
    case "onion":
      return (
        <g>
          {[[40, 76], [80, 76], [60, 56]].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <path d={`M${x} ${y - 24}c2 6 18 12 18 26a18 18 0 0 1-36 0c0-14 16-20 18-26z`} fill={t.pack} />
              <path d={`M${x} ${y - 20}c-4 8-8 14-8 24M${x} ${y - 20}c4 8 8 14 8 24`} stroke={t.band} strokeWidth="1.2" fill="none" opacity="0.5" />
            </g>
          ))}
        </g>
      );
    case "spinach":
      return (
        <g>
          {[-28, -10, 8, 26].map((a, i) => (
            <path key={a} d="M60 96C40 80 36 50 60 26c24 24 20 54 0 70z" fill={i % 2 ? t.pack : t.accent} transform={`rotate(${a} 60 96)`} />
          ))}
          <rect x="52" y="86" width="16" height="8" rx="2" fill="#E85D2B" />
        </g>
      );
    case "wors":
      return (
        <g>
          <circle cx="60" cy="64" r="30" fill="none" stroke={t.pack} strokeWidth="9" />
          <circle cx="60" cy="64" r="17" fill="none" stroke={t.accent} strokeWidth="9" />
          <circle cx="60" cy="64" r="5" fill={t.pack} />
        </g>
      );
    case "mince":
      return (
        <g>
          <rect x="22" y="56" width="76" height="34" rx="6" fill={t.pack} stroke="#171310" strokeOpacity="0.08" />
          <path d="M30 62h60v16a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z" fill={t.accent} />
          {[38, 48, 58, 68, 78].map((x, i) => (
            <circle key={x} cx={x} cy={70 + (i % 2) * 5} r="4" fill={t.band} opacity="0.7" />
          ))}
          <rect x="40" y="50" width="40" height="10" rx="3" fill={t.band} />
          <text x="60" y="57.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, system-ui">
            {amount ?? "MINCE"}
          </text>
        </g>
      );
    default:
      return (
        <g>
          <path d="M30 44l30-12 30 12v44l-30 12-30-12z" fill={t.pack} stroke="#171310" strokeOpacity="0.1" />
          <path d="M30 44l30 12 30-12M60 56v44" stroke="#171310" strokeOpacity="0.12" fill="none" />
          <path d="M30 64l30 12v12l-30-12z" fill={t.band} opacity="0.9" />
        </g>
      );
  }
}

function Sack({ t, L, amount, kind }: { t: Theme; L: string; amount?: string; kind: ProductKind }) {
  return (
    <g>
      {/* crimped top */}
      <path d="M32 26l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4v8H32z" fill={t.pack} stroke="#171310" strokeOpacity="0.08" />
      <path d="M32 34h56l4 56a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" fill={t.pack} stroke="#171310" strokeOpacity="0.08" />
      <path d="M34 36h8l-2 60h-4a6 6 0 0 1-6-6z" fill="#fff" opacity="0.5" />
      <rect x="30" y="56" width="60" height="22" fill={t.band} />
      <text x="60" y="66.5" textAnchor="middle" fontSize={L.length > 8 ? 6.6 : 8} fontWeight="800" fill={t.ink} fontFamily="Bricolage Grotesque, system-ui" letterSpacing="0.3">
        {L}
      </text>
      {amount && (
        <text x="60" y="75" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={t.ink} opacity="0.85" fontFamily="Inter, system-ui">
          {amount}
        </text>
      )}
      {/* a small cue of what's inside */}
      {kind === "maize" && (
        <g transform="translate(60 44)">
          <ellipse rx="4" ry="7" fill={t.accent} />
          <path d="M-4 3c-5-1-7-5-6-9M4 3c5-1 7-5 6-9" stroke="#3F8E3A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === "sugar" && (
        <g transform="translate(60 45)" fill={t.accent}>
          <rect x="-8" y="-4" width="6" height="6" rx="1" />
          <rect x="1" y="-6" width="6" height="6" rx="1" transform="rotate(12)" />
          <rect x="-3" y="2" width="6" height="6" rx="1" transform="rotate(-8)" />
        </g>
      )}
      {kind === "rice" && (
        <g transform="translate(60 45)" fill={t.accent}>
          {[[-7, -2, 20], [-2, 2, -10], [3, -3, 35], [7, 1, -25], [0, -6, 5]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="1.6" ry="3.6" transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      )}
      {kind === "flour" && (
        <g transform="translate(60 46)" stroke={t.accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M0 8V-8" />
          {[-5, -1, 3].map((y) => (
            <path key={y} d={`M0 ${y}c-3-1-5-3-5-6M0 ${y}c3-1 5-3 5-6`} />
          ))}
        </g>
      )}
      <rect x="30" y="86" width="60" height="4" fill={t.band} opacity="0.35" />
    </g>
  );
}
