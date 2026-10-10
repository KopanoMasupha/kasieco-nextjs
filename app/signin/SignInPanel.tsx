"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SessionAccount } from "@/lib/types";
import { BadgeCheck, KeyRound, Loader2, LogIn, MapPin, Phone, Store } from "lucide-react";

interface DemoAccount {
  name: string;
  phone: string;
  shopName: string | null;
}

function DemoRow({ account, onPick }: { account: DemoAccount; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink/10 px-3 py-2.5 text-left text-sm transition-colors hover:bg-sand-50"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <Store size={13} />
          <span className="truncate">{account.shopName ?? account.name}</span>
        </span>
        <span className="block truncate text-xs text-ink/45">
          {account.name} · {account.phone}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink/60">
        Demo
      </span>
    </button>
  );
}

export default function SignInPanel({ next }: { next?: string }) {
  const { state, dispatch } = useStore();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState<DemoAccount[]>([]);
  const [demoPin, setDemoPin] = useState("1234");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/demo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        setDemo(data.accounts ?? []);
        if (data.demoPin) setDemoPin(data.demoPin);
      })
      .catch(() => {
        /* the demo list is a convenience only */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const destination = next || "/owner";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok || !data?.account) {
        setError(data?.error || "Could not sign you in.");
        setBusy(false);
        return;
      }
      await dispatch({ type: "SIGN_IN", account: data.account as SessionAccount });
      router.replace(destination);
    } catch {
      setError("Could not reach the app's local server — is `npm run dev` still running?");
      setBusy(false);
    }
  }

  function fillDemo(account: DemoAccount) {
    setPhone(account.phone);
    setPin(demoPin);
    setError(null);
  }

  if (state.account) {
    const signedIn = state.account;
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf/10 text-leaf">
            <BadgeCheck size={26} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-ink">You're signed in, {signedIn.name}</h1>
          <p className="mt-1 text-sm text-ink/55">
            Signed in as a shop owner · {signedIn.phone}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/owner" className="btn-dark px-5 py-3 text-sm">
              <Store size={15} /> Go to my dashboard
            </Link>
            <Link href="/signout" className="btn-outline px-5 py-3 text-sm">
              Sign out
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Shop owner sign in</h1>
        <p className="text-sm text-ink/50">
          Sign in with the phone number and PIN you registered your shop with — or
          register a new shop if you haven't yet.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Store size={16} className="text-ember-dark" /> Owner login
          </div>

          <div>
            <p className="label">Phone number</p>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input pl-9"
                placeholder="071 234 5678"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
          </div>

          <div>
            <p className="label">PIN</p>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input pl-9"
                placeholder="Your 4-digit PIN"
                type="password"
                autoComplete="current-password"
                inputMode="numeric"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !phone.trim() || !pin.trim()}
            className="btn-ember w-full py-3.5 text-sm"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign in
              </>
            )}
          </button>

          <div className="border-t border-ink/5 pt-4 text-center text-xs text-ink/45">
            No shop on KasiEco yet?{" "}
            <Link href="/owner/register" className="font-semibold text-ember-dark hover:text-ember">
              Register your shop
            </Link>{" "}
            — it takes two minutes and you choose your own PIN.
          </div>
        </form>

        <div className="card flex flex-col p-5">
          <div>
            <h2 className="font-semibold text-ink">Demo shop accounts</h2>
            <p className="mt-1 text-xs text-ink/50">
              Tap one to fill the form. Every demo shop uses the PIN{" "}
              <span className="font-semibold text-ink">{demoPin}</span>.
            </p>
          </div>
          <div className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {demo.map((a) => (
              <DemoRow key={a.phone} account={a} onPick={() => fillDemo(a)} />
            ))}
            {demo.length === 0 && (
              <p className="text-sm text-ink/40">
                Demo accounts appear here once the local data file has loaded.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-xl2 bg-sand-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/70">
              <MapPin size={13} /> Only here to shop?
            </p>
            <p className="mt-1 text-xs text-ink/50">
              Shoppers don't need an account — browse the map, see who has stock and
              what it costs.
            </p>
            <Link
              href="/consumer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ember-dark hover:text-ember"
            >
              Open the shop finder <MapPin size={12} />
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink/35">
        Accounts live in <code>data/db.json</code> and PINs are stored as SHA-256 hashes — a
        local prototype of real auth, not production security.
      </p>
    </div>
  );
}
