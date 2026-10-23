"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · Insights (decision 034): place → evidence → supported
   interpretation → records. A register of numbered findings for one
   city, each claim beside its limit, its figure and its method. No
   coverage percentages, cost forecasts or allocation scores: the record
   cannot support them, so they are not drawn.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { rememberHome, resolveHome } from "@/lib/home-city";
import { Printer } from "lucide-react";
import { useSpatialDataset } from "../data/spatial";
import { cityEvidence, KINDS } from "../atlas/evidence";
import { State } from "../ui";
import { findings, loadedScope, type Period } from "./findings";
import { FindingView, Hatch } from "./Findings";
import { MobileDetails } from "../ui/MobileDetails";
import "./city.css";

export function Insights() {
  const router = useRouter();
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = useState<Period>("all");
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  const ev = city ? cityEvidence(city, cities.find((c) => c.city === city)?.cells ?? 0) : null;
  const pick = (c: string) => { rememberHome(c); router.replace(`/city/insights?city=${encodeURIComponent(c)}`, { scroll: false }); };
  /* With no city in the link, open the person's own city, not simply the largest. */
  const asked = useSearchParams().get("city");
  const homed = useRef(!!asked);
  useEffect(() => {
    if (homed.current || !cities.length) return;
    homed.current = true;
    resolveHome(cities).then((home) => { if (home && home !== city && cities.some((c) => c.city === home)) router.replace(`/city/insights?city=${encodeURIComponent(home)}`, { scroll: false }); });
  }, [cities, city, router]);

  return (
    <div className="ci">
      <Hatch />
      <header className="ci-head">
        <div className="ci-title">
          <p className="k">Municipality · insights</p>
          <h1 className="display">{city ?? "Insights"}</h1><p className="ci-sub">What the record supports</p>
        </div>
        {cities.length > 0 && <div className="ci-controls">
          <label className="field"><span className="label">City</span><select className="select" value={city ?? ""} onChange={(e) => pick(e.target.value)} disabled={!cities.length}>{cities.filter((c) => c.cases > 0 || c.animals > 0).map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}</select></label>
          <div className="seg" role="group" aria-label="Period"><button type="button" aria-pressed={period === "all"} onClick={() => setPeriod("all")}>{ld?.capped ? "Loaded record" : "Whole record"}</button><button type="button" aria-pressed={period === "12m"} onClick={() => setPeriod("12m")}>Last 12 months</button></div>
          {city && <Link className="btn is-s" href={`/city/report?city=${encodeURIComponent(city)}`}><Printer size={14} aria-hidden /> City report</Link>}
        </div>}
        {ld?.capped && <p className="ci-loaded" role="note"><b>Partial record.</b> Showing {ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles{ld.totals.cases ? <> and {ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests</> : null}. Older records are outside these findings.</p>}
        {ev && <p className="ci-ev"><span className="ci-kind" style={{ ["--ink" as string]: KINDS[ev.kind].ink }}>{KINDS[ev.kind].label}</span> {ev.precision}. {ev.note}</p>}
      </header>
      {loading && <div className="ci-wrap"><div className="skel" style={{ height: 260 }} /><div className="skel" style={{ height: 260, marginTop: 20 }} /></div>}
      {error && <State kind="error" title="Not read" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button>}>{error} Nothing is shown as zero.</State>}
      {!loading && !error && city && !list.length && <State title="Too little to say">The record for {city} in this period is too thin to support a finding. That is a statement about the record, not about the animals.</State>}
      {list.length > 0 && (
        <div className="ci-wrap">
          <MobileDetails label="Jump to a finding" className="ci-index-fold"><nav className="ci-index" aria-label="Findings">
            <p className="k">{list.length} findings</p>
            <ol>{list.map((x, i) => <li key={x.id}><a href={`#${x.id}`}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{x.kicker}</a></li>)}</ol>
            <p className="small">Each finding says what it counts and what it cannot say. Figures come from the live record when this page was opened.</p>
          </nav></MobileDetails>
          <div className="ci-list">{list.map((x, i) => <FindingView key={x.id} x={x} i={i} city={city!} />)}</div>
        </div>
      )}
    </div>
  );
}
