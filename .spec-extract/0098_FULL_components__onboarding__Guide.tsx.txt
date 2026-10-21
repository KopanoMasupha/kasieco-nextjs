"use client";

import clsx from "clsx";

export type GuidePose = "wave" | "point" | "happy";

/**
 * Thuli — MzansiConnect's guide. An original character: long single braids,
 * a bucket hat with the kasi stripe, gold hoops. Drawn in SVG so she's crisp
 * at any size and costs no download.
 */
export default function Guide({ pose = "happy", size = 120, className }: { pose?: GuidePose; size?: number; className?: string }) {
  const skin = "#8A5638";
  const skinShade = "#74472D";
  const braid = "#22150F";
  const braidHi = "#4A3226";
  // long single braids: [x at the top, x at the bottom, length]
  const back = [
    [52, 40, 168], [56, 46, 172], [60, 52, 176], [64, 58, 170], [96, 102, 170], [100, 108, 176], [104, 114, 172], [108, 120, 168],
  ];
  const front = [
    [50, 44, 150], [54, 49, 158], [58, 55, 154], [102, 105, 154], [106, 111, 158], [110, 116, 150],
  ];
  return (
    <svg viewBox="0 0 160 200" width={size} height={(size * 200) / 160} className={clsx("guide-bob select-none", className)} role="img" aria-label="Thuli, your MzansiConnect guide">
      {/* braids behind the shoulders */}
      {back.map(([x1, x2, len], i) => (
        <g key={`b${i}`}>
          <path d={`M${x1} 58 C ${x1 - 4} ${90} ${x2 + 3} ${130} ${x2} ${len}`} stroke={braid} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d={`M${x1} 58 C ${x1 - 4} ${90} ${x2 + 3} ${130} ${x2} ${len}`} stroke={braidHi} strokeWidth="1" strokeDasharray="2 4" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* body: green top */}
      <path d="M38 200 C 38 160 52 142 80 140 C 108 142 122 160 122 200 Z" fill="#2F6D4F" />
      <path d="M68 141 L80 158 L92 141" fill="none" stroke="#24563E" strokeWidth="3" strokeLinejoin="round" />
      {/* neck */}
      <path d="M71 118 h18 v22 c-5 5 -13 5 -18 0z" fill={skinShade} />

      {/* arm — waving or pointing */}
      {pose === "wave" && (
        <g className="guide-wave" style={{ transformOrigin: "118px 160px" }}>
          <path d="M112 162 C 126 150 132 132 134 114" stroke="#2F6D4F" strokeWidth="13" strokeLinecap="round" fill="none" />
          <circle cx="135" cy="107" r="8" fill={skin} />
          <path d="M131 100 l-1 -7 M135 99 l0 -8 M139 100 l1 -7" stroke={skin} strokeWidth="3.4" strokeLinecap="round" />
        </g>
      )}
      {pose === "point" && (
        <g>
          <path d="M112 164 C 126 158 138 150 146 140" stroke="#2F6D4F" strokeWidth="13" strokeLinecap="round" fill="none" />
          <circle cx="148" cy="137" r="7" fill={skin} />
          <path d="M150 133 l9 -8" stroke={skin} strokeWidth="3.6" strokeLinecap="round" />
        </g>
      )}

      {/* face */}
      <ellipse cx="80" cy="92" rx="25" ry="29" fill={skin} />
      <ellipse cx="55.5" cy="95" rx="4.5" ry="6.5" fill={skinShade} />
      <ellipse cx="104.5" cy="95" rx="4.5" ry="6.5" fill={skinShade} />
      {/* gold hoops */}
      <circle cx="55" cy="105" r="5" fill="none" stroke="#E8B53A" strokeWidth="1.8" />
      <circle cx="105" cy="105" r="5" fill="none" stroke="#E8B53A" strokeWidth="1.8" />
      {/* brows, eyes, cheeks, smile */}
      <path d="M66 82 q6 -4 12 -1 M84 81 q6 -3 12 1" stroke={braid} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g className="guide-blink" style={{ transformOrigin: "80px 91px" }}>
        <ellipse cx="72" cy="91" rx="3.2" ry="3.8" fill="#1A100B" />
        <ellipse cx="88" cy="91" rx="3.2" ry="3.8" fill="#1A100B" />
        <circle cx="73.2" cy="89.6" r="1" fill="#fff" />
        <circle cx="89.2" cy="89.6" r="1" fill="#fff" />
      </g>
      <path d="M79 94 q-2 6 1 8" stroke={skinShade} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <ellipse cx="66" cy="103" rx="4.5" ry="2.6" fill="#C8644A" opacity="0.35" />
      <ellipse cx="94" cy="103" rx="4.5" ry="2.6" fill="#C8644A" opacity="0.35" />
      {pose === "happy" || pose === "wave" ? (
        <path d="M70 108 q10 9 20 0 q-10 4 -20 0z" fill="#7A2E22" stroke="#7A2E22" strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <path d="M71 108 q9 7 18 0" stroke="#7A2E22" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}

      {/* braids falling in front of the shoulders */}
      {front.map(([x1, x2, len], i) => (
        <g key={`f${i}`}>
          <path d={`M${x1} 66 C ${x1 - 3} ${100} ${x2 + 2} ${125} ${x2} ${len}`} stroke={braid} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d={`M${x1} 66 C ${x1 - 3} ${100} ${x2 + 2} ${125} ${x2} ${len}`} stroke={braidHi} strokeWidth="1" strokeDasharray="2 4" fill="none" strokeLinecap="round" />
          <circle cx={x2} cy={len + 1} r="2.1" fill="#E8B53A" />
        </g>
      ))}

      {/* bucket hat: flat-topped tapered crown, kasi-stripe band, soft brim that dips down */}
      <path d="M57 63 L61 37 C 61 33 66 31 80 31 C 94 31 99 33 99 37 L103 63 Z" fill="#E85D2B" />
      <path d="M61 36 C 66 33 94 33 99 36" stroke="#C4471C" strokeWidth="1.4" fill="none" />
      <path d="M64 40 L61 58" stroke="#F08A5D" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M70 34 L70 62 M90 34 L90 62" stroke="#C4471C" strokeWidth="0.9" strokeDasharray="2.5 2.5" opacity="0.7" />
      <g>
        {["#E85D2B", "#F2B134", "#2F6D4F", "#171310", "#4C6EF5"].map((c, i) => (
          <rect key={c} x={58 + i * 8.8} y="55" width="8.8" height="7" fill={c} />
        ))}
      </g>
      <path d="M38 76 C 44 64 60 61 80 61 C 100 61 116 64 122 76 C 116 73 100 70 80 70 C 60 70 44 73 38 76 Z" fill="#C4471C" />
      <path d="M44 72 C 56 67 104 67 116 72" stroke="#A93B16" strokeWidth="1.3" fill="none" strokeDasharray="3 3" />
    </svg>
  );
}
