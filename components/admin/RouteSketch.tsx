"use client";

/**
 * A lightweight route drawing (no map tiles needed, works offline): the
 * wholesaler as a square, each shop as a numbered dot, one colour per trip.
 */
export const TRIP_COLOURS = ["#E8622C", "#1F8A5B", "#2563EB", "#9333EA", "#CA8A04"];

interface Pt {
  lat: number;
  lng: number;
}
interface SketchTrip {
  driverName: string;
  stops: (Pt & { shopName: string; township: string; status?: string })[];
}

export default function RouteSketch({ pickup, trips, height = 260 }: { pickup: Pt & { name: string }; trips: SketchTrip[]; height?: number }) {
  const all: Pt[] = [pickup, ...trips.flatMap((t) => t.stops)];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const W = 600;
  const H = 360;
  const pad = 36;
  const spanLng = Math.max(0.02, maxLng - minLng);
  const spanLat = Math.max(0.02, maxLat - minLat);
  const x = (lng: number) => pad + ((lng - minLng) / spanLng) * (W - pad * 2);
  const y = (lat: number) => pad + ((maxLat - lat) / spanLat) * (H - pad * 2);

  // township labels at the centre of their shops
  const towns = new Map<string, Pt[]>();
  trips.forEach((t) => t.stops.forEach((s) => towns.set(s.township, [...(towns.get(s.township) || []), s])));

  return (
    <figure className="overflow-hidden rounded-xl2 border border-ink/5 bg-sand-50">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full" role="img" aria-label="Route sketch: wholesaler and delivery stops">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0f172a" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {Array.from(towns.entries()).map(([name, pts]) => {
          const cx = pts.reduce((s, p) => s + x(p.lng), 0) / pts.length;
          const cy = pts.reduce((s, p) => s + y(p.lat), 0) / pts.length;
          return (
            <g key={name}>
              <circle cx={cx} cy={cy} r={34} fill="#0f172a" fillOpacity={0.04} />
              <text x={cx} y={cy - 38} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a" fillOpacity="0.45">
                {name}
              </text>
            </g>
          );
        })}
        {trips.map((t, ti) => {
          const c = TRIP_COLOURS[ti % TRIP_COLOURS.length];
          const pts = [pickup, ...t.stops].map((p) => `${x(p.lng)},${y(p.lat)}`).join(" ");
          return (
            <g key={ti}>
              <polyline points={pts} fill="none" stroke={c} strokeWidth={3} strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round" />
              {t.stops.map((s, i) => (
                <g key={i}>
                  <circle cx={x(s.lng)} cy={y(s.lat)} r={11} fill={s.status === "delivered" ? "#1F8A5B" : s.status === "failed" ? "#DC2626" : c} stroke="white" strokeWidth={2} />
                  <text x={x(s.lng)} y={y(s.lat) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
                    {i + 1}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        <rect x={x(pickup.lng) - 11} y={y(pickup.lat) - 11} width={22} height={22} rx={5} fill="#0f172a" stroke="white" strokeWidth={2} />
        <text x={x(pickup.lng)} y={y(pickup.lat) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
          W
        </text>
        <text x={x(pickup.lng)} y={y(pickup.lat) + 28} textAnchor="middle" fontSize="11" fill="#0f172a" fillOpacity="0.6">
          {pickup.name}
        </text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/5 px-3 py-2 text-[11px] text-ink/55">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-ink align-middle" /> W = wholesaler (pickup)
        </span>
        {trips.map((t, i) => (
          <span key={i}>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: TRIP_COLOURS[i % TRIP_COLOURS.length] }} />
            {t.driverName}
          </span>
        ))}
        <span>Stop order · not to scale</span>
      </figcaption>
    </figure>
  );
}
