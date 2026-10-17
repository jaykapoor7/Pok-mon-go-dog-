/* ════════════════════════════════════════════════════════════════════
   Community · one organisation: what it does in its own words, what its
   public record holds (in units), where it works (by area, never a
   spot), its programmes, recent public activity and animals on its
   record. Figures are the organisation's own record, not a rating.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { NGO, Dog } from "@/lib/types";
import type { OrgImpact, PublicOrgActivity, PublicOrgH3Cell, PublicProgramme } from "@/lib/org-public";
import { animalTitle } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import { Portrait } from "../../ui/Portrait";
import { publicLocality } from "../../ui/place";
import { OrgAreas } from "./OrgAreas";
import "./more.css";

const f = (n: number) => n.toLocaleString("en-IN");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

export function Organisation({ org, impact, cells, activity, animals, programmes, median }: { org: NGO; impact: OrgImpact | null; cells: PublicOrgH3Cell[]; activity: PublicOrgActivity[]; animals: Dog[]; programmes: PublicProgramme[]; median: number | null }) {
  const figs = impact ? [
    { v: impact.animalsRecorded, l: "animal profiles" }, { v: impact.caseRecords, l: "requests on record" }, { v: impact.resolvedCases, l: "requests closed" },
    { v: impact.sterilised, l: "recorded sterilised" }, { v: impact.vaccinated, l: "recorded vaccinated" },
  ].filter((x) => x.v > 0) : [];
  return (
    <article className="mo og">
      <header className="mo-head og-head">
        <Link className="link small" href="/community/organisations"><ArrowLeft size={13} aria-hidden /> Organisations</Link>
        <p className="k">{[org.city, org.state].filter(Boolean).join(", ") || "Place not published"}{org.verified ? " · verified organisation" : " · not yet verified"}</p>
        <h1 className="display">{org.name}</h1>
        {org.mission && <p className="lede">{org.mission}</p>}
        <div className="row">{org.website && <a className="btn is-s" href={org.website} target="_blank" rel="noreferrer">Website <ExternalLink size={13} aria-hidden /></a>}{org.areas_of_work?.map((a) => <span key={a} className="pill is-plain">{a}</span>)}</div>
      </header>
      {figs.length > 0 && <section className="og-figs" aria-label="What its public record holds">{figs.map((x) => <div key={x.l}><b className="serif">{f(x.v)}</b><span>{x.l}</span></div>)}{median !== null && <div><b className="serif">{median}</b><span>days, median, from request to first field action (where both are recorded)</span></div>}</section>}
      <div className="og-body">
        <section className="og-col">
          {org.about && <><h2 className="h3">In its own words</h2><p className="body og-about">{org.about}</p></>}
          {cells.length > 0 && <><h2 className="h3">Where its record sits</h2><OrgAreas cells={cells} /><p className="small">Areas of about 0.74 km² sized by records; never an address. Empty places mean nothing recorded there by this organisation.</p></>}
          {programmes.length > 0 && <><h2 className="h3">Programmes</h2><ul className="og-progs">{programmes.map((p) => <li key={p.id}><Link href={`/city/programmes/${p.id}`}><b>{p.name}</b><small>{[p.area, p.startsOn && `from ${day(p.startsOn)}`].filter(Boolean).join(" · ")}{p.animalsRecorded ? ` · ${f(p.animalsRecorded)} animals on record` : ""}</small></Link></li>)}</ul></>}
        </section>
        <aside className="og-col">
          {activity.length > 0 && <><h2 className="h3">Recent public activity</h2><ol className="chrono">{activity.map((a) => <li key={a.id} className={a.kind === "care" ? "is-care" : "is-report"}><time className="mono">{day(a.occurredAt)}</time><span>{a.kind === "care" ? "Care recorded" : "A request recorded"}{publicLocality(a.area) ? ` in ${publicLocality(a.area)}` : ""}</span>{a.animalId && <small><Link className="link" href={`/animal/${a.animalId}`}>the animal</Link></small>}</li>)}</ol></>}
        </aside>
      </div>
      {animals.length > 0 && (
        <section className="og-animals">
          <h2 className="h3">Animals on its record</h2>
          <ul>{animals.map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id }); return <li key={d.id}><Link href={`/animal/${d.id}`}><Portrait src={d.cover_photo || null} tag={t} sensitive={isSensitivePhoto(d)} size="m" /><b>{t}</b><small>{publicLocality(d.zone) ?? "Area not published"}</small></Link></li>; })}</ul>
        </section>
      )}
    </article>
  );
}
