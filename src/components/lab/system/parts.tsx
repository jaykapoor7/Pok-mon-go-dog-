import Link from "next/link";
import { projector, type Box } from "../geo";

const NAV = [
  { href: "/lab/system/home", label: "Nearby" },
  { href: "/lab/system/spatial", label: "Map" },
  { href: "/lab/system/coverage", label: "Coverage" },
  { href: "/lab/system/ngo", label: "Operations" },
  { href: "/lab/system/organisation", label: "Organisations" },
  { href: "/lab/system/analytics", label: "Analytics" },
];

/** The mark: one cell of the map with one record in it. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 1.8 20.8 6.9v10.2L12 22.2 3.2 17.1V6.9Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" fill="#f05b40" />
    </svg>
  );
}

/** Global navigation. The crumbs are the scale ladder: where on the map this screen stands. */
export function Band({ current, crumbs = [], over }: { current?: string; crumbs?: string[]; over?: boolean }) {
  return (
    <>
      <header className={`sx-band${over ? " over" : ""}`}>
        <Link href="/lab/system/landing" className="sx-mark" aria-label="StrayPaw"><Mark />StrayPaw</Link>
        <div className="sx-crumbs" aria-label="Scale">
          {crumbs.map((c, i) => <span key={c + i} style={{ display: "contents" }}>{i > 0 && <i>›</i>}{i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}</span>)}
        </div>
        <nav className="sx-nav" aria-label="StrayPaw">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}
          <Link href="/lab/system/home#report" className="sx-report">Report an animal</Link>
        </nav>
      </header>
      <Tabs current={current} />
    </>
  );
}

const I = {
  near: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  map: <path d="M12 2.5 20 7.2v9.6L12 21.5 4 16.8V7.2Z M12 2.5V21.5 M4 7.2l16 9.6 M20 7.2 4 16.8" />,
  plus: <path d="M12 5v14M5 12h14" />,
  work: <path d="M4 7h16v12H4Z M9 7V4h6v3 M4 12h16" />,
  rec: <path d="M6 3h9l3 3v15H6Z M9 9h6 M9 13h6 M9 17h4" />,
};

/** Phone navigation: five places a field worker goes with a thumb. */
export function Tabs({ current }: { current?: string }) {
  const t = [
    { href: "/lab/system/home", label: "Nearby", i: I.near },
    { href: "/lab/system/spatial", label: "Map", i: I.map },
    { href: "/lab/system/home#report", label: "Report", i: I.plus, report: true },
    { href: "/lab/system/ngo", label: "Work", i: I.work },
    { href: "/lab/system/animal", label: "Records", i: I.rec },
  ];
  return (
    <nav className="sx-tabs" aria-label="StrayPaw">
      {t.map((x) => (
        <Link key={x.label} href={x.href} className={x.report ? "report" : ""} aria-current={current === x.href ? "page" : undefined}>
          {x.report
            ? <span className="dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">{x.i}</svg></span>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">{x.i}</svg>}
          {x.label}
        </Link>
      ))}
    </nav>
  );
}

/** Sequential blue ramp for recorded care; stepped so a legend can name each step. */
export const RAMP = ["#e6ddcf", "#c8d4f0", "#93aee9", "#5b82dc", "#2457ce", "#16398f"];
export const rampOf = (v: number, steps: number[]) => { let i = 0; while (i < steps.length && v > steps[i]) i++; return RAMP[Math.min(i + 1, RAMP.length - 1)]; };

/** A proportional band: parts of a whole, with the unrecorded share hatched rather than coloured. */
export function Band100({ parts, height = 14, total }: { parts: { n: number; fill: string; hatch?: boolean; label?: string }[]; height?: number; total?: number }) {
  const T = total ?? parts.reduce((a, p) => a + p.n, 0);
  let x = 0;
  return (
    <svg viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label={parts.filter((p) => p.n).map((p) => `${p.label ?? ""} ${p.n}`).join(", ")} style={{ display: "block" }}>
      <defs><pattern id={`hb${height}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="none" /><path d="M0 0V6" stroke="rgba(11,30,61,.35)" strokeWidth="1.6" /></pattern></defs>
      {parts.map((p, i) => {
        const w = T ? (p.n / T) * 1000 : 0;
        const r = <rect key={i} x={x} y={0} width={Math.max(0, w - (w > 3 ? 1.5 : 0))} height={height} fill={p.hatch ? `url(#hb${height})` : p.fill} />;
        x += w;
        return r;
      })}
    </svg>
  );
}

/** A small line of a series, with its last value marked. */
export function Spark({ values, w = 96, h = 24, color = "var(--sx-blue)", fill }: { values: number[]; w?: number; h?: number; color?: string; fill?: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (w - 4) + 2, h - 2 - (v / max) * (h - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={`${d}L${last[0]} ${h}L2 ${h}Z`} fill={fill} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

/** Hex cells drawn to SVG: the same unit as the live map, for places the map would be too heavy. */
export function CellSVG({ cells, box, width, height, fill, stroke = "rgba(11,30,61,.18)", mark, pad = 6, label }: {
  cells: { key: string; ring: [number, number][] }[]; box: Box; width: number; height: number;
  fill: (key: string) => string; stroke?: string; mark?: { lng: number; lat: number; r?: number; color?: string }[]; pad?: number; label: string;
}) {
  const { p } = projector(box, width, height, pad);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label} style={{ display: "block" }}>
      {cells.map((c) => (
        <polygon key={c.key} points={c.ring.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(",")).join(" ")} fill={fill(c.key)} stroke={stroke} strokeWidth="0.6" />
      ))}
      {mark?.map((m, i) => { const [x, y] = p(m.lng, m.lat); return <circle key={i} cx={x} cy={y} r={m.r ?? 5} fill="none" stroke={m.color ?? "#f05b40"} strokeWidth="2.2" />; })}
    </svg>
  );
}
