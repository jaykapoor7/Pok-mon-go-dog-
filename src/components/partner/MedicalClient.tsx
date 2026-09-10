"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Stethoscope } from "lucide-react";
import { getPartnerMedicalEvents, type PartnerMedicalEvent } from "@/lib/animal-actions";
import { MEDICAL_KINDS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MedicalCases } from "./MedicalCases";

const labelFor = (kind: string) => MEDICAL_KINDS.find((item) => item.id === kind)?.label ?? kind;

export function MedicalClient() {
  const [view, setView] = useState<"events" | "cases">("events");
  return <><div className="med-ledger-filters" role="group" aria-label="Medical records view">
    <button aria-pressed={view === "events"} className={view === "events" ? "active" : ""} onClick={() => setView("events")}>Animal care history</button>
    <button aria-pressed={view === "cases"} className={view === "cases" ? "active" : ""} onClick={() => setView("cases")}>Medical cases</button>
  </div>{view === "events" ? <CareLedger/> : <MedicalCases/>}</>;
}

function CareLedger() {
  const [events, setEvents] = useState<PartnerMedicalEvent[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { getPartnerMedicalEvents().then(setEvents).catch(() => setEvents([])); }, []);

  const kinds = useMemo(() => Array.from(new Set((events ?? []).map((event) => event.kind))), [events]);
  const visible = filter === "all" ? (events ?? []) : (events ?? []).filter((event) => event.kind === filter);

  if (events === null) return <div className="spa-empty"><Loader2 size={26} className="imp-spin" /><p>Loading…</p></div>;

  if (events.length === 0) {
    return <div className="spa-empty"><Stethoscope size={40} strokeWidth={1.25} /><h2>No care events recorded yet</h2><p>Log treatment, vaccination or sterilisation from an animal record. Only your organisation&apos;s work appears here.</p></div>;
  }

  return (
    <section className="med-ledger" aria-label="Care ledger">
      <div className="med-ledger-head">
        <div><span className="spa-mono">Care ledger</span><p>Every treatment stays attached to the animal it belongs to.</p></div>
        <strong>{events.length} logged</strong>
      </div>
      <div className="med-ledger-filters" aria-label="Filter care events">
        <button aria-pressed={filter === "all"} className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All care</button>
        {kinds.map((kind) => <button key={kind} aria-pressed={filter === kind} className={filter === kind ? "active" : ""} onClick={() => setFilter(kind)}>{labelFor(kind)}</button>)}
      </div>
      <ol className="med-ledger-list">
        {visible.map((event) => (
          <li key={event.id}>
            <time dateTime={event.event_date}>{formatDate(event.event_date)}</time>
            <div className="med-ledger-kind">{labelFor(event.kind)}</div>
            <div className="med-ledger-detail"><b>{event.animal.name || event.animal.code || "Unnamed animal"}</b><small>{[event.animal.code, event.animal.zone].filter(Boolean).join(" · ") || "Animal record"}</small>{event.notes && <p>{event.notes}</p>}</div>
            <div className="med-ledger-by">{event.performed_by || "Clinician not recorded"}</div>
            <Link href={`/partner/animals/${event.animal.id}`} aria-label={`Open ${event.animal.name || event.animal.code || "animal"} record`}><ArrowUpRight size={16} /></Link>
          </li>
        ))}
      </ol>
      {visible.length === 0 && <p className="med-ledger-none">No {labelFor(filter).toLowerCase()} entries in this organisation&apos;s record.</p>}
    </section>
  );
}
