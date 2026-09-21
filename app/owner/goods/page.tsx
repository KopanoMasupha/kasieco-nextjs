"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { GoodsCategory } from "@/lib/types";
import { Plus, Trash2, Eye, EyeOff, Store } from "lucide-react";
import Link from "next/link";

const CATEGORIES: GoodsCategory[] = [
  "groceries",
  "fresh produce",
  "airtime",
  "cooked food",
  "meat",
  "bakery",
  "household",
  "toiletries",
];

export default function OwnerGoodsPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    category: "groceries" as GoodsCategory,
    unit: "each",
    price: "",
    stockQty: "",
  });

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const myGoods = state.goods.filter((g) => g.shopId === shop.id);
  const shopId = shop.id;

  function addGood() {
    if (!draft.name.trim() || !draft.price) return;
    dispatch({
      type: "ADD_GOOD",
      good: {
        id: `g-${Date.now()}`,
        shopId: shopId,
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit || "each",
        price: parseFloat(draft.price) || 0,
        stockQty: parseInt(draft.stockQty || "0", 10),
        hidden: false,
      },
    });
    setDraft({ name: "", category: "groceries", unit: "each", price: "", stockQty: "" });
    setShowAdd(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">My goods</h1>
          <p className="text-sm text-ink/50">Update stock so search results stay accurate.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-dark px-4 py-2.5 text-sm">
          <Plus size={15} /> Add item
        </button>
      </div>

      {showAdd && (
        <div className="card grid grid-cols-12 gap-2 p-4">
          <input
            placeholder="Item name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="input col-span-12 sm:col-span-4"
          />
          <select
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as GoodsCategory }))}
            className="input col-span-6 sm:col-span-3"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Unit"
            value={draft.unit}
            onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
            className="input col-span-6 sm:col-span-2"
          />
          <input
            placeholder="Price"
            type="number"
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            className="input col-span-6 sm:col-span-2"
          />
          <input
            placeholder="Stock"
            type="number"
            value={draft.stockQty}
            onChange={(e) => setDraft((d) => ({ ...d, stockQty: e.target.value }))}
            className="input col-span-6 sm:col-span-1"
          />
          <button onClick={addGood} className="btn-ember col-span-12 py-2.5 text-sm">
            Save item
          </button>
        </div>
      )}

      <div className="card divide-y divide-ink/5 p-2">
        {myGoods.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-[140px] flex-1">
              <p className={`text-sm font-medium ${g.hidden ? "text-ink/35 line-through" : "text-ink"}`}>
                {g.name}
              </p>
              <p className="text-xs text-ink/40">{g.category} · per {g.unit}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink/40">R</span>
              <input
                type="number"
                value={g.price}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { price: parseFloat(e.target.value) || 0 } })
                }
                className="input w-20 py-1.5 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink/40">Stock</span>
              <input
                type="number"
                value={g.stockQty}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { stockQty: parseInt(e.target.value) || 0 } })
                }
                className={`input w-20 py-1.5 text-sm ${g.stockQty === 0 ? "text-red-500 font-semibold" : ""}`}
              />
            </div>

            <button
              onClick={() => dispatch({ type: "UPDATE_GOOD", goodId: g.id, patch: { hidden: !g.hidden } })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 hover:bg-sand-100"
              title={g.hidden ? "Show to customers" : "Hide from customers"}
            >
              {g.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={() => dispatch({ type: "REMOVE_GOOD", goodId: g.id })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/30 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {myGoods.length === 0 && (
          <p className="p-4 text-sm text-ink/40">You haven't added anything yet.</p>
        )}
      </div>
    </div>
  );
}
