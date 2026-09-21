"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import NavBar from "./NavBar";
import Container from "./Container";
import { useStore } from "@/lib/store";
import { isVerificationOnHold } from "@/lib/verificationProcess";

/** /owner pages that stay open to signed-out visitors (the sign-up flow). */
const PUBLIC_OWNER_PATHS = ["/owner/register"];

/** /owner pages an UNVERIFIED owner may still use while their shop is locked. */
const UNVERIFIED_ALLOWED_PATHS = [
  "/owner/register",
  "/owner/verify-status",
  "/owner/compliance",
  "/owner/learn",
  "/owner/training",
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();

  const isLanding = pathname === "/";
  const isOwnerArea =
    pathname.startsWith("/owner") && !PUBLIC_OWNER_PATHS.includes(pathname);
  // Signed-out visitors are sent to /signin and returned to this path afterwards.
  const needsSignIn = isOwnerArea && state.account?.role !== "owner";

  // Verification gate: until the shop is verified (and any in-flight CIPC /
  // B-BBEE / Tshwane checks have finished), trading pages are locked and the
  // owner is held on the verification flow.
  const myShop = state.shops.find((s) => s.id === state.myShopId);
  const verificationHold =
    !!myShop &&
    (myShop.verificationStatus !== "verified" || isVerificationOnHold(myShop.id, myShop));
  const ownerUnverified =
    isOwnerArea &&
    !needsSignIn &&
    verificationHold &&
    !UNVERIFIED_ALLOWED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  useEffect(() => {
    if (!needsSignIn || !state.hydrated) return;
    router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [needsSignIn, state.hydrated, pathname, router]);

  useEffect(() => {
    if (!ownerUnverified || !state.hydrated) return;
    router.replace("/owner/verify-status");
  }, [ownerUnverified, state.hydrated, pathname, router]);

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <NavBar />
      {/* same layout pattern as the navbar: gutter on the full-width parent,
          Container inside — so content edges align with the navbar card on
          phones, tablets and desktop alike */}
      <main className="app-gutter pb-16 pt-4">
        <Container>
          {needsSignIn || ownerUnverified ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
              <Loader2 size={22} className="animate-spin text-ink/30" />
              <p className="text-sm text-ink/50">
                {needsSignIn
                  ? state.hydrated
                    ? "Taking you to the sign-in page…"
                    : "Checking your session…"
                  : "Verification needed — taking you to your verification status…"}
              </p>
            </div>
          ) : (
            children
          )}
        </Container>
      </main>
    </>
  );
}
