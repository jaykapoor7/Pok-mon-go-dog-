import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { programmeCategory, programmePrimaryTotal, type PublicProgramme } from "@/lib/public-programmes";
import { OrgMark } from "./OrgMark";

/* ════════════════════════════════════════════════════════════════════
   Campaigns on one time axis. Each is a row: what it is and who ran it,
   then a bar from the day it began to the day it ended on an axis shared
   by every row, so their lengths and overlaps read at a glance, then the
   one figure it is about. The bar's colour is the campaign's kind:
   sterilisation blue, vaccination teal (the map's ARV colour), the rest ink.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const KIND_LABEL: Record<string, string> = { vaccination: "Vaccination", sterilisation: "Sterilisation drive", treatment: "Rescue and treatment", study: "Study", other: "Programme" };
export const KIND_UNIT: Record<string, string> = { vaccination: "vaccinated", sterilisation: "sterilised", treatment: "records", study: "records", other: "records" };
const t = (iso: string | null) => (iso ? Date.parse(`${iso}T00:00:00Z`) : NaN);
export const monthYear = (iso: string | null) => { const v = t(iso); if (Number.isNaN(v)) return null; const d = new Date(v); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export function CampaignStrip({ campaigns, showOrg = true, current, logos = {} }: {
  campaigns: PublicProgramme[]; showOrg?: boolean; current?: string; logos?: Record<string, string | null>;
}) {
  const spans = campaigns.map((c) => ({ c, a: t(c.starts_on), b: t(c.ends_on) }));
  const known = spans.flatMap((s) => [s.a, s.b]).filter((x) => !Number.isNaN(x));
  if (!known.length) return null;
  const lo = new Date(Math.min(...known)), hi = new Date(Math.max(...known));
  const from = Date.UTC(lo.getUTCFullYear(), 0, 1), to = Date.UTC(hi.getUTCFullYear() + 1, 0, 1);
  const x = (v: number) => ((v - from) / (to - from)) * 100;
  const years: number[] = [];
  for (let y = lo.getUTCFullYear(); y <= hi.getUTCFullYear(); y++) years.push(y);

  return (
    <div className="cs">
      <div className="cs-axis" aria-hidden="true">
        <span />
        <span className="cs-years">{years.map((y) => <i key={y} style={{ left: `${x(Date.UTC(y, 0, 1))}%` }}>{y}</i>)}</span>
        <span />
      </div>
      <ol className="cs-rows">
        {spans.map(({ c, a, b }) => {
          const cat = programmeCategory(c);
          const total = programmePrimaryTotal(c);
          const start = Number.isNaN(a) ? b : a, end = Number.isNaN(b) ? a : b;
          const days = !Number.isNaN(a) && !Number.isNaN(b) ? Math.max(1, Math.round((b - a) / DAY)) : null;
          return (
            <li key={c.id} className={c.id === current ? "is-current" : undefined}>
              <Link href={`/programmes/${c.id}`} aria-current={c.id === current ? "page" : undefined}>
                <span className="cs-what">
                  <small className="sys-mono">{KIND_LABEL[cat]}</small>
                  <b>{c.name}</b>
                  <span className="cs-who">
                    {showOrg && <><OrgMark name={c.ngo_name} logoUrl={c.ngo_slug ? logos[c.ngo_slug] : null} size={18} />{c.ngo_name} · </>}
                    {[c.zone || c.city, monthYear(c.starts_on) && monthYear(c.ends_on) ? `${monthYear(c.starts_on)} – ${monthYear(c.ends_on)}` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="cs-track" aria-hidden="true">
                  {years.map((y) => <i key={y} style={{ left: `${x(Date.UTC(y, 0, 1))}%` }} />)}
                  <b className={`is-${cat}`} style={{ left: `${x(start)}%`, width: `${Math.max(1.2, x(end) - x(start))}%` }} />
                </span>
                <span className="cs-n">
                  <b>{total.toLocaleString("en-IN")}</b>
                  <small>{KIND_UNIT[cat]}{days ? ` · ${days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`}` : ""}</small>
                </span>
                <ArrowUpRight size={15} aria-hidden className="cs-go" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
