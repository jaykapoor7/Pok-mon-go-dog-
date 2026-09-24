import Link from "next/link";

/* ════════════════════════════════════════════════════════════════════
   The register across India, as an atlas inset.

   Cities are placed by latitude and longitude on a graticule and sized by
   the animals on the record there. The sample city the plate shows is
   marked as the sample. One real animal, photographed by a resident, is
   pinned to the city she lives in — the photograph and the place in one
   composition, rather than a picture beside a map.

   No national outline is drawn: the frame is the graticule itself, which
   keeps boundary depiction out of a decorative inset.
   ════════════════════════════════════════════════════════════════════ */

type City = { name: string; state: string; lng: number; lat: number; animals: number };

export function IndiaInset({ cities, sample, pinky, photoCount }: {
  cities: City[];
  sample: string;
  pinky: { id: string; straypaw_id: string | null } | null;
  photoCount: number;
}) {
  const W = 230, H = 250;
  const box = [68, 7, 92, 33];
  const k = Math.cos((20 * Math.PI) / 180);
  const s = Math.min(W / ((box[2] - box[0]) * k), H / (box[3] - box[1]));
  const p = (lng: number, lat: number): [number, number] => [(lng - box[0]) * k * s, H - (lat - box[1]) * s];
  const max = Math.max(1, ...cities.map((c) => c.animals));
  const r = (n: number) => 2.6 + Math.sqrt(n / max) * 11;
  // Nearby cities of the same state collapse visually; label only the ones that carry weight.
  // Label the cities a reader is looking for; the smaller districts stay dots
  // and are counted in the caption, rather than printed on top of each other.
  const labelled = new Set(cities.filter((c) => c.name === sample || c.name === "Delhi" || c.name === "Bengaluru").map((c) => c.name));
  const others = cities.filter((c) => !labelled.has(c.name));
  const blr = cities.find((c) => c.name === "Bengaluru");
  const pinkyAt = blr ? p(blr.lng, blr.lat) : null;

  return (
    <figure className="ld-inset" style={{ ["--pin-y" as string]: pinkyAt ? `${((pinkyAt[1] + 4) * 230) / (H + 8)}px` : "50%" }}>
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label={`Animals on the StrayPaw register by city: ${cities.map((c) => `${c.name} ${c.animals}`).join(", ")}`}>
        <g className="ld-inset-grid">
          {[72, 76, 80, 84, 88].map((l) => { const [x] = p(l, 0); return <path key={`x${l}`} d={`M${x.toFixed(1)} 0V${H}`} />; })}
          {[10, 14, 18, 22, 26, 30].map((l) => { const [, y] = p(0, l); return <path key={`y${l}`} d={`M0 ${y.toFixed(1)}H${W}`} />; })}
          <rect x="0" y="0" width={W} height={H} />
        </g>
        <g className="ld-inset-lat">
          {[10, 20, 30].map((l) => <text key={l} x={3} y={p(0, l)[1] - 3}>{l}°N</text>)}
        </g>
        {pinkyAt && pinky && <path className="ld-inset-leader" d={`M${pinkyAt[0].toFixed(1)} ${pinkyAt[1].toFixed(1)}L${(W + 4).toFixed(1)} ${pinkyAt[1].toFixed(1)}`} />}
        {cities.map((c) => {
          const [x, y] = p(c.lng, c.lat);
          const isSample = c.name === sample;
          return (
            <g key={c.name} className={isSample ? "is-sample" : ""}>
              <circle cx={x} cy={y} r={r(c.animals)} />
              {labelled.has(c.name) && (
                <text x={x + r(c.animals) + 5} y={y + (c.name === sample ? 10 : c.name === "Bengaluru" ? -9 : 1)}>
                  <tspan className="ld-inset-name">{c.name}</tspan>
                  <tspan className="ld-inset-n" x={x + r(c.animals) + 5} dy="12">{c.animals.toLocaleString("en-IN")}{isSample ? " · sample city" : ""}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="ld-pinky">
        {pinky ? (
          <Link href={`/dog/${pinky.id}`} className="ld-pinky-card">
            {/* A local asset, so the first photograph on the site never waits on an optimiser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pinky-bengaluru.jpg" alt="Pinky, a community dog reported in Bengaluru" width={160} height={152} loading="eager" />
            <span>
              <b>Pinky</b>
              <small className="sys-mono">{pinky.straypaw_id ?? "Bengaluru"}</small>
              <small>Bengaluru, Karnataka</small>
            </span>
          </Link>
        ) : (
          <span className="ld-pinky-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pinky-bengaluru.jpg" alt="Pinky, a community dog reported in Bengaluru" width={160} height={152} loading="eager" />
            <span><b>Pinky</b><small>Bengaluru, Karnataka</small></span>
          </span>
        )}
        <small className="ld-pinky-note">One of {photoCount.toLocaleString("en-IN")} animals a resident has photographed onto the record.</small>
      </figcaption>
      {others.length > 0 && (
        <p className="ld-inset-more">and {others.length} more district{others.length === 1 ? "" : "s"}, mostly around {others.slice().sort((a, b) => b.animals - a.animals)[0].name}</p>
      )}
    </figure>
  );
}
