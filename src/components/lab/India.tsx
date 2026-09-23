/* The register across India, as a graticule locator.

   Cities are placed by latitude and longitude on a 4° graticule (70–86°E, 8–32°N) and sized
   by the animals on record there. No national outline is drawn: the frame
   is the graticule itself. Each direction supplies its own colours and
   type; the geometry is shared. */

import { CITIES, SAMPLE, fmt } from "./data";

export function IndiaLocator({ width = 260, ink = "currentColor", accent = "#f05b40", faint = 0.18, font = "inherit", size = 11, sample = true }: {
  width?: number; ink?: string; accent?: string; faint?: number; font?: string; size?: number; sample?: boolean;
}) {
  const box = [70, 8, 86, 32]; // lng0, lat0, lng1, lat1
  const k = Math.cos((20 * Math.PI) / 180);
  const s = width / ((box[2] - box[0]) * k);
  const height = Math.round((box[3] - box[1]) * s);
  const p = (lng: number, lat: number) => [(lng - box[0]) * k * s, height - (lat - box[1]) * s];
  const max = Math.max(...CITIES.map((c) => c.animals));
  const r = (n: number) => 3.5 + Math.sqrt(n / max) * 9;
  return (
    <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} width="100%" style={{ maxWidth: width, display: "block", overflow: "visible" }} role="img"
      aria-label={`Animals on the StrayPaw register by city: ${CITIES.map((c) => `${c.city} ${c.animals}`).join(", ")}`}>
      <g stroke={ink} strokeOpacity={faint} strokeWidth="1" fill="none">
        {[74, 78, 82].map((l) => { const [x] = p(l, 0); return <path key={l} d={`M${x} 0V${height}`} />; })}
        {[12, 16, 20, 24, 28].map((l) => { const [, y] = p(0, l); return <path key={l} d={`M0 ${y}H${width}`} />; })}
        <rect x="0" y="0" width={width} height={height} strokeOpacity={faint * 2} />
      </g>
      <g fill={ink} fillOpacity=".6" style={{ fontFamily: font, fontSize: size - 2 }}>
        {[12, 20, 28].map((l) => <text key={l} x={3} y={p(0, l)[1] - 3}>{l}°N</text>)}
      </g>
      {CITIES.map((c) => {
        const [x, y] = p(c.lng, c.lat);
        const isS = sample && c.city === SAMPLE;
        // Labels sit to the east; the two southern cities are close, so they are stacked apart.
        const dy = c.city === SAMPLE ? 12 : c.lat < 20 ? -8 : 0;
        const lx = x + r(c.animals) + 6;
        return (
          <g key={c.city}>
            <circle cx={x} cy={y} r={r(c.animals)} fill={isS ? accent : ink} fillOpacity={isS ? 0.85 : 0.75} />
            <text x={lx} y={y + 4 + dy} fill={ink} style={{ fontFamily: font, fontSize: size, fontWeight: 600 }}>{c.city}</text>
            <text x={lx} y={y + 4 + dy + size + 2} fill={ink} fillOpacity=".65" style={{ fontFamily: font, fontSize: size - 1 }}>{fmt(c.animals)}{isS ? " · sample" : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}
