"use client";

/* ════════════════════════════════════════════════════════════════════
   The case clock: one case's life on one line.

   Reported on the left, today (or the close) on the right. Everything a
   person recorded sits on the line where it happened — the first field
   action, each entry in the history, each follow-up below the line (done,
   missed, still due). The stretch since anyone last touched an open case
   is hatched: that silence is the thing a paragraph of history hides and
   the reason a case ends up in review. A closing date the import had to
   assume is drawn hollow, because it is not a date anybody recorded.
   ════════════════════════════════════════════════════════════════════ */

import { HatchDef } from "@/components/system/Hatch";
import { useWidth } from "@/components/viz/useWidth";
import type { CaseUpdate } from "@/lib/types";
import type { CaseFollowupRow } from "@/lib/case-file";

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (t: number) => { const d = new Date(t); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const span = (days: number) =>
  days >= 365 ? `${(days / 365).toFixed(days >= 730 ? 0 : 1)} ${days >= 730 ? "years" : "year"}` : days >= 60 ? `${Math.round(days / 30)} months` : days === 1 ? "1 day" : `${days} days`;

export type ClockInput = {
  opened: string;
  firstAction: string | null;
  lastActivity: string | null;
  open: boolean;
  closedAt: string | null;
  /** How the close date is known: recorded by a person, derived from the workbook, or assumed by the import. */
  closedHow: "recorded" | "derived" | "assumed" | "reviewed" | null;
  closeLabel: string;
  updates: CaseUpdate[];
  followups: CaseFollowupRow[];
};

export function CaseClock(p: ClockInput) {
  const [ref, w] = useWidth<HTMLDivElement>(760);
  const now = Date.now();
  const t0 = Date.parse(p.opened);
  const tClose = p.closedAt ? Date.parse(p.closedAt) : null;
  const futureDue = p.followups.filter((f) => f.status === "upcoming").map((f) => Date.parse(f.due_at)).filter((t) => t > now);
  // The axis runs to whatever was last recorded: a follow-up or a note after
  // the close still belongs on the line, and so does a follow-up not yet due.
  const marks = [...p.updates.map((u) => Date.parse(u.created_at)), ...p.followups.map((f) => Date.parse(f.completed_at ?? f.due_at))].filter((t) => Number.isFinite(t) && t <= now);
  const tEnd = Math.max(p.open ? now : tClose ?? now, ...marks, ...futureDue, t0 + DAY);
  const phone = w < 560;
  const padL = phone ? 14 : 22, padR = phone ? 14 : 22, H = 150, yLine = 64;
  const x = (t: number) => padL + ((Math.min(Math.max(t, t0), tEnd) - t0) / (tEnd - t0)) * (w - padL - padR);

  const last = p.lastActivity ? Date.parse(p.lastActivity) : null;
  const quietFrom = p.open ? Math.max(t0, last ?? t0) : null;
  const quietDays = quietFrom != null ? Math.floor((now - quietFrom) / DAY) : 0;
  const quiet = p.open && quietDays > 30;
  const lineEnd = p.open ? now : tClose ?? t0;
  const first = p.firstAction ? Date.parse(p.firstAction) : null;
  const firstDays = first != null ? Math.max(0, Math.round((first - t0) / DAY)) : null;

  // Axis ticks: years for a long case, months for a short one.
  const ticks: { x: number; label: string }[] = [];
  const years = (tEnd - t0) / DAY > 540;
  const d0 = new Date(t0);
  for (let d = new Date(Date.UTC(d0.getUTCFullYear(), years ? 12 : d0.getUTCMonth() + 1, 1)); +d < tEnd; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (years ? 12 : (tEnd - t0) / DAY > 200 ? 3 : 1), 1))) {
    ticks.push({ x: x(+d), label: years || d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()] });
  }
  const minGap = phone ? 34 : 44;
  const shown = ticks.filter((t, i) => t.x - x(t0) > minGap && x(tEnd) - t.x > minGap && (i === 0 || t.x - ticks[i - 1].x > minGap / 1.5));

  const hist = p.updates.filter((u) => u.type !== "created");
  const openedLabel = `Reported ${short(t0)}`;
  const endX = x(lineEnd);
  const endAnchor = endX > w - 120 ? "end" : "start";

  return (
    <figure className="ck" ref={ref}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`The case from ${short(t0)} to ${p.open ? "today" : p.closedAt ? short(tClose!) : "its close"}.`}>
        <defs><HatchDef id="ck-hatch" /></defs>

        {/* axis */}
        <line className="ck-axis" x1={padL} x2={w - padR} y1={H - 26} y2={H - 26} />
        {shown.map((t) => (
          <g key={t.x}>
            <line className="ck-tick" x1={t.x} x2={t.x} y1={H - 30} y2={H - 22} />
            <text className="ck-tlab" x={t.x} y={H - 8} textAnchor="middle">{t.label}</text>
          </g>
        ))}

        {/* the life of the case */}
        <line className="ck-life" x1={x(t0)} x2={x(quiet ? quietFrom! : lineEnd)} y1={yLine} y2={yLine} />
        {quiet && (
          <g>
            <rect x={x(quietFrom!)} y={yLine - 9} width={Math.max(2, x(now) - x(quietFrom!))} height={18} fill="url(#ck-hatch)" className="ck-quiet" />
            <line className="ck-quiet-edge" x1={x(quietFrom!)} x2={x(now)} y1={yLine} y2={yLine} />
          </g>
        )}

        {/* entries in the history */}
        {hist.map((u) => (
          <line key={u.id} className={`ck-entry ${u.type === "note" ? "is-note" : ""}`} x1={x(Date.parse(u.created_at))} x2={x(Date.parse(u.created_at))} y1={yLine - 16} y2={yLine - 4}>
            <title>{`${short(Date.parse(u.created_at))}: ${u.actor_name ?? "Someone"}${u.note ? ` — ${u.note}` : ""}`}</title>
          </line>
        ))}

        {/* follow-ups below the line */}
        {p.followups.map((f) => {
          const t = Date.parse(f.due_at), fx = x(t);
          const cls = f.status === "done" ? "is-done" : f.status === "missed" || (f.status === "upcoming" && t < now) ? "is-missed" : f.status === "upcoming" ? "is-due" : "is-off";
          return (
            <g key={f.id} className={`ck-fu ${cls}`} transform={`translate(${fx - 5} ${yLine + 12})`}>
              <rect width={10} height={10} rx={2} />
              {cls === "is-missed" && <path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" />}
              <title>{`Follow-up ${short(t)}: ${f.status === "upcoming" && t < now ? "overdue" : f.status}${f.note ? ` — ${f.note}` : ""}`}</title>
            </g>
          );
        })}

        {/* reported */}
        <circle className="ck-open" cx={x(t0)} cy={yLine} r={6} />
        <text className="ck-lab" x={x(t0)} y={yLine - 26} textAnchor="start">{openedLabel}</text>

        {/* first action */}
        {first != null && (
          <g>
            <circle className="ck-first" cx={x(first)} cy={yLine} r={5} />
            {x(first) - x(t0) > 150 && endX - x(first) > 150 && (
              <text className="ck-lab is-blue" x={x(first)} y={yLine - 26} textAnchor="middle">First action{firstDays ? ` · ${span(firstDays)}` : " · same day"}</text>
            )}
          </g>
        )}

        {/* the close, or today */}
        {p.open ? (
          <g>
            <line className="ck-now" x1={x(now)} x2={x(now)} y1={yLine - 20} y2={H - 26} />
            <text className={`ck-lab ${quiet ? "is-hot" : ""}`} x={x(now) + (endAnchor === "end" ? -8 : 8)} y={yLine - 26} textAnchor={endAnchor}>
              {quiet ? `Quiet for ${span(quietDays)}` : "Today"}
            </text>
          </g>
        ) : tClose != null ? (
          <g>
            <rect className={`ck-close ${p.closedHow === "assumed" ? "is-assumed" : ""}`} x={x(tClose) - 6} y={yLine - 6} width={12} height={12} transform={`rotate(45 ${x(tClose)} ${yLine})`} />
            {x(tClose) - x(t0) > 170 && (
              <text className="ck-lab" x={x(tClose) + (endAnchor === "end" ? -10 : 10)} y={yLine - 26} textAnchor={endAnchor}>{p.closeLabel}</text>
            )}
          </g>
        ) : null}
      </svg>
      <figcaption className="ck-key">
        <span><i className="k-open" /> reported</span>
        {first != null && <span><i className="k-first" /> first field action</span>}
        {hist.length > 0 && <span><i className="k-entry" /> an entry in the history</span>}
        {p.followups.length > 0 && <span><i className="k-fu is-done" /> follow-up done <i className="k-fu is-due" /> due <i className="k-fu is-missed" /> missed</span>}
        {quiet && <span><i className="k-quiet" /> nothing recorded</span>}
        {!p.open && <span><i className={`k-close ${p.closedHow === "assumed" ? "is-assumed" : ""}`} /> {p.closedHow === "assumed" ? "closed · the date was assumed on import" : p.closedHow === "reviewed" ? "closed on review" : "closed"}</span>}
      </figcaption>
    </figure>
  );
}
