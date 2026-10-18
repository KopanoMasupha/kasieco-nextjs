import { FundingOpportunity, FundingProfile, Shop } from "./types";

export type EligibilityResult = { level: "likely" | "check" | "no"; reasons: string[] };

/**
 * A first-pass check from what the owner told us. It never replaces the
 * provider's own assessment — it just saves owners from applying blind.
 */
export function checkEligibility(op: FundingOpportunity, shop: Shop, profile?: FundingProfile): EligibilityResult {
  const c = op.criteria;
  const no: string[] = [];
  const check: string[] = [];

  if (c.requiresVerified && shop.verificationStatus !== "verified") check.push("Get verified on MzansiConnect first (shows you're compliant)");

  if (c.ageMin !== undefined || c.ageMax !== undefined) {
    if (profile?.ownerAge === undefined) check.push("Tell us your age");
    else if ((c.ageMin !== undefined && profile.ownerAge < c.ageMin) || (c.ageMax !== undefined && profile.ownerAge > c.ageMax))
      no.push(`Owners must be ${c.ageMin ?? 0}–${c.ageMax ?? "any"}`);
  }
  if (c.minTradingMonths !== undefined) {
    if (profile?.tradingMonths === undefined) check.push("Tell us how long you've been trading");
    else if (profile.tradingMonths < c.minTradingMonths) no.push(`Needs ${Math.round(c.minTradingMonths / 12)}+ years of trading`);
  }
  if (c.requiresCipc) {
    if (profile?.hasCipc === undefined) check.push("Are you registered with CIPC?");
    else if (!profile.hasCipc) check.push("Register with CIPC first (the compliance course explains how)");
  }
  if (c.requiresTradingPermit) {
    if (profile?.hasTradingPermit === undefined) check.push("Do you have a municipal trading permit?");
    else if (!profile.hasTradingPermit) check.push("Get your municipal trading permit — the most common reason applications fail");
  }

  if (no.length) return { level: "no", reasons: no };
  if (check.length) return { level: "check", reasons: check };
  return { level: "likely", reasons: ["You meet the basic requirements we can check"] };
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.floor(ms / 86400000); // whole days left; 0 = closes today
}
