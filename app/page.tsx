"use client";

import { platformSavingsCents } from "@/lib/products";
import { formatCents } from "@/lib/pot";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore, useMe } from "@/lib/store";
import { HOME_FOR } from "@/components/SignIn";
import { isVerified } from "@/lib/compliance";
import TownshipSlideshow from "@/components/TownshipSlideshow";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Users2,
  ShoppingBag,
  Store,
  Landmark,
  GraduationCap,
  Wallet,
  Truck,
} from "lucide-react";
import clsx from "clsx";

export default function LandingPage() {
  const { state, dispatch, loading } = useStore();
  const router = useRouter();
  const me = useMe();
  const signedInShop = state.shops.find((s) => s.id === state.myShopId);
  const verifiedShops = useMemo(() => state.shops.filter(isVerified), [state.shops]);
  const townships = Array.from(new Set(verifiedShops.map((s) => s.township)));

  const openPools = state.pools.filter((p) => p.status === "open");
  const potShops = new Set(openPools.flatMap((p) => p.commitments.map((c) => c.shopId))).size;

  // navigate straight away — never wait on the store, so the tap always works
  function goAsConsumer() {
    router.push("/consumer");
    if (!me) Promise.resolve(dispatch({ type: "SET_ROLE", role: "consumer" })).catch(() => {});
  }

  async function goAsOwner() {
    router.push(me ? HOME_FOR[me.role] : "/signin");
  }

  return (
    <div className="min-h-screen">
      <div className="kasi-stripe" />
      {/* top bar */}
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Mzansi<span className="text-ember">Connect</span>
        </span>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <button onClick={goAsConsumer} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink/70 hover:bg-sand-100">
            <MapPin size={15} /> <span className="hidden min-[400px]:inline">Find shops</span>
            <span className="min-[400px]:hidden">Shops</span>
          </button>
          {me ? (
            <button onClick={goAsOwner} className="btn-dark px-4 py-2.5 text-sm" title="Go to my home page">
              <Store size={14} /> <span className="max-w-[110px] truncate">{signedInShop ? signedInShop.name : me.name.split(" (")[0]}</span>
            </button>
          ) : (
            <Link href="/signin" className="btn-dark px-4 py-2.5 text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {/* hero — rotating township photos */}
      <div className="mx-auto max-w-7xl px-3 pb-10 sm:px-6">
        <TownshipSlideshow>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <Users2 size={14} className="text-ember" />
              {loading ? "Loading…" : `${verifiedShops.length} verified shops trading`}
              {!loading && platformSavingsCents(state.pools) > 0 && (
                <span className="font-normal text-white/80"> · {formatCents(platformSavingsCents(state.pools)).replace(/\.\d+$/, "")} saved together</span>
              )}
            </span>
            <h1 className="mt-5 text-[2.75rem] font-extrabold leading-[0.98] text-white sm:text-7xl">
              Buy together.
              <br />
              <span className="text-ember">Pay less.</span>
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/75">Kasi shops pool their orders. The more that join, the lower the price — delivered to the door.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/owner/register" className="btn-ember px-5 py-3.5 text-sm">
                <Store size={16} /> Register a shop
              </Link>
              <button onClick={goAsConsumer} className="btn-pill border border-white/25 bg-white/10 px-5 py-3.5 text-sm text-white backdrop-blur-md hover:bg-white/20">
                <MapPin size={16} /> Find a shop <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </TownshipSlideshow>
      </div>

      {/* live numbers */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid grid-cols-3 divide-x divide-ink/10 rounded-2xl border border-ink/[0.07] bg-white">
          {[
            [loading ? "—" : String(verifiedShops.length), "verified shops"],
            [loading ? "—" : String(potShops), "buying together"],
            [loading ? "—" : String(townships.length), "townships"],
          ].map(([n, l]) => (
            <div key={l} className="px-3 py-5 text-center sm:px-6 sm:py-7">
              <p className="num font-display text-xl font-bold text-ink sm:text-4xl">{n}</p>
              <p className="mt-1 text-[11px] text-ink/50 sm:text-sm">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works — three beats */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <p className="eyebrow">How it works</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", icon: Users2, t: "Reserve free", d: "Every shop that joins lowers the price." },
            { n: "02", icon: Wallet, t: "Pay when full", d: "Everyone pays the lowest price — held by TradeSafe." },
            { n: "03", icon: Truck, t: "Delivered", d: "On your day, with a 4-digit code." },
          ].map((x, i) => (
            <motion.div key={x.n} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card relative overflow-hidden p-6">
              <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[7rem] font-extrabold leading-none text-ink/[0.04]">{x.n}</span>
              <x.icon size={22} className="text-ember" />
              <h3 className="mt-4 text-xl font-bold text-ink">{x.t}</h3>
              <p className="mt-1 text-sm text-ink/55">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* what's inside */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShoppingBag, title: "Bulk deals", body: "Wholesale prices, together.", tone: "bg-ember text-white", go: () => router.push("/owner/pools") },
            { icon: Users2, title: "Willing buyer & seller", body: "Swap stock with neighbours.", tone: "bg-leaf text-white", go: () => router.push("/owner/exchange") },
            { icon: MapPin, title: "Find a shop", body: "See who has it in stock.", tone: "bg-ink text-white", go: goAsConsumer },
            { icon: Landmark, title: "Funding", body: "Grants and loans that fit.", tone: "bg-[#F2B33D] text-ink", go: () => router.push("/owner/funding") },
          ].map((l) => (
            <button key={l.title} onClick={l.go} className="card group flex items-start gap-4 p-5 text-left transition-shadow hover:shadow-md">
              <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", l.tone)}>
                <l.icon size={19} />
              </span>
              <span>
                <span className="block font-semibold text-ink">{l.title}</span>
                <span className="text-sm text-ink/55">{l.body}</span>
              </span>
              <ArrowRight size={16} className="ml-auto mt-1 shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </section>

      {/* who does what */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <h2 className="text-3xl font-bold text-ink">One deal, three roles</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { who: "Shop owner", icon: Store, steps: ["Reserve units — free", "Pay via TradeSafe when full", "Give the driver your code"] },
            { who: "Two admins", icon: ShieldCheck, steps: ["Check payments", "One asks, one approves", "Book drivers with AI"] },
            { who: "Driver", icon: Truck, steps: ["Accept the trip", "Collect at wholesaler", "Deliver with codes"] },
          ].map((r) => (
            <div key={r.who} className="card p-5">
              <p className="flex items-center gap-2.5 font-semibold text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
                  <r.icon size={16} />
                </span>
                {r.who}
              </p>
              <ol className="mt-4 space-y-2 text-sm text-ink/70">
                {r.steps.map((st, j) => (
                  <li key={st} className="flex items-center gap-2.5">
                    <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ember/10 text-[11px] font-bold text-ember-dark">{j + 1}</span>
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* trust */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="glass-dark relative grid gap-6 overflow-hidden p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="kasi-stripe absolute inset-x-0 top-0" />
          <div>
            <ShieldCheck size={26} className="text-[#7BC79C]" />
            <h2 className="mt-4 text-3xl font-bold">Every shop is checked.</h2>
            <p className="mt-2 max-w-md text-sm text-white/65">No shop registers without passing the compliance quiz.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/owner/learn" className="btn-ember px-4 py-2.5 text-sm">
                <GraduationCap size={15} /> Try the course
              </Link>
              <Link href="/owner/training" className="btn-pill border border-white/20 px-4 py-2.5 text-sm text-white hover:bg-white/10">
                <Landmark size={15} /> Training
              </Link>
            </div>
          </div>
          <div className="flex gap-10 lg:pl-6">
            <div>
              <p className="num font-display text-5xl font-bold">{verifiedShops.length}</p>
              <p className="text-xs text-white/50">Verified</p>
            </div>
            <div>
              <p className="num font-display text-5xl font-bold text-white/60">{state.shops.length - verifiedShops.length}</p>
              <p className="text-xs text-white/50">In review</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/[0.07] px-5 py-8 text-center text-xs text-ink/40 sm:px-8">
        MzansiConnect · prototype ·{" "}
        <Link href="/verify" className="underline hover:text-ink/60">
          Verifier portal
        </Link>
      </footer>
    </div>
  );
}
