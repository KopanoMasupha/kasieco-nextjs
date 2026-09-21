"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function Certificate({
  shopName,
  courseTitle,
  certificateNumber,
  issuedAt,
  issuedWith,
  score,
}: {
  shopName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  issuedWith: string;
  score: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden rounded-xl3 border-2 border-ember/30 bg-white p-8 text-center shadow-lg print:shadow-none"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #171310 0, #171310 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
          <ShieldCheck size={28} />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
          Certificate of Compliance
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-ink">{shopName}</h2>
        <p className="mt-1 text-sm text-ink/60">has successfully completed</p>
        <p className="mt-1 text-lg font-bold text-ember-dark">{courseTitle}</p>

        <div className="mx-auto mt-6 h-px w-24 bg-ink/10" />

        <div className="mt-5 grid grid-cols-3 gap-4 text-left text-xs">
          <div>
            <p className="text-ink/40">Certificate no.</p>
            <p className="font-semibold text-ink">{certificateNumber}</p>
          </div>
          <div>
            <p className="text-ink/40">Score</p>
            <p className="font-semibold text-ink">{Math.round(score * 100)}%</p>
          </div>
          <div>
            <p className="text-ink/40">Issued</p>
            <p className="font-semibold text-ink">
              {new Date(issuedAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-ink/40">Issued with {issuedWith}</p>
      </div>
    </motion.div>
  );
}
