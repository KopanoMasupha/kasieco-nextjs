import L from "leaflet";

// react-leaflet / webpack can't resolve the default marker image paths —
// point them at the CDN copies that ship with the same leaflet version.
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 30px; height: 30px; border-radius: 999px 999px 999px 2px;
      background:${color}; transform: rotate(45deg);
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -28],
  });
}

export const shopIcon = pin("#171310");
export const activeShopIcon = pin("#E85D2B");
export const meIcon = pin("#2F6D4F");
