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
  const careOf = (id: string) => care.filter((c) => c.dog_id === id);
  return (
    <div className="mo">
      <header className="mo-head st-head">
        <p className="k">Community · stories</p>
        <h1 className="display">Documented lives</h1>
        <p className="lede">Animals whose requests for help are on the public record, from the day someone asked to where the record stops.{total !== null ? <> <b>{total.toLocaleString("en-IN")}</b> animals{city ? ` in ${city}` : ""}.</> : null} Photographs are the organisations&rsquo; own; where none was recorded, the page says so.</p>
        <nav className="row mo-cities" aria-label="City"><Link className="chip" aria-pressed={!city} href="/community/stories">Every city</Link>{cities.map((c) => <Link key={c} className="chip" aria-pressed={city === c} href={`/community/stories?city=${encodeURIComponent(c)}`}>{c}</Link>)}</nav>
      </header>
      {error && <State kind="error" title="Didn't load">The stories could not be read just now. Nothing is shown as none.</State>}
      {!error && !rows.length && <State title="No story here yet">{city ? `No organisation in ${city} has a public story yet.` : "No public story yet."}</State>}
      {rows.length > 0 && (
        <ol className="st-grid">
          {rows.map((s) => {
            const c = careOf(s.dog_id), title = animalTitle({ name: s.animal_name, straypaw_id: s.animal_code, id: s.dog_id });
            const place = publicLocality(s.zone);
            const last = c[0];
            const done = !!(s.resolved_at || s.outcome);
            return (
              <li key={s.id} className="st-card">
                <Portrait src={s.cover_photo} tag={title} sensitive size="m" />
                <Link href={`/animal/${s.dog_id}?from=${encodeURIComponent("/community/stories")}`} className="st-card-body">
                  <p className="st-where">{[place, s.city].filter(Boolean).join(", ") || "Area not published"}</p>
                  <h2 className="st-name">{title}<ArrowUpRight size={15} aria-hidden /></h2>
                  <p className="st-req"><time>{day(s.occurred_at)}</time>{s.title}</p>
                  {last && <p className="st-req is-care"><time>{day(last.occurred_at)}</time>{last.title}</p>}
                  <p className="st-foot"><span className={`st-pill${done ? " is-done" : ""}`}>{done ? (s.outcome ? s.outcome.replace(/_/g, " ") : "Closed") : "Ongoing"}</span>{s.ngo_name && <span className="st-by">by {s.ngo_name}</span>}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {next && <div className="row mo-pager"><Link className="btn" href={next}>Show older stories</Link></div>}
    </div>
  );
}
