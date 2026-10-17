"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Care ledger (1.0 /partner/medical).

   Two views of the organisation's medical work, read under the member's
   session: every care event in date order, each beside the animal it was
   given to and filterable by kind; and the cases that carry medical
   work. Read only: care is recorded from the animal's record, where the
   database checks the writer. A failed read says "Not read".
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPartnerCases } from "@/lib/cases";
import type { PartnerMedicalEvent } from "@/lib/animal-actions";
import { MEDICAL_KINDS, speciesLabel, type Case } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useMembership } from "../../shell/Shell";
import { Method, State, n, since, PageBrief } from "../../ui";
import { NgoGate } from "../Gate";
import { CARE_LIMIT, readCare } from "./read";
import "../ngo.css";
import "./records.css";

const labelFor = (kind: string) => MEDICAL_KINDS.find((k) => k.id === kind)?.label ?? kind;
const MEDICAL_CATEGORIES = new Set(["injury", "vaccination", "sterilisation"]);
const isMedical = (c: Case) => !!c.medical_notes || MEDICAL_CATEGORIES.has(c.category);
const month = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

type Load<T> = { state: "loading" } | { state: "failed"; error: string } | ({ state: "read" } & T);

export function CareLedger() {
  const mem = useMembership();
  const [view, setView] = useState<"events" | "cases">("events");
  return (
    <NgoGate title="Care ledger" lede="Treatment, vaccination and field care in date order, each attached to its animal.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · records</p><h1 className="serif">Care ledger</h1></div>
          <p className="ngo-sum">Treatment, vaccination and field care in date order, each attached to the animal it was given to. Only your organisation&rsquo;s work appears. Care is added from an animal&rsquo;s record.</p>
        </header>
        <PageBrief items={[["For", "Every treatment, vaccination and sterilisation your organisation recorded, attached to its animal."], ["Watch", "Care with no clinician named, and medical cases still open."], ["Next", "Open the animal to add or correct care."], ["After", "The event appears here and on the animal’s record, dated."]]} />
        <div className="tabs rc-tabs" role="tablist" aria-label="Care ledger view">
          <button type="button" role="tab" id="rc-t-ev" aria-controls="rc-p" aria-selected={view === "events"} onClick={() => setView("events")}>Animal care history</button>
          <button type="button" role="tab" id="rc-t-cs" aria-controls="rc-p" aria-selected={view === "cases"} onClick={() => setView("cases")}>Medical cases</button>
        </div>
        <div id="rc-p" role="tabpanel" aria-labelledby={view === "events" ? "rc-t-ev" : "rc-t-cs"} className="rc-body">
          {mem.member && (view === "events" ? <Events /> : <MedicalCases />)}
        </div>
      </div>
    </NgoGate>
  );
}

function Events() {
  const [d, setD] = useState<Load<{ rows: PartnerMedicalEvent[]; total: number }>>({ state: "loading" });
  const [kind, setKind] = useState("all");
  const load = useCallback(() => {
    setD({ state: "loading" });
    readCare().then((r) => setD({ state: "read", ...r })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => (d.state === "read" ? d.rows : []), [d]);
  const kinds = useMemo(() => { const m = new Map<string, number>(); rows.forEach((e) => m.set(e.kind, (m.get(e.kind) ?? 0) + 1)); return [...m.entries()]; }, [rows]);
  const visible = kind === "all" ? rows : rows.filter((e) => e.kind === kind);
  const groups = useMemo(() => { const g: { m: string; rows: PartnerMedicalEvent[] }[] = []; for (const e of visible) { const m = month(e.event_date); if (g.at(-1)?.m !== m) g.push({ m, rows: [] }); g.at(-1)!.rows.push(e); } return g; }, [visible]);

  if (d.state === "loading") return <div className="rc-skel" aria-label="Reading care history"><span className="skel" /><span className="skel" /><span className="skel" /></div>;
  if (d.state === "failed") return <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={load}>Try again</button>}>The care history could not be read ({d.error}). Nothing is shown as empty.</State>;
  if (!d.rows.length) return <State art="ngo-empty" title="No care recorded yet" action={<Link className="btn is-ink" href="/ngo/animals">Open the animal register</Link>}>Open an animal and add treatment, vaccination or sterilisation to its history. It appears here, dated and attached to that animal.</State>;

  return (
    <div className="rc-stack">
      <Method items={[["Scope", "your organisation's animals"], ["Showing", d.total > d.rows.length ? `newest ${n(d.rows.length)} of ${n(d.total)}` : `all ${n(d.total)}`], ["Dates", "as recorded"]]} />
      <div className="rc-chips" role="group" aria-label="Filter by kind of care">
        <button type="button" className="chip" aria-pressed={kind === "all"} onClick={() => setKind("all")}>All care <span className="n">{n(rows.length)}</span></button>
        {kinds.map(([k, c]) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{labelFor(k)} <span className="n">{n(c)}</span></button>)}
      </div>
      {d.total > d.rows.length && <p className="small">Older entries are on each animal&rsquo;s record. The filter applies to the {n(d.rows.length)} shown.</p>}
      <div className="rc-scroll" role="region" aria-label="Care events" tabIndex={0}>
        <table className="rc-table rc-care">
          <thead><tr><th scope="col">Date</th><th scope="col">Care</th><th scope="col">Animal</th><th scope="col">Notes</th><th scope="col">Given by</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
          {groups.map((g) => (
            <tbody key={g.m}>
              <tr className="rc-month"><th colSpan={6} scope="colgroup"><span className="serif">{g.m}</span></th></tr>
              {g.rows.map((e) => {
                const name = e.animal.name || e.animal.code || "Unnamed animal";
                return (
                  <tr key={e.id}>
                    <td className="mono rc-date"><time dateTime={e.event_date}>{formatDate(e.event_date)}</time></td>
                    <td><span className="pill is-care">{labelFor(e.kind)}</span></td>
                    <td className="rc-who"><b>{name}</b><small className="mono">{[e.animal.code, e.animal.zone].filter(Boolean).join(" · ") || "Animal record"}</small></td>
                    <td className="rc-note">{e.notes || <i className="small">No notes</i>}</td>
                    <td className="rc-by">{e.performed_by || <span className="pill is-unknown">Not recorded</span>}</td>
                    <td className="rc-open"><Link className="btn is-ghost is-s" href={`/ngo/animals/${e.animal.id}`} aria-label={`Open ${name}'s record`}>Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      {!visible.length && <p className="small">No {labelFor(kind).toLowerCase()} entries in this organisation&rsquo;s record.</p>}
    </div>
  );
}

function MedicalCases() {
  const [d, setD] = useState<Load<{ rows: Case[] }>>({ state: "loading" });
  const load = useCallback(() => {
    setD({ state: "loading" });
    getPartnerCases().then((rows) => setD({ state: "read", rows })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(load, [load]);
  const medical = useMemo(() => (d.state === "read" ? d.rows.filter(isMedical).sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)) : []), [d]);

  if (d.state === "loading") return <div className="rc-skel" aria-label="Reading medical cases"><span className="skel" /><span className="skel" /><span className="skel" /></div>;
  if (d.state === "failed") return <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={load}>Try again</button>}>Medical cases could not be read ({d.error}). Nothing is shown as empty.</State>;
  if (!medical.length) return <State art="ngo-empty" title="No medical cases yet" action={<Link className="btn is-ink" href="/ngo">Open the work queue</Link>}>Cases about injury, vaccination or sterilisation, or with medical notes, appear here. Cases from other organisations never do.</State>;

  return (
    <div className="rc-stack">
      <Method items={[["Scope", "your organisation's cases"], ["Read", `${n(d.state === "read" ? d.rows.length : 0)} most recently active`], ["Medical", `${n(medical.length)}: injury, vaccination, sterilisation or with medical notes`]]} />
      <div className="rc-scroll" role="region" aria-label="Medical cases" tabIndex={0}>
        <table className="rc-table rc-cases">
          <thead><tr><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Animal · locality</th><th scope="col">Last activity</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
          <tbody>
            {medical.map((c) => (
              <tr key={c.id}>
                <td className="rc-who"><b>{c.title}</b>{c.medical_notes && <small>{c.medical_notes}</small>}</td>
                <td><span className={`pill${c.status === "resolved" || c.status === "closed" ? " is-care" : " is-info"}`}>{c.status.replace("_", " ")}</span></td>
                <td>{speciesLabel(c.species ?? "dog")}{c.zone ? ` · ${c.zone}` : ""}</td>
                <td className="mono rc-date">{since(c.last_activity_at)}</td>
                <td className="rc-open"><Link className="btn is-ghost is-s" href={`/ngo/cases/${c.id}`} aria-label={`Open case ${c.title}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
