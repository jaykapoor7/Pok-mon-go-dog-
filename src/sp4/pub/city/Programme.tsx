/* One public programme (/city/programmes/[id]): what it was, who ran it,
   where and when, its figures in honest units, and what its organisation
   wrote. Server-rendered from the public programme card. */

import Link from "next/link";
import { isResearchArchiveProgramme, programmeCategory, programmePrimaryTotal, programmePrimaryUnit, type PublicProgramme } from "@/lib/public-programmes";
import { Body, Figs, Head, List, Note, Props, Row, Sec, Split, Tag } from "../kit";
import { CAT } from "./kinds";

const f = (n: number) => n.toLocaleString("en-IN");
const date = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Programme({ p, siblings }: { p: PublicProgramme; siblings: PublicProgramme[] }) {
  const k = programmeCategory(p);
  const total = programmePrimaryTotal(p), unit = programmePrimaryUnit(p);
  const figs = [
    { v: total, l: unit },
    ...(p.animals_recorded && p.animals_recorded !== total ? [{ v: p.animals_recorded, l: "animals on record" }] : []),
    ...(p.sterilised_recorded && k !== "sterilisation" ? [{ v: p.sterilised_recorded, l: "recorded sterilised" }] : []),
    ...(p.vaccinated_recorded && k !== "vaccination" ? [{ v: p.vaccinated_recorded, l: "recorded vaccinated" }] : []),
  ].filter((x) => x.v > 0);
  return (
    <>
      <Head back="/city/programmes" eyebrow={<Tag>{CAT[k].label}</Tag>} title={p.name}
        sum={<>Run by {p.ngo_slug ? <Link className="pb-link" href={`/community/organisations/${p.ngo_slug}`}>{p.ngo_name}</Link> : p.ngo_name}.</>} />
      <Body>
        {isResearchArchiveProgramme(p.id) && <Note tone="amber" action={<Link className="pb-link" href="/research">About the research archive</Link>}><b>Research archive.</b> This summarises a published research or public dataset. It is kept for reference with its source and is not counted as operational programme work on StrayPaw.</Note>}
        {figs.length ? <Figs label="What its record holds" items={figs.map((x) => ({ label: cap(x.l), value: f(x.v) }))} /> : <p className="pb-fine">No figure published.</p>}
        <Split side={<>
          {p.public_summary && <Sec title={`From ${p.ngo_name}`}><p className="pb-prose">{p.public_summary}</p></Sec>}
          {siblings.length > 0 && (
            <Sec title={`${p.ngo_name}’s other programmes`} count={Math.min(8, siblings.length)}>
              <List label="Other programmes">{siblings.slice(0, 8).map((s) => <Row key={s.id} href={`/city/programmes/${s.id}`} title={s.name} meta={`${CAT[programmeCategory(s)].label}${s.city ? ` · ${s.city}` : ""} · ${f(programmePrimaryTotal(s))} ${programmePrimaryUnit(s)}`} />)}</List>
            </Sec>
          )}
        </>}>
          <Sec title="Where and when">
            <Props items={[
              { label: "Where", value: [...new Set([p.zone, p.city, p.state].filter(Boolean))].join(", ") || <span className="pb-unknown">Not published</span> },
              { label: "When", value: <>{date(p.starts_on) ?? "Start not published"} to {date(p.ends_on) ?? "ongoing or not published"}</> },
            ]} />
          </Sec>
          <Sec title="What these figures are">
            <Props items={[
              { label: "Unit", value: unit === "animals on record" ? "Animals the organisation recorded in the programme; no separate vaccination or sterilisation figure was published" : unit === "records" ? "Entries in the organisation's register for the programme: requests, cases or treatments, not unique animals" : unit === "observed" ? "Animals observed during the study" : `Animals recorded as ${unit} during the programme` },
              { label: "Source", value: <>{p.ngo_name}&rsquo;s own record{p.source_rows_count ? `, ${f(p.source_rows_count)} source rows` : ""}</> },
              { label: "Traceable", value: <>{f(p.traceable_animals_recorded)} of these animals have an individual record on StrayPaw</> },
              { label: "Not a claim of", value: <>Coverage of the area&rsquo;s animals, or verification by StrayPaw or the municipality</> },
            ]} />
          </Sec>
        </Split>
      </Body>
    </>
  );
}
