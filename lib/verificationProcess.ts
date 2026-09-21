import { Shop } from "./types";

/**
 * Simulated government verification pipeline (front-end only).
 *
 * When an owner submits documents or passes the compliance quiz, the shop enters
 * a ~30 minute "under verification" window during which the platform pretends to
 * check with CIPC, the B-BBEE commission, and the City of Tshwane. Progress is
 * derived from a start timestamp stored in localStorage, so the bar keeps moving
 * (and finishes) even across page reloads.
 */

const envMinutes =
  typeof process !== "undefined" ? Number(process.env.NEXT_PUBLIC_VERIFY_WAIT_MINUTES) : NaN;
const WAIT_MINUTES = Number.isFinite(envMinutes) && envMinutes > 0 ? envMinutes : 30;

/** How long the simulated verification takes (override with NEXT_PUBLIC_VERIFY_WAIT_MINUTES). */
export const VERIFY_WAIT_MS = WAIT_MINUTES * 60 * 1000;

export interface VerificationStep {
  key: string;
  label: string;
  detail: string;
  /** fraction of the total wait at which this step completes (0–1) */
  endPct: number;
}

export const VERIFY_STEPS: VerificationStep[] = [
  {
    key: "cipc",
    label: "Checking CIPC business registration",
    detail: "Querying the CIPC registry to confirm your business exists and is active…",
    endPct: 0.3,
  },
  {
    key: "bbbee",
    label: "Verifying B-BBEE black ownership",
    detail: "Confirming black ownership status with the B-BBEE commission…",
    endPct: 0.6,
  },
  {
    key: "tshwane",
    label: "Confirming Tshwane registration permit",
    detail: "Checking your trading permit with the City of Tshwane…",
    endPct: 0.9,
  },
  {
    key: "final",
    label: "Finalising verification",
    detail: "All checks passed — issuing your verified badge…",
    endPct: 1,
  },
];

export type VerificationMethod = "documents" | "course";

interface StoredProcess {
  startedAt: number;
  method: VerificationMethod;
}

export interface VerificationProgress {
  startedAt: number;
  method: VerificationMethod;
  /** 0–1 */
  pct: number;
  stepIndex: number;
  step: VerificationStep;
  msRemaining: number;
  done: boolean;
}

const key = (shopId: string) => `kasi-verify-process:${shopId}`;

/** Begin (or restart) the simulated verification window for a shop. */
export function startVerificationProcess(shopId: string, method: VerificationMethod): void {
  if (typeof window === "undefined") return;
  const record: StoredProcess = { startedAt: Date.now(), method };
  window.localStorage.setItem(key(shopId), JSON.stringify(record));
}

export function clearVerificationProcess(shopId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(shopId));
}

/** Current progress of the simulated pipeline, or null if none is running. */
export function getVerificationProcess(shopId: string): VerificationProgress | null {
  if (typeof window === "undefined") return null;
  let record: StoredProcess;
  try {
    const raw = window.localStorage.getItem(key(shopId));
    if (!raw) return null;
    record = JSON.parse(raw) as StoredProcess;
  } catch {
    return null;
  }
  if (!record?.startedAt) return null;

  const elapsed = Date.now() - record.startedAt;
  const pct = Math.min(1, Math.max(0, elapsed / VERIFY_WAIT_MS));
  const done = pct >= 1;
  const stepIndex = done ? VERIFY_STEPS.length - 1 : VERIFY_STEPS.findIndex((s) => pct < s.endPct);

  return {
    startedAt: record.startedAt,
    method: record.method,
    pct,
    stepIndex: stepIndex === -1 ? 0 : stepIndex,
    step: VERIFY_STEPS[stepIndex === -1 ? 0 : stepIndex],
    msRemaining: Math.max(0, VERIFY_WAIT_MS - elapsed),
    done,
  };
}

/**
 * Whether the shop should still be held out of trading features. The wait is
 * skipped early only when a human verifier has approved uploaded documents
 * (verificationMethod "document") — human approval overrides the simulation.
 */
export function isVerificationOnHold(shopId: string, shop: Shop | undefined | null): boolean {
  if (!shop) return false;
  const progress = getVerificationProcess(shopId);
  if (!progress || progress.done) return false;
  if (shop.verificationStatus === "verified" && shop.verificationMethod === "document") return false;
  return true;
}
