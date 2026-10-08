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
import { Dashboard, Feed, ItemList, MapChips, Panel, type Item } from "@/components/dash/Dashboard";
import { LiveMap, type MapCell } from "@/components/dash/LiveMap";
import { getMyOrg } from "@/lib/actions";
import { dueFollowups, isStale, openCases, opsCounts, orgOpenWorkCells, queueOrder, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts, type OrgOpenWorkCell } from "@/lib/ops";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import "./ops.css";

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
    const spots: { key: string; lat: number; lng: number; live: number; stale: number }[] = rows.map((row) => {
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

  const [mapMode, setMapMode] = useState<"open" | "live" | "stale">("open");
  const mapCells: MapCell[] = (openCells ?? []).filter((r) => r.h3_r8 && isValidCell(r.h3_r8)).map((r) => ({
    h3: r.h3_r8, value: mapMode === "open" ? r.open_cases : mapMode === "live" ? Math.max(0, r.open_cases - r.stale_cases) : r.stale_cases,
    hot: r.critical_cases, label: (open ?? []).find((c) => c.h3_r8 === r.h3_r8)?.zone ?? r.city,
  }));
  const filtered = shown.filter((q) => focus === "all" ? true : focus === "critical" ? q.crit : q.kind === "followup");
  const queueItems: Item[] = filtered.slice(0, queueRows).map((q) => {
    const c = q.c, f = q.f;
    return {
      key: q.key, href: c ? `/partner/cases/${c.id}` : f?.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records?view=overdue",
      title: q.kind === "followup" ? "Follow-up overdue" : c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c?.title || "Open case",
      meta: who(c) || (f?.kind ? f.kind.replace(/_/g, " ") : "From the imported register"),
      tag: { text: q.kind === "followup" ? "Overdue" : q.crit ? "Critical" : STATUS_META[(c?.status_class ?? "open") as StatusClass]?.short ?? "Open", tone: q.crit || q.kind === "followup" ? "hot" : "open" },
      right: q.kind === "followup" ? `${ago(f!.due_at)} late` : `${ago(c?.occurred_at ?? null)} waiting`,
    };
  });
  const changeItems: Item[] = changes.slice(0, 7).map((c) => ({
    key: c.id, href: `/partner/cases/${c.id}`,
    title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case",
    meta: [STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label, c.closure_reason ? CLOSURE_SHORT[c.closure_reason] ?? c.closure_reason : null, c.zone].filter(Boolean).join(" · "),
    right: `${ago(c.last_activity_at)} ago`, tag: { text: "", tone: c.status_class === "closed" ? "care" : "quiet" },
  }));

  if (!loadError && (blank || signedOut)) return (
    <Dashboard
      eyebrow={org?.name ?? "NGO workspace"}
      title={signedOut ? <>Your organisation&apos;s <em>operations</em></> : <>Start with the records <em>you already keep</em></>}
      subtitle={signedOut ? "Cases, animals and locations load only for members of the organisation that keeps them." : "Import the workbook your team already uses, or open your first rescue case."}
      actions={signedOut && !user ? <><Link href="/join" className="x-btn is-flame">Sign in with your code</Link><Link href="/partner-apply" className="x-btn">Apply to partner</Link></> : signedOut ? <Link href="/partner-apply" className="x-btn is-flame">Apply to partner</Link> : <><Link href="/partner/import" className="x-btn is-flame">Import a workbook</Link><Link href="/partner/cases/new" className="x-btn">Open a rescue case</Link></>}
      kpis={[{ label: "Live cases", value: signedOut ? null : 0 }, { label: "Critical", value: signedOut ? null : 0, tone: "hot" }, { label: "Follow-ups overdue", value: signedOut ? null : 0, tone: "hot" }, { label: "Waiting on a decision", value: signedOut ? null : 0 }]}
      map={<LiveMap cells={[]} tone="flame" metric="open cases" label="Open work by cell" emptyNote={signedOut ? "Sign in with your organisation code to see where your open work is." : "Open work appears here once a case carries a location."} />}
      side={<>
        <Panel title="Needs someone"><ItemList items={[]} empty="Live cases and overdue follow-ups appear here, critical conditions first." /></Panel>
        <Panel title="How the workspace works"><ol className="db-steps"><li><b>Queue</b> — live cases and overdue follow-ups, critical first.</li><li><b>Record</b> — every case opens into the animal, its history and care.</li><li><b>Action</b> — assign, treat, schedule a follow-up or close with a reason.</li></ol></Panel>
      </>}
    />
  );

  return (
    <Dashboard
      eyebrow={<>{org?.name ?? "Organisation workspace"}{today ? ` · ${today}` : ""}</>}
      title={<>Today in <em>{place ?? "the field"}</em></>}
      subtitle={loadError ? "The organisation record could not be read. Reload to try again — nothing has been changed." : "Live work first. Months-old cases with no activity wait in review, not in the queue."}
      actions={<><Link href="/partner/records" className="x-btn"><Search size={15} aria-hidden /> Find a record</Link><Link href="/partner/import" className="x-btn">Import</Link></>}
      kpis={[
        { label: "Live cases", value: loading ? null : live, href: "/partner/cases", note: "Open, with recent activity" },
        { label: "Critical", value: loading ? null : crit, tone: "hot", note: "Accident, maggots, abuse, bite…" },
        { label: "Follow-ups overdue", value: loading ? null : overdue, tone: "hot", href: "/partner/records?view=overdue" },
        { label: "Waiting on a decision", value: loading ? null : stale, tone: "blue", href: "/partner/review", note: "Open 90+ days, quiet 30+" },
      ]}
      map={<LiveMap cells={mapCells} tone="flame" metric={mapMode === "stale" ? "older open cases" : "open cases"} label={`Open work by cell in ${place ?? "your area"}`} selected={cell} onCell={(k) => setCell((x) => (x === k ? null : k))} emptyNote={loading ? "Placing the open work…" : "No open case carries a location."}>
        <MapChips value={mapMode} options={[{ id: "open", label: "All open" }, { id: "live", label: "Live" }, { id: "stale", label: "Waiting on review" }]} onChange={setMapMode} label="Map measure" />
        <Link href="/partner/map?mode=cases" className="db-maplink">Field map <ArrowUpRight size={14} aria-hidden /></Link>
        {cell && <div className="db-selcard"><b>{(open ?? []).find((c) => c.h3_r8 === cell)?.zone ?? "Selected cell"}</b><p>The queue shows this cell only.</p><button type="button" className="x-btn" onClick={() => setCell(null)}><X size={14} aria-hidden /> Show everywhere</button></div>}
      </LiveMap>}
      side={<>
        <Panel title="Needs someone" count={loading ? undefined : filtered.length} action={{ label: "All cases", href: "/partner/cases" }}>
          <div className="db-filter" role="group" aria-label="Show">
            {(["all", "critical", "followup"] as const).map((k) => <button key={k} type="button" aria-pressed={focus === k} onClick={() => setFocus(k)}>{k === "all" ? "All" : k === "critical" ? "Critical" : "Overdue"}</button>)}
          </div>
          <ItemList items={queueItems} loading={loading} empty={cell ? "Nothing live in this cell." : "No live case and nothing overdue."} />
        </Panel>
        <Panel title="What changed" action={{ label: "Register", href: "/partner/records" }}>
          <Feed items={changeItems} loading={loading} empty="Closed cases and recorded outcomes show here." />
        </Panel>
      </>}
    >
      <div className="db-row3">
        {stale > 0 && <Panel title="Decisions waiting" count={stale} action={{ label: "Review them", href: "/partner/review" }}><p className="db-empty">Open for months with nothing recorded — usually imported. A person decides what happened to each, and the queue stays about today.</p></Panel>}
        <Panel title="Tasks"><div className="db-legacy"><TasksSection compact /></div></Panel>
        <Panel title="Camps coming up"><div className="db-legacy"><CampsSection compact /></div></Panel>
      </div>
    </Dashboard>
  );
}
