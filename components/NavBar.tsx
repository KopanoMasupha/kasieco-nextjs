"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Sparkles,
  Bot,
  MapPin,
  Store,
  ShoppingCart,
  Handshake,
  Boxes,
  Landmark,
  ShieldCheck,
  ChevronDown,
  LogOut,
  LayoutGrid,
  Wallet,
  Bell,
  Truck,
  ClipboardList,
  Users,
  UserCircle2,
} from "lucide-react";
import { useStore, useMe, useInbox } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { amountDue, dealsToPay, feesDue } from "@/lib/payments";
import { formatCents } from "@/lib/pot";
import { ADMIN_ROLE_LABEL } from "@/lib/types";
import { startTour } from "@/lib/tour";

type NavLink = { href: string; label: string; icon: any; exact?: boolean; match?: string[]; badge?: number; dot?: boolean; dataTour?: string };

export default function NavBar() {
  const { state, dispatch } = useStore();
  const me = useMe();
  const inbox = useInbox();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const myShop = state.shops.find((s) => s.id === state.myShopId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const holdingForOthers = state.trips.flatMap((t) => t.stops).filter((s) => s.status === "at-partner" && s.partnerShopId === state.myShopId).length;
  const approvalsForMe = state.approvals.filter((a) => a.status === "pending" && a.requestedById !== state.userId).length;
  const waiting = state.pools.filter((p) => ["target-reached", "payment-confirmed", "ordered"].includes(p.status)).length;
  const dueCount = myShop ? dealsToPay(state.pools, myShop.id).length + feesDue(state.fees, myShop.id).length : 0;
  const myTripsOpen = state.trips.filter((t) => t.driverId === state.myDriverId && t.status !== "completed").length;

  let links: NavLink[] = [{ href: "/consumer", label: "Find shops", icon: MapPin, exact: true }];
  if (me?.role === "owner")
    links = [
      { href: "/owner", label: "Home", icon: LayoutGrid, exact: true, dataTour: "nav-home" },
      { href: "/owner/pools", label: "Buy", icon: ShoppingCart, dataTour: "nav-buy" },
      { href: "/owner/payments", label: "Payments", icon: Wallet, badge: dueCount || undefined, dataTour: "nav-payments" },
      { href: "/owner/exchange", label: "Willing buyer & seller", icon: Handshake, dataTour: "nav-exchange" },
      { href: "/owner/partner", label: "Drop point", icon: Store, badge: holdingForOthers || undefined },
      { href: "/owner/stock", label: "My stock", icon: Boxes },
      { href: "/owner/funding", label: "Funding", icon: Landmark, dataTour: "nav-funding" },
      { href: "/owner/compliance", label: "Compliance", icon: ShieldCheck, dot: myShop && !isVerified(myShop), match: ["/owner/compliance", "/owner/learn", "/owner/training"] },
      { href: "/owner/cart", label: "Cart", icon: ShoppingCart, dataTour: "nav-cart" },
    ];
  if (me?.role === "admin")
    links = [
      { href: "/admin", label: "Today", icon: LayoutGrid, exact: true },
      { href: "/admin/deals", label: "Deals", icon: ClipboardList, badge: waiting || undefined },
      { href: "/admin/drivers", label: "Drivers", icon: Users },
      { href: "/admin/team", label: "Admin team", icon: ShieldCheck, badge: approvalsForMe || undefined },
    ];
  if (me?.role === "driver") links = [{ href: "/driver", label: "My trips", icon: Truck, badge: myTripsOpen || undefined, match: ["/driver"] }];
  if (me?.role === "verifier") links = [{ href: "/verify", label: "Verification", icon: ShieldCheck, exact: true }];

  const isActive = (l: NavLink) => (l.match ? l.match.some((m) => pathname.startsWith(m)) : l.exact ? pathname === l.href : pathname.startsWith(l.href));

  const linkEls = (mode: "side" | "row") =>
    links.map((l) => {
      const active = isActive(l);
      const Icon = l.icon;
      return (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active ? "page" : undefined}
          data-tour={l.dataTour}
          className={clsx(
            "relative flex items-center gap-2.5 whitespace-nowrap text-sm font-medium transition-colors",
            mode === "side" ? "rounded-xl px-3 py-2.5" : "rounded-full border px-3.5 py-2",
            mode === "side" && (active ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"),
            mode === "row" && (active ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70")
          )}
        >
          <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
          <span className={mode === "side" ? "flex-1" : ""}>{l.label}</span>
          {l.badge ? <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">{l.badge}</span> : null}
          {l.dot && <span className="h-2 w-2 rounded-full bg-ember" aria-label="needs attention" />}
        </Link>
      );
    });

  const due = myShop ? amountDue(state.pools, state.fees, myShop.id) : 0;
  const roleLabel = me && me.role !== "owner" ? (me.role === "admin" ? `Admin${me.adminRole ? " · " + ADMIN_ROLE_LABEL[me.adminRole] : ""}` : me.role === "driver" ? "Driver" : "Verifier") : null;

  return (
    <>
      {/* desktop sidebar */}
      {me && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink/[0.07] bg-white lg:flex">
          <div className="kasi-stripe" />
          <Link href="/" className="px-6 pb-6 pt-6 font-display text-2xl font-extrabold tracking-tight text-ink">
            Mzansi<span className="text-ember">Connect</span>
          </Link>
          {roleLabel && <p className="eyebrow -mt-3 mb-4 px-6">{roleLabel}</p>}
          <nav className="flex flex-col gap-0.5 px-3">{linkEls("side")}</nav>
          <div className="flex-1" />
          {myShop && (
            <Link href="/owner/payments" className={clsx("mx-3 mb-4 rounded-xl px-4 py-3", due > 0 ? "bg-ember/10 hover:bg-ember/15" : "bg-[#0B3D3A]/[0.06] hover:bg-[#0B3D3A]/10")}>
              <p className={clsx("eyebrow", due > 0 ? "!text-ember-dark" : "!text-[#0B3D3A]/70")}>{due > 0 ? "Due now" : "Payments"}</p>
              <p className={clsx("num font-display text-lg font-bold", due > 0 ? "text-ember-dark" : "text-[#0B3D3A]")}>{due > 0 ? formatCents(due) : "All paid"}</p>
              <p className="text-[10px] text-ink/45">Secured by TradeSafe</p>
            </Link>
          )}
        </aside>
      )}

      <header className={clsx("sticky top-0 z-40 border-b border-ink/[0.07] bg-[var(--paper)]/90 backdrop-blur", me && "lg:ml-60")}>
        {!me && <div className="kasi-stripe" />}
        {me && <div className="kasi-stripe lg:hidden" />}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className={clsx("shrink-0 font-display text-xl font-extrabold tracking-tight text-ink", me && "lg:hidden")}>
            Mzansi<span className="text-ember">Connect</span>
          </Link>
          {roleLabel && <span className="hidden rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink/60 sm:inline lg:hidden">{roleLabel}</span>}
          {!me && <nav className="ml-2 hidden items-center gap-1 sm:flex">{linkEls("row")}</nav>}
          <div className="flex-1" />

          {me?.role === "owner" && due > 0 && (
            <Link href="/owner/payments" className="num hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-ember/10 px-3 py-1.5 text-sm font-semibold text-ember-dark sm:flex lg:hidden" title="Due now">
              <Wallet size={14} /> Due {formatCents(due)}
            </Link>
          )}

          {me && (
            <Link href="/inbox" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/[0.05]" aria-label={`Messages, ${inbox.unread} unread`}>
              <Bell size={18} className="text-ink/70" />
              {inbox.unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">{inbox.unread}</span>
              )}
            </Link>
          )}

          {!me ? (
            <Link href="/signin" className="btn-dark shrink-0 px-4 py-2 text-sm">
              Sign in
            </Link>
          ) : (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full border border-ink/10 bg-white py-1 pl-1 pr-3 text-sm font-medium"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                  {me.role === "owner" ? <Store size={15} /> : me.role === "driver" ? <Truck size={15} /> : <UserCircle2 size={15} />}
                </span>
                <span className="hidden max-w-[150px] truncate sm:inline">{myShop ? myShop.name : me.name.split(" (")[0]}</span>
                <ChevronDown size={14} className="text-ink/40" />
              </button>
              {menuOpen && (
                <div className="glass-strong absolute right-0 z-50 mt-2 w-64 p-2">
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-semibold text-ink">{myShop ? myShop.name : me.name}</p>
                    <p className="text-xs text-ink/45">
                      {myShop ? `${myShop.ownerName} · ${myShop.township}` : roleLabel}
                    </p>
                    {myShop && (
                      <p className={clsx("mt-1 text-xs font-semibold", isVerified(myShop) ? "text-leaf" : "text-ember-dark")}>{isVerified(myShop) ? "Verified" : "Not verified yet"}</p>
                    )}
                  </div>
                  <div className="my-1 h-px bg-ink/5" />
                  {me.role === "owner" && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (pathname !== "/owner") router.push("/owner");
                        startTour();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink/80 hover:bg-sand-100"
                    >
                      <Sparkles size={15} className="text-ember" /> Take the tour with Thuli
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      dispatch({ type: "SIGN_OUT" });
                      router.push("/");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* phone + tablet: scrollable tabs */}
        {me && links.length > 1 && <nav className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">{linkEls("row")}</nav>}
        {!me && <nav className="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 sm:hidden">{linkEls("row")}</nav>}
      </header>
    </>
  );
}