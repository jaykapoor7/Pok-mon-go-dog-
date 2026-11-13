/* ════════════════════════════════════════════════════════════════════
   Community · one organisation: what it does in its own words, what its
   public record holds (in units), where it works (by area, never a
   spot), its programmes, recent public activity and animals on its
   record. Figures are the organisation's own record, not a rating.
   ════════════════════════════════════════════════════════════════════ */

import { ExternalLink } from "lucide-react";
import type { NGO, Dog } from "@/lib/types";
import type { OrgImpact, PublicOrgActivity, PublicOrgH3Cell, PublicProgramme } from "@/lib/org-public";
import { animalTitle } from "@/lib/animal-name";
import { Btn, Head, Page, Panel, Row, Rows, Section, Split, Stats, Tag } from "@/ws/kit";
import { publicLocality } from "../../ui/place";
import { OrgAreas } from "./OrgAreas";
import "./more.css";

const f = (n: number) => n.toLocaleString("en-IN");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "date not recorded");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Organisation({ org, impact, cells, activity, animals, programmes, median }: { org: NGO; impact: OrgImpact | null; cells: PublicOrgH3Cell[]; activity: PublicOrgActivity[]; animals: Dog[]; programmes: PublicProgramme[]; median: number | null }) {
  const figs = impact ? [
    { v: impact.animalsRecorded, l: "animal profiles" }, { v: impact.caseRecords, l: "requests on record" }, { v: impact.resolvedCases, l: "requests closed" },
    { v: impact.sterilised, l: "recorded sterilised" }, { v: impact.vaccinated, l: "recorded vaccinated" },
  ].filter((x) => x.v > 0) : [];
  const stats = [...figs.map((x) => ({ label: cap(x.l), value: f(x.v) })), ...(median !== null ? [{ label: "Days to first field action", value: median, note: "median, where both dates are recorded" }] : [])];
  return (
    <Page>
      <Head title={org.name}
        eyebrow={<>{[org.city, org.state].filter(Boolean).join(", ") || "Place not published"} · {org.verified ? "verified organisation" : "not yet verified"}</>}
        sum={org.mission ?? undefined}
        actions={org.website ? <Btn href={org.website} icon={<ExternalLink size={14} />}>Website</Btn> : undefined} />
      {org.areas_of_work?.length ? <p className="cmo-tags">{org.areas_of_work.map((a) => <Tag key={a}>{a}</Tag>)}</p> : null}
      {stats.length > 0 ? <section aria-label="What its public record holds"><Stats items={stats} /></section> : <p className="cmo-fine">{impact ? "No public records yet. That says what has been shared, not what has happened." : "Figures could not be read just now: not read, not zero."}</p>}
      <Split side={<>
        {cells.length > 0 && <Section title="Where its record sits"><OrgAreas cells={cells} /><p className="cmo-fine">Areas of about 0.74 km² sized by records; never an address. Empty places mean nothing recorded there by this organisation.</p></Section>}
        {org.about && <Section title="In its own words"><p className="cmo-prose">{org.about}</p></Section>}
      </>}>
        <Section title="Programmes" count={programmes.length}>
          <Panel>{programmes.length ? <Rows>{programmes.map((p) => <Row key={p.id} href={`/city/programmes/${p.id}`} title={p.name} meta={[p.area, p.startsOn && `from ${day(p.startsOn)}`].filter(Boolean).join(" · ") || "Area and dates not published"} end={p.animalsRecorded ? `${f(p.animalsRecorded)} animals on record` : undefined} />)}</Rows> : <p className="cmo-quiet">No programme published yet.</p>}</Panel>
        </Section>
        {activity.length > 0 && (
          <Section title="Recent public activity" count={activity.length}>
            <Panel><Rows>{activity.slice(0, 6).map((a) => <Row key={a.id} href={a.animalId ? `/animal/${a.animalId}` : undefined} title={<>{a.kind === "care" ? "Care recorded" : "A request recorded"}{publicLocality(a.area) ? ` in ${publicLocality(a.area)}` : ""}</>} end={<time>{day(a.occurredAt)}</time>} />)}</Rows></Panel>
          </Section>
        )}
        {animals.length > 0 && (
          <Section title="Animals on its record" count={animals.length}>
            <Panel><Rows>{animals.slice(0, 8).map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id }); return <Row key={d.id} href={`/animal/${d.id}`} title={t} meta={publicLocality(d.zone) ?? "Area not published"} />; })}</Rows></Panel>
          </Section>
        )}
      </Split>
    </Page>
  );
}
