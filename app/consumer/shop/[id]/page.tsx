"use client";

import { notFound } from "next/navigation";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { SHOP_CATEGORY_LABEL } from "@/lib/types";
import { CATEGORY_BG, CATEGORY_ICON } from "@/lib/categoryMeta";
import {
  Store,
  ShoppingBasket,
  Beef,
  Leaf,
  UtensilsCrossed,
  Scissors,
  ChefHat,
  Package,
  Clock,
  Truck,
  Phone,
  BadgeCheck,
} from "lucide-react";

const ICONS: Record<string, any> = {
  Store,
  ShoppingBasket,
  Beef,
  Leaf,
  UtensilsCrossed,
  Scissors,
  ChefHat,
  Package,
};

function GoodRow({ good }: { good: any }) {
  const outOfStock = good.stockQty <= 0;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/5 py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{good.name}</p>
        <p className="text-xs text-ink/45">
          R{good.price.toFixed(2)} / {good.unit}
          {outOfStock ? (
            <span className="ml-2 font-medium text-red-500">Out of stock</span>
          ) : (
            <span className="ml-2">{good.stockQty} in stock</span>
          )}
        </p>
      </div>

      <span
        className={
          outOfStock
            ? "shrink-0 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-medium text-ink/40"
            : "shrink-0 rounded-full bg-leaf/10 px-3 py-1.5 text-xs font-semibold text-leaf"
        }
      >
        {outOfStock ? "Not available" : "Buy in store"}
      </span>
    </div>
  );
}

export default function ShopPage({ params }: { params: { id: string } }) {
  const { state } = useStore();
  const shop = state.shops.find((s) => s.id === params.id);
  if (!shop || !isVerified(shop)) return notFound();

  const goods = state.goods.filter((g) => g.shopId === shop.id && !g.hidden);
  const Icon = ICONS[CATEGORY_ICON[shop.category]] ?? Store;

  const grouped = goods.reduce<Record<string, typeof goods>>((acc, g) => {
    (acc[g.category] ||= []).push(g);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card overflow-hidden">
        <div className={`flex h-32 items-center justify-center ${CATEGORY_BG[shop.category]}`}>
          <Icon size={40} strokeWidth={1.5} />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink">{shop.name}</h1>
              <p className="text-sm text-ink/50">
                {SHOP_CATEGORY_LABEL[shop.category]} · {shop.township}
              </p>
            </div>
            {shop.verified && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">
                <BadgeCheck size={13} /> Verified
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink/60">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {shop.hours}
            </span>
            {shop.offersDelivery && (
              <span className="flex items-center gap-1.5">
                <Truck size={14} /> Delivery available
              </span>
            )}
            <a
              href={`tel:${shop.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1.5 hover:text-ink"
            >
              <Phone size={14} /> {shop.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-ink">What they sell</h2>
        <p className="mt-1 text-xs text-ink/45">
          These are in-store prices. Kasi-Connect doesn't take orders — pop into the shop to buy.
        </p>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/35">{cat}</p>
            <div>
              {items.map((g) => (
                <GoodRow key={g.id} good={g} />
              ))}
            </div>
          </div>
        ))}
        {goods.length === 0 && (
          <p className="mt-3 text-sm text-ink/40">This shop hasn't listed any goods yet.</p>
        )}
      </div>
    </div>
  );
}
