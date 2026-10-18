"use client";

import Link from "next/link";
import {
  Store,
  ShoppingBasket,
  Beef,
  Leaf,
  UtensilsCrossed,
  Scissors,
  ChefHat,
  Package,
  BadgeCheck,
  Truck,
  Clock,
  MapPin,
} from "lucide-react";
import { Shop, SHOP_CATEGORY_LABEL } from "@/lib/types";
import { CATEGORY_BG, CATEGORY_ICON } from "@/lib/categoryMeta";
import { formatDistance } from "@/lib/geo";

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

export default function ShopCard({
  shop,
  goodsCount,
  distanceKm,
  matchLabel,
}: {
  shop: Shop;
  goodsCount?: number;
  distanceKm?: number;
  matchLabel?: string;
}) {
  const Icon = ICONS[CATEGORY_ICON[shop.category]] ?? Store;

  return (
    <Link
      href={`/consumer/shop/${shop.id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className={`relative flex h-28 items-center justify-center ${CATEGORY_BG[shop.category]}`}>
        <Icon size={34} strokeWidth={1.6} />
        {shop.verified && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-leaf">
            <BadgeCheck size={12} />
            Verified
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{shop.name}</h3>
        </div>
        <p className="text-xs font-medium text-ink/45">
          {SHOP_CATEGORY_LABEL[shop.category]} · {shop.township}
        </p>

        {matchLabel && (
          <p className="mt-0.5 text-xs font-medium text-ember">{matchLabel}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-ink/50">
          {typeof distanceKm === "number" && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {formatDistance(distanceKm)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} /> {shop.hours.split(" ").slice(0, 3).join(" ")}
          </span>
          {shop.offersDelivery && (
            <span className="flex items-center gap-1">
              <Truck size={12} /> Delivers
            </span>
          )}
        </div>

        {typeof goodsCount === "number" && (
          <p className="pt-1 text-xs text-ink/40">{goodsCount} goods listed</p>
        )}
      </div>
    </Link>
  );
}
