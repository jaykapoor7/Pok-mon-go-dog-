"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardPlus, Plus, Share2, Stethoscope } from "lucide-react";
import { Shell } from "../Shell";
import { Sample, TrustChip, initials } from "../ui";
import { ANIMALS } from "../fixtures";
import { AnimalBody } from "./AnimalBody";
import { Check as Tick, ArrowUpRight, Info } from "lucide-react";
import { Chip } from "../ui";
import { useAnimal, useLive, type TimelineEvent } from "../live";

const TABS = ["Summary", "Interventions", "Cases", "Evidence", "Activity"];

function SampleRecord({ id }: { id: string }) {
  const a = ANIMALS.find((x) => x.id === id);
  const [tab, setTab] = useState("Summary");
  const calm = useReducedMotion();
  if (!a) return <Shell crumb={["Animals", id]}><div className="nx-page"><h1 className="nx-h1">No animal with this ID</h1><p className="nx-sub">It may have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/animals" className="nx-btn is-quiet">Back to Animals</Link></p></div></Shell>;
  return (
    <Shell crumb={["Animals", `${a.id}`]}>
      <div className="nx-rec-h">
        <div className="nx-rec-t">
          <span className="nx-rec-av">{initials(a.species)}</span>
          <div><h1><span className="num">{a.id}</span> · {a.name}<Sample /></h1><p>{a.ward} · Last seen {a.last} <TrustChip trust={a.trust} /></p></div>
        </div>
        <div className="nx-rec-acts"><button type="button" className="nx-btn is-sm"><Plus size={13} />Add encounter</button><button type="button" className="nx-btn is-quiet is-sm"><ClipboardPlus size={13} />Start a case</button><button type="button" className="nx-btn is-quiet is-sm"><Stethoscope size={13} />Refer to a vet</button><button type="button" className="nx-btn is-quiet is-sm"><Share2 size={13} />Share</button></div>
      </div>
      <div className="nx-tabs" role="tablist" aria-label="Record sections">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{tab === t ? <motion.span layoutId="nx-tab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
      </div>
      {tab === "Summary" ? <AnimalBody a={a} /> : <div className="nx-page"><p className="nx-sub">{tab} is not built yet. Summary shows the full record.</p></div>}
    </Shell>
  );
}

const word = (v: string | null | undefined, none = "Not recorded") => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : none);
const good = (v: string | null) => !!v && /^(sterili[sz]ed|vaccinated|done|yes|confirmed|verified)$/i.test(v);
/* Some rows carry the device payload after the sentence a person wrote. Show the sentence. */
const prose = (t: string) => t.split(/\s*\{"|\s*Device request:/)[0].trim();
const short = (c: string) => (c.length > 14 ? `${c.slice(0, 4)}…${c.slice(-6)}` : c);
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The record of one real animal: what the register holds, what was logged against it, and its cases. */
function LiveRecord({ id }: { id: string }) {
  const { org } = useLive();
  const a = useAnimal(org!.workspace === "ngo" ? org!.org_id : null, id);
  const [tab, setTab] = useState("Summary");
  const calm = useReducedMotion();
  const now = Date.now(), week = now - 7 * 864e5;
  const groups: [string, TimelineEvent[]][] = [
    ["Upcoming", a.events.filter((e) => Date.parse(e.occurred_at) > now)],
    ["This week", a.events.filter((e) => { const t = Date.parse(e.occurred_at); return t <= now && t >= week; })],
    ["Earlier", a.events.filter((e) => Date.parse(e.occurred_at) < week)],
  ];
  if (a.loading) return <Shell crumb={["Animals", "…"]}><div className="nx-page"><p className="nx-sub">Reading the record…</p></div></Shell>;
  if (!a.dog) return <Shell crumb={["Animals", "Not found"]}><div className="nx-page"><h1 className="nx-h1">No animal with this ID on {org!.name}&apos;s register</h1><p className="nx-sub">{a.error ?? "It may belong to another organisation, or the link is wrong."}</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/animals" className="nx-btn is-quiet">Back to Animals</Link></p></div></Shell>;
  const d = a.dog, code = d.code ?? (d.straypaw_id ? `SP-${d.straypaw_id.slice(-8)}` : d.id.slice(0, 8).toUpperCase());
  const imported = !!d.provenance && /import/i.test(d.provenance);
  const tabs: [string, number?][] = [["Summary"], ["Cases", a.cases.length], ["Activity", a.events.length]];
  const timeline = (
    <section aria-label="Activity and medical history">
      <h3 className="nx-h3">Activity and medical history</h3>
      {a.events.length ? groups.map(([label, es]) => es.length ? (
        <div key={label}><p className={`nx-tl-g ${label === "Upcoming" ? "is-up" : ""}`}>{label}</p>
          <ol className="nx-tl">{es.map((e) => { const med = /vaccin|sterili|surgery|treat|medical/i.test(`${e.event_type} ${e.title}`); return (
            <li key={e.id}><span className={`nx-tl-d ${med ? "t-ok" : ""}`}>{med ? <Tick size={10} strokeWidth={3} /> : null}</span>
              <div><b>{e.title || word(e.event_type, "Event")}</b><small>{when(e.occurred_at)}{e.actor_name ? ` · ${e.actor_name}` : ""}</small>{e.details && prose(e.details) ? <p>{prose(e.details)}</p> : null}<div className="nx-tl-c"><Chip>{e.provenance && /import/i.test(e.provenance) ? "Imported" : "Recorded"}</Chip></div></div></li>); })}</ol></div>
      ) : null) : <p className="nx-sub">Nothing has been logged against this animal yet.</p>}
      <p className="nx-note"><Info size={13} /><span>Events here are as recorded by the organisation. A municipal verification is a separate step and is shown on the submission, not here.</span></p>
    </section>
  );
  const cases = (
    <section aria-label="Cases">
      <h3 className="nx-h3">Cases <span className="nx-count">{a.cases.length}</span></h3>
      {a.cases.length ? <div className="nx-rel">{a.cases.map((c) => <Link key={c.id} href={`/ngo/cases/${c.id}`}><ArrowUpRight size={13} /><span className="num">{short(c.case_code ?? c.id.slice(0, 8).toUpperCase())}</span><span style={{ color: "var(--ink-3)" }}>{c.title || word(c.category, "Case")}</span><small>{c.resolved_at ? "Resolved" : word(c.stage ?? c.status, "Open")}</small></Link>)}</div> : <p className="nx-foot" style={{ marginTop: 0 }}>This animal is not part of any case.</p>}
    </section>
  );
  return (
    <Shell crumb={["Animals", code]}>
      <div className="nx-rec-h">
        <div className="nx-rec-t"><span className="nx-rec-av">{initials(d.species ?? "Dog")}</span><div><h1><span className="num">{code}</span> · {d.name || "Unnamed"}</h1><p>{d.zone ?? d.city ?? "Place not recorded"} · Last seen {d.last_seen ? when(d.last_seen) : "not recorded"} <TrustChip trust={imported ? "Imported" : "Recorded"} /></p></div></div>
        <div className="nx-rec-acts"><Link href={`/ngo/animals/${d.id}`} className="nx-btn is-sm"><Plus size={13} />Add encounter</Link><Link href="/ngo/cases/new" className="nx-btn is-quiet is-sm"><ClipboardPlus size={13} />Start a case</Link></div>
      </div>
      <div className="nx-tabs" role="tablist" aria-label="Record sections">
        {tabs.map(([t, n]) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{n ? <span className="nx-count">{n}</span> : null}{tab === t ? <motion.span layoutId="nx-ltab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
      </div>
      {tab === "Summary" ? (
        <div className="nx-rec">
          <section aria-label="Details">
            <h3 className="nx-h3">Details</h3>
            <dl className="nx-props">
              <div><dt>Animal ID</dt><dd className="num">{code}</dd></div>
              <div><dt>Species</dt><dd>{word(d.species)}</dd></div>
              <div><dt>Sex</dt><dd>{word(d.sex)}</dd></div>
              <div><dt>Colour</dt><dd style={{ fontWeight: 400 }}>{d.color ?? "Not recorded"}</dd></div>
              <div><dt>Place</dt><dd>{d.zone ?? d.city ?? "Not recorded"}</dd></div>
              <div><dt>Marks</dt><dd style={{ fontWeight: 400 }}>{d.identifiers ?? "Not recorded"}</dd></div>
              <div><dt>Sterilisation</dt><dd><Chip tone={good(d.sterilisation_status) ? "ok" : "plain"}>{word(d.sterilisation_status)}</Chip></dd></div>
              <div><dt>Vaccination</dt><dd><Chip tone={good(d.vaccination_status) ? "ok" : "plain"}>{word(d.vaccination_status)}</Chip></dd></div>
              <div><dt>Identity</dt><dd><Chip tone={good(d.identity_state) ? "ok" : "plain"}>{word(d.identity_state)}</Chip></dd></div>
            </dl>
          </section>
          {timeline}
          {cases}
        </div>
      ) : <div className="nx-page">{tab === "Cases" ? cases : timeline}</div>}
    </Shell>
  );
}

export function AnimalRecord({ id }: { id: string }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Animals", "…"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ? <LiveRecord id={id} /> : <SampleRecord id={id} />;
}
