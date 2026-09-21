"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import NavBar from "./NavBar";
import { useStore } from "@/lib/store";

/** /owner pages that stay open to signed-out visitors (the sign-up flow). */
const PUBLIC_OWNER_PATHS = ["/owner/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();

  const isLanding = pathname === "/";
  const isOwnerArea =
    pathname.startsWith("/owner") && !PUBLIC_OWNER_PATHS.includes(pathname);
  // Signed-out visitors are sent to /signin and returned to this path afterwards.
  const needsSignIn = isOwnerArea && state.account?.role !== "owner";

  useEffect(() => {
    if (!needsSignIn || !state.hydrated) return;
    router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [needsSignIn, state.hydrated, pathname, router]);

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        {needsSignIn ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
            <Loader2 size={22} className="animate-spin text-ink/30" />
            <p className="text-sm text-ink/50">
              {state.hydrated
                ? "Taking you to the sign-in page…"
                : "Checking your session…"}
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}
