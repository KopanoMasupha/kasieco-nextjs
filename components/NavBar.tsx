"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { isVerificationOnHold } from "@/lib/verificationProcess";
import Container from "./Container";
import {
  Boxes,
  ChevronDown,
  Coins,
  FileCheck,
  GraduationCap,
  LogOut,
  MapPin,
  Repeat,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import clsx from "clsx";

export default function NavBar() {
  const { state, dispatch } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const account = state.account;
  const myShop = state.shops.find((s) => s.id === state.myShopId);
  // Auth is for shop owners only — shoppers browse the map with no account, so
  // being signed in always means "viewing as an owner".
  const signedIn = !!account;

  function switchRole(role: "consumer" | "owner") {
    // the owner side needs a signed-in owner account
    if (role === "owner" && !signedIn) {
      router.push("/signin?next=%2Fowner");
      return;
    }
    dispatch({ type: "SET_ROLE", role });
    router.push(role === "consumer" ? "/consumer" : "/owner");
  }

  const consumerLinks = [{ href: "/consumer", label: "Find shops", icon: MapPin }];

  const ownerLinks = [
    { href: "/owner", label: "Home", icon: Store },
    { href: "/owner/pools", label: "Bulk buy", icon: Coins },
    { href: "/owner/exchange", label: "Exchange", icon: Repeat },
    { href: "/owner/goods", label: "My stock", icon: Boxes },
    { href: "/owner/funding", label: "Funding", icon: Wallet },
    { href: "/owner/compliance", label: "Compliance", icon: ShieldCheck },
  ];

  // Unverified owners get a verification-focused nav until they're compliant.
  const unverifiedOwnerLinks = [
    { href: "/owner/verify-status", label: "Verification", icon: ShieldCheck },
    { href: "/owner/compliance", label: "Compliance", icon: FileCheck },
    { href: "/owner/learn", label: "Free course", icon: GraduationCap },
  ];

  const shopNeedsVerification =
    !!myShop &&
    (myShop.verificationStatus !== "verified" || isVerificationOnHold(myShop.id, myShop));
  const links = signedIn
    ? shopNeedsVerification
      ? unverifiedOwnerLinks
      : ownerLinks
    : consumerLinks;

  return (
    <header className="sticky top-0 z-40 app-gutter pt-4">
      <Container>
        <div className="card flex items-center gap-3 px-4 py-3 shadow-sm">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl font-extrabold tracking-tight text-ink">
              KasiEco<span className="text-ember">.</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-2 overflow-x-auto">
            {links.map((l) => {
              const active = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "bg-ink text-white" : "text-ink/70 hover:bg-sand-100"
                  )}
                >
                  <Icon size={15} />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* role switch */}
          <div className="hidden sm:flex items-center rounded-full bg-sand-100 p-1 text-sm font-medium">
            <button
              onClick={() => switchRole("consumer")}
              className={clsx(
                "rounded-full px-3.5 py-1.5 transition-colors",
                !signedIn || state.role === "consumer"
                  ? "bg-white shadow-sm text-ink"
                  : "text-ink/50"
              )}
            >
              I'm shopping
            </button>
            <button
              onClick={() => switchRole("owner")}
              className={clsx(
                "rounded-full px-3.5 py-1.5 transition-colors",
                signedIn && state.role === "owner" ? "bg-white shadow-sm text-ink" : "text-ink/50"
              )}
            >
              I own a shop
            </button>
          </div>

          {account ? (
            <div className="relative shrink-0">
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-ink/10 bg-white pl-1 pr-3 py-1 text-sm font-medium"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf/10 text-leaf">
                  <Store size={15} />
                </span>
                <span className="hidden sm:inline max-w-[130px] truncate">
                  {myShop?.name ?? account.name}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx("text-ink/40 transition-transform", accountMenuOpen && "rotate-180")}
                />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 card p-2 shadow-lg">
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                      Signed in as
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-ink">{account.name}</p>
                    <p className="text-xs text-ink/45">Shop owner · {account.phone}</p>
                    {account.demo && (
                      <p className="mt-1 text-[11px] font-medium text-ink/35">Demo account</p>
                    )}
                  </div>
                  <div className="border-t border-ink/5 pt-1">
                    <Link
                      href={shopNeedsVerification ? "/owner/verify-status" : "/owner"}
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-sand-50"
                    >
                      <Store size={15} />{" "}
                      {shopNeedsVerification ? "Verification status" : "My dashboard"}
                    </Link>
                    <Link
                      href="/consumer"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-sand-50"
                    >
                      <MapPin size={15} /> Find shops on the map
                    </Link>
                    <Link
                      href="/owner/register"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-sand-50"
                    >
                      <Store size={15} /> Register another shop
                    </Link>
                    <Link
                      href="/signout"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-ember hover:bg-ember/5"
                    >
                      <LogOut size={15} /> Sign out
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/signin" className="btn-dark shrink-0 px-4 py-2.5 text-sm">
              sign in
            </Link>
          )}
        </div>


        {/* mobile links */}
        <nav className="md:hidden mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap card",
                  active ? "bg-ink text-white" : "text-ink/70"
                )}
              >
                <Icon size={14} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="sm:hidden mt-2 flex items-center justify-center rounded-full bg-sand-100 p-1 text-sm font-medium">
          <button
            onClick={() => switchRole("consumer")}
            className={clsx(
              "flex-1 rounded-full px-3.5 py-1.5 transition-colors",
              !signedIn || state.role === "consumer" ? "bg-white shadow-sm text-ink" : "text-ink/50"
            )}
          >
            I'm shopping
          </button>
          <button
            onClick={() => switchRole("owner")}
            className={clsx(
              "flex-1 rounded-full px-3.5 py-1.5 transition-colors",
              signedIn && state.role === "owner" ? "bg-white shadow-sm text-ink" : "text-ink/50"
            )}
          >
            I own a shop
          </button>
        </div>
        <div className="sm:hidden mt-2 flex items-center justify-center">
          {account ? (
            <Link href="/signout" className="flex items-center gap-1.5 text-xs font-semibold text-ink/50">
              <LogOut size={12} /> Sign out ({account.name})
            </Link>
          ) : (
            <Link href="/signin" className="text-xs font-semibold text-ember-dark">
              Owner sign in
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
