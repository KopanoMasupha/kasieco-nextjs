"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { distanceKm, formatDistance } from "@/lib/geo";
import { isVerified } from "@/lib/compliance";
import { Search, LocateFixed, MapPin, Clock, Truck, BadgeCheck } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const ShopFinderMap = dynamic(() => import("@/components/maps/ShopFinderMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl2 bg-sand-100 text-sm text-ink/40">
      Loading map…
    </div>
  ),
});

const TOWNSHIP_CENTERS: Record<string, { lat: number; lng: number }> = {
  Mamelodi: { lat: -25.7069, lng: 28.3765 },
  Soshanguve: { lat: -25.5167, lng: 28.1167 },
  Attridgeville: { lat: -25.7716, lng: 27.9884 },
};

const QUICK_SEARCHES = ["Bread", "Airtime", "Cooking oil", "Maize meal", "Fresh veg", "Meat"];

export default function ConsumerHome() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [township, setTownship] = useState<string | null>(null);
  const [area, setArea] = useState({ lat: -25.7069, lng: 28.3765, radiusKm: 6 });
  const [recenterTick, setRecenterTick] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | undefined>();

  function jumpToTownship(t: string) {
    setTownship(t);
    const c = TOWNSHIP_CENTERS[t];
    if (c) {
      setArea((a) => ({ ...a, lat: c.lat, lng: c.lng }));
      setRecenterTick((v) => v + 1);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setArea((a) => ({ ...a, lat: loc.lat, lng: loc.lng }));
        setRecenterTick((v) => v + 1);
        setTownship(null);
      },
      () => {
        /* permission refused — consumer keeps browsing by township / map */
      }
    );
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.shops
      .filter(isVerified)
      .map((shop) => {
        const dist = distanceKm(area.lat, area.lng, shop.lat, shop.lng);
        const shopGoods = state.goods.filter(
          (g) => g.shopId === shop.id && !g.hidden && g.stockQty > 0
        );
        const matches = q
          ? shopGoods.filter((g) => g.name.toLowerCase().includes(q))
          : shopGoods;
        return { shop, dist, matches, qualifies: q ? matches.length > 0 : shopGoods.length > 0 };
      })
      .filter((r) => r.qualifies && r.dist <= Math.max(area.radiusKm, 3))
      .sort((a, b) => a.dist - b.dist);
  }, [state.shops, state.goods, query, area]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Find a shop near you</h1>
        <p className="text-sm text-ink/50">
          Search for what you need, or browse shops on the map. Only shops with it in
          stock show up — visit in store to buy.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search “bread”, “airtime”, “tomatoes”…"
            className="input pl-11"
          />
        </div>
        <button onClick={useMyLocation} className="btn-outline shrink-0 px-4 py-2.5 text-sm">
          <LocateFixed size={15} /> Use my location
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_SEARCHES.map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className={clsx("chip", query === q && "chip-active")}
          >
            {q}
          </button>
        ))}
        <span className="mx-1 my-auto h-4 w-px bg-ink/10" />
        {Object.keys(TOWNSHIP_CENTERS).map((t) => (
          <button
            key={t}
            onClick={() => jumpToTownship(t)}
            className={clsx("chip", township === t && "chip-active")}
          >
            <MapPin size={13} /> {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="order-2 space-y-3 lg:order-1">
          <p className="text-xs font-medium text-ink/40">
            {results.length} shop{results.length === 1 ? "" : "s"} in view
          </p>
          <div className="space-y-3">
            {results.map(({ shop, dist, matches }) => (
              <Link
                key={shop.id}
                href={`/consumer/shop/${shop.id}`}
                onMouseEnter={() => setActiveShopId(shop.id)}
                className="card block p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{shop.name}</p>
                    <p className="text-xs text-ink/45">{shop.township}</p>
                  </div>
                  {shop.verified && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-leaf">
                      <BadgeCheck size={13} /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {formatDistance(dist)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {shop.hours}
                  </span>
                  {shop.offersDelivery && (
                    <span className="flex items-center gap-1">
                      <Truck size={12} /> Delivers
                    </span>
                  )}
                </div>
                {query && matches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/5 pt-3">
                    {matches.slice(0, 4).map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-medium text-ink/70"
                      >
                        {g.name} · R{g.price}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
            {results.length === 0 && (
              <div className="card p-6 text-center text-sm text-ink/45">
                No registered shops match yet. Try a different search, or pan the map.
              </div>
            )}
          </div>
        </div>

        <div className="order-1 h-[420px] lg:sticky lg:top-24 lg:order-2 lg:h-[600px]">
          <ShopFinderMap
            shops={results.map((r) => r.shop)}
            center={{ lat: area.lat, lng: area.lng }}
            recenterTick={recenterTick}
            onArea={(lat, lng, radiusKm) => setArea({ lat, lng, radiusKm })}
            activeShopId={activeShopId}
            userLocation={userLocation}
          />
        </div>
      </div>
    </div>
  );
}
