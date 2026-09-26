/* ════════════════════════════════════════════════════════════════════
   A record, drawn as a route.

   The same line the landing uses for one request, followed to the end:
   a stop for each thing the record holds, in order, with the time between
   two stops written on the line. What is still missing is drawn as the
   route carrying on, dashed, to a stop nobody has reached yet: the record
   shows its own gaps and says who can close them.

   Kinds: start (the first report), step (care, a sighting, a follow-up),
   open (work still open), end (the outcome), missing (not recorded yet).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import "./route.css";

export type RouteStop = {
  key: string;
  at: string | null;
  label: string;
  detail?: ReactNode;
  kind: "start" | "step" | "open" | "end" | "missing";
  href?: string;
  cta?: string;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

/** The time between two stops, as it would be said. */
export function gapText(a: string, b: string) {
  const d = Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  if (d <= 0) return "same day";
  if (d === 1) return "next day";
  if (d < 60) return `${d} days later`;
  if (d < 730) return `${Math.round(d / 30)} months later`;
  return `${(d / 365).toFixed(1)} years later`;
}

export function Route({ stops, label, tone = "paper" }: { stops: RouteStop[]; label: string; tone?: "paper" | "night" }) {
  let last: string | null = null;
  return (
    <ol className={`rt is-${tone}`} aria-label={label}>
      {stops.map((s, i) => {
        const gap = s.at && last && s.kind !== "missing" ? gapText(last, s.at) : null;
        if (s.at) last = s.at;
        const missing = s.kind === "missing";
        return (
          <li key={s.key} className={`rt-stop is-${s.kind}`} style={{ ["--i" as string]: i }}>
            <i className="rt-mark" aria-hidden />
            <span className="rt-when sys-mono">
              {missing ? "not recorded yet" : s.at ? <time dateTime={s.at}>{when(s.at)}</time> : "date not recorded"}
              {gap && <em> · {gap}</em>}
            </span>
            <b className="rt-label">{s.label}</b>
            {s.detail && <span className="rt-detail">{s.detail}</span>}
            {s.href && s.cta && <Link href={s.href} className="rt-cta">{s.cta} <ArrowUpRight size={13} aria-hidden /></Link>}
          </li>
        );
      })}
    </ol>
  );
}
