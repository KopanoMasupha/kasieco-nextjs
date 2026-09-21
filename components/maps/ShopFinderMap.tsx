"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { shopIcon, activeShopIcon, meIcon } from "./leafletIcons";
import { Shop } from "@/lib/types";
import Link from "next/link";

function AreaReporter({
  onArea,
}: {
  onArea: (lat: number, lng: number, radiusKm: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => report(),
  });

  function report() {
    const center = map.getCenter();
    const bounds = map.getBounds();
    const radiusKm = map.distance(center, bounds.getNorthEast()) / 1000;
    onArea(center.lat, center.lng, radiusKm);
  }

  useEffect(() => {
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RecenterOnChange({ lat, lng, tick }: { lat: number; lng: number; tick: number }) {
  const map = useMap();
  const last = useRef(tick);
  useEffect(() => {
    if (tick !== last.current) {
      map.setView([lat, lng], map.getZoom());
      last.current = tick;
    }
  }, [tick, lat, lng, map]);
  return null;
}

export default function ShopFinderMap({
  shops,
  center,
  recenterTick,
  onArea,
  activeShopId,
  userLocation,
}: {
  shops: Shop[];
  center: { lat: number; lng: number };
  recenterTick: number;
  onArea: (lat: number, lng: number, radiusKm: number) => void;
  activeShopId?: string;
  userLocation?: { lat: number; lng: number } | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl2">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AreaReporter onArea={onArea} />
        <RecenterOnChange lat={center.lat} lng={center.lng} tick={recenterTick} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={meIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {shops.map((shop) => (
          <Marker
            key={shop.id}
            position={[shop.lat, shop.lng]}
            icon={shop.id === activeShopId ? activeShopIcon : shopIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{shop.name}</p>
                <p className="text-xs text-ink/60">{shop.township}</p>
                <Link
                  href={`/consumer/shop/${shop.id}`}
                  className="mt-1 inline-block text-xs font-semibold text-ember-dark underline"
                >
                  View shop
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
