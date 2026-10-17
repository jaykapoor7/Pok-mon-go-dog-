"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · City report (decisions 024, 034; reference 13 Stripe
   Press). A publication built from the same findings as Insights: cover,
   contents, numbered findings with their method written out, and the
   limits of the record. Printed or saved as PDF from the browser; the
   page itself is the document, so nothing is generated elsewhere.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useSpatialDataset } from "../data/spatial";
import { cityEvidence, KINDS } from "../atlas/evidence";
import { ArtSlot, State } from "../ui";
import { findings, loadedScope, type Period } from "./findings";
import { FindingView, Hatch } from "./Findings";
import "./city.css";

export function CityReport() {
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = useState<Period>("all");
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  const ev = city ? cityEvidence(city, cities.find((c) => c.city === city)?.cells ?? 0) : null;
  const built = ds ? new Date(ds.built).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="cr">
      <Hatch />
      <div className="cr-bar no-print">
        <Link className="link" href={`/city/insights${city ? `?city=${encodeURIComponent(city)}` : ""}`}><ArrowLeft size={14} aria-hidden /> Insights</Link>
        <div className="seg" role="group" aria-label="Period"><button type="button" aria-pressed={period === "all"} onClick={() => setPeriod("all")}>{ld?.capped ? "Loaded record" : "Whole record"}</button><button type="button" aria-pressed={period === "12m"} onClick={() => setPeriod("12m")}>Last 12 months</button></div>
        <button type="button" className="btn is-ink is-s" onClick={() => window.print()} disabled={!list.length}><Printer size={14} aria-hidden /> Print or save as PDF</button>
      </div>
      {loading && <div className="skel" style={{ height: 600, margin: 28 }} />}
      {error && <State kind="error" title="Not read">{error}</State>}
      {city && !loading && !error && (
        <article className="cr-doc">
          <section className="cr-cover">
            <p className="k">StrayPaw · city report</p>
            <h1 className="display">Street animals in {city}</h1>
            <p className="cr-dek serif">What the shared record shows, and what it cannot yet say. {period === "all" ? (ld?.capped ? "The most recent loaded record" : "The whole record") : "The last twelve months"}, built {built}.</p>
            {ld?.capped && <p className="ci-loaded"><b>Loaded scope.</b> Built from the most recent {ld.totals.cases ? <>{ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests and </> : null}{ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles in {city}. Older records are not in these figures.</p>}
            {ev && <p className="cr-ev"><span className="ci-kind" style={{ ["--ink" as string]: KINDS[ev.kind].ink }}>{KINDS[ev.kind].label}</span> {ev.precision}. {ev.note}</p>}
            <ArtSlot id="city-report-cover" />
          </section>
          <section className="cr-contents">
            <h2 className="h3">Contents</h2>
            <ol>{list.map((x, i) => <li key={x.id}><a href={`#${x.id}`}><span className="mono">{String(i + 1).padStart(2, "0")}</span> {x.kicker}</a></li>)}<li><a href="#limits"><span className="mono">{String(list.length + 1).padStart(2, "0")}</span> The limits of this record</a></li></ol>
          </section>
          {!list.length && <p className="body">The record for {city} in this period is too thin to support a finding.</p>}
          {list.map((x, i) => <FindingView key={x.id} x={x} i={i} city={city} print />)}
          <section className="cr-limits" id="limits">
            <p className="fi-n serif" aria-hidden>{String(list.length + 1).padStart(2, "0")}</p>
            <div>
              <h2 className="fi-claim serif">The limits of this record</h2>
              <ul className="cr-list">
                <li>It is the work of the organisations that share their records with StrayPaw, not a census of animals or of all care in {city}.</li>
                <li>Animal profiles, requests, sightings and care events are different units. None of them, alone or added together, is a count of unique animals.</li>
                <li>Places are areas of about 0.74 km² or recorded localities. They are analysis areas, not wards, and never an animal&rsquo;s exact spot.</li>
                <li>Where something was not recorded, it is reported as not recorded, never as zero or as no.</li>
                <li>Official census and research estimates, where they exist, are separate sources with their own year and method, and are not mixed into these figures.</li>
              </ul>
              <p className="small">Figures are read from the live record when the report is opened and may change as organisations add records. Cite with the build date above.</p>
            </div>
          </section>
        </article>
      )}
    </div>
  );
}
