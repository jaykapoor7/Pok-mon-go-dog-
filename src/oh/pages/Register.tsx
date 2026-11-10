"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { OhShell, isFacility, useOh } from "../Shell";
import { call, fmtDate, useRead, AGE, COURSE, HANDOFF, KIND_OF_EXPOSURE, SPECIES, type RegisterRow } from "../data";
import { Chip, Empty, Failed, Head, Loading } from "../ui";

export function Register() { return <OhShell><Suspense><Body /></Suspense></OhShell>; }

const FILTERS: [string, string][] = [["all", "All"], ["needs_assessment", "Waiting for a clinician"], ["active", "In course"], ["closed", "Closed"]];

function Body() {
  const { place } = useOh();
  const sp = useSearchParams(), router = useRouter();
  const filter = FILTERS.some(([k]) => k === sp.get("filter")) ? sp.get("filter")! : "all";
  const [q, setQ] = useState("");
  const id = place?.institution_id ?? "";
  const rows = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: id, p_filter: filter, p_limit: 200 }), `reg:${id}:${filter}`, !!place && isFacility(place.kind));
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return (rows.data ?? []).filter((r) => !s || [r.code, r.patient_ref, r.ward].some((v) => v?.toLowerCase().includes(s))); }, [rows.data, q]);
  if (!place || !isFacility(place.kind)) return <main className="oh-page"><Empty title="This page belongs to a hospital or health centre" /></main>;
  return (
    <main className="oh-page wide" id="main-content">
      <Head eyebrow={place.short_name ?? place.name} title="Bite register" lede="Every bite and scratch this facility has seen. Patient details stay here; the programme sees counts only."
        actions={<Link className="oh-btn primary" href={`/workspace/${id}/new`}><Plus size={16} aria-hidden />Record a bite</Link>} />
      <nav className="oh-tabs" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} href={`/workspace/${id}/register${k === "all" ? "" : `?filter=${k}`}`} aria-current={filter === k ? "page" : undefined}>{l}</Link>)}</nav>
      <label className="oh-field" style={{ maxWidth: 360, marginBottom: 16 }}>
        <span className="sr">Search</span>
        <div style={{ position: "relative" }}><Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)" }} /><input className="oh-input" style={{ paddingLeft: 36 }} placeholder="Register number, code or ward" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </label>
      {rows.loading && !rows.data ? <Loading rows={6} /> : rows.error ? <Failed error={rows.error} retry={rows.reload} /> : !shown.length ? <Empty title={q ? "No record matches" : "No records here"} /> : (
        <div className="oh-table-wrap">
          <table className="oh-table">
            <thead><tr><th>Patient</th><th>Presented</th><th>Exposure</th><th>Ward</th><th>Category</th><th>Course</th><th className="r">Doses</th><th>Next due</th><th>Animal</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="link" onClick={() => router.push(`/workspace/${id}/record/${r.id}`)}>
                  <td className="strong"><Link href={`/workspace/${id}/record/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.patient_ref ?? r.code}</Link><div style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>{AGE[r.age_band]}</div></td>
                  <td>{fmtDate(r.presented_on)}</td>
                  <td>{SPECIES[r.species]} {KIND_OF_EXPOSURE[r.kind]?.toLowerCase()}</td>
                  <td>{r.ward ?? "Not recorded"}</td>
                  <td>{r.category === "not_recorded" ? <Chip tone="amber">Not recorded</Chip> : <Chip plain tone={r.category === "III" ? "flame" : undefined}>Category {r.category}</Chip>}</td>
                  <td>{r.course_status ? <Chip tone={COURSE[r.course_status].tone}>{COURSE[r.course_status].label}</Chip> : <Chip plain>None prescribed</Chip>}</td>
                  <td className="r">{r.doses_total ? `${r.doses_given} / ${r.doses_total}` : "–"}</td>
                  <td>{r.next_due ? fmtDate(r.next_due) : "–"}</td>
                  <td>{r.handoff_status ? <Chip tone={HANDOFF[r.handoff_status].tone}>{HANDOFF[r.handoff_status].label}</Chip> : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
