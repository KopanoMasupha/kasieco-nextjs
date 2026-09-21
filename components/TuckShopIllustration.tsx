"use client";

import { motion } from "framer-motion";

export default function TuckShopIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Illustration of a township tuck shop"
    >
      {/* sky glow */}
      <motion.circle
        cx="460"
        cy="70"
        r="70"
        fill="#F4EBDD"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <circle cx="460" cy="70" r="38" fill="#F7DDBE" />

      {/* ground */}
      <rect x="0" y="360" width="560" height="60" fill="#EAE0CE" />
      <rect x="0" y="356" width="560" height="6" fill="#DCCBAE" />

      {/* shack body */}
      <motion.g
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
      >
        <rect x="120" y="190" width="300" height="170" rx="6" fill="#FFFFFF" stroke="#171310" strokeOpacity="0.08" strokeWidth="2" />
        {/* corrugated roof */}
        <path d="M100 190 L270 130 L440 190 Z" fill="#171310" />
        <path d="M100 190 L270 130 L440 190" stroke="#171310" strokeWidth="2" strokeLinejoin="round" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1={112 + i * 27}
            y1={188 - Math.abs(i - 5.5) * 2}
            x2={112 + i * 27}
            y2={196 - Math.abs(i - 5.5) * 2}
            stroke="#F4EBDD"
            strokeOpacity="0.15"
            strokeWidth="3"
          />
        ))}

        {/* awning */}
        <path d="M120 208 L420 208 L400 240 L140 240 Z" fill="#E85D2B" />
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M${140 + i * 32} 240 L${152 + i * 32} 240 L${148 + i * 32} 256 L${144 + i * 32} 256 Z`}
            fill={i % 2 === 0 ? "#FFFFFF" : "#E85D2B"}
          />
        ))}

        {/* door + window */}
        <rect x="150" y="250" width="70" height="110" rx="4" fill="#171310" fillOpacity="0.85" />
        <rect x="260" y="250" width="130" height="70" rx="6" fill="#F4EBDD" stroke="#171310" strokeOpacity="0.1" strokeWidth="2" />
        <line x1="325" y1="250" x2="325" y2="320" stroke="#171310" strokeOpacity="0.1" strokeWidth="2" />

        {/* shelves of goods behind the window */}
        <rect x="268" y="262" width="50" height="10" rx="2" fill="#2F6D4F" opacity="0.8" />
        <rect x="268" y="278" width="35" height="10" rx="2" fill="#E85D2B" opacity="0.8" />
        <rect x="332" y="262" width="50" height="10" rx="2" fill="#E85D2B" opacity="0.7" />
        <rect x="332" y="278" width="40" height="10" rx="2" fill="#171310" opacity="0.5" />

        {/* shop sign */}
        <rect x="130" y="160" width="170" height="34" rx="6" fill="#171310" />
        <text x="215" y="182" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="14" fontWeight="700" fill="#FBF7F1">
          Kasi-Connect
        </text>
      </motion.g>

      {/* crates of produce */}
      <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
        <rect x="60" y="310" width="52" height="50" rx="4" fill="#E85D2B" />
        <rect x="66" y="316" width="40" height="38" rx="2" fill="#F7A56B" />
        <circle cx="78" cy="326" r="6" fill="#C4471C" />
        <circle cx="94" cy="330" r="6" fill="#C4471C" />
        <circle cx="86" cy="342" r="6" fill="#C4471C" />

        <rect x="120" y="326" width="46" height="34" rx="4" fill="#2F6D4F" />
        <rect x="126" y="332" width="34" height="22" rx="2" fill="#8FBBA0" />
      </motion.g>

      {/* crates on the other side */}
      <motion.g initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <rect x="432" y="316" width="50" height="44" rx="4" fill="#171310" fillOpacity="0.85" />
        <rect x="438" y="322" width="38" height="32" rx="2" fill="#FBF7F1" fillOpacity="0.15" />
      </motion.g>

      {/* a customer walking up */}
      <motion.g
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
      >
        <circle cx="46" cy="326" r="10" fill="#171310" />
        <rect x="38" y="336" width="16" height="24" rx="6" fill="#E85D2B" />
        <rect x="34" y="360" width="8" height="4" rx="2" fill="#171310" />
        <rect x="50" y="360" width="8" height="4" rx="2" fill="#171310" />
      </motion.g>
    </svg>
  );
}
