import Link from "next/link";

const NAV = [
  { href: "/lab/journal/landing", label: "The journal" },
  { href: "/lab/journal/home", label: "Today's page" },
  { href: "/lab/journal/map", label: "Survey sheets" },
  { href: "/lab/journal/ngo", label: "Duty log" },
];

export function Mast({ current, right }: { current?: string; right?: string }) {
  return (
    <header className="fj-mast">
      <Link href="/lab/journal/landing"><b>STRAYPAW · FIELD JOURNAL</b></Link>
      <nav aria-label="Journal">{NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}</nav>
      {right && <span className="caps" style={{ color: "var(--fj-grey)" }}>{right}</span>}
    </header>
  );
}

export function Stamp({ children, r = -3, blue, small, land, delay, style }: {
  children: React.ReactNode; r?: number; blue?: boolean; small?: boolean; land?: boolean; delay?: number; style?: React.CSSProperties;
}) {
  return (
    <span className={`fj-stamp${blue ? " blue" : ""}${small ? " small" : ""}${land ? " land" : ""}`}
      style={{ ["--r" as string]: `${r}deg`, animationDelay: delay != null ? `${delay}s` : undefined, ...style }}>{children}</span>
  );
}

/** Tally marks, in gates of five, for counts small enough to be counted by hand. */
export function Tally({ n, color = "var(--fj-pen)" }: { n: number; color?: string }) {
  const gates = Math.floor(n / 5), rest = n % 5, w = gates * 44 + rest * 9 + 4;
  const wob = (i: number) => ((i * 37) % 7) / 7 - 0.5;
  const marks: React.ReactNode[] = [];
  let x = 2, i = 0;
  for (let g = 0; g < gates; g++) {
    for (let k = 0; k < 4; k++) { marks.push(<path key={i} d={`M${x + k * 8 + wob(i)} 4 L${x + k * 8 - wob(i)} 40`} />); i++; }
    marks.push(<path key={i} d={`M${x - 3} 34 L${x + 30} 10`} />); i++;
    x += 44;
  }
  for (let k = 0; k < rest; k++) { marks.push(<path key={i} d={`M${x + k * 9 + wob(i)} 4 L${x + k * 9 - wob(i)} 40`} />); i++; }
  if (!n) return <svg width="60" height="44" aria-hidden><path d="M4 24 C 18 20, 36 28, 56 22" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>;
  return <svg width={w} height="44" aria-hidden><g stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none">{marks}</g></svg>;
}

/** A bar drawn with a pen: filled for what is recorded, hatched for what is not. */
export function PenBar({ of, parts }: { of: number; parts: { n: number; color: string }[] }) {
  let x = 0;
  const id = `h${of}${parts.map((p) => p.n).join("-")}`;
  return (
    <div className="fj-penbar">
      <svg viewBox="0 0 1000 18" preserveAspectRatio="none" aria-hidden>
        <defs><pattern id={id} width="8" height="18" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><path d="M0 0V18" stroke="rgba(26,36,55,.28)" strokeWidth="1.4" /></pattern></defs>
        <rect x="0" y="2" width="1000" height="14" fill={`url(#${id})`} />
        {parts.map((p, i) => { const w = (p.n / of) * 1000; const r = <rect key={i} x={x} y="1" width={Math.max(w, p.n ? 3 : 0)} height="16" fill={p.color} />; x += w; return r; })}
        <rect x="0.5" y="1.5" width="999" height="15" fill="none" stroke="var(--fj-ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
