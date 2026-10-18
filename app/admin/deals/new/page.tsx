"use client";

import { useState } from "react";
import Link from "next/link";
import PhotoPicker from "@/components/shop/PhotoPicker";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Megaphone, Wand2 } from "lucide-react";
import { useStore, useMe } from "@/lib/store";
import { PriceTier } from "@/lib/types";
import { formatCents, toCents } from "@/lib/pot";

/** Five price steps from the starting price down to the full-lot price. */
function makeTiers(lot: number, start: number, best: number): PriceTier[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    minQty: Math.round(lot * f),
    price: Math.round((start - (start - best) * f) * 100) / 100,
  }));
}

export default function NewDealPage() {
  const { state, dispatch } = useStore();
  const me = useMe();
  const router = useRouter();
  const [f, setF] = useState({
    wholesalerId: "",
    productName: "",
    unitLabel: "",
    unitWeightKg: "",
    minQty: "",
    startPrice: "",
    bestPrice: "",
    retailPrice: "",
    deliveryFee: "",
    closesInDays: "5",
    deliveryWithinDays: "5",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const lot = parseInt(f.minQty) || 0;
  const start = parseFloat(f.startPrice) || 0;
  const best = parseFloat(f.bestPrice) || 0;
  const tiers = lot && start && best ? makeTiers(lot, start, best) : [];
  const verifiedShops = state.shops.filter((s) => s.verificationStatus === "verified").length;

  function example() {
    setF({
      wholesalerId: state.wholesalers[0]?.id ?? "",
      productName: "Washing powder 2kg",
      unitLabel: "box (9 × 2kg)",
      unitWeightKg: "18.5",
      minQty: "36",
      startPrice: "520",
      bestPrice: "462",
      retailPrice: "540",
      deliveryFee: "600",
      closesInDays: "5",
      deliveryWithinDays: "5",
    });
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.wholesalerId) return setError("Choose the wholesaler.");
    if (!f.productName.trim() || !f.unitLabel.trim()) return setError("Write the product name and what one unit is.");
    if (lot < 2) return setError("The lot needs at least 2 units.");
    if (!(start > 0 && best > 0 && best <= start)) return setError("Sold-out price can't be above the starting price.");
    if (!(parseFloat(f.unitWeightKg) > 0)) return setError("Add the unit weight.");
    setBusy(true);
    const meta = await dispatch({
      type: "ADMIN_CREATE_DEAL",
      adminName: me?.name.split(" (")[0] ?? "Admin",
      wholesalerId: f.wholesalerId,
      productName: f.productName,
      unitLabel: f.unitLabel,
      unitWeightKg: parseFloat(f.unitWeightKg),
      minQty: lot,
      tiers,
      retailPrice: parseFloat(f.retailPrice) || start,
      deliveryFeeCents: toCents(parseFloat(f.deliveryFee) || 0),
      closesInDays: parseInt(f.closesInDays) || 5,
      deliveryWithinDays: parseInt(f.deliveryWithinDays) || 5,
      photo: photo ?? undefined,
    });
    setBusy(false);
    if (meta.error) return setError(meta.error);
    router.push(`/admin/deals/${meta.dealId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/deals" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> All deals
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">New deal</h1>
          <p className="text-sm text-ink/55">{verifiedShops} verified shops will be notified.</p>
        </div>
        <button type="button" onClick={example} className="btn-outline px-4 py-2 text-sm">
          <Wand2 size={14} /> Fill in an example
        </button>
      </div>

      <form onSubmit={publish} className="card space-y-4 p-5" noValidate>
        <label className="block">
          <span className="label">Wholesaler</span>
          <select value={f.wholesalerId} onChange={set("wholesalerId")} className="input">
            <option value="">Choose a partner wholesaler…</option>
            {state.wholesalers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.address}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Product</span>
            <input value={f.productName} onChange={set("productName")} placeholder="e.g. Maize meal 5kg" className="input" />
          </label>
          <label className="block">
            <span className="label">Unit</span>
            <input value={f.unitLabel} onChange={set("unitLabel")} placeholder="e.g. bale (10 × 5kg)" className="input" />
          </label>
          <div className="sm:col-span-2">
            <span className="label">Product photo</span>
            <PhotoPicker name={f.productName} value={photo ?? undefined} onChange={setPhoto} />
          </div>
          <label className="block">
            <span className="label">Unit weight (kg)</span>
            <input type="number" inputMode="decimal" value={f.unitWeightKg} onChange={set("unitWeightKg")} placeholder="50" className="input" />
          </label>
          <label className="block">
            <span className="label">Lot size (units)</span>
            <input type="number" inputMode="numeric" value={f.minQty} onChange={set("minQty")} placeholder="40" className="input" />
          </label>
          <label className="block">
            <span className="label">Starting price (R)</span>
            <input type="number" inputMode="decimal" value={f.startPrice} onChange={set("startPrice")} placeholder="745" className="input" />
          </label>
          <label className="block">
            <span className="label">Sold-out price (R)</span>
            <input type="number" inputMode="decimal" value={f.bestPrice} onChange={set("bestPrice")} placeholder="670" className="input" />
          </label>
          <label className="block">
            <span className="label">Retail price (R)</span>
            <input type="number" inputMode="decimal" value={f.retailPrice} onChange={set("retailPrice")} placeholder="750" className="input" />
          </label>
          <label className="block">
            <span className="label">Delivery budget (R)</span>
            <input type="number" inputMode="decimal" value={f.deliveryFee} onChange={set("deliveryFee")} placeholder="900" className="input" />
          </label>
          <label className="block">
            <span className="label">Open for (days)</span>
            <select value={f.closesInDays} onChange={set("closesInDays")} className="input">
              {[2, 3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Deliver within (days)</span>
            <select value={f.deliveryWithinDays} onChange={set("deliveryWithinDays")} className="input">
              {[3, 5, 7, 10].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
        </div>

        {tiers.length > 0 && (
          <div className="rounded-xl2 bg-sand-50 p-3">
            <p className="mb-2 text-xs font-semibold text-ink/50">Price steps</p>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {tiers.map((t) => (
                <div key={t.minQty} className="rounded-lg bg-ink/[0.04] px-1 py-2">
                  <p className="text-ink/45">{t.minQty === 0 ? "first unit" : `${t.minQty}+ sold`}</p>
                  <p className="font-bold text-ink">{formatCents(toCents(t.price))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-ember w-full py-3.5 text-sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />} Publish the deal and tell every verified shop
        </button>
      </form>
    </div>
  );
}
