"use client";

/**
 * The shop owner's cart: deals they want to reserve, collected while they
 * browse and reserved together at checkout with ONE set of delivery choices.
 * Kept in this browser per account (it's a shopping list, not money).
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Pool } from "./types";
import { toCents, totalQtyOf, unitCentsFor } from "./pot";
import { useMe } from "./store";

export interface CartItem {
  dealId: string;
  qty: number;
  addedAt: string;
}

const EMPTY: CartItem[] = [];
const keyFor = (userId: string) => `mc-cart:${userId}`;
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; items: CartItem[] }>();

function read(key: string): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // storage blocked: fall back to the in-memory copy
  }
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.items;
  let items: CartItem[] = cached?.items ?? EMPTY;
  try {
    if (raw !== null) items = JSON.parse(raw) as CartItem[];
  } catch {
    items = EMPTY;
  }
  snapshots.set(key, { raw, items });
  return items;
}

function write(key: string, items: CartItem[]) {
  const raw = JSON.stringify(items);
  snapshots.set(key, { raw, items });
  try {
    localStorage.setItem(key, raw);
  } catch {
    // storage blocked: the cart still works until the page closes
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("mc-cart:")) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const me = useMe();
  const key = me ? keyFor(me.id) : null;
  const items = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : EMPTY),
    () => EMPTY
  );

  const save = useCallback((next: CartItem[]) => key && write(key, next), [key]);

  const add = useCallback(
    (dealId: string, qty: number) => {
      if (!key || qty < 1) return;
      const cur = read(key);
      const found = cur.find((i) => i.dealId === dealId);
      save(found ? cur.map((i) => (i.dealId === dealId ? { ...i, qty: i.qty + qty } : i)) : [...cur, { dealId, qty, addedAt: new Date().toISOString() }]);
    },
    [key, save]
  );
  const setQty = useCallback(
    (dealId: string, qty: number) => {
      if (!key) return;
      const cur = read(key);
      save(qty < 1 ? cur.filter((i) => i.dealId !== dealId) : cur.map((i) => (i.dealId === dealId ? { ...i, qty } : i)));
    },
    [key, save]
  );
  const remove = useCallback((dealId: string) => key && save(read(key).filter((i) => i.dealId !== dealId)), [key, save]);
  const removeMany = useCallback((ids: string[]) => key && save(read(key).filter((i) => !ids.includes(i.dealId))), [key, save]);

  return useMemo(
    () => ({
      items,
      count: items.length,
      units: items.reduce((s, i) => s + i.qty, 0),
      qtyOf: (dealId: string) => items.find((i) => i.dealId === dealId)?.qty ?? 0,
      add,
      setQty,
      remove,
      removeMany,
    }),
    [items, add, setQty, remove, removeMany]
  );
}

/** Units still free in a deal (0 once it's full). */
export const unitsLeft = (pool: Pool) => (pool.status === "open" ? Math.max(0, pool.minQty - totalQtyOf(pool)) : 0);

/**
 * What one cart line will cost once the deal fills: goods at the final
 * (lowest) price + the 2% service fee + its share of delivery. Nothing is
 * paid at checkout; this is what's due later, within 48 hours of filling.
 */
export function lineEstimate(pool: Pool, qty: number) {
  const finalUnit = unitCentsFor(pool, pool.minQty);
  const goodsCents = qty * finalUnit;
  const serviceCents = Math.round(goodsCents * pool.serviceFeeRate);
  const deliveryCents = Math.round((pool.deliveryFeeCents * qty) / pool.minQty);
  const aloneCents = qty * toCents(pool.retailPrice);
  return {
    finalUnit,
    goodsCents,
    serviceCents,
    deliveryCents,
    totalCents: goodsCents + serviceCents + deliveryCents,
    savingsCents: Math.max(0, aloneCents - goodsCents),
    aloneCents,
  };
}

