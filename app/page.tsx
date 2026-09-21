"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import TuckShopIllustration from "@/components/TuckShopIllustration";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Users2,
  Store,
  Landmark,
  GraduationCap,
} from "lucide-react";
import clsx from "clsx";

export default function LandingPage() {
  const { state, dispatch } = useStore();
  const router = useRouter();

  const verifiedShops = state.shops.filter(isVerified);

  async function goAsConsumer() {
    await dispatch({ type: "SET_ROLE", role: "consumer" });
    router.push("/consumer");
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* top bar */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="text-xl font-extrabold tracking-tight text-ink">
          Kasi-Connect<span className="text-ember">.</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/verify" className="hidden text-xs font-medium text-ink/40 hover:text-ink/60 sm:inline">
            Government verifier portal
          </Link>
          {state.account ? (
            <>
              <Link
                href="/owner"
                className="hidden items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-ink sm:flex"
              >
                <Store size={14} />
                {state.account.name}
              </Link>
              <Link href="/signout" className="btn-dark px-4 py-2.5 text-sm">
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/owner/register"
                className="hidden text-xs font-semibold text-ember-dark hover:text-ember sm:inline"
              >
                Register your shop
              </Link>
              <Link href="/signin" className="btn-dark px-4 py-2.5 text-sm">
                Sign in <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-2 lg:items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="chip border-none bg-ember/10 text-ember-dark">
            <Users2 size={14} /> {verifiedShops.length} verified kasi shops already trading
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-ink sm:text-5xl">
            Buy together.
            <br />
            Swap stock. <span className="text-ember">Get found.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/60">
            The platform for township shops: pool orders for wholesale prices, trade
            surplus stock with shops nearby, and get discovered by customers searching
            for what you sell — all behind a government-backed compliance check.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={goAsConsumer} className="btn-ember px-5 py-3.5 text-sm">
              I'm shopping <ArrowRight size={16} />
            </button>
            <Link href="/signin" className="btn-outline px-5 py-3.5 text-sm">
              <Store size={16} /> Shop owner login
            </Link>
            <Link
              href="/owner/register"
              className="px-3 py-3.5 text-sm font-semibold text-ember-dark hover:text-ember"
            >
              Register a shop
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
          <TuckShopIllustration className="w-full" />
        </motion.div>
      </section>

      {/* the map + shop finder live on their own page for shoppers */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
              <MapPin size={20} />
            </span>
            <div>
              <h2 className="font-bold text-ink">Shopping nearby?</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/55">
                The shop finder maps every verified kasi shop around you, shows the stock
                they have in and what it costs — no account needed.
              </p>
            </div>
          </div>
          <Link href="/consumer" className="btn-ember shrink-0 px-5 py-3.5 text-sm">
            Find shops on the map <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* what Kasi-Connect does */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Buy", color: "text-ember-dark", body: "Join a pool and watch the price fall as more shops join." },
            { title: "Stock exchange", color: "text-leaf", body: "Short on oil? Swap or sell with a shop nearby, safely on record." },
            { title: "Discovery", color: "text-ink/50", body: "Customers search for what they need and find who has it, nearby." },
          ].map((l, i) => (
            <motion.div
              key={l.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-5"
            >
              <h3 className={clsx("font-bold", l.color)}>{l.title}</h3>
              <p className="mt-1.5 text-sm text-ink/55">{l.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* compliance trust section */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="card grid gap-6 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="chip border-none bg-leaf/10 text-leaf">
              <ShieldCheck size={14} /> Compliance you can trust
            </span>
            <h2 className="mt-4 text-2xl font-bold text-ink">Every shop on the map has been checked.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">
              Owners either pass a free compliance course — covering CIPC registration,
              food safety and municipal by-laws — or submit their own documents for a
              government verifier to check. Only then does a shop go live to customers
              or gain the right to trade with other shops.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/owner/learn" className="btn-dark px-4 py-2.5 text-sm">
                <GraduationCap size={15} /> Preview the compliance course
              </Link>
              <Link href="/owner/training" className="btn-outline px-4 py-2.5 text-sm">
                <Landmark size={15} /> Government training sessions
              </Link>
            </div>
          </div>
          <div className="flex gap-6 lg:pl-6">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-ink">{verifiedShops.length}</p>
              <p className="text-xs text-ink/45">Verified shops</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-ink">{state.shops.length - verifiedShops.length}</p>
              <p className="text-xs text-ink/45">In compliance review</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/5 px-5 py-8 text-center text-xs text-ink/35 sm:px-8">
        Kasi-Connect — a Mzansi Business Digital Platform prototype ·{" "}
        <Link href="/verify" className="underline hover:text-ink/55">
          Government verifier portal
        </Link>
      </footer>
    </div>
  );
}
