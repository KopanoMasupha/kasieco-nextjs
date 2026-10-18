"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import ProductImage from "@/components/ProductImage";
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
  Navigation,
  MessageCircle,
  AtSign,
  Globe,
  ArrowLeft,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { SHOP_CATEGORY_LABEL } from "@/lib/types";
import { CATEGORY_BG, CATEGORY_ICON } from "@/lib/categoryMeta";
import { hoursLabel, isOpenNow, stockLevel } from "@/lib/hours";
import { formatRand } from "@/lib/pricing";

const ICONS: Record<string, any> = { Store, ShoppingBasket, Beef, Leaf, UtensilsCrossed, Scissors, ChefHat, Package };

function waLink(num: string) {
  const digits = num.replace(/\D/g, "").replace(/^0/, "27");
  return `https://wa.me/${digits}`;
}

export default function ShopPage({ params }: { params: { id: string } }) {
  const { state } = useStore();
  const shop = state.shops.find((s) => s.id === params.id);
  if (!shop || !isVerified(shop)) return notFound();

  const goods = state.goods.filter((g) => g.shopId === shop.id && !g.hidden);
  const Icon = ICONS[CATEGORY_ICON[shop.category]] ?? Store;
  const open = isOpenNow(shop);
  const grouped = goods.reduce<Record<string, typeof goods>>((acc, g) => {
    (acc[g.category] ||= []).push(g);
    return acc;
  }, {});
  const s = shop.socials || {};
  // honest shop-window signals: this shop's best sellers, and price vs other verified shops nearby
  const topSellers = new Set(goods.filter((g) => g.soldLast7Days >= 10).sort((a, b) => b.soldLast7Days - a.soldLast7Days).slice(0, 2).map((g) => g.id));
  const verifiedIds = new Set(state.shops.filter(isVerified).map((x) => x.id));
  const areaAvg = (name: string) => {
    const prices = state.goods.filter((g) => verifiedIds.has(g.shopId) && g.name.toLowerCase() === name.toLowerCase()).map((g) => g.price);
    return prices.length >= 2 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/consumer" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> Back to the map
      </Link>

      <div className="card overflow-hidden">
        <div className={`relative flex h-36 items-center justify-center ${CATEGORY_BG[shop.category]}`}>
          <Icon size={44} strokeWidth={1.5} />
          <span
            className={clsx(
              "absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              open ? "bg-leaf text-white" : "bg-ink/80 text-white"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", open ? "bg-white" : "bg-sand-50")} />
            {open ? "Open now" : "Closed now"}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-ink">{shop.name}</h1>
              <p className="text-sm text-ink/50">
                {SHOP_CATEGORY_LABEL[shop.category]} · {shop.township}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf" title="Checked by MzansiConnect's compliance process">
              <BadgeCheck size={13} /> Verified
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink/60">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {hoursLabel(shop)}
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={14} /> {shop.offersDelivery ? "Delivers nearby" : "Walk-in only"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ember px-4 py-2.5 text-sm"
            >
              <Navigation size={14} /> Directions
            </a>
            <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="btn-outline px-4 py-2.5 text-sm">
              <Phone size={14} /> Call
            </a>
            {s.whatsapp && (
              <a href={waLink(s.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2.5 text-sm">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {s.facebook && (
              <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2.5 text-sm">
                <Globe size={14} /> Facebook
              </a>
            )}
            {s.instagram && (
              <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2.5 text-sm">
                <AtSign size={14} /> Instagram
              </a>
            )}
            {s.tiktok && (
              <a href={`https://www.tiktok.com/@${s.tiktok}`} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2.5 text-sm">
                <AtSign size={14} /> TikTok
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">What's on the shelf</h2>
          <span className="text-xs text-ink/40">{goods.filter((g) => g.stockQty > 0).length} items in stock</span>
        </div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mt-5">
            <p className="eyebrow capitalize">{cat}</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items
                .slice()
                .sort((a, b) => Number(b.stockQty > 0) - Number(a.stockQty > 0) || b.soldLast7Days - a.soldLast7Days)
                .map((g) => {
                  const lvl = stockLevel(g.stockQty);
                  const avg = areaAvg(g.name);
                  const cheaper = avg != null && avg - g.price >= 1; // only a saving worth mentioning
                  const popular = topSellers.has(g.id) && lvl.tone !== "out";
                  return (
                    <div key={g.id} className={clsx("flex flex-col overflow-hidden rounded-xl2 border border-ink/[0.07] bg-white", lvl.tone === "out" && "opacity-60")}>
                      <div className="relative">
                        <ProductImage name={g.name} src={g.photo} size="fill" rounded="rounded-none" />
                        {popular && <span className="absolute left-2 top-2 rounded-full bg-ember px-2 py-0.5 text-[10px] font-bold text-white">Popular here</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{g.name}</p>
                        <p className="mt-1">
                          <span className="num font-display text-lg font-bold text-ink">{formatRand(g.price)}</span>
                          <span className="text-xs text-ink/45"> / {g.unit}</span>
                        </p>
                        {cheaper && <p className="num text-[11px] font-semibold text-leaf">{formatRand(avg! - g.price)} below the area average</p>}
                        <span
                          className={clsx(
                            "mt-2 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            lvl.tone === "in" && "bg-leaf/10 text-leaf",
                            lvl.tone === "low" && "bg-amber-100 text-amber-700",
                            lvl.tone === "out" && "bg-ink/5 text-ink/40"
                          )}
                        >
                          {lvl.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
        {goods.length === 0 && <p className="mt-3 text-sm text-ink/40">This shop hasn't listed any stock yet.</p>}
        <p className="mt-4 flex items-start gap-1.5 text-xs text-ink/45">
          <Info size={13} className="mt-0.5 shrink-0" />
          Stock set by the owner · pay at the shop.
        </p>
      </div>
    </div>
  );
}
