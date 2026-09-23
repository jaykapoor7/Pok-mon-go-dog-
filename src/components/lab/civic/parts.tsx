import Link from "next/link";
import { hexbin, projector, type Box } from "../geo";

const NAV = [
  { href: "/lab/civic/landing", label: "Register" },
  { href: "/lab/civic/home", label: "Your ward" },
  { href: "/lab/civic/map", label: "Coverage" },
  { href: "/lab/civic/ngo", label: "Operations" },
];

export function Band({ current, code }: { current?: string; code?: string }) {
  return (
    <header className="ci-band">
      <Link href="/lab/civic/landing" className="mark"><i aria-hidden />STRAYPAW</Link>
      <nav aria-label="Register">{NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}</nav>
      <span className="code">{code ?? "PUBLIC REGISTER · IN"}</span>
    </header>
  );
}

/** Hex coverage drawn to an SVG: the civic unit of area. */
export function HexSVG<T>({
  items, ll, box, width, height, sizeKm, fill, highlight, stroke = "#0b1e3d",
}: {
  items: T[]; ll: (t: T) => [number, number]; box: Box; width: number; height: number; sizeKm: number;
  fill: (n: number, items: T[]) => string; highlight?: [number, number]; stroke?: string;
}) {
  const lat0 = (box[1] + box[3]) / 2;
  const hexes = hexbin(items, ll, lat0, sizeKm);
  const { p } = projector(box, width, height, 8);
  const hl = highlight ? hexbin([highlight], (x) => x, lat0, sizeKm)[0]?.key : null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Coverage by hexagon">
      {hexes.map((h) => (
        <polygon key={h.key} points={h.ring.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill={h.key === hl ? "#f05b40" : fill(h.items.length, h.items)} stroke={h.key === hl ? stroke : "rgba(11,30,61,.25)"} strokeWidth={h.key === hl ? 2 : 0.6} />
      ))}
    </svg>
  );
}

export const ramp = (n: number, max: number) => {
  const t = Math.min(1, Math.log1p(n) / Math.log1p(max));
  const stops = ["#d6e1f6", "#a9c0ee", "#6f95e2", "#3f6fd6", "#2457ce", "#1a3f99"];
  return stops[Math.min(stops.length - 1, Math.floor(t * (stops.length - 1) + 0.0001))];
};
