import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DogPhoto } from "@/components/ui/DogPhoto";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { getPublishedCaseStoriesCached as getPublishedCaseStories, getPublicCareTimelineCached as getPublicCareTimeline } from "@/lib/community-case-stories-cached";
import { rescueCategory } from "@/lib/rescue-taxonomy";
import { dogLabel } from "@/lib/utils";
import "./stories.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rescue stories, StrayPaw", description: "Rescues with a recorded issue, care and outcome, each drawn from the day it was reported to the day it ended." };

/* ════════════════════════════════════════════════════════════════════
   Stories: rescues that finished, told by their own record.

   A story is only published when the record holds an issue, care, an
   outcome and a date, so each one can be drawn rather than described:
   the day it was reported, every care event after, the day it ended.
   The figure at the top lines them all up on the day they began, so the
   reader sees at once how long a rescue takes and how much care it needs.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const span = (d: number) => (d >= 60 ? `${Math.round(d / 30)} months` : d === 1 ? "1 day" : `${d} days`);

type Journey = { dogId: string; latest: PublicCaseStory; start: number; care: number[]; end: number | null; name: string; category: string };

function journeys(cases: PublicCaseStory[], care: Awaited<ReturnType<typeof getPublicCareTimeline>>): Journey[] {
  const byDog = new Map<string, PublicCaseStory[]>();
  for (const c of cases) if (c.dog_id) byDog.set(c.dog_id, [...(byDog.get(c.dog_id) ?? []), c]);
  const careBy = new Map<string, number[]>();
  for (const e of care) if (e.dog_id) careBy.set(e.dog_id, [...(careBy.get(e.dog_id) ?? []), Date.parse(e.occurred_at)]);
  return [...byDog.entries()].map(([dogId, rows]) => {
    const ordered = [...rows].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
    const latest = ordered[0];
    const start = Date.parse(latest.occurred_at);
    const end = latest.resolved_at && Date.parse(latest.resolved_at) > start + DAY / 2 ? Date.parse(latest.resolved_at) : null;
    const careDays = (careBy.get(dogId) ?? []).filter((t) => t >= start - DAY && (!end || t <= end + 30 * DAY)).sort((a, b) => a - b);
    return {
      dogId, latest, start, care: careDays, end,
      name: dogLabel({ name: latest.animal_name, zone: latest.zone }),
      category: rescueCategory({ subtype: latest.category, title: latest.title, detail: latest.outcome }),
    };
  }).sort((a, b) => b.start - a.start);
}

export default async function StoriesPage() {
  const [cases, care] = await Promise.all([getPublishedCaseStories(), getPublicCareTimeline()]);
  const all = journeys(cases, care).slice(0, 24);
  const withEnd = all.filter((j) => j.end);
  const lengths = withEnd.map((j) => Math.round((j.end! - j.start) / DAY)).sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : null;
  const careTotal = all.reduce((s, j) => s + j.care.length, 0);

  return (
    <AppShell>
      <main className="st">
        <header className="st-head">
          <p className="sys-eyebrow">Stories</p>
          <h1>Rescues, from the day they were reported to the day they&nbsp;ended.</h1>
          {all.length > 0 && <p className="st-lede">
            <b>{all.length}</b> recent rescues with an issue, care and an outcome on the record — <b>{careTotal}</b> care events between them
            {median != null ? <>, and half were over within <b>{span(median)}</b></> : null}. Each one below is drawn from its own record.
          </p>}
          <Link href="/report" className="sys-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link>
        </header>

        {all.length > 0 && <Journeys rows={all} />}

        {all.length ? (
          <ol className="st-grid">
            {all.map((j) => <Story key={j.dogId} j={j} />)}
          </ol>
        ) : <p className="st-empty">No finished rescue has been published yet.</p>}
      </main>
    </AppShell>
  );
}

/** Every rescue on one clock, aligned on the day it began. */
function Journeys({ rows }: { rows: Journey[] }) {
  const maxDays = Math.max(30, ...rows.map((j) => Math.round(((j.end ?? Math.max(j.start, ...j.care)) - j.start) / DAY)));
  const X = (d: number) => (Math.log1p(Math.max(0, d)) / Math.log1p(maxDays)) * 100;
  const ticks = [0, 1, 7, 30, 90, 180, 365].filter((d) => d <= maxDays);
  return (
    <figure className="st-fig">
      <figcaption>Every rescue here, lined up on the day it was reported. <span><i className="is-start" /> reported <i className="is-care" /> care <i className="is-end" /> ended</span></figcaption>
      <div className="st-lanes">
        <div className="st-axis" aria-hidden>{ticks.map((d) => <span key={d} style={{ left: `${X(d)}%` }}>{d === 0 ? "day 0" : d < 30 ? `${d} d` : d < 365 ? `${Math.round(d / 30)} mo` : "1 year"}</span>)}</div>
        {rows.map((j) => {
          const endD = j.end ? (j.end - j.start) / DAY : null;
          return (
            <Link key={j.dogId} href={`/dog/${j.dogId}`} className="st-lane" title={`${j.name} · ${j.category}`}>
              <span className="st-lane-n">{j.name}</span>
              <span className="st-lane-track">
                {endD != null && <i className="st-lane-line" style={{ width: `${X(endD)}%` }} />}
                <i className="st-dot is-start" style={{ left: 0 }} />
                {j.care.map((t, k) => <i key={k} className="st-dot is-care" style={{ left: `${X((t - j.start) / DAY)}%` }} />)}
                {endD != null && <i className="st-dot is-end" style={{ left: `${X(endD)}%` }} />}
              </span>
            </Link>
          );
        })}
      </div>
    </figure>
  );
}

function Story({ j }: { j: Journey }) {
  const row = j.latest;
  const len = j.end ? Math.round((j.end - j.start) / DAY) : null;
  const outcome = row.outcome?.trim().replace(/\.$/, "") ?? "";
  const said = outcome.split(/\s+/).length > 3;
  const cat = /^unknown|not recorded/i.test(j.category) ? null : j.category;
  return (
    <li>
      <Link href={`/dog/${j.dogId}`} className={`st-card ${row.cover_photo ? "" : "is-plain"}`}>
        <DogPhoto src={row.cover_photo} alt={j.name} seed={j.dogId} tone="resolved" className="st-photo" />
        <div className="st-body">
          <p className="st-meta">{cat && <span className="st-cat">{cat}</span>}{row.zone && <span><MapPin size={11} /> {row.zone}</span>}</p>
          <h2>{j.name}</h2>
          {outcome && (said ? <p className="st-outcome">&ldquo;{outcome}.&rdquo;</p> : <p className="st-result">Outcome: <b>{outcome.toLowerCase()}</b></p>)}
          <p className="st-facts">
            Reported {day(row.occurred_at)} · {j.care.length} care event{j.care.length === 1 ? "" : "s"}{len != null ? <> · ended after {span(len)}</> : null}
          </p>
        </div>
        <ArrowUpRight size={16} className="st-go" />
      </Link>
    </li>
  );
}
