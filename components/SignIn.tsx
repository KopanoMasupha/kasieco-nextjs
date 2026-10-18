"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { ArrowRight, ChevronDown, CheckCircle2, Eye, EyeOff, Loader2, Phone, ShieldCheck, Store, Truck, UserCog, BadgeCheck } from "lucide-react";
import clsx from "clsx";
import SignInScene from "./SignInScene";
import { useStore } from "@/lib/store";
import { UserRole } from "@/lib/types";

export const HOME_FOR: Record<UserRole, string> = {
  owner: "/owner",
  admin: "/admin",
  driver: "/driver",
  verifier: "/verify",
};

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Shop owners",
  admin: "MzansiConnect admins",
  driver: "Drivers",
  verifier: "Government verifier",
};

/**
 * One sign-in for everyone: shop owners, drivers, admins and verifiers all use
 * their phone number and a 4-digit PIN. MzansiConnect knows which kind of account it is.
 */
export default function SignIn({ redirect = true, title = "Sign in" }: { redirect?: boolean; title?: string }) {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoRole, setDemoRole] = useState<UserRole>("owner");
  const [pinFocus, setPinFocus] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);
  const shake = useAnimationControls();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!phone.trim() || pin.length !== 4) {
      setError("Enter your phone and PIN.");
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      return;
    }
    setBusy(true);
    const meta = await dispatch({ type: "SIGN_IN", phone, pin });
    setBusy(false);
    if (meta.error) {
      setError(meta.error);
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      return;
    }
    const who = state.users.find((u) => u.phone.replace(/\s/g, "") === phone.replace(/\s/g, ""));
    setWelcome(who ? who.name.split(" ")[0] : "back");
    await new Promise((r) => setTimeout(r, 650)); // let the welcome tick land
    if (redirect) router.push(HOME_FOR[meta.role as UserRole]);
  }

  const groups: { role: UserRole; label: string; icon: any }[] = [
    { role: "owner", label: "Owner", icon: Store },
    { role: "admin", label: "Admin", icon: UserCog },
    { role: "driver", label: "Driver", icon: Truck },
    { role: "verifier", label: "Verifier", icon: BadgeCheck },
  ];
  const demoUsers = state.users.filter((u) => {
    if (u.role !== demoRole) return false;
    const shop = u.shopId ? state.shops.find((s) => s.id === u.shopId) : null;
    return !(shop && shop.verificationStatus !== "verified" && u.role === "owner" && u.shopId !== "shop-fresh-veg");
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto w-full max-w-5xl py-2 sm:py-6">
      <div className="grid overflow-hidden rounded-3xl border border-ink/[0.07] bg-white shadow-[0_24px_60px_-30px_rgba(23,19,16,0.35)] lg:grid-cols-[1.05fr_1fr]">
        {/* ---------- the scene ---------- */}
        <div className="relative isolate overflow-hidden bg-ink text-white">
          <div className="kasi-stripe absolute inset-x-0 top-0" />
          <div className="relative z-10 px-6 pt-7 sm:px-8 lg:pt-10">
            <p className="font-display text-xl font-extrabold tracking-tight">
              Mzansi<span className="text-ember">Connect</span>
            </p>
            <p className="mt-3 max-w-xs font-display text-2xl font-bold leading-tight sm:text-3xl">
              Many shops. <span className="text-[#F2B33D]">One pot.</span> Lower prices.
            </p>
          </div>
          <div className="mx-auto -mt-2 h-[230px] w-full max-w-[360px] sm:h-[280px] lg:mt-2 lg:h-[420px] lg:max-w-none">
            <SignInScene />
          </div>
        </div>

        {/* ---------- the form ---------- */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {welcome ? (
              <motion.div key="welcome" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-16 text-center">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white">
                  <CheckCircle2 size={32} />
                </motion.span>
                <p className="mt-4 font-display text-2xl font-bold text-ink">Sawubona, {welcome}</p>
                <p className="text-sm text-ink/50">Opening your page…</p>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, y: -8 }}>
                <p className="eyebrow">Welcome back</p>
                <h1 className="mt-1 text-3xl font-bold text-ink">{title}</h1>
                <p className="mt-1 text-sm text-ink/55">Owners, drivers and admins.</p>

                <motion.form animate={shake} onSubmit={submit} className="mt-6 space-y-4" noValidate>
                  <label className="block" htmlFor="signin-phone">
                    <span className="label">Phone number</span>
                    <span className="relative block">
                      <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
                      <input
                        id="signin-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="071 234 5678"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setError("");
                        }}
                        className="input py-3 pl-10 text-base"
                      />
                    </span>
                  </label>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="signin-pin" className="label">
                        4-digit PIN
                      </label>
                      <button type="button" onClick={() => setShowPin((v) => !v)} className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink/50 hover:text-ink" aria-label={showPin ? "Hide PIN" : "Show PIN"}>
                        {showPin ? <EyeOff size={13} /> : <Eye size={13} />} {showPin ? "Hide" : "Show"}
                      </button>
                    </div>
                    {/* one real input under four boxes */}
                    <div className="relative grid grid-cols-4 gap-2.5">
                      {[0, 1, 2, 3].map((i) => {
                        const filled = i < pin.length;
                        const active = pinFocus && (i === pin.length || (pin.length === 4 && i === 3));
                        return (
                          <div key={i} className={clsx("flex h-14 items-center justify-center rounded-xl border-2 bg-white transition-colors", active ? "border-ember" : filled ? "border-ink/25" : "border-ink/10")}>
                            <AnimatePresence>
                              {filled && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="font-display text-2xl font-bold text-ink">
                                  {showPin ? pin[i] : <span className="block h-3 w-3 rounded-full bg-ink" />}
                                </motion.span>
                              )}
                            </AnimatePresence>
                            {active && !filled && <span className="h-6 w-0.5 animate-pulse rounded bg-ember" />}
                          </div>
                        );
                      })}
                      <input
                        id="signin-pin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        maxLength={4}
                        value={pin}
                        onFocus={() => setPinFocus(true)}
                        onBlur={() => setPinFocus(false)}
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setError("");
                        }}
                        className="absolute inset-0 h-full w-full cursor-text opacity-0"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={busy} className="btn-ember group w-full py-3.5 text-base">
                    {busy ? <Loader2 size={17} className="animate-spin" /> : null} Sign in
                    {!busy && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
                  </button>
                </motion.form>

                <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-ink/55">
                  <ShieldCheck size={14} className="text-leaf" /> New shop?{" "}
                  <Link href="/owner/register" className="font-semibold text-ember-dark hover:underline">
                    Register
                  </Link>
                </p>

                {/* demo accounts */}
                <div className="mt-6 rounded-2xl border border-dashed border-ink/15 p-3">
                  <button type="button" onClick={() => setShowDemo((v) => !v)} className="flex w-full items-center justify-between text-xs font-semibold text-ink/60" aria-expanded={showDemo}>
                    Demo accounts · PIN 1234
                    <motion.span animate={{ rotate: showDemo ? 180 : 0 }} className="text-ink/40">
                      <ChevronDown size={14} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showDemo && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-ink/[0.04] p-1">
                          {groups.map((g) => (
                            <button key={g.role} type="button" onClick={() => setDemoRole(g.role)} className={clsx("flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors", demoRole === g.role ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink")}>
                              <g.icon size={12} /> {g.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto text-xs">
                          {demoUsers.map((u) => {
                            const shop = u.shopId ? state.shops.find((s) => s.id === u.shopId) : null;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setPhone(u.phone);
                                  setPin("1234");
                                  setError("");
                                }}
                                className={clsx("flex w-full justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-sand-100", phone === u.phone && "bg-ember/[0.07]")}
                              >
                                <span className="truncate font-medium text-ink/80">{shop ? shop.name : u.name.split(" (")[0]}</span>
                                <span className="shrink-0 tabular-nums text-ink/45">{u.phone}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
