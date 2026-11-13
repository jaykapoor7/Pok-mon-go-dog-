/* ════════════════════════════════════════════════════════════════════
   Community · Stories (decision 039; references 05 Happywhale, 06 Photo
   Ark, 13 Stripe Press). Documented lives, start to where the record
   stops. Each story is a strip on a year spine: the real photograph or a
   plate saying none was recorded, the animal's name or tag, the area, the
   request, the care on the record, and an outcome only where the source
   records one. Ongoing reads as ongoing; nothing is invented to close it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { PublicCaseStory, PublicTimelineEvent } from "@/lib/community-case-stories";
import { animalTitle } from "@/lib/animal-name";
import { Btn, Empty, Head, Page, Panel, Tag } from "@/ws/kit";
import { Portrait } from "../../ui/Portrait";
import { publicLocality } from "../../ui/place";
import "./more.css";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null);

export function Stories({ rows, care, total, cities, city, next, error }: { rows: PublicCaseStory[]; care: PublicTimelineEvent[]; total: number | null; cities: string[]; city: string | null; next: string | null; error: string | null }) {
  const careOf = (id: string) => care.filter((c) => c.dog_id === id);
  return (
    <Page>
      <Head title="Stories"
        sum={<>{total !== null ? <><b>{total.toLocaleString("en-IN")}</b> {total === 1 ? "animal" : "animals"}{city ? ` in ${city}` : ""} whose requests for help are on the public record</> : <>Animals whose requests for help are on the public record</>}, from the day someone asked to where the record stops. Photographs are the organisations&rsquo; own.</>} />
      {cities.length > 0 && <nav className="cmo-chips" aria-label="City"><Link aria-current={!city ? "page" : undefined} href="/community/stories">Every city</Link>{cities.map((c) => <Link key={c} aria-current={city === c ? "page" : undefined} href={`/community/stories?city=${encodeURIComponent(c)}`}>{c}</Link>)}</nav>}
      <Panel>
        {error ? <div role="alert"><Empty title="Didn't load">The stories could not be read just now. Nothing is shown as none.</Empty></div>
          : !rows.length ? <Empty title="No story here yet">{city ? `No organisation in ${city} has a public story yet.` : "No public story yet."} That says what has been shared, not what has happened.</Empty>
          : (
            <ol className="k-rows" aria-label="Stories">
              {rows.map((s) => {
                const c = careOf(s.dog_id), title = animalTitle({ name: s.animal_name, straypaw_id: s.animal_code, id: s.dog_id });
                const place = publicLocality(s.zone);
                const last = c[0];
                const done = !!(s.resolved_at || s.outcome);
                return (
                  <li key={s.id}>
                    <Link href={`/animal/${s.dog_id}?from=${encodeURIComponent("/community/stories")}`} className="k-row">
                      <span className="cmo-thumb" aria-hidden><Portrait src={s.cover_photo} tag={title} sensitive size="s" /></span>
                      <span className="k-row-t">
                        <b>{title} <span className="cmo-dim">· {[place, s.city].filter(Boolean).join(", ") || "Area not published"}</span></b>
                        <small>{day(s.occurred_at)}: {s.title}{last ? <> · then {day(last.occurred_at)}: {last.title}</> : null}{s.ngo_name ? <> · by {s.ngo_name}</> : null}</small>
                      </span>
                      <span className="k-row-e"><Tag tone={done ? "green" : "amber"}>{done ? (s.outcome ? s.outcome.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase()) : "Closed") : "Ongoing"}</Tag></span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
      </Panel>
      {next && <p className="cmo-pager"><Btn href={next}>Show older stories</Btn></p>}
    </Page>
  );
}
