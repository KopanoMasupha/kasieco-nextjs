"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { CheckCircle2, Loader2, LogOut, MapPin, Store } from "lucide-react";

export default function SignOutPanel() {
  const { state, dispatch } = useStore();
  const [done, setDone] = useState(false);
  const account = state.account;

  function signOut() {
    dispatch({ type: "SIGN_OUT" });
    setDone(true);
  }

  if (!state.hydrated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <Loader2 size={22} className="animate-spin text-ink/30" />
        <p className="text-sm text-ink/50">Checking your session…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf/10 text-leaf">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-ink">You've been signed out</h1>
          <p className="mt-1 text-sm text-ink/55">
            Your session was cleared from this browser. The shop data you changed is still saved.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/signin" className="btn-dark px-5 py-3 text-sm">
              Sign in again
            </Link>
            <Link href="/" className="btn-outline px-5 py-3 text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand-100 text-ink/40">
            <LogOut size={26} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-ink">You're not signed in</h1>
          <p className="mt-1 text-sm text-ink/55">
            There's no owner session to end on this browser. Shoppers don't need an
            account — the shop finder is open to everyone.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/signin" className="btn-dark px-5 py-3 text-sm">
              Shop owner sign in
            </Link>
            <Link href="/consumer" className="btn-outline px-5 py-3 text-sm">
              <MapPin size={15} /> Find shops on the map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember/10 text-ember-dark">
          <Store size={26} />
        </div>
        <h1 className="mt-3 text-xl font-bold text-ink">Sign out</h1>
        <p className="mt-1 text-sm text-ink/55">
          Signed in as a shop owner:{" "}
          <span className="font-semibold text-ink">{account.name}</span> · {account.phone}
        </p>

        <button onClick={signOut} className="btn-ember mt-5 w-full py-3.5 text-sm">
          <LogOut size={16} /> Yes, sign me out
        </button>
        <Link
          href="/owner"
          className="mt-2 inline-flex w-full items-center justify-center py-3 text-sm font-semibold text-ink/55 hover:text-ink"
        >
          Cancel — take me back to my dashboard
        </Link>
      </div>
    </div>
  );
}
