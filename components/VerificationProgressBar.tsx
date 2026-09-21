"use client";

import { useEffect, useReducer } from "react";
import {
  getVerificationProcess,
  VERIFY_STEPS,
  VERIFY_WAIT_MS,
} from "@/lib/verificationProcess";
import { CheckCircle2, Loader2, RadioTower } from "lucide-react";
import clsx from "clsx";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Live progress bar for the simulated CIPC / B-BBEE / Tshwane verification
 * pipeline. Ticks every second so the bar and time-remaining update in real
 * time, and keeps its position across page reloads (timestamp-based).
 */
export default function VerificationProgressBar({ shopId }: { shopId: string }) {
  const [, tick] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = getVerificationProcess(shopId);
  if (!progress) return null;

  const pctWidth = `${(progress.pct * 100).toFixed(1)}%`;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <RadioTower size={18} className="text-ember-dark" />
        <p className="font-semibold text-ink">Verification in progress</p>
        <span className="ml-auto rounded-full bg-ember/10 px-2.5 py-1 text-xs font-semibold text-ember-dark">
          {progress.done ? "Almost done…" : `~${formatRemaining(progress.msRemaining)} left`}
        </span>
      </div>

      {/* the loading bar */}
      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ember to-ember-dark transition-all duration-1000 ease-linear"
            style={{ width: pctWidth }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-ink/40">
          <span>{Math.round(progress.pct * 100)}% complete</span>
          <span>
            Estimated {Math.round(VERIFY_WAIT_MS / 60000)} min process
          </span>
        </div>
      </div>

      {/* current step */}
      <div className="mt-4 rounded-xl2 border border-ink/10 bg-sand-50 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Loader2 size={14} className="shrink-0 animate-spin text-ember" />
          {progress.done ? "Completing verification…" : progress.step.label}
        </p>
        <p className="mt-1 text-xs text-ink/50">{progress.step.detail}</p>
      </div>

      {/* all steps */}
      <ul className="mt-4 space-y-2">
        {VERIFY_STEPS.map((step, i) => {
          const complete = progress.done || progress.pct >= step.endPct;
          const current = !complete && i === progress.stepIndex;
          return (
            <li key={step.key} className="flex items-center gap-2.5 text-sm">
              {complete ? (
                <CheckCircle2 size={16} className="shrink-0 text-leaf" />
              ) : current ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-ember" />
              ) : (
                <span className="ml-0.5 mr-0.5 h-[13px] w-[13px] shrink-0 rounded-full border-2 border-ink/15" />
              )}
              <span
                className={clsx(
                  complete ? "text-ink/45" : current ? "font-medium text-ink" : "text-ink/40"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-ink/35">
        Kasi-Connect checks your details against CIPC, the B-BBEE commission and the
        City of Tshwane. You can leave this page — progress is saved and this window
        keeps counting down.
      </p>
    </div>
  );
}
