"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import HelpBot from "./HelpBot";
import { PageSkeleton } from "./Skeleton";
import SalesPop from "./shop/SalesPop";
import { useStore, useMe } from "@/lib/store";
import SignIn, { HOME_FOR } from "./SignIn";
import { UserRole } from "@/lib/types";

const AREA: { prefix: string; role: UserRole; name: string }[] = [
  { prefix: "/owner", role: "owner", name: "shop owners" },
  { prefix: "/admin", role: "admin", name: "MzansiConnect admins" },
  { prefix: "/driver", role: "driver", name: "drivers" },
  { prefix: "/verify", role: "verifier", name: "government verifiers" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, dispatch } = useStore();
  const me = useMe();
  const isLanding = pathname === "/";
  const area = pathname === "/owner/register" ? undefined : AREA.find((a) => pathname.startsWith(a.prefix));

  let body: React.ReactNode = children;
  if (loading) body = <PageSkeleton />;
  else if (area && !me) body = <SignIn redirect={false} title={`Sign in to continue`} />;
  else if (area && me && me.role !== area.role)
    body = (
      <div className="glass-strong mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-bold text-ink">This page is for {area.name}</h1>
        <p className="mt-1 text-sm text-ink/55">You're signed in as {me.name}.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href={HOME_FOR[me.role]} className="btn-dark px-4 py-2.5 text-sm">
            Go to my home page
          </Link>
          <button onClick={() => dispatch({ type: "SIGN_OUT" })} className="btn-outline px-4 py-2.5 text-sm">
            Sign out
          </button>
        </div>
      </div>
    );

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      {isLanding ? (
        children
      ) : (
        <>
          <NavBar />
          <div className={me ? "lg:pl-60" : ""}>
            <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-8">{body}</main>
          </div>
        </>
      )}
      <HelpBot />
      {me?.role === "owner" && !isLanding && <SalesPop />}
    </>
  );
}
