"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Work (decisions 021, 022, 025, 033, 008B–008G).

   Action first, never a metrics wall. One queue beside one inspector:

   QUEUE      Live work in the order FigJam 021 sets: scheduled
              follow-ups that slipped, critical cases, then the rest, oldest
              first; long-overdue rechecks last. Group by priority or by
              the person responsible. Filter by mine, unowned, critical,
              follow-ups, a text, or a map area. Two cohorts are kept OUT of
              today's work and have their own tabs: cases waiting on a
              decision (open 90+ days, nothing for 30) and imported
              statuses never confirmed (historical review).
   INSPECTOR  The case read with the member's own session: identity, place
              at the precision recorded, owner, follow-ups, chronology and
              the one next step the record allows, each confirmed by the
              database before it says "saved" (Receipt). Closing shows
              any follow-up that stays due (008C).
   MAP        The organisation's open work by area. Choosing an area
              narrows the queue; choosing a row rings its area. Work with no
              location stays in the queue.

   Keys: j/k ↓/↑ move · Enter open · Esc close · o case file · m map · / search
   ════════════════════════════════════════════════════════════════════ */

import { shortCode } from "@/lib/caseCode";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, X } from "lucide-react";
import { Btn, Empty, Head, Lanes, More, Panel, Props, Section, Tag } from "@/ws/kit";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePageState } from "@/ws/store";
import { getMyOrg } from "@/lib/actions";
import { loadCaseFile, type CaseFile } from "@/lib/case-file";
import { dueFollowups, isHistoricalCase, isStale, openCases, opsCounts, orgOpenWorkCells, queueOrder, queueRank, type DueFollowup, type OpenCase, type OpsCounts, type OrgOpenWorkCell } from "@/lib/ops";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import { useMembership } from "../shell/Shell";
import { AreaMap } from "../atlas/AreaMap";
import { day, n } from "../ui";
import { Reading } from "../ui/Reading";
import { FollowupList, NextStep } from "./NextStep";
import "./ngo.css";
import "./cases.k.css";
import "./work2.css";
import { careNote } from "@/lib/care-note";

const DAY = 86_400_000;
const ageDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0);
const short = (iso: string | null) => { if (!iso) return "—"; const d = ageDays(iso); return d < 1 ? "today" : d < 31 ? `${d}d` : d < 365 ? `${Math.round(d / 30)}mo` : `${(d / 365).toFixed(1)}y`; };
const isCritical = (c: { condition_class: string | null }) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const realName = (s: string | null | undefined) => { const t = (s ?? "").trim(); return t && !/·/.test(t) ? t : null; };

type Cohort = "live" | "decide" | "history";
type Focus = "all" | "mine" | "unowned" | "critical" | "followup";
export type Row = { key: string; kind: "followup" | "case"; c?: OpenCase; f?: DueFollowup; crit: boolean; cell: string | null; age: number };

const RANKS = [
  { rank: 0, label: "Critical", note: "Critical conditions, waiting longest first" },
  { rank: 1, label: "Follow-ups that slipped", note: "Scheduled rechecks overdue, last 90 days" },
  { rank: 2, label: "Open", note: "Other live cases, waiting longest first" },
  { rank: 3, label: "Long-overdue follow-ups", note: "More than 90 days late: check before acting" },
];

export function Work() {
  const { user, ready } = useAuth();
  const mem = useMembership();
  const member = !!user && mem.member;
  const [open, setOpen] = useState<OpenCase[] | null>(null);
  const [due, setDue] = useState<DueFollowup[]>([]);
  const [counts, setCounts] = useState<OpsCounts | null>(null);
  const [cells, setCells] = useState<OrgOpenWorkCell[]>([]);
  const [org, setOrg] = useState<NGO | null>(null);
  const [failed, setFailed] = useState(false);
  const [cohort, setCohort] = useState<Cohort>("live");
  const [focus, setFocusState] = useState<Focus>("all");
  const setFocus=useCallback((value:Focus)=>{setFocusState(value);const url=new URL(window.location.href);if(value==='all')url.searchParams.delete('focus');else url.searchParams.set('focus',value);window.history.replaceState(window.history.state,'',url)},[]);
  useEffect(()=>{const read=()=>{const value=new URLSearchParams(window.location.search).get('focus');setFocusState(['mine','unowned','critical','followup'].includes(value??'')?value as Focus:'all')};read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read)},[]);
  const [group, setGroup] = usePageState<"priority" | "owner">("group", "priority");
  const [text, setText] = usePageState("q", "");
  const [cell, setCell] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [pane, setPane] = useState<"inspector" | "map">("inspector");
  const [sheet, setSheet] = useState(false);
  const [limit, setLimit] = useState(80);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("cohort");
    if (c === "decide" || c === "history") setCohort(c);
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [o, d, g, c, w] = await Promise.all([openCases(), dueFollowups(), getMyOrg().catch(() => null), opsCounts(), orgOpenWorkCells()]);
      setOpen(o); setDue(d); setOrg(g); setCounts(c); setCells(w);
    } catch { setFailed(true); setOpen([]); }
  }, []);
  useEffect(() => { if (ready && mem.ready && member) void load(); }, [ready, mem.ready, member, load]);

  const co = useMemo(() => {
    const now = Date.now(), loaded = open ?? [];
    const history = loaded.filter(isHistoricalCase), current = loaded.filter((c) => !isHistoricalCase(c));
    const decide = current.filter((c) => isStale(c, now)), live = current.filter((c) => !isStale(c, now));
    const overdue = due.filter((f) => f.source === "scheduled" && Date.parse(f.due_at) < now);
    const byCase = new Map(current.map((c) => [c.id, c]));
    const rows = (k: Cohort): Row[] => {
      const out: Row[] = [];
      if (k === "live") for (const f of overdue) { const c = f.case_id ? byCase.get(f.case_id) : undefined; out.push({ key: `f-${f.id}`, kind: "followup", f, c, crit: c ? isCritical(c) : false, cell: c?.h3_r8 ?? null, age: ageDays(f.due_at) }); }
      for (const c of k === "live" ? live : k === "decide" ? decide : history) out.push({ key: `c-${c.id}`, kind: "case", c, crit: isCritical(c), cell: c.h3_r8, age: ageDays(c.occurred_at) });
      return out.sort(queueOrder);
    };
    return { live: rows("live"), decide: rows("decide"), history: rows("history"), overdue };
  }, [open, due]);

  const all = co[cohort];
  const q = text.trim().toLowerCase();
  const me = user?.name ?? "";
  const rows = useMemo(() => all.filter((r) => {
    const owner = r.c?.assignee_name ?? r.f?.assignee_name ?? null;
    if (cell && r.cell !== cell) return false;
    if (focus === "mine" && owner !== me) return false;
    if (focus === "unowned" && owner) return false;
    if (focus === "critical" && !r.crit) return false;
    if (focus === "followup" && r.kind !== "followup") return false;
    if (!q) return true;
    return [r.c?.case_code, r.c?.title, r.c?.condition_class, r.c?.animal_name, r.c?.zone, owner, r.f?.straypaw_id, r.f?.animal_name, r.f?.zone].filter(Boolean).join(" ").toLowerCase().includes(q);
  }), [all, cell, focus, q, me]);
  const shown = rows.slice(0, limit);
  const selRow = all.find((r) => r.key === sel) ?? null;

  const groups = useMemo(() => {
    if (cohort !== "live") return [{ key: cohort, label: cohort === "decide" ? "Waiting on a decision" : "Imported, never confirmed", note: cohort === "decide" ? "Open 90+ days with nothing recorded for 30. Is anyone still working these? Nothing closes on its own." : "Open in a historical register. Confirm, close with a reason, or leave. Never counted as today's work.", rows: shown }];
    if (group === "owner") {
      const by = new Map<string, Row[]>();
      for (const r of shown) { const o = r.c?.assignee_name ?? r.f?.assignee_name ?? "Nobody yet"; by.set(o, [...(by.get(o) ?? []), r]); }
      return [...by.entries()].sort((a, b) => (a[0] === "Nobody yet" ? -1 : b[0] === "Nobody yet" ? 1 : b[1].length - a[1].length)).map(([o, rs]) => ({ key: o, label: o === "Nobody yet" ? "Unowned" : o, note: o === "Nobody yet" ? "No named person holds these" : `${rs.length} item${rs.length === 1 ? "" : "s"}`, rows: rs }));
    }
    return RANKS.map((g) => ({ key: String(g.rank), label: g.label, note: g.note, rows: shown.filter((r) => queueRank(r) === g.rank) })).filter((g) => g.rows.length);
  }, [shown, cohort, group]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest("input, textarea, select, dialog, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const flat = groups.flatMap((g) => g.rows);
      const i = flat.findIndex((r) => r.key === sel);
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); const r = flat[Math.min(flat.length - 1, i + 1)]; if (r) setSel(r.key); }
      else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); const r = flat[Math.max(0, i - 1)]; if (r) setSel(r.key); }
      else if (e.key === "Enter" && sel) { setPane("inspector"); setSheet(true); }
      else if (e.key === "Escape") { if (sheet) setSheet(false); else setSel(null); }
      else if (e.key === "o" && selRow) { const id = selRow.c?.id ?? selRow.f?.case_id; if (id) window.location.href = `/ngo/cases/${id}`; }
      else if (e.key === "m") setPane((p) => (p === "map" ? "inspector" : "map"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groups, sel, sheet, selRow]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-key="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  if (!ready || !mem.ready) return <div className="wq"><div className="wq-top"><i className="kc-skel" /></div></div>;
  if (!member) return <SignedOut signedIn={!!user} />;

  const loading = open === null;
  const cohortN = (k: Cohort) => (k === "live" ? co.live.length : k === "decide" ? counts?.quiet ?? co.decide.length : counts?.historicalReview ?? co.history.length);
  const unplaced = all.filter((r) => !r.cell).length;
  const areaCells = cells.filter((r) => r.h3_r8).map((r) => ({ h3: r.h3_r8, value: cohort === "history" ? r.historical_cases : cohort === "decide" ? r.stale_cases : Math.max(0, r.open_cases - r.stale_cases), hot: cohort === "live" ? r.critical_cases : 0, label: r.city }));

  const live = co.live.filter((r) => r.kind === "case");
  const nCrit = live.filter((r) => r.crit).length, nNobody = live.filter((r) => !r.c?.assignee_name).length;
  const nothing = !loading && !failed && co.live.length + co.decide.length + co.history.length === 0;
  return (
    <div className={`wq kc-scope${sheet ? " is-sheet" : ""}${pane === "map" ? " show-map" : ""}`}>
      <div className="wq-top">
        <Head title="Cases"
          sum={loading ? <Reading>Reading your organisation&rsquo;s open work</Reading> : failed ? <><span className="is-hot">The organisation&rsquo;s work could not be read. Nothing is shown as zero.</span> <button type="button" className="kc-link" onClick={() => void load()}>Retry</button></>
            : nothing ? "Nothing is on the record yet. Start with the register you already keep."
            : <>The queue: <b>{n(live.length)}</b> live{nCrit ? <>, <span className="is-hot">{n(nCrit)} critical</span></> : null}, <b>{n(co.overdue.length)}</b> {co.overdue.length === 1 ? "follow-up" : "follow-ups"} overdue, <b>{n(nNobody)}</b> held by nobody.</>}
          actions={nothing ? <Btn variant="primary" href="/ngo/import" icon={<Upload size={14} />}>Import a register</Btn> : undefined} />
      </div>

      <div className="wq-body">
        <section className="wq-col" aria-label="Work queue">
          <div className="wq-tools">
            <Lanes<Cohort> label="Which cases" value={cohort} onChange={(k) => { setCohort(k); setSel(null); setLimit(80); }} lanes={[
              { id: "live", label: "Live", count: loading ? null : cohortN("live") },
              { id: "decide", label: "Needs a decision", count: loading ? null : cohortN("decide") },
              { id: "history", label: "Imported", count: loading ? null : cohortN("history") },
            ]} />
            <label className="k-search wq-search"><Search size={14} aria-hidden /><input ref={searchRef} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Code, animal, place, person" aria-label="Filter the queue" /></label>
            <div className="wq-chips" role="group" aria-label="Show">
              {(["all", "mine", "unowned", "critical", "followup"] as Focus[]).map((k) => <button key={k} type="button" aria-pressed={focus === k} onClick={() => setFocus(k)}>{k === "all" ? "All" : k === "mine" ? "Mine" : k === "unowned" ? "Unowned" : k === "critical" ? "Critical" : "Follow-ups"}</button>)}
              {cell && <button type="button" aria-pressed onClick={() => setCell(null)}>One area <X size={12} aria-hidden /></button>}
              <span className="wq-chips-end">
                {cohort === "live" && <button type="button" onClick={() => setGroup(group === "priority" ? "owner" : "priority")} aria-label={`Group by ${group === "priority" ? "person" : "priority"}`}>By {group === "priority" ? "priority" : "person"}</button>}
                <button type="button" className="wq-tomap" onClick={() => setPane("map")}>Map</button>
              </span>
            </div>
          </div>

          <div className="wq-list" ref={listRef} role="listbox" aria-label={`${rows.length} items in the queue`} aria-activedescendant={sel ? `wk-${sel}` : undefined} tabIndex={0}>
            {loading && Array.from({ length: 9 }, (_, i) => <i key={i} className="kc-skel" aria-hidden />)}
            {!loading && !rows.length && (
              <Empty title={failed ? "Not read" : all.length ? "Nothing matches" : cohort === "live" ? "Nothing live is waiting" : "Nothing in this cohort"}>
                {failed ? "Reload to try again. A failed read is never shown as an empty queue." : all.length ? "Clear the filter or choose another area." : cohort === "live" ? "No critical case, slipped follow-up or live case is open for your organisation right now." : "When there is something here, it will wait for a person to decide. Nothing closes on a timer."}
              </Empty>
            )}
            {!loading && groups.map((g) => g.rows.length > 0 && (
              <div key={g.key} role="group" aria-label={g.label} className="wq-band">
                <p className="wq-bandh" title={g.note}><b>{g.label}</b><em>{n(g.rows.length)}</em></p>
                {g.rows.map((r) => <QueueRow key={r.key} r={r} on={sel === r.key} me={me} onPick={() => { setSel(r.key); setPane("inspector"); setSheet(true); }} />)}
              </div>
            ))}
            {rows.length > limit && <button type="button" className="k-more" onClick={() => setLimit((x) => x + 80)}>Show {Math.min(80, rows.length - limit)} more of {n(rows.length - limit)}</button>}
            {!loading && unplaced > 0 && <p className="kc-hint wq-foot">{n(unplaced)} in this cohort carry no location. They stay in the queue and are not drawn on the map.</p>}
          </div>
        </section>

        <section className="wq-stage" aria-label="Map of open work and the chosen case">
          <AreaMap className="wq-map" cells={areaCells} selected={cell} focus={selRow?.cell ?? null} onPick={(h) => { setCell(h); setSel(null); }} label="Open work by area" ink={cohort === "history" ? "#cfc3ae" : cohort === "decide" ? "#e5b65a" : "#5fa3ae"}
            empty={loading ? "Placing the open work…" : "No case in this cohort carries a location."} pad={{ top: 30, left: 30, bottom: 30, right: selRow ? 470 : 30 }} />
          <p className="wq-mapkey"><i className="is-area" /> an area with {cohort === "live" ? "live" : cohort === "decide" ? "quiet" : "imported"} cases, sized by count <i className="is-hot" /> holds critical work · areas, never addresses</p>
          <button type="button" className="k-btn is-plain wq-back" onClick={() => setPane("inspector")}>Back to the queue</button>
          {selRow ? (
            <aside className="wq-insp" aria-label="Case inspector">
              <button type="button" className="wq-close" onClick={() => { setSheet(false); setSel(null); }} aria-label="Close the case"><X size={16} /></button>
              <Inspector key={selRow.key} row={selRow} cohort={cohort} onChanged={load} />
            </aside>
          ) : (
            <p className="wq-hint"><b>Choose a case</b> to open it here. Keys: <kbd>j</kbd> <kbd>k</kbd> move, <kbd>Enter</kbd> open, <kbd>o</kbd> case file, <kbd>m</kbd> map, <kbd>Esc</kbd> close.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function QueueRow({ r, on, me, onPick }: { r: Row; on: boolean; me: string; onPick: () => void }) {
  const c = r.c, f = r.f;
  const title = r.kind === "followup" ? `Follow-up · ${(f?.kind ?? "recheck").replace(/_/g, " ")}` : c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c?.title || "Open case";
  const who = realName(c?.animal_name) || realName(f?.animal_name) || f?.straypaw_id || null;
  const place = c?.zone ?? f?.zone ?? null;
  const owner = c?.assignee_name ?? f?.assignee_name ?? null;
  const status = r.kind === "followup" ? "Overdue" : r.crit ? "Critical" : STATUS_META[(c?.status_class ?? "open") as StatusClass]?.short ?? "Open";
  const tone = r.crit ? "flame" : r.kind === "followup" ? "amber" : status === "In progress" ? "blue" : "plain";
  return (
    <div id={`wk-${r.key}`} data-key={r.key} role="option" aria-selected={on} className={`wq-row${on ? " is-on" : ""}`} onClick={onPick}>
      <span className="wq-row-t"><b>{title}</b>
        <small><span className="kc-code">{shortCode(c?.case_code ?? f?.case_code, "—")}</span> · {[who, place].filter(Boolean).join(" · ") || "Animal and place not recorded"}{r.cell ? "" : " · no location"} · <span className={owner ? undefined : "is-none"}>{owner ? (owner === me ? "You" : owner) : "Nobody holds it"}</span></small></span>
      <span className="wq-row-e"><Tag tone={tone}>{status}</Tag><span title={r.kind === "followup" ? `Due ${day(f?.due_at)}` : `Recorded ${day(c?.occurred_at)}`}>{r.kind === "followup" ? `${short(f?.due_at ?? null)} late` : short(c?.occurred_at ?? null)}</span></span>
    </div>
  );
}

function Inspector({ row, cohort, onChanged }: { row: Row; cohort: Cohort; onChanged: () => Promise<void> }) {
  const id = row.c?.id ?? row.f?.case_id ?? null;
  const [file, setFile] = useState<CaseFile | null | "loading" | "error">("loading");
  const generation = useRef(0);
  const read = useCallback(async () => {
    const version = ++generation.current;
    if (!id) { setFile(null); return; }
    try { const next = await loadCaseFile(id); if (version === generation.current) setFile(next); }
    catch { if (version === generation.current) setFile("error"); }
  }, [id]);
  useEffect(() => {
    const requests = generation;
    setFile("loading"); void read();
    return () => { requests.current++; };
  }, [read]);

  if (!id) {
    const f = row.f!;
    return (
      <div className="wq-in">
        <p className="k-eyebrow">Follow-up · not linked to a case</p>
        <h2 className="wq-ih">{realName(f.animal_name) || f.straypaw_id || "Animal follow-up"}</h2>
        <Props items={[{ label: "Due", value: day(f.due_at) }, { label: "Kind", value: (f.kind ?? "recheck").replace(/_/g, " ") }, { label: "Place", value: f.zone ?? "not recorded" }]} />
        {f.note && <p className="kc-p">{f.note}</p>}
        {f.dog_id && <div className="kc-acts"><Btn href={`/ngo/animals/${f.dog_id}`}>Open the animal</Btn></div>}
      </div>
    );
  }
  if (file === "loading") return <div className="wq-in" aria-busy="true"><i className="kc-skel" /><i className="kc-skel is-tall" /><i className="kc-skel is-tall" /></div>;
  if (file === "error") return <div className="wq-in"><Empty title="Didn't load" action={<Btn small onClick={() => void read()}>Try again</Btn>}>This case could not be read just now. Nothing was changed.</Empty></div>;
  if (!file) return <div className="wq-in"><Empty title="Not available">This case belongs to another organisation.</Empty></div>;

  const { c, reg, animal, updates, followups, medical, neighbours, sameAnimal } = file;
  const imported = reg.provenance === "imported_historical_record";
  const history = [
    ...updates.map((u) => ({ at: u.created_at, k: "update", t: u.note || (u.to_status ? `Status → ${u.to_status.replace(/_/g, " ")}` : u.type.replace(/_/g, " ")), who: u.actor_name })),
    ...medical.map((m) => ({ at: m.event_date, k: "medical", t: `${m.kind.replace(/_/g, " ")}${careNote(m.notes) ? `: ${careNote(m.notes)}` : ""}`, who: m.performed_by })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const reloadAll = async () => { await read(); await onChanged(); };
  return (
    <div className="wq-in">
      <p className="k-eyebrow wq-id"><span className="kc-code">{shortCode(reg.case_code)}</span><Tag tone={row.crit || row.kind === "followup" ? "flame" : "plain"}>{row.kind === "followup" ? "Follow-up overdue" : row.crit ? "Critical" : STATUS_META[(reg.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"}</Tag>{imported ? <Tag>Imported record</Tag> : null}</p>
      <h2 className="wq-ih">{reg.condition_class && reg.condition_class !== "Not recorded" ? reg.condition_class : c.title}</h2>
      {reg.condition_text && <p className="kc-quiet">{reg.condition_text}</p>}

      <Section title="Next step"><Panel pad><NextStep file={file} cohort={cohort} onChanged={reloadAll} /></Panel></Section>

      <Section title="Properties">
        <Props items={[
          { label: "Animal", value: c.dog_id ? <Link className="kc-link" href={`/ngo/animals/${c.dog_id}`}>{realName(animal?.name) ?? animal?.straypaw_id ?? "Animal record"}</Link> : "Not linked" },
          { label: "Place", value: <>{[c.zone, reg.city].filter(Boolean).join(", ") || "not recorded"} <small className="kc-hint">{reg.location_precision ? reg.location_precision.replace(/_/g, " ") : reg.h3_r8 ? "recorded area" : "no location"}</small></> },
          { label: "Held by", value: c.assignee_name ?? <span className="is-none">Nobody yet</span> },
          { label: "Recorded", value: <>{day(reg.occurred_at)}{reg.intake_channel && <small className="kc-hint"> via {reg.intake_channel.replace(/_/g, " ")}</small>}</> },
          ...(reg.next_action ? [{ label: "Next action", value: reg.next_action }] : []),
          ...(reg.hospital ? [{ label: "Clinic", value: reg.hospital }] : []),
        ]} />
      </Section>

      <Section title="Follow-ups" count={followups.length}><Panel><FollowupList file={file} onChanged={reloadAll} /></Panel></Section>

      <Section title="Chronology" count={history.length}>
        <Panel>{history.length ? <More items={history} cap={5}>{(shown) => <ol className="kc-items">{shown.map((h, i) => <li key={i} className="kc-item"><span className="kc-item-t"><b>{h.t}</b><small><time>{day(h.at)}</time>{h.who ? ` · ${h.who}` : ""}</small></span></li>)}</ol>}</More> : <p className="kc-quiet is-pad">Nothing recorded on this case since it was opened.</p>}</Panel>
      </Section>

      {(sameAnimal.length > 0 || neighbours.length > 0) && <p className="kc-hint wq-foot">{sameAnimal.length ? `${sameAnimal.length} other case${sameAnimal.length === 1 ? "" : "s"} on this animal. ` : ""}{neighbours.length ? `${neighbours.length} other case${neighbours.length === 1 ? "" : "s"} in the same area.` : ""}</p>}
      <div className="kc-acts wq-acts"><Btn href={`/ngo/cases/${c.id}`}>Full case file</Btn>{reg.h3_r8 && <Btn variant="quiet" href={`/ngo/map?area=${reg.h3_r8}${reg.city ? `&city=${encodeURIComponent(reg.city)}` : ""}`}>On the map</Btn>}</div>
    </div>
  );
}


function SignedOut({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="ngo-door">
      <header className="ngo-door-head">
        <p className="k">NGO workspace</p>
        <h1>Your organisation&rsquo;s work, in one place.</h1>
        <p className="ngo-door-sum">{signedIn
          ? "Your account is not part of an organisation yet. Join with the invitation code your organisation's admin gave you, or apply to partner."
          : "Cases, animals and field work for your team. Sign in with the code your organisation gave you to open its private workspace."}</p>
        <div className="ngo-door-act">
          <Link href="/join" className="btn is-flame">{signedIn ? "Join with a code" : "Sign in with your code"}</Link>
          <Link href="/partner-apply" className="btn">Apply to partner</Link>
        </div>
      </header>
      <section className="ngo-door-inc" aria-labelledby="ngo-door-inc">
        <h2 id="ngo-door-inc">What your workspace includes</h2>
        <ol>
          <li><span aria-hidden>1</span><div><h3>One work queue</h3><p>Requests, cases and follow-ups in one queue.</p></div></li>
          <li><span aria-hidden>2</span><div><h3>Each animal&rsquo;s history</h3><p>Read sightings, cases and recorded care together, with the available location and source.</p></div></li>
          <li><span aria-hidden>3</span><div><h3>Your team&rsquo;s next step</h3><p>Accept and assign cases, record treatment, schedule follow-ups and close cases with an outcome.</p></div></li>
        </ol>
      </section>
    </div>
  );
}
