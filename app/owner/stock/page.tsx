"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import PhotoPicker from "@/components/shop/PhotoPicker";
import { Plus, Trash2, Eye, EyeOff, Store, ShoppingCart } from "lucide-react";
import { useStore, useMyShop } from "@/lib/store";
import { GoodsCategory } from "@/lib/types";
import AiInsights from "@/components/AiInsights";

const CATEGORIES: GoodsCategory[] = ["groceries", "fresh produce", "airtime", "cooked food", "meat", "bakery", "household", "toiletries"];

export default function StockPage() {
  const { state, dispatch } = useStore();
  const shop = useMyShop();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "groceries" as GoodsCategory, unit: "each", price: "", stockQty: "" });
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [saleQty, setSaleQty] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  if (!shop) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const goods = state.goods.filter((g) => g.shopId === shop.id);
  const shopId = shop.id;

  async function addGood() {
    if (!draft.name.trim() || !draft.price) return;
    await dispatch({
      type: "ADD_GOOD",
      good: {
        id: `g-${Date.now()}`,
        shopId,
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit || "each",
        price: parseFloat(draft.price) || 0,
        stockQty: parseInt(draft.stockQty || "0", 10),
        soldLast7Days: 0,
        hidden: false,
        photo: draftPhoto ?? undefined,
      },
    });
    setDraft({ name: "", category: "groceries", unit: "each", price: "", stockQty: "" });
    setDraftPhoto(null);
    setShowAdd(false);
    setRefreshKey((k) => k + 1);
  }

  async function recordSale(goodId: string, name: string) {
    const qty = saleQty[goodId] || 1;
    const meta = await dispatch({ type: "RECORD_SALE", goodId, qty });
    setFlash(meta.error ? meta.error : `Sold ${qty} × ${name}`);
    setTimeout(() => setFlash(null), 2500);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">My stock</h1>
          <p className="text-sm text-ink/55">Customers see these on the map.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-dark px-4 py-2.5 text-sm">
          <Plus size={15} /> Add item
        </button>
      </div>

      <AiInsights shopId={shop.id} refreshKey={refreshKey} />

      {showAdd && (
        <div className="card grid grid-cols-12 gap-2 p-4">
          <div className="col-span-12 mb-1">
            <PhotoPicker name={draft.name} value={draftPhoto ?? undefined} onChange={setDraftPhoto} size={64} />
          </div>
          <input placeholder="Item name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="input col-span-12 sm:col-span-4" />
          <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as GoodsCategory }))} className="input col-span-6 sm:col-span-3">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} className="input col-span-6 sm:col-span-2" />
          <input placeholder="Price (R)" type="number" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className="input col-span-6 sm:col-span-2" />
          <input placeholder="Stock" type="number" value={draft.stockQty} onChange={(e) => setDraft((d) => ({ ...d, stockQty: e.target.value }))} className="input col-span-6 sm:col-span-1" />
          <button onClick={addGood} className="btn-ember col-span-12 py-2.5 text-sm">
            Save item
          </button>
        </div>
      )}

      {flash && <p className="rounded-xl2 bg-leaf/10 px-4 py-2 text-sm font-medium text-leaf">{flash}</p>}

      <div className="card divide-y divide-ink/5 p-2">
        {goods.map((g) => (
          <div key={g.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:flex-1">
              <PhotoPicker compact size={48} name={g.name} value={g.photo} onChange={(photo) => dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { photo: photo ?? undefined } })} />
              <div className="min-w-0">
              <p className={clsx("text-sm font-medium", g.hidden ? "text-ink/35 line-through" : "text-ink")}>{g.name}</p>
              <p className="text-xs text-ink/40">
                {g.category} · per {g.unit} · sold {g.soldLast7Days} this week
              </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-ink/40">
              R
              <input
                type="number"
                value={g.price}
                onChange={(e) => dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { price: parseFloat(e.target.value) || 0 } })}
                className="input w-20 py-1.5 text-sm"
                aria-label={`Price of ${g.name}`}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink/40">
              Stock
              <input
                type="number"
                value={g.stockQty}
                onChange={(e) => dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { stockQty: parseInt(e.target.value) || 0 } })}
                className={clsx("input w-20 py-1.5 text-sm", g.stockQty === 0 && "font-semibold text-red-500")}
                aria-label={`Stock of ${g.name}`}
              />
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={saleQty[g.id] ?? 1}
                onChange={(e) => setSaleQty((s) => ({ ...s, [g.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="input w-14 py-1.5 text-sm"
                aria-label={`Units sold of ${g.name}`}
              />
              <button disabled={g.stockQty === 0} onClick={() => recordSale(g.id, g.name)} className="btn-outline px-3 py-2 text-xs">
                <ShoppingCart size={13} /> Record sale
              </button>
            </div>
            <button
              onClick={() => dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { hidden: !g.hidden } })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 hover:bg-white"
              title={g.hidden ? "Show to customers" : "Hide from customers"}
              aria-label={g.hidden ? "Show to customers" : "Hide from customers"}
            >
              {g.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={() => dispatch({ type: "REMOVE_GOOD", goodId: g.id })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/30 hover:bg-red-50 hover:text-red-500"
              aria-label={`Remove ${g.name}`}
            >
              <Trash2 size={16} />
            </button>
            </div>
          </div>
        ))}
        {goods.length === 0 && <p className="p-4 text-sm text-ink/40">You haven't added anything yet.</p>}
      </div>
    </div>
  );
}
