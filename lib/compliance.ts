import { Shop, ShopCategory, VerificationStatus, VERIFICATION_LABEL, ComplianceDocType } from "./types";

export function isVerified(shop: Shop | undefined | null): boolean {
  return !!shop && shop.verificationStatus === "verified";
}

/** Categories that sell food — they need a Certificate of Acceptability (R638). */
export const FOOD_CATEGORIES: ShopCategory[] = [
  "spaza",
  "tuckshop",
  "butchery",
  "greengrocer",
  "takeaway",
  "caterer",
];

/**
 * Documents the platform requires before a shop can be verified, based on what
 * the shop sells. Food businesses need food-safety certification; everyone needs
 * to prove the business and the owner exist.
 */
export function requiredDocsForCategory(category: ShopCategory): ComplianceDocType[] {
  const base: ComplianceDocType[] = ["cipc-registration", "id-document"];
  return FOOD_CATEGORIES.includes(category)
    ? [...base, "certificate-of-acceptability", "municipal-trading-licence"]
    : [...base, "municipal-trading-licence"];
}


export const STATUS_STYLE: Record<VerificationStatus, string> = {
  draft: "bg-sand-200 text-ink/50",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-leaf/10 text-leaf",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-red-100 text-red-600",
};

export function statusLabel(status: VerificationStatus): string {
  return VERIFICATION_LABEL[status];
}
