"use client";

import { useCallback, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { meIcon } from "./leafletIcons";
import { Crosshair } from "lucide-react";

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const done = useRef(false);
  if (!done.current) {
    map.setView([lat, lng], map.getZoom());
    done.current = true;
  }
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [flyKey, setFlyKey] = useState(0);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setFlyKey((k) => k + 1);
      },
      () => {
        // permission denied or unavailable — silently keep current pin
      }
    );
  }, [onChange]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl2">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[lat, lng]}
          draggable
          icon={meIcon}
          eventHandlers={{
            dragend: (e) => {
              const m = e.target;
              const pos = m.getLatLng();
              onChange(pos.lat, pos.lng);
            },
          }}
        />
        <ClickHandler onPick={onChange} />
        <FlyTo key={flyKey} lat={lat} lng={lng} />
      </MapContainer>

      <button
        type="button"
        onClick={useMyLocation}
        className="absolute bottom-3 right-3 z-[400] flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold shadow-md hover:bg-sand-50"
      >
        <Crosshair size={14} className="text-ember" />
        Use my location
      </button>
      <div className="absolute left-3 top-3 z-[400] rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-ink/60 shadow-sm">
        Click the map or drag the pin
      </div>
    </div>
  );
}
