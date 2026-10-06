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
import { DeskHeader } from "@/components/app/DeskHeader";
import { HairlineFigure } from "@/components/hairline/HairlineFigure";
import { OpsStreetMap, type OpenSpot } from "@/components/partner/OpsStreetMap";
import { getMyOrg } from "@/lib/actions";
import { dueFollowups, isStale, openCases, opsCounts, orgOpenWorkCells, queueOrder, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts, type OrgOpenWorkCell } from "@/lib/ops";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import "./ops.css";

const DAY = 86_400_000;
const num = (n: number) => n.toLocaleString("en-IN");
const ageDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0);
const ago = (iso: string | null) => { const d = ageDays(iso); return d < 1 ? "today" : d === 1 ? "yesterday" : d < 31 ? `${d} days` : d < 365 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1)} years`; };
/* Imported animals are named "Dog · <locality> · <month>", so the place is
   printed once, not twice. */
const who = (c?: OpenCase) => {
  if (!c) return "";
  const name = (c.animal_name ?? "").trim(), place = (c.zone ?? "").trim();
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
  const [queueRows, setQueueRows] = useState(8);

  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })); }, []);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const apply = () => setQueueRows(phone.matches ? 5 : 8);
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

  return (
    <main className="ops ops-desk">
      <DeskHeader
        city={place ?? undefined}
        kicker={`${org?.name ?? "Your organisation"}${today ? ` · ${today}` : ""}`}
        title="What needs attention"
        lede={signedOut
          ? "A working view of the field, ready for your organisation’s records."
          : blank ? "Your first case starts the live work here."
          : "The work that needs a response, the follow-ups that have slipped, and the cases waiting for a decision."}
        figures={working || loading ? [
          { label: crit ? `in the live queue · ${num(crit)} critical` : "in the live queue", value: loading ? null : live, href: "/partner/records?view=rescue" },
          { label: "follow-ups overdue", value: loading ? null : overdue, tone: overdue ? "attention" : undefined, href: "/partner/records?view=overdue" },
          { label: "older cases to review", value: loading ? null : stale, tone: "quiet", href: "/partner/review" },
        ] : undefined}
        actions={<>
          <Link href="/partner/cases/new" className="dk-btn is-flame"><Plus size={16} />New rescue case</Link>
          <Link href="/partner/records" className="dk-btn is-tint"><Search size={14} />Find a record</Link>
        </>}
      />

      {loadError && <p role="alert" className="ops-alert">The organisation record could not be read. Reload to try again; nothing has been changed.</p>}

      {!loadError && (blank || signedOut) && (
        <section className="ops-setup dk-sheet">
          <div>
            <p className="dk-kicker">{signedOut ? "Members only" : "Day one"}</p>
            <h2>{signedOut ? "Sign in to open your organisation’s record." : "Start with the records you already keep."}</h2>
            <p>{signedOut
              ? "Anyone can look around the Field Workspace. The records themselves load only for members of the organisation that keeps them."
              : "Import an existing workbook, open your first rescue case, or add an animal directly. StrayPaw keeps your own source IDs and builds a permanent animal identity underneath them."}</p>
          </div>
          <div className="ops-setup-actions">
            {signedOut && !user ? (
              <>
                <Link href="/join" className="dk-btn">Sign in with your code</Link>
                <Link href="/partner-apply" className="dk-btn is-tint">Apply to partner</Link>
              </>
            ) : signedOut ? (
              <Link href="/partner-apply" className="dk-btn">Apply to partner</Link>
            ) : (
              <>
                <Link href="/partner/import" className="dk-btn">Import workbook</Link>
                <Link href="/partner/cases/new" className="dk-btn is-tint">New rescue case</Link>
              </>
            )}
          </div>
          <HairlineFigure
            kind="handoff"
            className="ops-setup-figure"
            label="A case moving through four stages of a field-work hand-off."
          />
        </section>
      )}

      {/* The desk: the queue beside where the queue is. */}
      <section className="ops-board dk-panel" aria-label="Today’s operations">
        <div className="ops-board-bar">
          <b>Field Workspace</b>
          <span className="ops-board-place sys-mono">{place ?? "Your area"}</span>
          {today && <span className="ops-board-clock"><i aria-hidden />{today}</span>}
        </div>
        <div className="ops-board-body">
          <div className="ops-queue">
            <p className="ops-eyebrow"><span>The queue{cell ? " · one cell" : ""}</span><Link href="/partner/records">All records <ArrowUpRight size={12} /></Link></p>
            {cell && <button type="button" className="ops-chip" onClick={() => setCell(null)}>Showing one cell <X size={13} /></button>}
            {loading ? (
              <ol className="ops-list is-loading" aria-label="Loading the queue">{[0, 1, 2, 3, 4].map((i) => <li key={i}><span /></li>)}</ol>
            ) : shown.length === 0 ? (
              <p className="ops-empty">{signedOut ? "Your organisation’s live work appears here." : blank ? "Nothing is queued yet. The first case you open appears here." : cell ? "Nothing live in this cell." : "No live case and nothing overdue. This is the state you want."}</p>
            ) : (
              <ol className="ops-list">
                {shown.slice(0, queueRows).map((q, i) => {
                  const c = q.c, f = q.f;
                  const href = c ? `/partner/cases/${c.id}` : f?.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records?view=overdue";
                  return (
                    <li key={q.key} style={{ ["--i" as string]: i }} onPointerEnter={() => setHot(q.cell)} onPointerLeave={() => setHot(null)}>
                      <Link href={href} onFocus={() => setHot(q.cell)} onBlur={() => setHot(null)}>
                        <i className={`ops-mark ${q.kind === "followup" ? "is-due" : q.crit ? "is-crit" : ""}`} aria-hidden />
                        <span className="ops-what">
                          <b>{q.kind === "followup" ? "Follow-up overdue" : c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c?.title || "Open case"}</b>
                          <small>{who(c) || (f?.kind && !/^imported/i.test(f.kind) ? f.kind.replace(/_/g, " ") : f?.dog_id ? "An animal's review" : "From the imported register")}</small>
                        </span>
                        <span className="ops-age">
                          <i style={{ width: `${Math.min(100, (q.age / 90) * 100)}%` }} className={q.age > 30 ? "is-long" : ""} aria-hidden />
                          <small>{q.kind === "followup" ? `due ${ago(f!.due_at)} ago` : `${STATUS_META[(c?.status_class ?? "open") as StatusClass]?.short ?? "Open"} · ${ago(c?.occurred_at ?? null)}`}</small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
            {shown.length > queueRows && <Link href="/partner/records?view=rescue" className="ops-more">{num(shown.length - queueRows)} more in the queue <ArrowUpRight size={13} /></Link>}
          </div>

          <div className="ops-geo">
            <p className="ops-eyebrow">
              <span>Where it is{workMap ? ` · ${workMap.name}` : ""}</span>
              <Link href="/partner/map?mode=cases">Field map <ArrowUpRight size={12} /></Link>
            </p>
            <div className="ops-map">
              {workMap ? (
                <>
                  <OpsStreetMap spots={workMap.spots} box={workMap.box} selected={cell ?? hot}
                    label={`Open work on the streets of ${workMap.name}`} onSpot={(k) => setCell((x) => (x === k ? null : k))} />
                  <p className="ops-map-key"><i className="is-dot" /> live cases <i className="is-ring" /> only older cases <span>· tap a point to narrow the queue</span></p>
                </>
              ) : <p className="ops-map-empty">{signedOut ? "Sign in with your organisation’s code to see where your open work is." : loading ? "Placing the open work…" : "Open work appears here by cell once a case carries a location."}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="ops-lower">
        {/* Tasks and the one decision waiting sit together, beside what changed,
            so neither column runs on alone. */}
        {(isMember || (working && stale > 0)) && (
          <div className="ops-lower-side">
            {isMember && <section className="dk-section ops-tasks" aria-label="Tasks"><TasksSection compact /></section>}
            {isMember && <section className="dk-section ops-tasks" aria-label="Camps coming up"><CampsSection compact /></section>}
            {working && stale > 0 && (
              <div className="ops-decide">
                <b>{num(stale)}</b>
                <p>Cases open for months with nothing recorded. A person decides what happened to each.</p>
                <Link href="/partner/review" className="dk-btn is-tint">Review them</Link>
              </div>
            )}
          </div>
        )}

        {working && (
          <section className="dk-section" aria-label="Recent changes">
            <div className="dk-section-head"><h2>What changed</h2><Link href="/partner/records" className="dk-btn is-plain">Record <ArrowUpRight size={13} /></Link></div>
            {changes.length ? (
              <ol className="ops-changes">
                {changes.slice(0, 5).map((c) => (
                  <li key={c.id}><Link href={`/partner/cases/${c.id}`}>
                    <span><b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</b>
                      <small>{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label}{c.closure_reason ? ` · ${CLOSURE_SHORT[c.closure_reason] ?? c.closure_reason}` : ""}{c.zone ? ` · ${c.zone}` : ""}</small></span>
                    <em>{ago(c.last_activity_at)}</em>
                  </Link></li>
                ))}
              </ol>
            ) : <p className="ops-empty">Closed cases and recorded outcomes show here.</p>}
          </section>
        )}
      </div>
    </main>
  );
}
