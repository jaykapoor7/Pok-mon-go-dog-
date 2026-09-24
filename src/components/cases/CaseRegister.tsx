"use client";

/* ════════════════════════════════════════════════════════════════════
   The cases register.

   Open work comes first and is drawn before it is listed: a board of
   triage against age, one square per open case, hatched where nothing has
   been recorded for a month. It answers the two questions a coordinator
   opens this page with — what is urgent, and what has been forgotten —
   before a single row is read, and any square of it filters the list.

   Each row carries its own age bar on a log scale (a week, a month, a
   year are all readable on one ruler): solid while someone was working
   it, hatched for the silence since. Closed work is a lens away, a page
   at a time; search runs across the whole register in the database.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download, Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { closedCounts, closedRegister, openRegister, PAGE, searchRegister, type RegisterRow } from "@/lib/case-register";
import { CLOSURE_META, STATUS_META, triageOf, type ClosureReason, type StatusClass, type Triage } from "@/lib/register/taxonomy";
import { downloadCsv } from "@/lib/csv";
import "./register.css";

const DAY = 86_400_000;
type Lens = "open" | "quiet" | "critical" | "nobody" | "overdue" | "closed" | "reasonless" | "search";
const OPEN_LENSES: Lens[] = ["open", "quiet", "critical", "nobody", "overdue"];
const LENS_LABEL: Record<Lens, string> = {
  open: "All open", quiet: "Quiet a month", critical: "Critical", nobody: "Nobody on it", overdue: "Follow-up overdue",
  closed: "Closed", reasonless: "Closed, no reason", search: "Search",
};
const TRIAGE_ROWS: { id: Triage; label: string }[] = [
  { id: "Critical", label: "Critical" }, { id: "Priority", label: "Priority" }, { id: "Routine", label: "Routine" }, { id: "Unclassified", label: "Not triaged" },
];
const BANDS = [
  { id: 0, label: "This week", max: 7 }, { id: 1, label: "This month", max: 30 }, { id: 2, label: "1–3 months", max: 90 },
  { id: 3, label: "3–6 months", max: 180 }, { id: 4, label: "6–12 months", max: 365 }, { id: 5, label: "Over a year", max: Infinity },
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const daysSince = (iso: string | null, now: number) => (iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / DAY)) : 0);
const span = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1)} y` : d >= 60 ? `${Math.round(d / 30)} mo` : `${d} d`);
const cond = (r: RegisterRow) => (r.condition_class && r.condition_class !== "Not recorded" ? r.condition_class : null);
const triage = (r: RegisterRow): Triage => (r.severity === "critical" ? "Critical" : cond(r) ? triageOf(cond(r)) : "Unclassified");
const isOpen = (r: RegisterRow) => r.status_class === "open" || r.status_class === "in_progress";
const quietDays = (r: RegisterRow, now: number) => daysSince(r.last_activity_at && Date.parse(r.last_activity_at) <= now ? r.last_activity_at : r.occurred_at, now);
const isQuiet = (r: RegisterRow, now: number) => quietDays(r, now) > 30;
const band = (days: number) => BANDS.findIndex((b) => days <= b.max);
const shortCode = (c: string | null) => (!c ? null : c.length > 14 ? c.slice(0, 12) : c);
/** The close, and how it is known (an assumed import date is not a date). */
const closeOf = (r: RegisterRow) => (r.resolved_at && r.resolved_at_source && r.resolved_at_source !== "import_assumed" ? r.resolved_at : r.reviewed_at ?? null);

export function CaseRegister() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const [open, setOpen] = useState<RegisterRow[] | null>(null);
  const [counts, setCounts] = useState<{ closed: number; reasonless: number } | null>(null);
  const [lens, setLens] = useState<Lens>("open");
  const [cell, setCell] = useState<{ t: Triage; b: number } | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<RegisterRow[] | null>(null);
  const [closed, setClosed] = useState<{ lens: Lens; rows: RegisterRow[]; more: boolean } | null>(null);
  const [sort, setSort] = useState<"oldest" | "newest" | "quiet">("oldest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useMemo(() => Date.now(), []);

  // Arrive with ?q (the top-bar search) or ?lens.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q0 = p.get("q"), l0 = p.get("lens") as Lens | null;
    if (q0) { setQ(q0); setLens("search"); } else if (l0 && l0 in LENS_LABEL) setLens(l0);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (lens === "search" && q.trim()) { p.set("q", q.trim()); p.delete("lens"); }
    else { p.delete("q"); if (lens === "open") p.delete("lens"); else p.set("lens", lens); }
    const s = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [lens, q]);

  useEffect(() => {
    if (!ready || !accessReady) return;
    if (!user || !member) { setOpen([]); return; }
    let live = true;
    openRegister().then((r) => live && setOpen(r)).catch((e: Error) => { if (live) { setError(e.message); setOpen([]); } });
    closedCounts().then((c) => live && setCounts(c)).catch(() => {});
    return () => { live = false; };
  }, [ready, accessReady, user, member]);

  // Closed lenses read a page at a time.
  useEffect(() => {
    if (!member || (lens !== "closed" && lens !== "reasonless")) return;
    if (closed?.lens === lens) return;
    let live = true;
    setBusy(true);
    closedRegister(lens).then((rows) => live && setClosed({ lens, rows, more: rows.length === PAGE }))
      .catch((e: Error) => live && setError(e.message)).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [lens, member, closed?.lens]);

  // Search across the register, debounced.
  useEffect(() => {
    if (lens !== "search" || !member) return;
    const t = q.trim();
    if (t.length < 2) { setFound(null); return; }
    let live = true;
    const h = setTimeout(() => {
      setBusy(true);
      searchRegister(t).then((r) => live && setFound(r)).catch((e: Error) => live && setError(e.message)).finally(() => live && setBusy(false));
    }, 280);
    return () => { live = false; clearTimeout(h); };
  }, [q, lens, member]);

  const openRows = useMemo(() => open ?? [], [open]);
  const lensCount = useMemo(() => ({
    open: openRows.length,
    quiet: openRows.filter((r) => isQuiet(r, now)).length,
    critical: openRows.filter((r) => triage(r) === "Critical").length,
    nobody: openRows.filter((r) => !r.assignee_name).length,
    overdue: openRows.filter((r) => r.next_due && Date.parse(r.next_due) < now).length,
  }), [openRows, now]);

  const rows = useMemo(() => {
    let list: RegisterRow[];
    if (lens === "search") list = found ?? [];
    else if (lens === "closed" || lens === "reasonless") list = closed?.lens === lens ? closed.rows : [];
    else {
      list = openRows.filter((r) =>
        lens === "quiet" ? isQuiet(r, now) : lens === "critical" ? triage(r) === "Critical" : lens === "nobody" ? !r.assignee_name
          : lens === "overdue" ? !!r.next_due && Date.parse(r.next_due) < now : true);
      if (cell) list = list.filter((r) => triage(r) === cell.t && band(daysSince(r.occurred_at, now)) === cell.b);
      list = [...list].sort((a, b) => sort === "newest" ? (b.occurred_at ?? "").localeCompare(a.occurred_at ?? "")
        : sort === "quiet" ? quietDays(b, now) - quietDays(a, now) : (a.occurred_at ?? "").localeCompare(b.occurred_at ?? ""));
    }
    return list;
  }, [lens, found, closed, openRows, cell, sort, now]);

  const loadMore = async () => {
    if (!closed || (lens !== "closed" && lens !== "reasonless")) return;
    setBusy(true);
    try { const more = await closedRegister(lens, closed.rows.length); setClosed({ lens, rows: [...closed.rows, ...more], more: more.length === PAGE }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read more."); }
    finally { setBusy(false); }
  };

  const exportCsv = () => downloadCsv(`cases-${lens}-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => ({
    case: r.case_code ?? r.id, condition: r.condition_class ?? "", triage: triage(r), status: r.status_class ?? "", closure_reason: r.closure_reason ?? "",
    place: r.zone ?? "", animal: r.animal_name ?? "", straypaw_id: r.straypaw_id ?? "", reported: (r.occurred_at ?? "").slice(0, 10),
    last_activity: (r.last_activity_at ?? "").slice(0, 10), days_open: isOpen(r) ? daysSince(r.occurred_at, now) : "", quiet_days: isOpen(r) ? quietDays(r, now) : "",
    with: r.assignee_name ?? "", followups_done: r.followups_done ?? 0, followups_missed: r.followups_missed ?? 0,
  })));

  if (!ready || !accessReady || open === null) return <main className="cr"><p className="cr-state"><Loader2 size={16} className="animate-spin" /> Reading your organisation&rsquo;s cases…</p></main>;
  if (!user || !member) return (
    <main className="cr">
      <Head />
      <p className="cr-state">Cases load once you sign in with an organisation account, and each organisation sees only its own. They hold what callers said and where an animal was found, so nothing is shown before that.</p>
    </main>
  );

  return (
    <main className="cr">
      <Head count={lensCount} review={counts?.reasonless} />

      {openRows.length > 0 && <Board rows={openRows} now={now} cell={cell} onCell={(c) => { setCell(c); setLens((l) => (OPEN_LENSES.includes(l) ? l : "open")); }} />}

      <div className="cr-lenses" role="tablist" aria-label="Which cases">
        {OPEN_LENSES.map((l) => (
          <button key={l} role="tab" aria-selected={lens === l} className={`${lens === l ? "is-on" : ""} ${l === "critical" || l === "quiet" || l === "overdue" ? "is-att" : ""}`} onClick={() => setLens(l)}>
            {LENS_LABEL[l]} <b className="sys-mono">{lensCount[l as keyof typeof lensCount]}</b>
          </button>
        ))}
        <span className="cr-lens-gap" aria-hidden />
        {(["closed", "reasonless"] as Lens[]).map((l) => (
          <button key={l} role="tab" aria-selected={lens === l} className={lens === l ? "is-on" : ""} onClick={() => { setLens(l); setCell(null); }}>
            {LENS_LABEL[l]} {counts && <b className="sys-mono">{(l === "closed" ? counts.closed : counts.reasonless).toLocaleString("en-IN")}</b>}
          </button>
        ))}
      </div>

      <div className="cr-tools">
        <label className="cr-search">
          <Search size={15} aria-hidden />
          <span className="sys-sr">Search every case</span>
          <input value={q} placeholder="Search every case: code, animal, place, condition" onChange={(e) => { setQ(e.target.value); if (e.target.value.trim()) { setLens("search"); setCell(null); } else if (lens === "search") setLens("open"); }} />
        </label>
        {OPEN_LENSES.includes(lens) && (
          <label className="cr-sort"><span className="sys-sr">Order</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="oldest">Oldest first</option>
              <option value="quiet">Quietest first</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        )}
        {cell && <button type="button" className="cr-chip" onClick={() => setCell(null)}>{TRIAGE_ROWS.find((t) => t.id === cell.t)?.label} · {BANDS[cell.b].label.toLowerCase()} <span aria-hidden>×</span><span className="sys-sr">Clear</span></button>}
        <p className="cr-tally">{busy ? <Loader2 size={14} className="animate-spin" /> : null}{rows.length.toLocaleString("en-IN")}{closed?.more && (lens === "closed" || lens === "reasonless") ? "+" : ""} {rows.length === 1 ? "case" : "cases"}</p>
        <button type="button" className="cr-btn" onClick={exportCsv} disabled={!rows.length}><Download size={15} /> CSV</button>
      </div>

      {error && <p className="cr-state is-err">{error}</p>}
      {lens === "reasonless" && rows.length > 0 && (
        <p className="cr-note">These closed without field action and never said why. <Link href="/partner/review?tab=reasons">Record the reasons in case review <ArrowUpRight size={13} /></Link></p>
      )}

      {rows.length ? (
        <>
          <div className="cr-scale" aria-hidden><span className="cr-scale-ax">{["1 week", "1 month", "3 months", "1 year", "3 years"].map((l, i) => <i key={l} style={{ left: `${(Math.log1p([7, 30, 90, 365, 1095][i]) / Math.log1p(1500)) * 100}%` }}>{l}</i>)}</span></div>
          <ol className="cr-list">{rows.map((r) => <Row key={r.id} r={r} now={now} />)}</ol>
          {closed?.more && (lens === "closed" || lens === "reasonless") && <button type="button" className="cr-more" onClick={loadMore} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : null} Read {PAGE} more</button>}
        </>
      ) : (
        <p className="cr-state">{lens === "search" ? (q.trim().length < 2 ? "Type at least two letters." : busy ? "Searching…" : "No case matches that.") : busy ? "Reading…" : lens === "open" ? "No open cases. Everything recorded has been closed." : "No cases in this view."}</p>
      )}
    </main>
  );
}

function Head({ count, review }: { count?: Record<string, number>; review?: number }) {
  return (
    <header className="cr-head">
      <div>
        <p className="sys-eyebrow">Cases</p>
        <h1>Every request, and where it&nbsp;stands.</h1>
        {count && (
          <p className="cr-line">
            <b>{count.open.toLocaleString("en-IN")}</b> open.{" "}
            {count.quiet ? <><em>{count.quiet}</em> quiet for more than a month, </> : null}
            {count.critical ? <><em>{count.critical}</em> critical, </> : null}
            <b>{count.nobody}</b> with nobody on {count.nobody === 1 ? "it" : "them"}.
          </p>
        )}
      </div>
      <div className="cr-acts">
        <Link href="/partner/cases/new" className="sys-btn is-flame"><Plus size={16} /> New rescue case</Link>
        <Link href="/partner/review" className="cr-link">Case review{review ? ` · ${review} need a reason` : ""} <ArrowUpRight size={14} /></Link>
      </div>
    </header>
  );
}

/** Triage against age. One square per open case; hatched when nothing was recorded for a month. */
function Board({ rows, now, cell, onCell }: { rows: RegisterRow[]; now: number; cell: { t: Triage; b: number } | null; onCell: (c: { t: Triage; b: number } | null) => void }) {
  const grid = useMemo(() => {
    const g = new Map<string, RegisterRow[]>();
    for (const r of rows) { const k = `${triage(r)}|${band(daysSince(r.occurred_at, now))}`; g.set(k, [...(g.get(k) ?? []), r]); }
    return g;
  }, [rows, now]);
  const colTotal = BANDS.map((b) => rows.filter((r) => band(daysSince(r.occurred_at, now)) === b.id).length);
  return (
    <figure className="cr-board">
      <div className="cr-grid" role="grid" aria-label="Open cases by triage and by how long they have been open">
        <span className="cr-corner" />
        {BANDS.map((b, i) => <span key={b.id} className="cr-colh" role="columnheader">{b.label}<small className="sys-mono">{colTotal[i]}</small></span>)}
        {TRIAGE_ROWS.map((t) => {
          const total = rows.filter((r) => triage(r) === t.id).length;
          return (
            <div key={t.id} className={`cr-trow is-${t.id.toLowerCase()}`} role="row">
              <span className="cr-rowh" role="rowheader"><i />{t.label}<small className="sys-mono">{total}</small></span>
              {BANDS.map((b) => {
                const list = grid.get(`${t.id}|${b.id}`) ?? [];
                const on = cell?.t === t.id && cell.b === b.id;
                const quiet = list.filter((r) => isQuiet(r, now)).length;
                return (
                  <button key={b.id} type="button" role="gridcell" className={`cr-cell ${on ? "is-on" : ""} ${list.length ? "" : "is-empty"}`} disabled={!list.length}
                    aria-selected={on} aria-label={`${t.label}, ${b.label.toLowerCase()}: ${list.length} open, ${quiet} quiet`}
                    onClick={() => onCell(on ? null : { t: t.id, b: b.id })}>
                    <span className="cr-units">
                      {list.slice(0, 60).map((r) => <i key={r.id} className={isQuiet(r, now) ? "is-quiet" : ""} />)}
                      {list.length > 60 && <em>+{list.length - 60}</em>}
                    </span>
                    {list.length > 0 && <b className="sys-mono">{list.length}</b>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <figcaption>
        <span><i className="k-live" /> worked on in the last month</span>
        <span><i className="k-quiet" /> nothing recorded for a month or more</span>
        <span>One square is one open case. Choose a square of the board to list those cases.</span>
      </figcaption>
    </figure>
  );
}

function Row({ r, now }: { r: RegisterRow; now: number }) {
  const t = triage(r);
  const o = isOpen(r);
  const age = daysSince(r.occurred_at, now);
  const q = quietDays(r, now);
  const close = closeOf(r);
  const closedDays = !o && close && r.occurred_at ? Math.max(0, Math.round((Date.parse(close) - Date.parse(r.occurred_at)) / DAY)) : null;
  const L = (d: number) => (Math.log1p(Math.max(0, d)) / Math.log1p(1500)) * 100;
  const total = o ? age : closedDays ?? 0;
  const active = o ? Math.max(0, age - q) : total;
  const cls = (r.status_class ?? "unknown") as StatusClass;
  const reason = r.closure_reason && r.closure_reason !== "unspecified" ? CLOSURE_META[r.closure_reason as ClosureReason]?.label : null;
  const overdue = o && r.next_due && Date.parse(r.next_due) < now;
  return (
    <li className={`cr-row ${o ? "" : "is-closed"}`}>
      <span className={`cr-mark is-${t.toLowerCase()}`} title={t === "Unclassified" ? "Not triaged" : t} />
      <div className="cr-what">
        <Link href={`/partner/cases/${r.id}`} className="cr-name">{cond(r) ?? "Condition not recorded"}</Link>
        <small>{[shortCode(r.case_code), r.animal_name].filter(Boolean).join(" · ")}</small>
      </div>
      <div className="cr-where"><span>{r.zone || "—"}</span><small>{day(r.occurred_at)}</small></div>
      <div className="cr-age" title={o ? `Open ${span(age)}; nothing recorded for ${span(q)}` : closedDays != null ? `Closed after ${span(closedDays)}` : "Close date not recorded"}>
        <span className="cr-bar">
          {o || closedDays != null ? (
            <>
              <i className="cr-bar-on" style={{ width: `${L(active)}%` }} />
              {o && q > 0 && <i className={`cr-bar-quiet ${q > 30 ? "is-long" : ""}`} style={{ left: `${L(active)}%`, width: `${Math.max(0.8, L(total) - L(active))}%` }} />}
            </>
          ) : <i className="cr-bar-unknown" />}
        </span>
        <small>{o ? (q > 30 ? <><b>{span(q)}</b> quiet · open {span(age)}</> : <>open {span(age)}</>) : closedDays != null ? <>closed in {span(closedDays)}</> : <>close date not recorded</>}</small>
      </div>
      <div className="cr-with">{o ? (r.assignee_name ? <span>{r.assignee_name}</span> : <span className="is-none">Nobody</span>) : reason ? <small>{reason}</small> : null}{overdue && <small className="is-hot">follow-up overdue</small>}</div>
      <span className={`cr-status is-${cls}`}>{STATUS_META[cls]?.short ?? cls}</span>
    </li>
  );
}
