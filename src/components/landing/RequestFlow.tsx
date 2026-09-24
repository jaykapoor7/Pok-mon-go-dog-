import { HatchDef } from "@/components/system/Hatch";
import { CLOSURE_META, type ClosureReason, type StatusClass } from "@/lib/register/taxonomy";

/* ════════════════════════════════════════════════════════════════════
   Where the requests went, drawn as a transit line.

   Every request for help on the register enters as one trunk. Where it
   becomes a case the line splits, like a route map, and each branch is as
   thick as the number of requests that took it: most close, some are
   still open, some go to another organisation — and one in five closes
   without field action. That branch splits again into the reasons written
   in the progress notes, and the largest named one is drawn in flame:
   the animal could not be found.

   On a phone the same numbers are an indented tree of proportional bars,
   because a wide diagram shrunk to 390px is a picture of a diagram.
   ════════════════════════════════════════════════════════════════════ */

type Branch = { key: string; n: number; label: string; tone: string; hatch?: boolean; big?: boolean };

const TONE = {
  ink: "var(--sp-ink)",
  closed: "var(--sp-blue)",
  open: "var(--sp-flame)",
  other: "#8fa9e8",
  none: "#6a7a90",
  reason: "#8795a8",
  lost: "var(--sp-flame)",
};

export function RequestFlow({ requests, status, reasons, noActionTotal }: {
  requests: number;
  status: Record<StatusClass, number>;
  reasons: { reason: string; n: number }[];
  noActionTotal: number;
}) {
  const open = (status.open ?? 0) + (status.in_progress ?? 0);
  const branches: Branch[] = [
    { key: "other", n: status.other_ngo ?? 0, label: "Handed to another organisation", tone: TONE.other },
    { key: "open", n: open, label: "Still open", tone: TONE.open },
    { key: "closed", n: status.closed ?? 0, label: "Closed, work done", tone: TONE.closed, big: true },
    { key: "none", n: noActionTotal, label: "Closed without field action", tone: TONE.none, big: true },
    { key: "unknown", n: status.unknown ?? 0, label: "Status never recorded", tone: TONE.reason, hatch: true },
  ].filter((b) => b.n > 0);
  const subs: Branch[] = reasons.filter((r) => r.n > 0).map((r) => ({
    key: r.reason,
    n: r.n,
    label: CLOSURE_META[r.reason as ClosureReason]?.label ?? r.reason,
    tone: r.reason === "could_not_locate" ? TONE.lost : TONE.reason,
    hatch: r.reason === "unspecified",
  }));
  const lost = reasons.find((r) => r.reason === "could_not_locate")?.n ?? 0;

  /* ── the diagram (u along the flow, v across it) ─────────────────── */
  const W = 1000, V0 = 190;
  const TRUNK = 76;
  const sc = TRUNK / Math.max(1, requests);
  const w = (n: number) => Math.max(1.6, n * sc);
  const U_SPLIT = 250, U_BEND = 360;
  const targets: Record<string, number> = { other: -150, open: -100, closed: -30, none: 78, unknown: 250 };
  const ends: Record<string, number> = { other: 620, open: 620, closed: 700, none: 470, unknown: 620 };

  let acc = -TRUNK / 2;
  const laid = branches.map((b) => {
    const th = b.n * sc;
    const v0 = acc + th / 2;
    acc += th;
    return { ...b, v0, v1: targets[b.key] ?? 0, end: ends[b.key] ?? 620, th: w(b.n) };
  });
  const none = laid.find((b) => b.key === "none");
  const U_FAN = 470, U_FAN_BEND = 560, U_FAN_END = 690;
  let accR = none ? none.v1 - none.th / 2 : 0;
  const fanned = none ? subs.map((s, i) => {
    const th = s.n * sc;
    const v0 = accR + th / 2;
    accR += th;
    return { ...s, v0, v1: 128 + i * 40, th: w(s.n) };
  }) : [];

  const lastLane = fanned.length ? fanned[fanned.length - 1].v1 : 120;
  const H = V0 + lastLane + 40;
  const curve = (u0: number, v0: number, u1: number, v1: number, uEnd: number) =>
    `M${u0} ${V0 + v0}C${(u0 + u1) / 2} ${V0 + v0} ${(u0 + u1) / 2} ${V0 + v1} ${u1} ${V0 + v1}L${uEnd} ${V0 + v1}`;
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const share = (n: number) => `${Math.round((n / Math.max(1, requests)) * 100)}%`;

  return (
    <div className="ld-flow">
      <svg className="ld-flow-svg" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Of ${fmt(requests)} requests for help: ${branches.map((b) => `${fmt(b.n)} ${b.label.toLowerCase()}`).join("; ")}. Of those closed without field action: ${subs.map((s) => `${fmt(s.n)} ${s.label.toLowerCase()}`).join("; ")}.`}>
        <defs><HatchDef id="ld-flow-hatch" /></defs>
        {/* trunk */}
        <path d={`M0 ${V0}L${U_SPLIT} ${V0}`} className="ld-flow-line" style={{ stroke: TONE.ink, strokeWidth: TRUNK }} />
        <text x={0} y={V0 - TRUNK / 2 - 30} className="ld-flow-num is-big">{fmt(requests)}</text>
        <text x={0} y={V0 - TRUNK / 2 - 12} className="ld-flow-label">requests for help</text>
        {/* branches */}
        {laid.map((b) => (
          <g key={b.key} className={`ld-flow-branch is-${b.key}`}>
            <path d={curve(U_SPLIT, b.v0, U_BEND, b.v1, b.end)} className="ld-flow-line" style={{ stroke: b.hatch ? "url(#ld-flow-hatch)" : b.tone, strokeWidth: b.th }} />
            {b.key !== "none" && (
              <>
                {b.th < 12
                  ? <circle cx={b.end} cy={V0 + b.v1} r={4.5} className="ld-flow-stop" style={{ stroke: b.tone }} />
                  : <path d={`M${b.end} ${V0 + b.v1 - b.th / 2 - 4}V${V0 + b.v1 + b.th / 2 + 4}`} className="ld-flow-terminal" />}
                <text x={b.end + 16} y={V0 + b.v1 + (b.big ? 0 : 1)} className={`ld-flow-num ${b.big ? "is-big" : ""}`}>{fmt(b.n)}</text>
                <text x={b.end + 16} y={V0 + b.v1 + (b.big ? 20 : 18)} className="ld-flow-label">{b.label} · {share(b.n)}</text>
              </>
            )}
          </g>
        ))}
        {/* the no-action branch fans into its reasons */}
        {none && (
          <g>
            <text x={U_BEND + 6} y={V0 + none.v1 - none.th / 2 - 10} className="ld-flow-label is-strong">{fmt(none.n)} closed without field action · {share(none.n)}</text>
            {fanned.map((s) => (
              <g key={s.key} className={`ld-flow-reason ${s.key === "could_not_locate" ? "is-lost" : ""}`}>
                <path d={curve(U_FAN, s.v0, U_FAN_BEND, s.v1, U_FAN_END)} className="ld-flow-line" style={{ stroke: s.hatch ? "url(#ld-flow-hatch)" : s.tone, strokeWidth: s.th }} />
                <circle cx={U_FAN_END} cy={V0 + s.v1} r={Math.max(3.5, s.th / 2 + 1.5)} className="ld-flow-stop" style={{ stroke: s.hatch ? TONE.reason : s.tone }} />
                <text x={U_FAN_END + 14} y={V0 + s.v1 + 4.5} className="ld-flow-reason-text">
                  <tspan className="ld-flow-num">{fmt(s.n)}</tspan>
                  <tspan dx="8">{s.label}</tspan>
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* phone: the same numbers as a tree of proportional bars */}
      <ol className="ld-flow-tree" aria-hidden>
        <li className="is-root"><b className="sys-mono">{fmt(requests)}</b><span>requests for help</span></li>
        {branches.map((b) => (
          <li key={b.key} className={`is-${b.key}`}>
            <i style={{ width: `${Math.max(1.5, (b.n / requests) * 100)}%`, background: b.hatch ? "var(--sp-hatch)" : b.tone }} />
            <b className="sys-mono">{fmt(b.n)}</b><span>{b.label}</span>
            {b.key === "none" && (
              <ol>
                {subs.map((s) => (
                  <li key={s.key} className={s.key === "could_not_locate" ? "is-lost" : ""}>
                    <i style={{ width: `${Math.max(1.5, (s.n / Math.max(1, noActionTotal)) * 100)}%`, background: s.hatch ? "var(--sp-hatch)" : s.tone }} />
                    <b className="sys-mono">{fmt(s.n)}</b><span>{s.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>

      {lost > 0 && (
        <p className="ld-flow-callout">
          <b>{fmt(lost)} times</b> the animal could not be found or caught — the largest reason a request never became a rescue.
          A precise place, a photograph and a second sighting are exactly what a StrayPaw report carries.
        </p>
      )}
    </div>
  );
}
