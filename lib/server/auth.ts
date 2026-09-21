import { createHash } from "crypto";
import { Account, SessionAccount } from "../types";

/**
 * Local auth helpers. PINs are stored as SHA-256 hashes and only ever compared
 * on the server (in the API routes / reducer), never in the browser.
 * Sign-in is for shop owners only — shoppers need no account.
 */
export function hashPin(pin: string): string {
  return createHash("sha256").update((pin || "").trim()).digest("hex");
}

/** Compare phone numbers by digits only, so "071 234 5678" === "0712345678". */
export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

/** Strip everything the browser must never see (the PIN hash). */
export function toSessionAccount(account: Account): SessionAccount {
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    phone: account.phone,
    shopId: account.shopId,
    demo: account.demo,
  };
}

/** Match an owner account by phone number (digits only) + hashed PIN. */
export function verifyCredentials(
  accounts: Account[],
  phone: string,
  pin: string
): Account | null {
  const digits = normalizePhone(phone);
  if (!digits || !pin) return null;
  const pinHash = hashPin(pin);
  return (
    accounts.find(
      (a) => a.role === "owner" && normalizePhone(a.phone) === digits && a.pinHash === pinHash
    ) ?? null
  );
}
