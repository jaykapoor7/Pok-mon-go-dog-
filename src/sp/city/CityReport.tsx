"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · City report (decisions 024, 034; reference 13 Stripe
   Press). A publication built from the same findings as Insights: cover,
   contents, numbered findings with their method written out, and the
   limits of the record. Printed or saved as PDF from the browser; the
   page itself is the document, so nothing is generated elsewhere.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { Printer } from "lucide-react";
import { Btn, Empty, Head, Lanes, Note, Page, Panel, Tools } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useSpatialDataset } from "../data/spatial";
import { cityEvidence, KINDS } from "../atlas/evidence";
import { findings, loadedScope, type Period } from "./findings";
import { FindingView, Hatch } from "./Findings";
import "./city.css";

export function CityReport() {
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = usePageState<Period>("period", "all");
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  const ev = city ? cityEvidence(city, cities.find((c) => c.city === city)?.cells ?? 0) : null;
  const built = ds ? new Date(ds.built).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const scope = period === "all" ? (ld?.capped ? "The most recent loaded record" : "The whole record") : "The last twelve months";

  /* The page is the document: a narrow column on screen, the same column on paper. The head and the period are the screen's own. */
  return (
    <Page width="narrow" className="crk">
      <Hatch />
      <div className="no-print">
        <Head title="City report"
          sum={loading ? "Reading the public record…" : error || !city ? "The report could not be built." : <>Street animals in <b>{city}</b>: {list.length} {list.length === 1 ? "finding" : "findings"} with their method, and the limits of the record. Built {built}.</>}
          actions={<Btn variant="primary" icon={<Printer size={14} />} onClick={() => window.print()} disabled={!city || loading || !!error}>Print or save as PDF</Btn>} />
        <Tools><Lanes<Period> label="Period" value={period} onChange={setPeriod} lanes={[{ id: "all", label: ld?.capped ? "Loaded record" : "Whole record" }, { id: "12m", label: "Last 12 months" }]} /></Tools>
      </div>
      {loading && <Panel><p className="mh-quiet" role="status">Reading the public record…</p></Panel>}
      {error && <Panel><div role="alert"><Empty title="Didn't load">{error}</Empty></div></Panel>}
      {city && !loading && !error && (
        <article className="crk-doc">
          <div className="print-only crk-brand" aria-hidden><b>StrayPaw</b><span>City report · {city} · printed {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
          <section className="crk-cover">
            <p className="crk-k">StrayPaw · city report</p>
            <p className="crk-title" role="heading" aria-level={2}>Street animals in {city}</p>
            <p className="crk-dek">What the shared record shows, and what it cannot yet say. {scope}, built {built}.</p>
            {ld?.capped && <Note><span><b>Loaded scope.</b> Built from the most recent {ld.totals.cases ? <>{ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests and </> : null}{ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles in {city}. Older records are not in these figures.</span></Note>}
            {ev && <p className="crk-ev"><b>{KINDS[ev.kind].label}.</b> {ev.precision}. {ev.note}</p>}
          </section>
          <nav className="crk-contents" aria-label="Contents">
            <h2>Contents</h2>
            <ol>{list.map((x, i) => <li key={x.id}><a href={`#${x.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{x.kicker}</a></li>)}<li><a href="#limits"><span>{String(list.length + 1).padStart(2, "0")}</span>The limits of this record</a></li></ol>
          </nav>
          {!list.length && <p className="crk-thin">The record for {city} in this period is too thin to support a finding.</p>}
          {list.map((x, i) => <FindingView key={x.id} x={x} i={i} city={city} print />)}
          <section className="fnd is-print" id="limits" aria-labelledby="limits-h">
            <p className="fnd-k"><span aria-hidden>{String(list.length + 1).padStart(2, "0")}</span>Limits</p>
            <h2 id="limits-h" className="fnd-claim">The limits of this record</h2>
            <ul className="crk-list">
              <li>It is the work of the organisations that share their records with StrayPaw, not a census of animals or of all care in {city}.</li>
              <li>Animal profiles, requests, sightings and care events are different units. None of them, alone or added together, is a count of unique animals.</li>
              <li>Places are areas of about 0.74 km² or recorded localities. They are analysis areas, not wards, and never an animal&rsquo;s exact spot.</li>
              <li>Where something was not recorded, it is reported as not recorded, never as zero or as no.</li>
              <li>Official census and research estimates, where they exist, are separate sources with their own year and method, and are not mixed into these figures.</li>
            </ul>
            <p className="fnd-cap">Figures are read from the live record when the report is opened and may change as organisations add records. Cite with the build date above.</p>
          </section>
        </article>
      )}
    </Page>
  );
}
