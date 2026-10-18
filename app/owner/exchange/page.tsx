"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import ProductImage from "@/components/ProductImage";
import { Plus, ArrowRight, MessageCircle, PackagePlus, PackageMinus, ShieldAlert, Scale, Store } from "lucide-react";
import { useStore, useMyShop } from "@/lib/store";
import { isVerified, statusLabel } from "@/lib/compliance";
import { distanceKm, formatDistance } from "@/lib/geo";
import { findMatches, threadsFor, fairUnitPrice } from "@/lib/exchange";
import { formatRand } from "@/lib/pricing";
import { ListingType, StockListing } from "@/lib/types";

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
  const shop = useMyShop();

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ListingType>("have");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("each");
  const [wantInReturn, setWantInReturn] = useState("");
  const [price, setPrice] = useState("");
  const [board, setBoard] = useState<"all" | ListingType>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const prefillItem = searchParams.get("prefillItem");
    if (searchParams.get("post") || prefillItem) setShowForm(true);
    if (prefillItem) {
      setType((searchParams.get("prefillType") as ListingType) || "have");
      setItem(prefillItem);
      setQty(searchParams.get("prefillQty") || "");
      setWantInReturn("Cash or a swap");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifiedIds = useMemo(
    () => new Set(state.shops.filter((s) => s.verificationStatus === "verified").map((s) => s.id)),
    [state.shops]
  );

  if (!shop) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
      </div>
    );
  }

  if (!isVerified(shop)) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <ShieldAlert size={30} className="mx-auto text-ember" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Get verified to trade</h1>
        <p className="mt-1 text-sm text-ink/55">
          {shop.name} is <strong>{statusLabel(shop.verificationStatus)}</strong>. Only verified shops can post and chat on the exchange, so
          every trade is between compliant businesses.
        </p>
        <Link href="/owner/compliance" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Go to compliance
        </Link>
      </div>
    );
  }

  const matches = findMatches(shop, state.listings);
  const myListings = state.listings.filter((l) => l.shopId === shop.id);
  const myThreads = threadsFor(shop.id, state.threads);
  const others = state.listings
    .filter((l) => l.shopId !== shop.id && l.status === "open" && (board === "all" || l.type === board))
    .map((l) => ({ l, dist: distanceKm(shop.lat, shop.lng, l.lat, l.lng) }))
    .sort((a, b) => a.dist - b.dist);

  const fair = item.trim() ? fairUnitPrice(item, state.goods, verifiedIds) : null;

  async function postListing() {
    setError("");
    if (!item.trim() || !qty) {
      setError("Add the item and how many.");
      return;
    }
    const meta = await dispatch({
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
        unit: unit || "each",
        wantInReturn: wantInReturn.trim() || "Open to offers",
        price: price ? parseFloat(price) : null,
        createdAt: new Date().toISOString(),
        status: "open",
      },
    });
    if (meta.error) return setError(meta.error);
    setItem("");
    setQty("");
    setWantInReturn("");
    setPrice("");
    setShowForm(false);
  }

  async function startChat(listing: StockListing) {
    const existing = state.threads.find(
      (t) =>
        (t.shopAId === listing.shopId && t.shopBId === shop!.id) || (t.shopBId === listing.shopId && t.shopAId === shop!.id)
    );
    if (existing) return router.push(`/owner/exchange/${existing.id}`);
    const threadId = `thread-${Date.now()}`;
    const meta = await dispatch({
      type: "START_THREAD",
      thread: {
        id: threadId,
        listingId: listing.id,
        shopAId: listing.shopId,
        shopBId: shop!.id,
        messages: [],
        offers: [],
        confirmedBy: [],
        status: "open",
        createdAt: new Date().toISOString(),
      },
    });
    if (!meta.error) router.push(`/owner/exchange/${threadId}`);
  }

  const ListingRow = ({ l, dist, note }: { l: StockListing; dist: number; note?: string }) => (
    <div className="card flex items-center justify-between gap-3 p-4">
      <ProductImage name={l.item} size={52} rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          <span className={clsx("mr-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", l.type === "have" ? "bg-leaf/10 text-leaf" : "bg-ember/10 text-ember-dark")}>
            {l.type === "have" ? "Has" : "Needs"}
          </span>
          <span className="font-semibold">{l.qty} {l.unit}</span> · {l.item}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink/45">
          {l.shopName} · {formatDistance(dist)} · wants {l.wantInReturn.toLowerCase()}
          {l.price ? ` · asking ${formatRand(l.price)}/${l.unit}` : ""}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      <button onClick={() => startChat(l)} className="btn-dark shrink-0 px-3.5 py-2 text-xs">
        <MessageCircle size={13} /> Chat
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Willing buyer & seller</h1>
          <p className="text-sm text-ink/55">Sell or swap with shops nearby.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-ember px-4 py-2.5 text-sm">
          <Plus size={15} /> Post
        </button>
      </div>

      <p className="flex items-center gap-2 text-sm text-ink/60">
        <Scale size={16} className="shrink-0 text-leaf" /> Both shops must accept. Every offer shows a fair price.
      </p>

      {showForm && (
        <div className="card space-y-3 p-5">
          <div className="flex gap-2">
            <button onClick={() => setType("have")} className={clsx("chip flex-1 justify-center", type === "have" && "chip-active")}>
              <PackagePlus size={14} /> I have extra
            </button>
            <button onClick={() => setType("need")} className={clsx("chip flex-1 justify-center", type === "need" && "chip-active")}>
              <PackageMinus size={14} /> I'm short
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} className="input col-span-12 sm:col-span-6" />
            <input placeholder="How many" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="input col-span-4 sm:col-span-2" />
            <input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="input col-span-4 sm:col-span-2" />
            <input placeholder="Price (R)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input col-span-4 sm:col-span-2" />
          </div>
          {fair !== null && (
            <p className="text-xs text-leaf">
              Fair price: about {formatRand(fair)} each
            </p>
          )}
          <input placeholder="Want in return (e.g. cash)" value={wantInReturn} onChange={(e) => setWantInReturn(e.target.value)} className="input" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={postListing} className="btn-ember w-full py-2.5 text-sm">
            Post to the exchange
          </button>
        </div>
      )}

      {matches.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-ink">Matches for your listings</h2>
          <div className="space-y-2">
            {matches.map((m) => (
              <ListingRow key={m.listing.id + m.mine.id} l={m.listing} dist={m.dist} note={`matches your “${m.mine.type}”`} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Posted by shops near you</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "have", "need"] as const).map((b) => (
              <button key={b} onClick={() => setBoard(b)} className={clsx("chip px-3 py-1.5 text-xs", board === b && "chip-active")}>
                {b === "all" ? "Everything" : b === "have" ? "Shops with extra" : "Shops that are short"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {others.map(({ l, dist }) => (
            <ListingRow key={l.id} l={l} dist={dist} />
          ))}
          {others.length === 0 && <div className="card p-5 text-sm text-ink/45">Nothing here yet.</div>}
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold text-ink">My posts</h2>
          <div className="card divide-y divide-ink/5 p-2">
            {myListings.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-2.5 text-sm">
                <span className="text-ink/70">
                  <span className={l.type === "have" ? "font-medium text-leaf" : "font-medium text-ember-dark"}>{l.type === "have" ? "Have" : "Need"}</span>{" "}
                  {l.qty} {l.unit} · {l.item}
                </span>
                <span className="text-xs capitalize text-ink/40">{l.status}</span>
              </div>
            ))}
            {myListings.length === 0 && <p className="p-3 text-sm text-ink/40">Nothing posted yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-ink">My chats</h2>
          <div className="card divide-y divide-ink/5 p-2">
            {myThreads.map((t) => {
              const other = state.shops.find((s) => s.id === (t.shopAId === shop.id ? t.shopBId : t.shopAId));
              return (
                <Link key={t.id} href={`/owner/exchange/${t.id}`} className="flex items-center justify-between p-2.5 text-sm hover:bg-sand-100">
                  <span className="text-ink/70">{other?.name}</span>
                  <span className="flex items-center gap-2">
                    {t.status === "completed" && <span className="text-xs font-semibold text-leaf">Completed</span>}
                    <ArrowRight size={14} className="text-ink/25" />
                  </span>
                </Link>
              );
            })}
            {myThreads.length === 0 && <p className="p-3 text-sm text-ink/40">No chats yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
