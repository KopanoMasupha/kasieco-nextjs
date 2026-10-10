"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { SHOP_CATEGORY_LABEL } from "@/lib/types";
import { CATEGORY_BG, CATEGORY_ICON } from "@/lib/categoryMeta";
import { getOpenStatus } from "@/lib/hours";
import { formatRand } from "@/lib/pricing";
import { LucideIcon } from "lucide-react";
import {
  Store, ShoppingBasket, Beef, Leaf, UtensilsCrossed, Scissors, ChefHat, Package,
  Clock, Truck, Phone, BadgeCheck, MapPin,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Store, ShoppingBasket, Beef, Leaf, UtensilsCrossed, Scissors, ChefHat, Package,
};

function socialHref(platform: "facebook" | "instagram" | "tiktok", value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  const roots = {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/@",
  };
  return `${roots[platform]}${encodeURIComponent(handle)}`;
}

export default function ShopPage({ params }: { params: { id: string } }) {
  const { state } = useStore();
  const shop = state.shops.find((item) => item.id === params.id);
  if (!shop || !isVerified(shop)) return notFound();
  const goods = state.goods.filter((good) => good.shopId === shop.id && !good.hidden);
  const grouped = goods.reduce<Record<string, typeof goods>>((all, good) => {
    (all[good.category] ||= []).push(good);
    return all;
  }, {});
  const Icon = ICONS[CATEGORY_ICON[shop.category]] ?? Store;
  const open = getOpenStatus(shop.hours);
  const whatsapp = (shop.socialLinks?.whatsapp || shop.phone).replace(/\D/g, "");
  const whatsappNumber = whatsapp.startsWith("0") ? `27${whatsapp.slice(1)}` : whatsapp;
  const facebook = socialHref("facebook", shop.socialLinks?.facebook);
  const instagram = socialHref("instagram", shop.socialLinks?.instagram);
  const tiktok = socialHref("tiktok", shop.socialLinks?.tiktok);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card overflow-hidden">
        <div className={`flex h-32 items-center justify-center ${CATEGORY_BG[shop.category]}`}>
          <Icon size={40} strokeWidth={1.5} />
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink">{shop.name}</h1>
              <p className="text-sm text-ink/50">{SHOP_CATEGORY_LABEL[shop.category]} · {shop.township}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">
              <BadgeCheck size={13} /> Verified
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/60">
            <span className={`flex items-center gap-1.5 font-semibold ${open.isOpen ? "text-leaf" : open.isOpen === false ? "text-ember-dark" : ""}`}>
              <Clock size={14} /> {open.label}
            </span>
            <span className="text-xs">{shop.hours}</span>
            {shop.offersDelivery && <span className="flex items-center gap-1.5"><Truck size={14} /> Delivery available</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`} target="_blank" rel="noreferrer" className="btn-dark px-3.5 py-2.5 text-xs">
              <MapPin size={14} /> Directions
            </a>
            <a href={`tel:${shop.phone.replace(/\s+/g, "")}`} className="btn-outline px-3.5 py-2.5 text-xs"><Phone size={14} /> Call</a>
            {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="btn-outline px-3.5 py-2.5 text-xs">WhatsApp</a>}
            {facebook && <a href={facebook} target="_blank" rel="noreferrer" className="btn-outline px-3.5 py-2.5 text-xs">Facebook</a>}
            {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="btn-outline px-3.5 py-2.5 text-xs">Instagram</a>}
            {tiktok && <a href={tiktok} target="_blank" rel="noreferrer" className="btn-outline px-3.5 py-2.5 text-xs">TikTok</a>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-ink">What they sell</h2>
        <p className="mt-1 text-xs text-ink/45">Browse stock and prices, then visit the shop to buy. KasiEco does not take customer orders or payments.</p>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/35">{category}</p>
            <div>
              {items.map((good) => (
                <div key={good.id} className="flex items-center justify-between gap-3 border-b border-ink/5 py-3.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{good.name}</p>
                    <p className="text-xs text-ink/45">{formatRand(good.price)} / {good.unit}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${good.stockQty <= 0 ? "bg-red-50 text-red-600" : good.stockQty <= 3 ? "bg-ember/10 text-ember-dark" : "bg-leaf/10 text-leaf"}`}>
                    {good.stockQty <= 0 ? "Sold out" : good.stockQty <= 3 ? `Only ${good.stockQty} left` : "In stock"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {goods.length === 0 && <p className="mt-3 text-sm text-ink/40">This shop has no stock listed right now.</p>}
      </div>
      <Link href="/consumer" className="inline-block text-sm font-semibold text-ember-dark">← Find more shops</Link>
    </div>
  );
}
