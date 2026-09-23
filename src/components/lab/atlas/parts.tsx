import Link from "next/link";
import { LAB, coord, dateLabel, photo, type Sighting } from "../data";
import { contours, pathOf, projector, type Box } from "../geo";

const NAV = [
  { href: "/lab/atlas/landing", label: "Atlas" },
  { href: "/lab/atlas/home", label: "Your area" },
  { href: "/lab/atlas/map", label: "Field map" },
  { href: "/lab/atlas/ngo", label: "Organisations" },
];

export function Masthead({ over = false, current }: { over?: boolean; current?: string }) {
  return (
    <header className={`la-mast${over ? " over" : ""}`}>
      <Link href="/lab/atlas/landing" className="la-mark"><b>StrayPaw</b><span className="cap">The living field atlas</span></Link>
      <nav className="la-nav cap" aria-label="Atlas">
        {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}
      </nav>
    </header>
  );
}

/** A small plate of a city's terrain, drawn from its records. */
export function ContourSVG({
  points, box, width, height, stroke = "#0b1e3d", mark, levels = 8, bg,
}: {
  points: [number, number][]; box: Box; width: number; height: number; stroke?: string;
  mark?: { lng: number; lat: number; label?: string }; levels?: number; bg?: string;
}) {
  const fc = contours(points, box, { res: 0.004, sigma: 2.2, levels });
  const { p } = projector(box, width, height, 6);
  const m = mark ? p(mark.lng, mark.lat) : null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Terrain of recorded care">
      {bg && <rect width={width} height={height} fill={bg} />}
      {fc.features.map((f) => {
        const pr = f.properties as { l: number; of: number; index: boolean };
        return <path key={pr.l} d={pathOf((f.geometry as GeoJSON.MultiLineString).coordinates as [number, number][][], p)} fill="none" stroke={stroke} strokeOpacity={0.18 + (pr.l / pr.of) * 0.5} strokeWidth={pr.index ? 1 : 0.55} />;
      })}
      {m && (
        <g>
          <circle cx={m[0]} cy={m[1]} r={9} fill="none" stroke="#f05b40" strokeWidth={1.4} />
          <circle cx={m[0]} cy={m[1]} r={2.6} fill="#f05b40" />
          {mark?.label && <text x={m[0] + 14} y={m[1] + 4} fontFamily="var(--la-cond)" fontSize={11} fill={stroke}>{mark.label}</text>}
        </g>
      )}
    </svg>
  );
}

export const cbePoints = () => LAB.cbe.animals.map(([lng, lat]) => [lng, lat] as [number, number]);

export function Fig({ s, n, height, sizes = 480 }: { s: Sighting; n: number; height: number; sizes?: number }) {
  return (
    <figure className="la-fig">
      <img src={photo(s.photo, sizes)} alt={`A street dog photographed in ${s.zone}`} style={{ height }} loading="lazy" />
      <figcaption>
        <b>Fig. {n}</b>
        <span>{s.zone}, {s.city}</span>
        <small>{coord(s.lat, s.lng)} · {dateLabel(s.at)}</small>
      </figcaption>
    </figure>
  );
}
