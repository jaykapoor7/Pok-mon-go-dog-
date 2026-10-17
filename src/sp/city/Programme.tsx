/* Municipality · one public programme: what it was, who ran it, where and
   when, its figures in honest units, and what its organisation wrote.
   Server-rendered from the public programme card. */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { programmeCategory, programmePrimaryTotal, programmePrimaryUnit, type PublicProgramme } from "@/lib/public-programmes";
import { CAT } from "./kinds";
import "./city.css";

const f = (n: number) => n.toLocaleString("en-IN");
const date = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null);

export function Programme({ p, siblings }: { p: PublicProgramme; siblings: PublicProgramme[] }) {
  const k = programmeCategory(p);
  const total = programmePrimaryTotal(p), unit = programmePrimaryUnit(p);
  const figs = [
    { v: total, l: unit, main: true },
    ...(p.animals_recorded && p.animals_recorded !== total ? [{ v: p.animals_recorded, l: "animals on record", main: false }] : []),
    ...(p.sterilised_recorded && k !== "sterilisation" ? [{ v: p.sterilised_recorded, l: "recorded sterilised", main: false }] : []),
    ...(p.vaccinated_recorded && k !== "vaccination" ? [{ v: p.vaccinated_recorded, l: "recorded vaccinated", main: false }] : []),
  ].filter((x) => x.v > 0);
  return (
    <article className="cp pd">
      <header className="pd-head" style={{ ["--cat" as string]: CAT[k].ink }}>
        <Link className="link small" href={`/city/programmes${p.city ? `?city=${encodeURIComponent(p.city)}` : ""}`}><ArrowLeft size={13} aria-hidden /> Programmes</Link>
        <p className="pd-kind"><i aria-hidden />{CAT[k].label}</p>
        <h1 className="display">{p.name}</h1>
        <p className="pd-by">Run by {p.ngo_slug ? <Link className="link" href={`/community/organisations/${p.ngo_slug}`}>{p.ngo_name}</Link> : p.ngo_name}</p>
        <dl className="ledger pd-facts">
          <div><dt>Where</dt><dd>{[...new Set([p.zone, p.city, p.state].filter(Boolean))].join(", ") || "not published"}</dd></div>
          <div><dt>When</dt><dd>{date(p.starts_on) ?? "start not published"} – {date(p.ends_on) ?? "ongoing or not published"}</dd></div>
        </dl>
      </header>
      <div className="pd-body">
        <section className="pd-figs" aria-label="What its record holds">
          {figs.length ? figs.map((x) => <div key={x.l} className={x.main ? "is-main" : ""}><b className="serif">{f(x.v)}</b><span>{x.l}</span></div>) : <p className="body">No figure published.</p>}
        </section>
        <section className="pd-method">
          <h2 className="h3">What these figures are</h2>
          <dl className="ledger fi-ledger">
            <div><dt>Unit</dt><dd>{unit === "animals on record" ? "Animals the organisation recorded in the programme; no separate vaccination or sterilisation figure was published" : unit === "records" ? "Entries in the organisation's register for the programme: requests, cases or treatments, not unique animals" : unit === "observed" ? "Animals observed during the study" : `Animals recorded as ${unit} during the programme`}</dd></div>
            <div><dt>Source</dt><dd>{p.ngo_name}&rsquo;s own record{p.source_rows_count ? `, ${f(p.source_rows_count)} source rows` : ""}</dd></div>
            <div><dt>Traceable</dt><dd>{f(p.traceable_animals_recorded)} of these animals have an individual record on StrayPaw</dd></div>
            <div><dt>Not a claim of</dt><dd>Coverage of the area&rsquo;s animals, or verification by StrayPaw or the municipality</dd></div>
          </dl>
        </section>
        {p.public_summary && <section className="pd-sum"><h2 className="h3">From {p.ngo_name}</h2><p className="body">{p.public_summary}</p></section>}
        {siblings.length > 0 && (
          <section className="pd-sib">
            <h2 className="h3">{p.ngo_name}&rsquo;s other programmes</h2>
            <ul>{siblings.slice(0, 8).map((s) => <li key={s.id}><Link href={`/city/programmes/${s.id}`}><b>{s.name}</b><small>{CAT[programmeCategory(s)].label}{s.city ? ` · ${s.city}` : ""} · {f(programmePrimaryTotal(s))} {programmePrimaryUnit(s)}</small></Link></li>)}</ul>
          </section>
        )}
      </div>
    </article>
  );
}
