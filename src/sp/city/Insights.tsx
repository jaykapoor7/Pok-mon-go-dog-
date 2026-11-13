"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · Insights (decision 034): place → evidence → supported
   interpretation → records. A register of numbered findings for one
   city, each claim beside its limit, its figure and its method. No
   coverage percentages, cost forecasts or allocation scores: the record
   cannot support them, so they are not drawn.
   ════════════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { rememberHome, resolveHome } from "@/lib/home-city";
import { myContext } from "@/lib/abc";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, Empty, Head, Lanes, Note, Page, Panel, Section, Split, Tools } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useSpatialDataset } from "../data/spatial";
import { cityEvidence, KINDS } from "../atlas/evidence";
import { firstName, greeting } from "../ui/Daily";
import { findings, loadedScope, type Period } from "./findings";
import { FindingView, Hatch } from "./Findings";
import { OfficeStrip } from "./OfficeStrip";
import "./city.css";

export function Insights() {
  const router = useRouter();
  const { user } = useAuth();
  const { ds, ix, city, cities, error, loading } = useSpatialDataset("public");
  const [period, setPeriod] = usePageState<Period>("period", "all");
  /* One finding at a time: the numbered list is the menu, so the page never runs long. */
  const [fid, setFid] = usePageState<string | null>("finding", null);
  /* A reviewing office lands on its command view; the public findings fold under it so the home fits one screen. */
  const [office, setOffice] = useState(false);
  const [, setPub] = usePageState<boolean>("sec:public-record", false);
  useEffect(() => { if (window.location.hash.length > 1) setPub(true); }, [setPub]);
  const row = cities.find((c) => c.city === city);
  const ld = useMemo(() => (ds && ix && city && row ? loadedScope(ds, ix, city, { cases: row.cases, animals: row.animals, open: row.open_cases ?? null }) : null), [ds, ix, city, row]);
  const list = useMemo(() => (ds && ix && city && ld ? findings(ds, ix, city, period, ld) : []), [ds, ix, city, period, ld]);
  useEffect(() => { const id = window.location.hash.slice(1); if (id && list.some((x) => x.id === id)) setFid(id); }, [list, setFid]);
  const on = Math.max(0, list.findIndex((x) => x.id === fid));
  const shown = list[on];
  const show = (i: number) => { const x = list[i]; if (!x) return; setFid(x.id); history.replaceState(null, "", `#${x.id}`); };
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

  const first = firstName(user?.name);
  const source = ev ? <>from {KINDS[ev.kind].label.toLowerCase()} ({ev.precision.toLowerCase()}). {ev.note}</> : null;

  /* The public record: period and city, then one finding with the numbered list beside it. */
  const record = (
    <>
      {cities.length > 0 && (
        <Tools end={<>
          <label className="mh-pick"><span className="sr-only">City</span><select value={city ?? ""} onChange={(e) => pick(e.target.value)} disabled={!cities.length}>{cities.filter((c) => c.cases > 0 || c.animals > 0).map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}</select></label>
          {city && <Btn href={`/city/report?city=${encodeURIComponent(city)}`} icon={<Printer size={14} />}>City report</Btn>}
        </>}>
          <Lanes<Period> label="Period" value={period} onChange={setPeriod} lanes={[{ id: "all", label: ld?.capped ? "Loaded record" : "Whole record" }, { id: "12m", label: "Last 12 months" }]} />
        </Tools>
      )}
      {office && source ? <p className="mh-note">{city}: what the record supports, {source}</p> : null}
      {ld?.capped && <Note><span><b>Partial record.</b> Showing {ld.animals.toLocaleString("en-IN")} of {ld.totals.animals.toLocaleString("en-IN")} animal profiles{ld.totals.cases ? <> and {ld.cases.toLocaleString("en-IN")} of {ld.totals.cases.toLocaleString("en-IN")} requests</> : null}. Older records are outside these findings.</span></Note>}
      {away && city !== away && <Note>No public record for {away} yet. It fills in as your operators’ approved records are published. Showing {city ?? "another city"} meanwhile.</Note>}
      {loading && <Panel><p className="mh-quiet" role="status">Reading the public record…</p></Panel>}
      {error && <Panel><div role="alert"><Empty title="Didn't load" action={<Btn onClick={() => window.location.reload()}>Try again</Btn>}>{error} Nothing is shown as zero.</Empty></div></Panel>}
      {!loading && !error && city && !list.length && <Panel><Empty title="Too little to say">The record for {city} in this period is too thin to support a finding. That is a statement about the record, not about the animals.</Empty></Panel>}
      {list.length > 0 && shown && (
        <Split side={
          <Section title="Findings" count={list.length}>
            <nav aria-label="Findings"><ol className="mh-menu">
              {list.map((x, i) => <li key={x.id}><button type="button" aria-current={i === on ? "true" : undefined} onClick={() => show(i)}><span>{String(i + 1).padStart(2, "0")}</span>{x.kicker}</button></li>)}
            </ol></nav>
          </Section>
        }>
          <Panel pad><FindingView key={shown.id} x={shown} i={on} city={city!} /></Panel>
          <div className="mh-step">
            <Btn small disabled={on === 0} onClick={() => show(on - 1)}>Previous finding</Btn>
            <span>{on + 1} of {list.length}</span>
            <Btn small disabled={on >= list.length - 1} onClick={() => show(on + 1)}>Next finding</Btn>
          </div>
        </Split>
      )}
    </>
  );

  return (
    <Page className="mh">
      <Hatch />
      <OfficeStrip onOffice={setOffice} />
      {office
        ? <Section fold="public-record" open={false} title="Public record" note="Published research data for the city, separate from your office’s records.">{record}</Section>
        : <>
            <Head title={`${greeting()}${first ? `, ${first}` : ""}.`}
              sum={!city ? (error ? "The public record could not be read." : "Reading the public record…") : <>What <b>{city}</b>’s public record supports{source ? <>, {source}</> : "."}</>} />
            {record}
          </>}
    </Page>
  );
}
