"use client";

/* City report (/city/report): a publication built from the same findings as
   City insights: cover, contents, numbered findings with their method
   written out, and the limits of the record. Printed or saved as PDF from
   the browser; the page itself is the document. */

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useSpatialDataset } from "@/sp/data/spatial";
import { cityEvidence, KINDS } from "@/sp/atlas/evidence";
import { findings, loadedScope, type Period } from "@/sp/city/findings";
import { Body, Btn, Empty, Head, Lanes, Note } from "../kit";
import { FindingView, Hatch } from "./Findings";
import "./city.css";

export function CityReport() {
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = useState<Period>("all");
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  const ev = city ? cityEvidence(city, row?.cells ?? 0) : null;
  const built = ds ? new Date(ds.built).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const scope = period === "all" ? (ld?.capped ? "The most recent loaded record" : "The whole record") : "The last twelve months";
  return (
    <>
      <Hatch />
      <div className="no-print">
        <Head back={city ? `/city/insights?city=${encodeURIComponent(city)}` : "/city/insights"} eyebrow="City record" title="City report"
          sum={loading ? "Reading the public record…" : error || !city ? "The report could not be built." : <>Street animals in <b>{city}</b>: {list.length} {list.length === 1 ? "finding" : "findings"} with their method, and the limits of the record. Built {built}.</>}
          actions={<Btn variant="primary" icon={<Printer size={16} aria-hidden />} onClick={() => window.print()} disabled={!city || loading || !!error}>Print or save as PDF</Btn>} />
      </div>
      <Body narrow>
        <div className="no-print"><Lanes<Period> label="Period" value={period} onChange={setPeriod} lanes={[{ id: "all", label: ld?.capped ? "Loaded record" : "Whole record" }, { id: "12m", label: "Last 12 months" }]} /></div>
        {loading && <p className="pb-fine" role="status">Reading the public record…</p>}
        {error && <Empty alert title="Not read">{error} Nothing is shown as zero.</Empty>}
        {city && !loading && !error && (
          <article className="cr-doc">
            <div className="print-only cr-brand" aria-hidden><b>StrayPaw</b><span>City report · {city} · printed {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
            <section className="cr-cover">
              <p className="cr-k">StrayPaw · city report</p>
              <p className="cr-title" role="heading" aria-level={2}>Street animals in {city}</p>
              <p className="cr-dek">What the shared record shows, and what it cannot yet say. {scope}, built {built}.</p>
              {ld?.capped && <Note><b>Loaded scope.</b> Built from the most recent {ld.totals.cases ? <>{ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests and </> : null}{ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles in {city}. Older records are not in these figures.</Note>}
              {ev && <p className="cr-ev"><b>{KINDS[ev.kind].label}.</b> {ev.precision}. {ev.note}</p>}
            </section>
            <nav className="cr-contents" aria-label="Contents">
              <h2>Contents</h2>
              <ol>{list.map((x, i) => <li key={x.id}><a href={`#${x.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{x.kicker}</a></li>)}<li><a href="#limits"><span>{String(list.length + 1).padStart(2, "0")}</span>The limits of this record</a></li></ol>
            </nav>
            {!list.length && <p className="cr-ev">The record for {city} in this period is too thin to support a finding.</p>}
            {list.map((x, i) => <FindingView key={x.id} x={x} i={i} city={city} print />)}
            <section className="fd is-print" id="limits" aria-labelledby="limits-h">
              <p className="fd-k"><span aria-hidden>{String(list.length + 1).padStart(2, "0")}</span>Limits</p>
              <h2 id="limits-h" className="fd-claim">The limits of this record</h2>
              <ul className="cr-list">
                <li>It is the work of the organisations that share their records with StrayPaw, not a census of animals or of all care in {city}.</li>
                <li>Animal profiles, requests, sightings and care events are different units. None of them, alone or added together, is a count of unique animals.</li>
                <li>Places are areas of about 0.74 km² or recorded localities. They are analysis areas, not wards, and never an animal&rsquo;s exact spot.</li>
                <li>Where something was not recorded, it is reported as not recorded, never as zero or as no.</li>
                <li>Official census and research estimates, where they exist, are separate sources with their own year and method, and are not mixed into these figures.</li>
              </ul>
              <p className="fd-cap">Figures are read from the live record when the report is opened and may change as organisations add records. Cite with the build date above.</p>
            </section>
          </article>
        )}
      </Body>
    </>
  );
}
