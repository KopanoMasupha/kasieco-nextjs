"use client";

import ComplianceTabs from "@/components/ComplianceTabs";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { GraduationCap, Clock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LearnPage() {
  const { state } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const alreadyVerified = shop?.verificationStatus === "verified";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ComplianceTabs />
      <div>
        <h1 className="text-3xl font-bold text-ink">Courses</h1>
        <p className="text-sm text-ink/50">Pass the quiz, get verified.</p>
      </div>

      {alreadyVerified && (
        <div className="card flex items-center gap-2 p-4 text-sm text-leaf">
          <ShieldCheck size={16} /> {shop!.name} is already verified — you're welcome to take a course anyway to brush up.
        </div>
      )}

      {state.courses.map((c) => {
        const totalMinutes = c.lessons.reduce((n, l) => n + l.minutes, 0);
        return (
          <Link key={c.id} href={`/owner/learn/${c.id}`} className="card block p-5 transition-shadow hover:shadow-md">
            <GraduationCap size={22} className="text-ember-dark" />
            <h2 className="mt-3 font-semibold text-ink">{c.title}</h2>
            <p className="mt-1 text-sm text-ink/55">{c.summary}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-ink/40">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {totalMinutes} min · {c.lessons.length} lessons
              </span>
              <span>{c.quiz.length}-question quiz</span>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-ember-dark">
              Start course <ArrowRight size={12} />
            </p>
          </Link>
        );
      })}
    </div>
  );
}
