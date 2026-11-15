"use client";

/* Resources (/learn/resources): practise a report (feedback on this page
   only; nothing is submitted), rescue helplines with tap-to-call, what to do
   after a bite, the classroom documents, a directory of animal-welfare
   organisations across India and the education partners. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { EDUCATION_PARTNERS } from "@/lib/platform/education";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";
import { Exercise } from "@/sp/learn/Interactives";
import { Body, Btn, Empty, Fold, Head, List, Row, SearchBox, Sec, Split, Table, Tools, type Col } from "../kit";
import { BiteSteps, Helplines } from "../community/Help";
import "./learn.css";

const stateName = new Map(STATES.map((s) => [s.code, s.name]));
type Org = (typeof ORGS)[number];

function ReportPractice() {
  const [done, setDone] = useState(false);
  return (
    <Sec title="Practise a useful report" note="Nothing is submitted. Describe a place and what you saw, and get feedback before making a real report.">
      <div className="lx-do"><div className="lx-ex"><Exercise id="practice-report" onDone={() => setDone(true)} /></div></div>
      {done && <p role="status" className="pb-ack is-saved">Practice complete. You kept observations separate from assumptions.</p>}
    </Sec>
  );
}

function Directory() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [all, setAll] = useState(false);
  const states = useMemo(() => [...new Set(ORGS.map((o) => o.stateCode))].map((c) => [c, stateName.get(c) ?? c] as const).sort((a, b) => a[1].localeCompare(b[1])), []);
  const t = q.trim().toLowerCase();
  const rows = ORGS.filter((o) => (!st || o.stateCode === st) && (!t || `${o.name} ${o.city} ${o.focus.join(" ")}`.toLowerCase().includes(t)));
  const shown = all ? rows : rows.slice(0, 8);
  const cols: Col<Org>[] = [
    { key: "name", label: "Organisation", render: (o) => o.name },
    { key: "place", label: "Place", render: (o) => <>{o.city}, {stateName.get(o.stateCode) ?? o.stateCode}{o.founded ? ` · since ${o.founded}` : ""}</> },
    { key: "focus", label: "Work", render: (o) => o.focus.join(" · ") },
    { key: "source", label: "Source", render: (o) => o.source },
    { key: "url", label: "Website", render: (o) => (o.url ? <a className="pb-link" href={o.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12} aria-hidden /><span className="pb-sr"> {o.name} website (new tab)</span></a> : <span className="pb-unknown">Not listed</span>) },
  ];
  return (
    <div className="pb-sec">
      <Tools end={<span className="pb-fine" aria-live="polite">{rows.length} of {ORGS.length}</span>}>
        <SearchBox value={q} onChange={(v) => { setQ(v); setAll(false); }} placeholder="Name, city or kind of work" label="Search organisations" />
        <label><span className="pb-sr">State</span><select className="pb-select" value={st} onChange={(e) => { setSt(e.target.value); setAll(false); }}><option value="">Every state</option>{states.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
      </Tools>
      <Table label="Animal-welfare organisations" cols={cols} rows={shown} rowKey={(o) => o.id} empty={<Empty title="No organisation matches">Try a different name, city or state.</Empty>} />
      {rows.length > shown.length && <div><Btn onClick={() => setAll(true)}>Show all {rows.length} organisations</Btn></div>}
    </div>
  );
}

export function Resources() {
  return (
    <>
      <Head back="/learn" eyebrow="StrayPaw Academy" title="Resources" sum="Practise a report, find who to call, know what to do after a bite, and see who teaches this well." />
      <Body>
        <Split side={<>
          <Sec id="helplines" title="Rescue helplines" note="Established rescue organisations, not StrayPaw lines, for an injured, trapped or distressed animal.">
            <Helplines />
            <p className="pb-fine">Or <Link href="/community/report">report the animal on StrayPaw</Link>; you will see whether an organisation takes it.</p>
          </Sec>
          <Sec id="after-a-bite" title="After a bite or scratch" note="Not medical advice: a doctor decides the schedule.">
            <BiteSteps />
            <p className="pb-fine"><Link href="/learn/courses/on-the-street/after-a-bite">The lesson</Link></p>
          </Sec>
        </>}>
          <ReportPractice />
          <Sec title="Classroom documents">
            <List label="Classroom documents"><Row href="/learn#kind-hour" title="Classroom documents" meta="Teaching decks by The Kind Hour Foundation, in the Academy" /></List>
          </Sec>
          <div id="directory">
            <Fold title="Animal-welfare organisations across India" count={ORGS.length}>
              <p className="pb-fine">A directory, not an endorsement. Each entry names its source. StrayPaw&rsquo;s partners are under <Link href="/community/organisations">Organisations</Link>.</p>
              <Directory />
            </Fold>
          </div>
          <Fold title="Education partners" count={EDUCATION_PARTNERS.length}>
            <ul className="lx-partners">{EDUCATION_PARTNERS.map((p) => <li key={p.id}><b>{p.fullName}</b><small>{p.city}</small><p>{p.summary}</p><ul>{p.programmes.map((x) => <li key={x}>{x}</li>)}</ul><a className="pb-link" href={p.url} target="_blank" rel="noreferrer">{p.source} <ExternalLink size={12} aria-hidden /><span className="pb-sr"> (new tab)</span></a></li>)}</ul>
            <p className="pb-fine">Descriptions are each organisation&rsquo;s own account of its work. Naming them here is not a claim of partnership beyond the material they shared.</p>
          </Fold>
        </Split>
      </Body>
    </>
  );
}
