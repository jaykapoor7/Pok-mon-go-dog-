"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Care ledger (1.0 /partner/medical).

   Two views of the organisation's medical work, read under the member's
   session: every care event in date order, each beside the animal it was
   given to and filterable by kind; and the cases that carry medical
   work. Read only: care is recorded from the animal's record, where the
   database checks the writer. A failed read says "Not read".
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPartnerCases } from "@/lib/cases";
import type { PartnerMedicalEvent } from "@/lib/animal-actions";
import { MEDICAL_KINDS, speciesLabel, type Case } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Btn, Empty, Head, Lanes, Page, Panel, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../../shell/Shell";
import { n, since } from "../../ui";
import { Pager, SkelRows, pageOf } from "../../abc/Pager";
import { NgoGate } from "../Gate";
import { readCare } from "./read";
import "../ngo.css";
import { friendlyError } from "@/lib/friendly-error";
import { careNote } from "@/lib/care-note";

const labelFor = (kind: string) => MEDICAL_KINDS.find((k) => k.id === kind)?.label ?? (kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));
const MEDICAL_CATEGORIES = new Set(["injury", "vaccination", "sterilisation"]);
const isMedical = (c: Case) => !!c.medical_notes || MEDICAL_CATEGORIES.has(c.category);
type Load<T> = { state: "loading" } | { state: "failed"; error: string } | ({ state: "read" } & T);

type View = "events" | "cases";
const PER = 20;

export function CareLedger() {
  const mem = useMembership();
  const [view, setView] = usePageState<View>("lane", "events");
  const lanes = <Lanes<View> label="Care ledger view" lanes={[{ id: "events", label: "Care given" }, { id: "cases", label: "Medical cases" }]} value={view} onChange={setView} />;
  return (
    <NgoGate title="Care ledger" lede="Treatment, vaccination and field care in date order, each attached to its animal.">
      <Page>{mem.member && (view === "events" ? <Events lanes={lanes} /> : <MedicalCases lanes={lanes} />)}</Page>
    </NgoGate>
  );
}

function Events({ lanes }: { lanes: ReactNode }) {
  const [d, setD] = useState<Load<{ rows: PartnerMedicalEvent[]; total: number }>>({ state: "loading" });
  const [kind, setKind] = usePageState("kind", "all");
  const load = useCallback(() => {
    setD({ state: "loading" });
    readCare().then((r) => setD({ state: "read", ...r })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => (d.state === "read" ? d.rows : []), [d]);
  const kinds = useMemo(() => { const m = new Map<string, number>(); rows.forEach((e) => m.set(e.kind, (m.get(e.kind) ?? 0) + 1)); return [...m.entries()]; }, [rows]);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [kind]);
  const filtered = kind === "all" ? rows : rows.filter((e) => e.kind === kind);
  const { pg, pages, slice: visible } = pageOf(filtered, page, PER);

  const cols: Col<PartnerMedicalEvent>[] = [
    { key: "who", label: "Animal", width: "minmax(0, 1.2fr)", render: (e) => <span className="kx-cell"><span>{e.animal.name || e.animal.code || "Unnamed animal"}<small className="kx-sub">{[labelFor(e.kind), formatDate(e.event_date)].join(" · ")}</small></span></span> },
    { key: "code", label: "Code and place", render: (e) => [e.animal.code, e.animal.zone].filter(Boolean).join(" · ") || <span className="kx-none">Not recorded</span> },
    { key: "kind", label: "Care", width: "144px", render: (e) => <Tag tone="green">{labelFor(e.kind)}</Tag> },
    { key: "date", label: "Date", width: "104px", render: (e) => <time className="kx-num" dateTime={e.event_date}>{formatDate(e.event_date)}</time> },
    { key: "note", label: "Notes", width: "minmax(0, 1.6fr)", render: (e) => { const t = careNote(e.notes); return t ? <span title={t}>{t}</span> : <span className="kx-none">No notes</span>; } },
    { key: "by", label: "Given by", render: (e) => e.performed_by || <span className="kx-none">Not recorded</span> },
  ];

  return (
    <>
      <Head title="Animals" sum={d.state === "loading" ? "Reading care history…" : d.state === "failed" ? "The care history did not load. Nothing is shown as empty." : !d.rows.length ? "No care recorded yet." : d.total > d.rows.length ? <>The newest <b>{n(d.rows.length)}</b> of <b>{n(d.total)}</b> care entries, as dated on each record. Older entries are on each animal&rsquo;s record.</> : <><b>{n(d.total)}</b> care {d.total === 1 ? "entry" : "entries"}, newest first, as dated on each record.</>} />
      <Tools end={d.state === "read" && d.rows.length ? <select className="kx-in is-auto" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by kind of care"><option value="all">All care ({n(rows.length)})</option>{kinds.map(([k, c]) => <option key={k} value={k}>{labelFor(k)} ({n(c)})</option>)}</select> : undefined}>{lanes}</Tools>
      {d.state === "loading" ? <Panel><SkelRows label="Reading care history" /></Panel>
        : d.state === "failed" ? <Panel><div role="alert"><Empty title="Didn't load" action={<Btn onClick={load}>Try again</Btn>}>The care history did not load. {friendlyError(d.error)} Nothing is shown as empty.</Empty></div></Panel>
        : !d.rows.length ? <Panel><Empty title="No care recorded yet" action={<Btn variant="primary" href="/ngo/animals">Open the animal register</Btn>}>Care added on an animal&apos;s record appears here.</Empty></Panel>
        : <>
          <Panel><Table cols={cols} rows={visible} rowKey={(e) => e.id} href={(e) => `/ngo/animals/${e.animal.id}`} label="Care events" empty={<Empty title={`No ${labelFor(kind).toLowerCase()} entries in this organisation's record.`} />} /></Panel>
          <Pager pg={pg} pages={pages} total={filtered.length} size={PER} onPage={setPage} />
        </>}
    </>
  );
}

function MedicalCases({ lanes }: { lanes: ReactNode }) {
  const [d, setD] = useState<Load<{ rows: Case[] }>>({ state: "loading" });
  const [page, setPage] = useState(0);
  const load = useCallback(() => {
    setD({ state: "loading" });
    getPartnerCases().then((rows) => setD({ state: "read", rows })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(load, [load]);
  const medical = useMemo(() => (d.state === "read" ? d.rows.filter(isMedical).sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)) : []), [d]);
  const { pg, pages, slice } = pageOf(medical, page, PER);

  const cols: Col<Case>[] = [
    { key: "case", label: "Case", width: "minmax(0, 1.4fr)", render: (c) => c.title },
    { key: "state", label: "Status", width: "112px", keep: true, render: (c) => <Tag tone={c.status === "resolved" || c.status === "closed" ? "green" : "blue"}>{c.status.replace("_", " ")}</Tag> },
    { key: "who", label: "Animal and locality", render: (c) => `${speciesLabel(c.species ?? "dog")}${c.zone ? ` · ${c.zone}` : ""}` },
    { key: "note", label: "Medical notes", width: "minmax(0, 1.4fr)", render: (c) => (c.medical_notes ? <span title={c.medical_notes}>{c.medical_notes}</span> : <span className="kx-none">None</span>) },
    { key: "last", label: "Last activity", width: "112px", render: (c) => <span className="kx-num">{since(c.last_activity_at)}</span> },
  ];

  return (
    <>
      <Head title="Animals" sum={d.state === "loading" ? "Reading medical cases…" : d.state === "failed" ? "Medical cases could not be read. Nothing is shown as empty." : <><b>{n(medical.length)}</b> medical {medical.length === 1 ? "case" : "cases"} among your {n(d.rows.length)} most recently active: injury, vaccination, sterilisation, or with medical notes.</>} />
      <Tools>{lanes}</Tools>
      {d.state === "loading" ? <Panel><SkelRows label="Reading medical cases" /></Panel>
        : d.state === "failed" ? <Panel><div role="alert"><Empty title="Didn't load" action={<Btn onClick={load}>Try again</Btn>}>Medical cases could not be read. {friendlyError(d.error)} Nothing is shown as empty.</Empty></div></Panel>
        : !medical.length ? <Panel><Empty title="No medical cases yet" action={<Btn href="/ngo/rescues">Open the cases</Btn>}>Medical cases appear here.</Empty></Panel>
        : <>
          <Panel><Table cols={cols} rows={slice} rowKey={(c) => c.id} href={(c) => `/ngo/cases/${c.id}`} label="Medical cases" /></Panel>
          <Pager pg={pg} pages={pages} total={medical.length} size={PER} onPage={setPage} />
        </>}
    </>
  );
}
