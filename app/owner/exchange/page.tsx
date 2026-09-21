"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { isVerified, statusLabel } from "@/lib/compliance";
import { distanceKm, formatDistance } from "@/lib/geo";
import { ListingType } from "@/lib/types";
import {
  Plus,
  ArrowRight,
  MessageCircle,
  Store,
  PackagePlus,
  PackageMinus,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";

export default function ExchangePage() {
  return (
    <Suspense fallback={null}>
      <ExchangeContent />
    </Suspense>
  );
}

function ExchangeContent() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shop = state.shops.find((s) => s.id === state.myShopId);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ListingType>("have");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("bottle");
  const [wantInReturn, setWantInReturn] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    const prefillItem = searchParams.get("prefillItem");
    if (prefillItem) {
      setShowForm(true);
      setType((searchParams.get("prefillType") as ListingType) || "have");
      setItem(prefillItem);
      setQty(searchParams.get("prefillQty") || "");
      setWantInReturn("Cash or a swap");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myListings = useMemo(
    () => (shop ? state.listings.filter((l) => l.shopId === shop.id) : []),
    [state.listings, shop]
  );

  const matches = useMemo(() => {
    if (!shop) return [];
    const openMine = myListings.filter((l) => l.status === "open");
    const results: { listing: (typeof state.listings)[number]; mine: (typeof state.listings)[number]; dist: number }[] = [];
    for (const mine of openMine) {
      const opposite = mine.type === "have" ? "need" : "have";
      for (const other of state.listings) {
        if (other.shopId === shop.id || other.status !== "open") continue;
        if (other.type !== opposite) continue;
        if (other.item.toLowerCase() !== mine.item.toLowerCase()) continue;
        results.push({
          listing: other,
          mine,
          dist: distanceKm(shop.lat, shop.lng, other.lat, other.lng),
        });
      }
    }
    return results.sort((a, b) => a.dist - b.dist);
  }, [shop, myListings, state.listings]);

  const myThreads = useMemo(
    () => (shop ? state.threads.filter((t) => t.shopAId === shop.id || t.shopBId === shop.id) : []),
    [state.threads, shop]
  );

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

  if (!isVerified(shop)) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <ShieldAlert size={30} className="mx-auto text-ember" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Get verified to trade</h1>
        <p className="mt-1 text-sm text-ink/50">
          {shop.name} is currently <strong>{statusLabel(shop.verificationStatus)}</strong>.
          Only verified shops can post listings and chat with other shops.
        </p>
        <Link href="/owner/compliance" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Go to compliance
        </Link>
      </div>
    );
  }

  async function postListing() {
    if (!item.trim() || !qty) return;
    await dispatch({
      type: "CREATE_LISTING",
      listing: {
        id: `listing-${Date.now()}`,
        shopId: shop!.id,
        shopName: shop!.name,
        township: shop!.township,
        lat: shop!.lat,
        lng: shop!.lng,
        type,
        item: item.trim(),
        qty: parseInt(qty, 10) || 0,
        unit,
        wantInReturn: wantInReturn.trim() || "Open to offers",
        price: price ? parseFloat(price) : null,
        createdAt: new Date().toISOString(),
        status: "open",
      },
    });
    setItem("");
    setQty("");
    setWantInReturn("");
    setPrice("");
    setShowForm(false);
  }

  async function startChat(otherShopId: string, listingId: string) {
    const existing = state.threads.find(
      (t) =>
        t.listingId === listingId &&
        ((t.shopAId === shop!.id && t.shopBId === otherShopId) ||
          (t.shopBId === shop!.id && t.shopAId === otherShopId))
    );
    if (existing) {
      router.push(`/owner/exchange/${existing.id}`);
      return;
    }
    const threadId = `thread-${Date.now()}`;
    const meta = await dispatch({
      type: "START_THREAD",
      thread: {
        id: threadId,
        listingId,
        shopAId: otherShopId,
        shopBId: shop!.id,
        messages: [],
        offers: [],
        confirmedBy: [],
        status: "open",
        createdAt: new Date().toISOString(),
      },
    });
    if (meta?.error) return;
    router.push(`/owner/exchange/${threadId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Stock exchange</h1>
          <p className="text-sm text-ink/50">Post what you have or need, and swap with a shop nearby.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-dark px-4 py-2.5 text-sm">
          <Plus size={15} /> Post
        </button>
      </div>

      {showForm && (
        <div className="card space-y-3 p-5">
          <div className="flex gap-2">
            <button
              onClick={() => setType("have")}
              className={clsx("chip flex-1 justify-center", type === "have" && "chip-active")}
            >
              <PackagePlus size={14} /> I have
            </button>
            <button
              onClick={() => setType("need")}
              className={clsx("chip flex-1 justify-center", type === "need" && "chip-active")}
            >
              <PackageMinus size={14} /> I need
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input
              placeholder="Item (e.g. Cooking oil 750ml)"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="input col-span-12 sm:col-span-6"
            />
            <input
              placeholder="Qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="input col-span-4 sm:col-span-2"
            />
            <input
              placeholder="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="input col-span-4 sm:col-span-2"
            />
            <input
              placeholder="Price (optional)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input col-span-4 sm:col-span-2"
            />
          </div>
          <input
            placeholder="What would you take in return? e.g. maize meal or cash"
            value={wantInReturn}
            onChange={(e) => setWantInReturn(e.target.value)}
            className="input"
          />
          <button onClick={postListing} className="btn-ember w-full py-2.5 text-sm">
            Post listing
          </button>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold text-ink">Nearby matches</h2>
          <div className="space-y-3">
            {matches.map(({ listing, mine, dist }, i) => (
              <div key={i} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {listing.shopName}{" "}
                    <span className="font-normal text-ink/45">
                      {listing.type === "have" ? "has" : "needs"} {listing.qty} {listing.unit} of {listing.item}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink/40">
                    {formatDistance(dist)} away · matches your "{mine.type}" listing
                  </p>
                </div>
                <button
                  onClick={() => startChat(listing.shopId, mine.id)}
                  className="btn-dark shrink-0 px-3.5 py-2 text-xs"
                >
                  <MessageCircle size={13} /> Chat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold text-ink">My listings</h2>
        <div className="card divide-y divide-ink/5 p-2">
          {myListings.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-ink/70">
                <span className={l.type === "have" ? "text-leaf font-medium" : "text-ember-dark font-medium"}>
                  {l.type === "have" ? "Have" : "Need"}
                </span>{" "}
                {l.qty} {l.unit} · {l.item}
              </span>
              <span className="text-xs capitalize text-ink/40">{l.status}</span>
            </div>
          ))}
          {myListings.length === 0 && <p className="p-3 text-sm text-ink/40">Nothing posted yet.</p>}
        </div>
      </div>

      {myThreads.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold text-ink">My chats</h2>
          <div className="card divide-y divide-ink/5 p-2">
            {myThreads.map((t) => {
              const otherId = t.shopAId === shop.id ? t.shopBId : t.shopAId;
              const other = state.shops.find((s) => s.id === otherId);
              return (
                <Link
                  key={t.id}
                  href={`/owner/exchange/${t.id}`}
                  className="flex items-center justify-between p-3 text-sm hover:bg-sand-50"
                >
                  <span className="text-ink/70">{other?.name}</span>
                  <span className="flex items-center gap-2">
                    {t.status === "completed" && (
                      <span className="text-xs font-semibold text-leaf">Completed</span>
                    )}
                    <ArrowRight size={14} className="text-ink/25" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
