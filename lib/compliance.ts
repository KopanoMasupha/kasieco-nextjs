import { Shop, VerificationStatus, VERIFICATION_LABEL } from "./types";

export function isVerified(shop: Shop | undefined | null): boolean {
  return !!shop && shop.verificationStatus === "verified";
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
