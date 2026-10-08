"use client";

/* ════════════════════════════════════════════════════════════════════
   The operations room: an organisation's day, in the order a field team
   asks for it.

   1. Where things stand, in one sentence, and the one action that starts
      work.
   2. The queue beside where the queue is. The queue holds LIVE work only:
      overdue follow-ups, then critical conditions, then the rest, oldest
      first. Cases open for months with nothing recorded are not live
      work; they would bury the queue, so they are counted separately and
      sent to review, where a person decides what happened. The plate
      beside the queue draws open work by cell; stale-only cells are
      hatched. Choose a cell to narrow the queue to it.
   3. What needs a decision: stale cases and reasonless closures, one
      line, one way in (case review already holds both tabs).
   4. What changed: the last few closed cases.

   Everything else this room used to repeat — sterilisation/vaccination
   share, where coverage is thin, missed-follow-up totals, the season's
   busy months, impossible dates — already has its own page (Analysis,
   Map, Data quality) and is one click away from the sidebar. Showing it
   twice was not a second feature, it was the same fact told again.

   Every figure is read live from the organisation's own records.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, Search, X } from "lucide-react";
import { cellToBoundary, cellToLatLng, isValidCell } from "h3-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { CampsSection } from "@/components/partner/CampsSection";
import { TasksSection } from "@/components/partner/TasksSection";
import { OpsStreetMap, type OpenSpot } from "@/components/partner/OpsStreetMap";
import { getMyOrg } from "@/lib/actions";
import { dueFollowups, isStale, openCases, opsCounts, orgOpenWorkCells, queueOrder, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts, type OrgOpenWorkCell } from "@/lib/ops";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import "./ops.css";
import "./today.css";

const DAY = 86_400_000;
const num = (n: number) => n.toLocaleString("en-IN");
const ageDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0);
const ago = (iso: string | null) => { const d = ageDays(iso); if (d < 1) return "today"; if (d === 1) return "1 day"; if (d < 31) return `${d} days`; if (d < 365) { const m = Math.round(d / 30); return `${m} month${m === 1 ? "" : "s"}`; } return `${(d / 365).toFixed(1)} years`; };
/* Imported animals are named "Dog · <locality> · <month>", so the place is
   printed once, not twice. */
const who = (c?: OpenCase) => {
  if (!c) return "";
  /* A generated label ("Dog · Place · Month") is not a name; say the place once. */
  const raw = (c.animal_name ?? "").trim(), place = (c.zone ?? "").trim();
  const name = /·/.test(raw) ? "" : raw;
  return [name, place && !name.toLowerCase().includes(place.toLowerCase()) ? place : "", c.case_code].filter(Boolean).join(" · ");
};
const critical = (c: { condition_class: string | null }) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const CLOSURE_SHORT: Record<string, string> = {
  could_not_locate: "could not be found", died: "died", recovered: "recovered", caller_unreachable: "caller unreachable",
  other_ngo: "handed on", duplicate: "duplicate", not_attended: "not attended", other: "other", unspecified: "no reason recorded",
};

export function OpsRoom() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const isMember = Boolean(user && member);
  const [open, setOpen] = useState<OpenCase[] | null>(null);
  const [due, setDue] = useState<DueFollowup[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [counts, setCounts] = useState<OpsCounts | null>(null);
  const [openCells, setOpenCells] = useState<OrgOpenWorkCell[] | null>(null);
  const [org, setOrg] = useState<NGO | null>(null);
  const [today, setToday] = useState("");
  const [cell, setCell] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [queueRows, setQueueRows] = useState(10);
  const [focus, setFocus] = useState<"all" | "critical" | "followup">("all");

  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })); }, []);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const apply = () => setQueueRows(phone.matches ? 6 : 10);
    apply(); phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (!ready || !accessReady) return;
    /* Signed out, or not yet a member, is a real state: the empty workspace. */
    if (!isMember) { setOpen([]); setDue([]); setChanges([]); setCounts(null); setOpenCells([]); setOrg(null); return; }
    let live = true; setLoadError(false);
    Promise.all([openCases(), dueFollowups(), recentChanges(), getMyOrg().catch(() => null), opsCounts(), orgOpenWorkCells().catch(() => [])])
      .then(([o, d, ch, g, c, cells]) => { if (!live) return; setOpen(o); setDue(d); setChanges(ch); setOrg(g); setCounts(c); setOpenCells(cells); })
      .catch(() => { if (live) { setLoadError(true); setOpen([]); setDue([]); setChanges([]); setCounts(null); setOpenCells([]); } });
    return () => { live = false; };
  }, [ready, accessReady, isMember]);

  /* ── the day's numbers ─────────────────────────────────────────────── */
  const s = useMemo(() => {
    const all = open ?? [];
    const now = Date.now();
    const stale = all.filter((c) => isStale(c, now));
    const liveWork = all.filter((c) => !isStale(c, now));
    const overdue = due.filter((f) => Date.parse(f.due_at) < now);
    const week = due.filter((f) => Date.parse(f.due_at) >= now);
    const crit = liveWork.filter(critical);
    return { all, stale, liveWork, overdue, week, crit };
  }, [open, due]);


  /* ── the queue: live work, what goes wrong first at the top ────────── */
  const queue = useMemo(() => {
    const items: { key: string; kind: "followup" | "case"; c?: OpenCase; f?: DueFollowup; crit: boolean; cell: string | null; age: number }[] = [];
    const byCase = new Map(s.all.map((c) => [c.id, c]));
    for (const f of s.overdue) {
      const c = f.case_id ? byCase.get(f.case_id) : undefined;
      items.push({ key: `f-${f.id}`, kind: "followup", f, c, crit: c ? critical(c) : false, cell: c?.h3_r8 ?? null, age: ageDays(f.due_at) });
    }
    for (const c of s.liveWork) items.push({ key: `c-${c.id}`, kind: "case", c, crit: critical(c), cell: c.h3_r8, age: ageDays(c.occurred_at) });
    return items.sort(queueOrder);
  }, [s]);
  const shown = cell ? queue.filter((q) => q.cell === cell) : queue;

  /* The queue is a bounded list of named rows. The map is not: its counts
     come from an exact RLS-scoped cell aggregate, so geography never stops at
     the queue's 800-row safety cap. */
  const workMap = useMemo(() => {
    if (!isMember || !openCells?.length) return null;
    const rows = openCells.filter((row) => row.h3_r8 && isValidCell(row.h3_r8) && row.open_cases > 0);
    if (!rows.length) return null;
    const spots: OpenSpot[] = rows.map((row) => {
      const [lat, lng] = cellToLatLng(row.h3_r8);
      return { key: row.h3_r8, lat, lng, live: Math.max(0, row.open_cases - row.stale_cases), stale: row.stale_cases };
    });
    const boundary = rows.flatMap((row) => cellToBoundary(row.h3_r8));
    const lats = boundary.map(([lat]) => lat), lngs = boundary.map(([, lng]) => lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = Math.max(0.012, Math.max(maxLat - minLat, maxLng - minLng) * 0.08);
    const cities = [...new Set(rows.map((row) => row.city).filter(Boolean))];
    return {
      spots,
      box: [minLng - pad, minLat - pad, maxLng + pad, maxLat + pad] as [number, number, number, number],
      name: cities.length === 1 ? cities[0] : "all open work",
    };
  }, [isMember, openCells]);

  const loading = open === null || !ready || !accessReady;
  const blank = !loading && isMember && (counts ? counts.open === 0 : s.all.length === 0);
  const signedOut = !loading && !isMember;
  const live = counts?.liveWork ?? s.liveWork.length;
  const crit = counts?.critical ?? s.crit.length;
  const overdue = counts?.overdue ?? s.overdue.length;
  const stale = counts?.stale ?? s.stale.length;
  const working = isMember && !blank && !loading;
  const place = workMap && workMap.name !== "all open work" ? workMap.name : org?.city ?? null;

  const summary = loading ? null : signedOut ? null : blank ? "Nothing is open. Start from the records you already keep." : null;
  const filtered = shown.filter((q) => focus === "all" ? true : focus === "critical" ? q.crit : q.kind === "followup");

  return (
    <main className="td">
      <header className="td-head x-wrap">
        <div className="td-head-copy">
          <p className="x-kicker">{org?.name ?? "Organisation workspace"}{today ? ` · ${today}` : ""}</p>
          <h1 className="x-h1">Today</h1>
          {working ? (
            <p className="td-sum" aria-live="polite">
              <span><b className="x-num">{num(live)}</b> live case{live === 1 ? "" : "s"}</span>
              <span className={crit ? "is-hot" : ""}><b className="x-num">{num(crit)}</b> critical</span>
              <span className={overdue ? "is-hot" : ""}><b className="x-num">{num(overdue)}</b> follow-up{overdue === 1 ? "" : "s"} overdue</span>
              <span><b className="x-num">{num(stale)}</b> older case{stale === 1 ? "" : "s"} waiting on a decision</span>
            </p>
          ) : <p className="x-lede">{summary ?? (loading ? "Reading your organisation's record…" : "The working record for the people who respond: what needs someone, where it is, and what happened.")}</p>}
        </div>
        <div className="td-head-do">
          <Link href="/partner/cases/new" className="x-btn is-flame"><Plus size={16} aria-hidden /> New case</Link>
          <Link href="/partner/records" className="x-btn"><Search size={16} aria-hidden /> Find a record</Link>
        </div>
      </header>

      {loadError && <p role="alert" className="td-alert x-wrap">The organisation record could not be read. Reload to try again — nothing has been changed.</p>}

      {!loadError && (blank || signedOut) && (
        <section className="td-start x-wrap" aria-labelledby="td-start-h">
          <div className="td-start-card x-night">
            <p className="x-kicker">{signedOut ? "Members only" : "Day one"}</p>
            <h2 id="td-start-h" className="x-h2">{signedOut ? <>Your organisation&apos;s record opens <em>after you sign in</em></> : <>Start with the records <em>you already keep</em></>}</h2>
            <p className="x-lede">{signedOut
              ? "Anyone can look around the workspace. Cases, animals and locations load only for members of the organisation that keeps them — they never reach this page otherwise."
              : "Import the workbook your team already uses, open your first rescue case, or add an animal directly. StrayPaw keeps your own source IDs and builds a lasting identity underneath them."}</p>
            <div className="td-start-do">
              {signedOut && !user ? <>
                <Link href="/join" className="x-btn is-flame">Sign in with your code</Link>
                <Link href="/partner-apply" className="x-btn">Apply to partner</Link>
              </> : signedOut ? <Link href="/partner-apply" className="x-btn is-flame">Apply to partner</Link> : <>
                <Link href="/partner/import" className="x-btn is-flame">Import a workbook</Link>
                <Link href="/partner/cases/new" className="x-btn">Open a rescue case</Link>
              </>}
            </div>
          </div>
          <ol className="td-flow" aria-label="How the workspace is organised">
            <li><b>1 · The queue</b><p>Live cases and overdue follow-ups, critical conditions first. Months-old cases with no activity are kept out of it and sent to review instead.</p></li>
            <li><b>2 · The record</b><p>Every case opens into the animal it concerns, its history, care and follow-ups — one identity across every source your team imported.</p></li>
            <li><b>3 · The action</b><p>Assign, record treatment, schedule the follow-up or close with a reason. The map and reports update from what you record.</p></li>
          </ol>
        </section>
      )}

      {(working || loading) && (
        <section className="td-desk x-wrap" aria-label="The queue and where it is">
          <div className="td-queue">
            <div className="td-queue-head">
              <h2 className="x-h3">Needs someone</h2>
              <div className="x-chips" role="group" aria-label="Show">
                <button type="button" className="x-chip" aria-pressed={focus === "all"} onClick={() => setFocus("all")}>All <b>{loading ? "—" : num(shown.length)}</b></button>
                <button type="button" className="x-chip" aria-pressed={focus === "critical"} onClick={() => setFocus("critical")}>Critical <b>{loading ? "—" : num(shown.filter((q) => q.crit).length)}</b></button>
                <button type="button" className="x-chip" aria-pressed={focus === "followup"} onClick={() => setFocus("followup")}>Overdue follow-ups <b>{loading ? "—" : num(shown.filter((q) => q.kind === "followup").length)}</b></button>
                {cell && <button type="button" className="x-chip is-on" onClick={() => setCell(null)}>One cell <X size={14} aria-hidden /></button>}
              </div>
            </div>
            {loading ? (
              <ol className="td-rows is-loading" aria-label="Loading the queue">{[0, 1, 2, 3, 4].map((i) => <li key={i}><span className="x-skel" /></li>)}</ol>
            ) : filtered.length === 0 ? (
              <p className="td-empty">{cell ? "Nothing live in this cell." : focus !== "all" ? "Nothing in this view." : "No live case and nothing overdue. This is the state you want."}</p>
            ) : (
              <ol className="td-rows">
                {filtered.slice(0, queueRows).map((q) => {
                  const c = q.c, f = q.f;
                  const href = c ? `/partner/cases/${c.id}` : f?.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records?view=overdue";
                  return (
                    <li key={q.key} onPointerEnter={() => setHot(q.cell)} onPointerLeave={() => setHot(null)} className={q.crit ? "is-crit" : q.kind === "followup" ? "is-due" : ""}>
                      <Link href={href} onFocus={() => setHot(q.cell)} onBlur={() => setHot(null)}>
                        <span className="td-tri" aria-hidden />
                        <span className="td-what">
                          <b>{q.kind === "followup" ? "Follow-up overdue" : c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c?.title || "Open case"}</b>
                          <small>{who(c) || (f?.kind && !/^imported/i.test(f.kind) ? f.kind.replace(/_/g, " ") : f?.dog_id ? "An animal's review" : "From the imported register")}</small>
                        </span>
                        <span className={`x-state ${q.crit ? "is-hot" : q.kind === "followup" ? "is-hot" : "is-open"}`}>{q.kind === "followup" ? "Overdue" : q.crit ? "Critical" : STATUS_META[(c?.status_class ?? "open") as StatusClass]?.short ?? "Open"}</span>
                        <span className="td-age"><b className="x-num">{q.kind === "followup" ? ago(f!.due_at) : ago(c?.occurred_at ?? null)}</b><small>{q.kind === "followup" ? "overdue" : "waiting"}</small></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
            {filtered.length > queueRows && <Link href="/partner/records?view=rescue" className="x-link">{num(filtered.length - queueRows)} more in the full register <ArrowUpRight size={14} aria-hidden /></Link>}
          </div>

          <div className="td-geo">
            <div className="td-geo-head"><h2 className="x-h3">Where it is{workMap ? <span className="x-small"> · {workMap.name}</span> : null}</h2><Link href="/partner/map?mode=cases" className="x-link">Field map <ArrowUpRight size={14} aria-hidden /></Link></div>
            <div className="td-map">
              {workMap ? (
                <OpsStreetMap spots={workMap.spots} box={workMap.box} selected={cell ?? hot} label={`Open work on the streets of ${workMap.name}`} onSpot={(k) => setCell((x) => (x === k ? null : k))} />
              ) : <p className="td-map-empty">{loading ? "Placing the open work…" : "Open work appears here by cell once a case carries a location."}</p>}
            </div>
            {workMap && <p className="td-key"><i className="is-dot" /> live cases <i className="is-ring" /> only older cases · choose a point to narrow the queue</p>}
          </div>
        </section>
      )}

      {working && (
        <section className="td-lower x-wrap" aria-label="Decisions, plans and what changed">
          {stale > 0 && (
            <div className="td-decide">
              <b className="x-num">{num(stale)}</b>
              <div><h2 className="x-h3">cases wait on a decision</h2><p>Open for months with nothing recorded. They are kept out of the queue; a person decides what happened to each — usually from the imported register.</p></div>
              <Link href="/partner/review" className="x-btn is-ink">Review them</Link>
            </div>
          )}
          <div className="td-plan">
            <section className="td-panel" aria-label="Tasks"><TasksSection compact /></section>
            <section className="td-panel" aria-label="Camps coming up"><CampsSection compact /></section>
          </div>
          <section className="td-panel td-changes" aria-labelledby="td-ch">
            <div className="td-geo-head"><h2 id="td-ch" className="x-h3">What changed</h2><Link href="/partner/records" className="x-link">Register <ArrowUpRight size={14} aria-hidden /></Link></div>
            {changes.length ? (
              <ol className="x-rows">
                {changes.slice(0, 6).map((c) => (
                  <li key={c.id}><Link className="x-row td-change" href={`/partner/cases/${c.id}`}>
                    <span className="x-state is-done" aria-hidden />
                    <span><b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</b>
                      <small className="x-small">{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label}{c.closure_reason ? ` · ${CLOSURE_SHORT[c.closure_reason] ?? c.closure_reason}` : ""}{c.zone ? ` · ${c.zone}` : ""}</small></span>
                    <em>{ago(c.last_activity_at)} ago</em>
                  </Link></li>
                ))}
              </ol>
            ) : <p className="td-empty">Closed cases and recorded outcomes show here.</p>}
          </section>
        </section>
      )}
    </main>
  );
}
