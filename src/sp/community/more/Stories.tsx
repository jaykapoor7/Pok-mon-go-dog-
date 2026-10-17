/* ════════════════════════════════════════════════════════════════════
   Community · Stories (decision 039; references 05 Happywhale, 06 Photo
   Ark, 13 Stripe Press). Documented lives, start to where the record
   stops. Each story is a strip on a year spine: the real photograph or a
   plate saying none was recorded, the animal's name or tag, the area, the
   request, the care on the record, and an outcome only where the source
   records one. Ongoing reads as ongoing; nothing is invented to close it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicCaseStory, PublicTimelineEvent } from "@/lib/community-case-stories";
import { animalTitle } from "@/lib/animal-name";
import { Portrait } from "../../ui/Portrait";
import { publicLocality } from "../../ui/place";
import { State } from "../../ui";
import "./more.css";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null);

export function Stories({ rows, care, total, cities, city, next, error }: { rows: PublicCaseStory[]; care: PublicTimelineEvent[]; total: number | null; cities: string[]; city: string | null; next: string | null; error: string | null }) {
  const byYear = new Map<number, PublicCaseStory[]>();
  for (const s of rows) { const y = new Date(s.occurred_at).getFullYear(); byYear.set(y, [...(byYear.get(y) ?? []), s]); }
  const careOf = (id: string) => care.filter((c) => c.dog_id === id);
  return (
    <div className="mo">
      <header className="mo-head">
        <p className="k">Community · stories</p>
        <h1 className="display">Documented lives</h1>
        <p className="lede">Animals whose requests for help are on the public record, from the day someone asked to where the record stops.{total !== null ? <> <b>{total.toLocaleString("en-IN")}</b> animals{city ? ` in ${city}` : ""}.</> : null} Photographs are the organisations&rsquo; own; where none was recorded, the page says so.</p>
        <nav className="row mo-cities" aria-label="City"><Link className="chip" aria-pressed={!city} href="/community/stories">Every city</Link>{cities.map((c) => <Link key={c} className="chip" aria-pressed={city === c} href={`/community/stories?city=${encodeURIComponent(c)}`}>{c}</Link>)}</nav>
      </header>
      {error && <State kind="error" title="Not read">The stories could not be read just now. Nothing is shown as none.</State>}
      {!error && !rows.length && <State title="No story here yet">{city ? `No organisation in ${city} has a public story yet.` : "No public story yet."}</State>}
      {[...byYear.entries()].map(([y, list]) => (
        <section key={y} className="st-year" aria-label={String(y)}>
          <h2 className="st-y serif">{y}</h2>
          <ol className="st-list">
            {list.map((s) => {
              const c = careOf(s.dog_id), title = animalTitle({ name: s.animal_name, straypaw_id: s.animal_code, id: s.dog_id });
              const place = publicLocality(s.zone);
              return (
                <li key={s.id}>
                  <Link href={`/animal/${s.dog_id}?from=${encodeURIComponent("/community/stories")}`} className="st-row">
                    <Portrait src={s.cover_photo} tag={title} sensitive size="m" />
                    <div className="st-body">
                      <p className="k">{[place, s.city].filter(Boolean).join(", ") || "Area not published"}{s.ngo_name ? ` · recorded by ${s.ngo_name}` : ""}</p>
                      <h3 className="serif">{title}</h3>
                      <ol className="chrono st-chrono">
                        <li className="is-report"><time className="mono">{day(s.occurred_at)}</time><span><b>{s.title}</b></span></li>
                        {c.slice(0, 3).map((e) => <li key={e.id} className="is-care"><time className="mono">{day(e.occurred_at)}</time><span>{e.title}</span></li>)}
                        {s.resolved_at || s.outcome ? <li className="is-care"><time className="mono">{day(s.resolved_at) ?? "date not recorded"}</time><span><b>{s.outcome ? s.outcome.replace(/_/g, " ") : "Closed"}</b></span></li> : <li className="is-sight"><time className="mono">—</time><span>Ongoing, or no outcome on the record yet</span></li>}
                      </ol>
                    </div>
                    <ArrowUpRight size={16} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {next && <div className="row mo-pager"><Link className="btn" href={next}>Older stories</Link></div>}
    </div>
  );
}
