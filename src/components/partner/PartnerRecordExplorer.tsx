"use client";

/* ════════════════════════════════════════════════════════════════════
   The working register: every rescue, care entry, follow-up and outcome
   the organisation keeps, in one list. Find a record by typing, narrow it
   by type, place, year and status, open it to work on it, export what is
   in view, and (for a team lead) delete a record that should not be
   there. A deletion asks once, in the row, and the database keeps a copy
   in the audit log.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Download, Search, Trash2, X, PanelRightOpen, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { deletePartnerRecord, deletionTarget, getPartnerRecordRows, type PartnerRecordKind, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { myProfile } from "@/lib/programme";
import { SearchSelect } from "@/components/app/SearchSelect";
import { formatDate } from "@/lib/utils";
import "./records.css";

const PAGE_SIZE = 40;
const TYPES: Array<{ id: "all" | PartnerRecordKind; label: string }> = [
  { id: "all", label: "All" }, { id: "rescue", label: "Rescues" }, { id: "care", label: "Care" }, { id: "follow_up", label: "Follow-ups" }, { id: "outcome", label: "Outcomes" },
];
const ATTENTION = [{ id: "overdue", label: "overdue" }, { id: "due_today", label: "due today" }, { id: "upcoming", label: "upcoming" }] as const;

function pending(row: PartnerRecordRow) { if (row.kind !== "follow_up") return false; return !["done", "completed", "cancelled", "canceled", "missed"].includes(String(row.status ?? "").toLowerCase()); }
function dayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return +d; }
function matches(row: PartnerRecordRow, filter: string) {
  if (filter === "all") return true;
  if (filter === "overdue") return pending(row) && +new Date(row.date) < dayStart();
  if (filter === "due_today") { const t = +new Date(row.date); return pending(row) && t >= dayStart() && t < dayStart() + 86400000; }
  if (filter === "upcoming") { const t = +new Date(row.date); return pending(row) && t >= dayStart() + 86400000 && t < dayStart() + 15 * 86400000; }
  if (filter === "vaccination") return row.kind === "care" && /vaccin|rabies|arv/.test(row.subtype.toLowerCase());
  if (filter === "sterilisation") return row.kind === "care" && /sterili|abc|spay|neuter/.test(row.subtype.toLowerCase());
  if (filter === "treatment") return row.kind === "care" && /treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/.test(row.subtype.toLowerCase());
  return row.kind === filter;
}
function destination(row: PartnerRecordRow) { if (row.caseId) return `/partner/cases/${row.caseId}`; if (row.animalId) return `/partner/animals/${row.animalId}`; return "/partner/records"; }
const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const words = (s: string) => s.replace(/_/g, " ");

export function PartnerRecordExplorer({ initialFilter = "all" }: { initialFilter?: string }) {
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  const [lead, setLead] = useState(false);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState(initialFilter), [locality, setLocality] = useState(""), [year, setYear] = useState(""), [status, setStatus] = useState(""), [subtype, setSubtype] = useState(""), [sort, setSort] = useState("newest"), [page, setPage] = useState(1);
  const [asking, setAsking] = useState<string | null>(null), [busy, setBusy] = useState<string | null>(null), [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<PartnerRecordRow | null>(null);

  useEffect(() => { getPartnerRecordRows().then(setRows).catch(() => setRows([])); myProfile().then((p) => setLead(Boolean(p.is_lead))).catch(() => {}); }, []);

  const options = useMemo(() => {
    const r = rows ?? [];
    const count = (pick: (x: PartnerRecordRow) => string | null | undefined) => { const m = new Map<string, number>(); for (const x of r) { const v = pick(x); if (v) m.set(v, (m.get(v) ?? 0) + 1); } return m; };
    const places = count((x) => x.locality);
    return {
      localities: [...places.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, n]) => ({ value, hint: `${n.toLocaleString("en-IN")} record${n === 1 ? "" : "s"}` })),
      years: [...count((x) => { const y = new Date(x.date).getFullYear(); return Number.isFinite(y) ? String(y) : null; }).keys()].sort((a, b) => b.localeCompare(a)),
      statuses: [...count((x) => x.status).keys()].sort(),
      subtypes: [...count((x) => x.subtype).keys()].sort(),
    };
  }, [rows]);

  const typeCounts = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.id, (rows ?? []).filter((r) => matches(r, t.id)).length])), [rows]);
  const attention = useMemo(() => Object.fromEntries(ATTENTION.map((a) => [a.id, (rows ?? []).filter((r) => matches(r, a.id)).length])), [rows]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => matches(r, filter) && (!locality || r.locality === locality) && (!year || String(new Date(r.date).getFullYear()) === year) && (!status || r.status === status) && (!subtype || r.subtype === subtype)
      && (!q || [r.title, r.detail, r.locality, r.animalLabel, r.straypawId, r.sourceCode, r.subtype, r.status, r.species].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))))
      .sort((a, b) => sort === "oldest" ? +new Date(a.date) - +new Date(b.date) : sort === "locality" ? String(a.locality ?? "").localeCompare(String(b.locality ?? "")) : sort === "status" ? String(a.status ?? "").localeCompare(String(b.status ?? "")) : +new Date(b.date) - +new Date(a.date));
  }, [rows, query, filter, locality, year, status, subtype, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE)), safe = Math.min(page, pages), shown = visible.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE);
  const narrowed = Boolean(query || locality || year || status || subtype || filter !== "all" || sort !== "newest");
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  function reset() { setQuery(""); setFilter("all"); setLocality(""); setYear(""); setStatus(""); setSubtype(""); setSort("newest"); setPage(1); }
  function exportCsv() {
    const cols = ["date", "type", "straypaw_id", "source_organisation_id", "animal", "species", "locality", "status", "detail", "case_id"];
    const body = visible.map((r) => [r.date, r.subtype, r.straypawId, r.sourceCode, r.animalLabel, r.species, r.locality, r.status, r.detail, r.caseId].map(esc).join(","));
    const blob = new Blob([[cols.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `straypaw-records-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  async function remove(row: PartnerRecordRow) {
    setBusy(row.id); setNotice(null);
    try {
      await deletePartnerRecord(row);
      const target = deletionTarget(row);
      /* A case takes its outcome row with it; anything pointing at the case
         stays, without the link. */
      setRows((rs) => (rs ?? []).filter((r) => (target?.kind === "case" ? !(r.source === "case" && r.caseId === target.id) : r.id !== row.id)));
      setNotice({ ok: true, text: `Deleted. A copy is kept in your organisation's audit log.` });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "The record was not deleted." });
    } finally { setBusy(null); setAsking(null); }
  }

  return (
    <section className="rec">
      <div className="rec-find">
        <label className="rec-q bare-field">
          <Search size={17} aria-hidden />
          <span className="sys-sr">Search records</span>
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search animal, StrayPaw ID, treatment, note…" />
        </label>
        <SearchSelect className="rec-place" icon="place" label="Location" allLabel="All locations" placeholder="Any location" options={options.localities} value={locality} onChange={set(setLocality)} />
      </div>

      <div className="rec-bar">
        <nav className="rec-types" aria-label="Record type">
          {TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={filter === t.id} className={filter === t.id ? "is-on" : ""} onClick={() => { setFilter(t.id); setPage(1); }}>
              {t.label}<span className="sys-mono">{(typeCounts[t.id] ?? 0).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </nav>
        <div className="rec-due" aria-label="Follow-ups by when they are due">
          {ATTENTION.map((a) => (
            <button key={a.id} type="button" aria-pressed={filter === a.id} className={`${filter === a.id ? "is-on" : ""} ${a.id === "overdue" && attention[a.id] ? "is-hot" : ""}`} onClick={() => { setFilter(a.id); setPage(1); }}>
              <b className="sys-mono">{attention[a.id] ?? 0}</b> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rec-refine">
        <Pick label="Record type" all="Any record type" value={subtype} items={options.subtypes} onChange={set(setSubtype)} />
        <Pick label="Year" all="Any year" value={year} items={options.years} onChange={set(setYear)} />
        <Pick label="Status" all="Any status" value={status} items={options.statuses} onChange={set(setStatus)} />
        <label className="rec-pick"><span>Order</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="locality">Location A–Z</option><option value="status">Status A–Z</option>
          </select>
        </label>
      </div>

      <div className="rec-meta">
        <span role="status">{rows === null ? "Loading records…" : `${visible.length.toLocaleString("en-IN")} of ${rows.length.toLocaleString("en-IN")} records`}</span>
        <div>
          {narrowed && <button type="button" className="rec-plain" onClick={reset}><X size={13} aria-hidden /> Clear filters</button>}
          <button type="button" className="rec-plain is-blue" onClick={exportCsv} disabled={!visible.length}><Download size={13} aria-hidden /> Export these ({visible.length.toLocaleString("en-IN")})</button>
        </div>
      </div>

      {notice && <p className={`rec-notice ${notice.ok ? "is-ok" : "is-bad"}`} role="status">{notice.text}</p>}

      <div className="rec-list">
        <div className="rec-head" aria-hidden="true"><span>Date</span><span>Record</span><span>Animal and detail</span><span>Location</span><span>Status</span><span /></div>
        {rows !== null && visible.length === 0 ? (
          <p className="rec-empty">{rows.length ? "No records match this view." : "No records yet. Rescues, care, follow-ups and outcomes your team records appear here."}</p>
        ) : shown.map((row) => {
          const target = deletionTarget(row);
          return (
            <div key={row.id} className={`rec-row has-inspector ${asking === row.id ? "is-asking" : ""} ${selected?.id === row.id ? "is-selected" : ""}`}>
              <Link href={destination(row)} className="rec-open">
                <time className="sys-mono">{formatDate(row.date)}</time>
                <span className="rec-kind">{words(row.subtype)}</span>
                <span className="rec-who"><b>{row.animalLabel || row.title}</b>{row.straypawId && <small className="sys-mono">{row.straypawId}</small>}<em>{row.detail || row.title}</em></span>
                <span className="rec-where">{row.locality || "Not recorded"}</span>
                <span className="rec-status">{row.status ? words(row.status) : "—"}</span>
                <ArrowUpRight size={14} aria-hidden className="rec-go" />
              </Link>
              <button type="button" className="rec-inspect" aria-label={`Inspect ${row.animalLabel || row.title}`} onClick={() => setSelected(row)}><PanelRightOpen size={16} /></button>
              {lead && target && (asking === row.id ? (
                <div className="rec-confirm" role="group" aria-label="Confirm deletion">
                  <span>Delete {target.what}?</span>
                  <button type="button" className="rec-yes" disabled={busy === row.id} onClick={() => remove(row)}>{busy === row.id ? "Deleting…" : "Delete"}</button>
                  <button type="button" className="rec-no" disabled={busy === row.id} onClick={() => setAsking(null)}>Keep</button>
                </div>
              ) : (
                <button type="button" className="rec-del" aria-label={`Delete ${row.animalLabel || row.title}`} title="Delete record" onClick={() => { setAsking(row.id); setNotice(null); }}>
                  <Trash2 size={15} aria-hidden />
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="spa-scope rec-inspector">
          {selected && <>
            <p className="rec-inspector-kicker">Organisation record / {words(selected.kind)}</p>
            <DialogTitle>{selected.animalLabel || selected.title}</DialogTitle>
            <DialogDescription>{selected.straypawId || selected.sourceCode || "Source identity not recorded"}</DialogDescription>
            <dl className="rec-inspector-facts">
              <div><dt>Recorded date</dt><dd>{formatDate(selected.date)}</dd></div>
              <div><dt>Activity</dt><dd>{words(selected.subtype)}</dd></div>
              <div><dt>Status</dt><dd>{selected.status ? words(selected.status) : "Not recorded"}</dd></div>
              <div><dt>Locality</dt><dd>{selected.locality || "Not recorded"}</dd></div>
              <div><dt>Source record</dt><dd>{selected.sourceCode || "Not recorded"}</dd></div>
            </dl>
            <section><h3>Recorded detail</h3><p className="rec-inspector-detail">{selected.detail || selected.title}</p></section>
            <div className="rec-inspector-actions">
              <Link href={destination(selected)}>Open working record <ArrowUpRight size={16} /></Link>
              {selected.animalId && <Link href={`/partner/animals/${selected.animalId}`}>Animal history <ArrowUpRight size={16} /></Link>}
              {selected.locality && <Link href={`/partner/map?q=${encodeURIComponent(selected.locality)}&mode=cases`}><MapPin size={16} />Locality on the field map</Link>}
            </div>
          </>}
        </DialogContent>
      </Dialog>

      {visible.length > PAGE_SIZE && (
        <nav className="rec-pages" aria-label="Pages">
          <button type="button" disabled={safe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ArrowLeft size={14} aria-hidden /> Previous</button>
          <span className="sys-mono">Page {safe} of {pages}</span>
          <button type="button" disabled={safe >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next <ArrowRight size={14} aria-hidden /></button>
        </nav>
      )}
    </section>
  );
}

function Pick({ label, all, value, items, onChange }: { label: string; all: string; value: string; items: string[]; onChange: (v: string) => void }) {
  return (
    <label className="rec-pick"><span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {items.map((i) => <option key={i} value={i}>{words(i)}</option>)}
      </select>
    </label>
  );
}
