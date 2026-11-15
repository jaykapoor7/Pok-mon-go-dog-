/* One organisation (/community/organisations/[slug]): what it does in its
   own words, what its public record holds (in units), where it works (by
   area, never a spot), its programmes, recent public activity and animals
   on its record. Figures are the organisation's own record, not a rating. */

import { ExternalLink } from "lucide-react";
import type { NGO, Dog } from "@/lib/types";
import type { OrgImpact, PublicOrgActivity, PublicOrgH3Cell, PublicProgramme } from "@/lib/org-public";
import { animalTitle } from "@/lib/animal-name";
import { Body, Figs, Head, List, LinkBtn, Row, Sec, Split, Tag } from "../kit";
import { day, publicLocality } from "../fmt";
import { OrgAreas } from "./OrgAreas";

const f = (n: number) => n.toLocaleString("en-IN");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Organisation({ org, impact, cells, activity, animals, programmes, median }: { org: NGO; impact: OrgImpact | null; cells: PublicOrgH3Cell[]; activity: PublicOrgActivity[]; animals: Dog[]; programmes: PublicProgramme[]; median: number | null }) {
  const figs = impact ? [
    { v: impact.animalsRecorded, l: "animal profiles" }, { v: impact.caseRecords, l: "requests on record" }, { v: impact.resolvedCases, l: "requests closed" },
    { v: impact.sterilised, l: "recorded sterilised" }, { v: impact.vaccinated, l: "recorded vaccinated" },
  ].filter((x) => x.v > 0) : [];
  const stats = [...figs.map((x) => ({ label: cap(x.l), value: f(x.v) })), ...(median !== null ? [{ label: "Days to first field action", value: median, note: "median, where both dates are recorded" }] : [])];
  return (
    <>
      <Head back="/community/organisations" title={org.name}
        eyebrow={<>{[org.city, org.state].filter(Boolean).join(", ") || "Place not published"} · {org.verified ? "verified organisation" : "not yet verified"}</>}
        sum={org.mission ?? undefined}
        actions={org.website ? <LinkBtn href={org.website} external icon={<ExternalLink size={16} aria-hidden />}>Website<span className="pb-sr"> (opens in a new tab)</span></LinkBtn> : undefined}>
        {org.areas_of_work?.length ? <div className="pb-tags">{org.areas_of_work.map((a) => <Tag key={a}>{a}</Tag>)}</div> : null}
      </Head>
      <Body>
        {stats.length > 0 ? <Figs label="What its public record holds" items={stats} /> : <p className="pb-fine">{impact ? "No public records yet. That says what has been shared, not what has happened." : "Figures could not be read just now: not read, not zero."}</p>}
        <Split side={<>
          {cells.length > 0 && <Sec title="Where its record sits" note="Areas of about 0.74 km² sized by records; never an address. Empty places mean nothing recorded there by this organisation."><OrgAreas cells={cells} /></Sec>}
          {org.about && <Sec title="In its own words"><p className="pb-prose">{org.about}</p></Sec>}
        </>}>
          <Sec title="Programmes" count={programmes.length}>
            {programmes.length ? <List label="Programmes">{programmes.map((p) => <Row key={p.id} href={`/city/programmes/${p.id}`} title={p.name} meta={[p.area, p.startsOn && `from ${day(p.startsOn)}`].filter(Boolean).join(" · ") || "Area and dates not published"} end={p.animalsRecorded ? `${f(p.animalsRecorded)} animals on record` : undefined} />)}</List> : <p className="pb-fine">No programme published yet.</p>}
          </Sec>
          {activity.length > 0 && (
            <Sec title="Recent public activity" count={Math.min(6, activity.length)}>
              <List label="Recent public activity">{activity.slice(0, 6).map((a) => <Row key={a.id} href={a.animalId ? `/animal/${a.animalId}` : undefined} title={<>{a.kind === "care" ? "Care recorded" : "A request recorded"}{publicLocality(a.area) ? ` in ${publicLocality(a.area)}` : ""}</>} end={<time dateTime={a.occurredAt ?? undefined}>{day(a.occurredAt)}</time>} />)}</List>
            </Sec>
          )}
          {animals.length > 0 && (
            <Sec title="Animals on its record" count={Math.min(8, animals.length)}>
              <List label="Animals on its record">{animals.slice(0, 8).map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id, city: d.city ?? null, zone: d.zone }); return <Row key={d.id} href={`/animal/${d.id}`} title={t} meta={publicLocality(d.zone) ?? "Area not published"} />; })}</List>
            </Sec>
          )}
        </Split>
      </Body>
    </>
  );
}
