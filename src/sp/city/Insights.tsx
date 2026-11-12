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
import { myContext } from "@/lib/abc";
import { Printer } from "lucide-react";
import { useSpatialDataset } from "../data/spatial";
import { cityEvidence, KINDS } from "../atlas/evidence";
import { State } from "../ui";
import { PageHead, Seg } from "../ui/Page";
import { findings, loadedScope, type Period } from "./findings";
import { FindingView, Hatch } from "./Findings";
import { MobileDetails } from "../ui/MobileDetails";
import { OfficeStrip } from "./OfficeStrip";
import "./city.css";

export function Insights() {
  const router = useRouter();
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = useState<Period>("all");
  /* One finding at a time: the numbered list is the menu, so the page never runs long. */
  const [on, setOn] = useState(0);
  /* A reviewing office lands on its command view; the public findings fold under it so the home fits one screen. */
  const [office, setOffice] = useState(false);
  const [pub, setPub] = useState(false);
  useEffect(() => { if (window.location.hash.length > 1) setPub(true); }, []);
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  useEffect(() => { setOn(0); }, [city, period]);
  useEffect(() => { const id = window.location.hash.slice(1); const i = list.findIndex((x) => x.id === id); if (i >= 0) setOn(i); }, [list]);
  const shown = list[Math.min(on, Math.max(0, list.length - 1))];
  const ev = city ? cityEvidence(city, cities.find((c) => c.city === city)?.cells ?? 0) : null;
  const pick = (c: string) => { rememberHome(c); router.replace(`/city/insights?city=${encodeURIComponent(c)}`, { scroll: false }); };
  /* With no city in the link, open the person's own city, not simply the largest. */
  const asked = useSearchParams().get("city");
  const homed = useRef(!!asked);
  /* The office's own city when the public record has not reached it yet, said plainly. */
  const [away, setAway] = useState<string | null>(null);
  useEffect(() => {
    if (homed.current || !cities.length) return;
    homed.current = true;
    /* A reviewing office opens on its own city when the record has reached it. */
    myContext().then((c) => { const want = c.offices.map((o) => o.city?.trim().toLowerCase()).filter(Boolean); const hit = cities.find((x) => want.includes(x.city.trim().toLowerCase()))?.city ?? null; if (!hit && c.offices[0]?.city) setAway(c.offices[0].city); return hit; }).catch(() => null).then((o) => o ?? resolveHome(cities)).then((home) => { if (home && home !== city && cities.some((c) => c.city === home)) router.replace(`/city/insights?city=${encodeURIComponent(home)}`, { scroll: false }); });
  }, [cities, city, router]);

  return (
    <div className="ci">
      <Hatch />
      <OfficeStrip onOffice={setOffice} publicOpen={pub} onPublic={() => setPub((v) => !v)} />
      {(!office || pub) && <div className="vw ci-v">
      <PageHead title={city ?? "Insights"}
        sum={<>What the record supports{ev ? <>, from <span className="ci-kind2" style={{ ["--ink" as string]: KINDS[ev.kind].ink }}>{KINDS[ev.kind].label.toLowerCase()}</span> ({ev.precision.toLowerCase()}). {ev.note}</> : "."}</>}
        actions={cities.length > 0 ? <>
          <label className="cpv-city-pick"><span className="sr-only">City</span><select value={city ?? ""} onChange={(e) => pick(e.target.value)} disabled={!cities.length}>{cities.filter((c) => c.cases > 0 || c.animals > 0).map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}</select></label>
          {city && <Link className="btn is-s" href={`/city/report?city=${encodeURIComponent(city)}`}><Printer size={14} aria-hidden /> City report</Link>}
        </> : undefined} />
      {cities.length > 0 && <div className="vw-bar"><Seg<Period> label="Period" value={period} onChange={setPeriod} options={[{ id: "all", label: ld?.capped ? "Loaded record" : "Whole record" }, { id: "12m", label: "Last 12 months" }]} /></div>}
      {ld?.capped && <p className="vw-note" role="note"><span><b>Partial record.</b> Showing {ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles{ld.totals.cases ? <> and {ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests</> : null}. Older records are outside these findings.</span></p>}
      {away && city !== away && <p className="vw-note" role="note"><span>No public record for {away} yet. It fills in as your operators’ approved records are published. Showing {city ?? "another city"} meanwhile.</span></p>}
      {loading && <div className="ci-wrap"><div className="skel" style={{ height: 260 }} /><div className="skel" style={{ height: 260, marginTop: 20 }} /></div>}
      {error && <State kind="error" title="Didn't load" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button>}>{error} Nothing is shown as zero.</State>}
      {!loading && !error && city && !list.length && <State title="Too little to say">The record for {city} in this period is too thin to support a finding. That is a statement about the record, not about the animals.</State>}
      {list.length > 0 && (
        <div className="ci-wrap">
          <MobileDetails label="Jump to a finding" className="ci-index-fold"><nav className="ci-index" aria-label="Findings">
            <p className="k">{list.length} findings</p>
            <ol>{list.map((x, i) => <li key={x.id}><button type="button" className="ci-tab" aria-current={i === on ? "true" : undefined} onClick={() => { setOn(i); history.replaceState(null, "", `#${x.id}`); }}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{x.kicker}</button></li>)}</ol>

          </nav></MobileDetails>
          <div className="ci-list">
            {shown && <FindingView key={shown.id} x={shown} i={on} city={city!} />}
            <div className="ci-step">
              <button type="button" className="btn is-s" disabled={on === 0} onClick={() => setOn((n) => n - 1)}>Previous finding</button>
              <span className="small">{on + 1} of {list.length}</span>
              <button type="button" className="btn is-s is-ink" disabled={on >= list.length - 1} onClick={() => setOn((n) => n + 1)}>Next finding</button>
            </div>
          </div>
        </div>
      )}
      </div>}
    </div>
  );
}
