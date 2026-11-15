/* Stories (/community/stories): animals whose requests for help are on the
   public record, from the day someone asked to where the record stops. The
   real photograph (veiled: these are requests for help) or a plate saying
   none was recorded, the area, the request, the care on the record, and an
   outcome only where the source records one. Ongoing reads as ongoing. */

import Link from "next/link";
import type { PublicCaseStory, PublicTimelineEvent } from "@/lib/community-case-stories";
import { animalTitle } from "@/lib/animal-name";
import { Body, Empty, Head, LinkBtn, Tag } from "../kit";
import { Pic } from "../Pic";
import { day, plural, publicLocality } from "../fmt";

export function Stories({ rows, care, total, cities, city, next, error }: { rows: PublicCaseStory[]; care: PublicTimelineEvent[]; total: number | null; cities: string[]; city: string | null; next: string | null; error: string | null }) {
  const careOf = (id: string) => care.filter((c) => c.dog_id === id);
  return (
    <>
      <Head title="Stories"
        sum={<>{total !== null ? <><b>{total.toLocaleString("en-IN")}</b> {plural(total, "animal")}{city ? ` in ${city}` : ""} whose requests for help are on the public record</> : <>Animals whose requests for help are on the public record</>}, from the day someone asked to where the record stops. Photographs are the organisations&rsquo; own.</>} />
      <Body>
        {cities.length > 0 && <nav className="pb-chips" aria-label="City"><Link aria-current={!city ? "page" : undefined} href="/community/stories">Every city</Link>{cities.map((c) => <Link key={c} aria-current={city === c ? "page" : undefined} href={`/community/stories?city=${encodeURIComponent(c)}`}>{c}</Link>)}</nav>}
        {error ? <Empty alert title="Not read">The stories could not be read just now. That is not the same as there being none; reload to try again.</Empty>
          : !rows.length ? <Empty title="No story here yet">{city ? `No organisation in ${city} has a public story yet.` : "No public story yet."} That says what has been shared, not what has happened.</Empty>
          : (
            <ol className="pb-list" aria-label="Stories">
              {rows.map((s) => {
                const c = careOf(s.dog_id), title = animalTitle({ name: s.animal_name, straypaw_id: s.animal_code, id: s.dog_id });
                const place = publicLocality(s.zone);
                const last = c[0];
                const done = !!(s.resolved_at || s.outcome);
                return (
                  <li key={s.id}>
                    <Link href={`/animal/${s.dog_id}?from=${encodeURIComponent("/community/stories")}`} className="pb-row is-link">
                      <span className="pb-row-i is-pic" aria-hidden><Pic src={s.cover_photo} tag={title} sensitive small /></span>
                      <span className="pb-row-t">
                        <b>{title} <span className="pb-unknown">· {[place, s.city].filter(Boolean).join(", ") || "Area not published"}</span></b>
                        <small>{day(s.occurred_at)}: {s.title}{last ? <> · then {day(last.occurred_at)}: {last.title}</> : null}{s.ngo_name ? <> · by {s.ngo_name}</> : null}</small>
                      </span>
                      <span className="pb-row-e"><Tag tone={done ? "green" : "amber"}>{done ? (s.outcome ? s.outcome.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase()) : "Closed") : "Ongoing"}</Tag></span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        {next && <div className="pb-actions"><LinkBtn href={next}>Show older stories</LinkBtn></div>}
      </Body>
    </>
  );
}
