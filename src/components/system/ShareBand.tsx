/* A whole, in parts: a 100% band whose unknown share is hatched, never
   coloured and never dropped. The legend beneath it is the accessible
   reading of the same numbers. */
export type BandPart = { key: string; n: number; color?: string; hatch?: boolean; label: string };

export function ShareBand({
  parts, height = 14, legend = true, night = false, total, className = "", ariaLabel,
}: {
  parts: BandPart[]; height?: number; legend?: boolean; night?: boolean; total?: number; className?: string; ariaLabel?: string;
}) {
  const T = total ?? parts.reduce((a, p) => a + p.n, 0);
  const pct = (n: number) => (T ? Math.round((n / T) * 1000) / 10 : 0);
  return (
    <div className={`sys-band ${night ? "is-night" : ""} ${className}`}>
      <div className="sys-band-bar" style={{ height }} role="img" aria-label={ariaLabel ?? parts.map((p) => `${p.label}: ${p.n.toLocaleString("en-IN")}`).join(", ")}>
        {parts.filter((p) => p.n > 0).map((p) => (
          <span key={p.key} className={p.hatch ? "is-hatch" : ""} style={{ flexGrow: p.n, background: p.hatch ? undefined : p.color }} title={`${p.label}: ${p.n.toLocaleString("en-IN")} (${pct(p.n)}%)`} />
        ))}
      </div>
      {legend && (
        <ul className="sys-band-legend">
          {parts.filter((p) => p.n > 0).map((p) => (
            <li key={p.key}>
              <i className={p.hatch ? "is-hatch" : ""} style={{ background: p.hatch ? undefined : p.color }} aria-hidden />
              <span>{p.label}</span>
              <b>{p.n.toLocaleString("en-IN")}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
