"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Plus, Search, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample, TrustChip } from "../ui";
import { CASES, type Tone, type Trust } from "../fixtures";
import { useCases, useLive } from "../live";

/* One table for every case, with views instead of separate pages. Sample and live rows are shaped into the same
   row here, so the two paths share one screen. */
type Row = { id: string; code: string; title: string; kind: string; severity: string; place: string; who: string; stage: string; next: string; due: string | null; overdue: boolean; updated: string; resolved: boolean; trust: Trust; href?: string; detail?: string | null };

const COLS = "minmax(0, 1.8fr) 108px 112px minmax(0, 1fr) 132px minmax(0, 1.1fr) 84px";
const SEV: Record<string, Tone> = { Critical: "bad", High: "warn", Normal: "plain", Low: "plain" };
const word = (v: string | null | undefined, none = "Not recorded") => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : none);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null);
const VIEWS = [
  { id: "active", label: "Active", test: (r: Row) => !r.resolved },
  { id: "urgent", label: "Critical and high", test: (r: Row) => !r.resolved && (r.severity === "Critical" || r.severity === "High") },
  { id: "due", label: "Due or overdue", test: (r: Row) => !r.resolved && !!r.due },
  { id: "unassigned", label: "Unassigned", test: (r: Row) => !r.resolved && r.who === "Unassigned" },
  { id: "resolved", label: "Resolved", test: (r: Row) => r.resolved },
] as const;

function CasesView({ rows, sample, loading, error, orgName }: { rows: Row[]; sample: boolean; loading: boolean; error: string | null; orgName: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("active");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const shown = useMemo(() => { const v = VIEWS.find((x) => x.id === view)!; const n = q.trim().toLowerCase(); return rows.filter((r) => v.test(r) && (!n || `${r.code} ${r.title} ${r.place} ${r.who} ${r.kind}`.toLowerCase().includes(n))); }, [rows, view, q]);
  const open = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const active = rows.filter((r) => !r.resolved).length;

  return (
    <Shell crumb={["NGO", "Cases"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head">
          <div><h1 className="nx-h1">Cases{sample ? <Sample /> : null}</h1><p className="nx-sub">{loading ? "Reading cases…" : <><b className="num">{active}</b> active of {rows.length}{rows.length === 300 ? " most recent" : ""}{sample ? "" : ` at ${orgName}`}. Rescue, injury, sterilisation, vaccination and investigation in one list.</>}</p></div>
          {sample ? <Link href="/try" className="nx-btn" title="Opens the live demo, where this works"><Plus size={14} />New case</Link> : <Link href="/ngo/cases/new" className="nx-btn"><Plus size={14} />New case</Link>}
        </div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {VIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId="nx-cview" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{rows.filter(v.test).length}</span></span></button>)}
          </div>
          <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a case" aria-label="Find a case" /></label>
        </div>
        {error ? <p className="nx-foot" role="alert">Cases could not be read: {error}</p> : null}
        <div className="nx-table" role="table" aria-label="Cases">
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: COLS }}><span>Case</span><span>Severity</span><span>Place</span><span>Assigned to</span><span>Stage</span><span>Next</span><span>Updated</span></div>
          {shown.map((r) => (
            <button key={r.id} type="button" role="row" className={`nx-tr ${openId === r.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setOpenId(r.id)} aria-label={`Open ${r.code}, ${r.title}`}>
              <span className="nx-cell-main"><span><b>{r.title}</b><small><span className="num">{r.code}</span> · {r.kind}<span className="nx-only-s"> · {r.place}</span></small></span></span>
              <span>{r.resolved ? <Chip tone="ok">Resolved</Chip> : <Chip tone={SEV[r.severity] ?? "plain"}>{r.severity}</Chip>}</span>
              <span className="nx-t2 nx-hide-s">{r.place}</span>
              <span className="nx-t2 nx-hide-s">{r.who}</span>
              <span className="nx-t2 nx-hide-s">{r.stage}</span>
              <span className="nx-t2 nx-hide-s">{r.due ? <>{r.next !== "—" ? `${r.next} · ` : ""}<span style={r.overdue ? { color: "var(--bad)", fontWeight: 500 } : undefined}>{r.overdue ? "overdue " : ""}{r.due}</span></> : r.next}</span>
              <span className="nx-t3 nx-hide-s">{r.updated}</span>
            </button>
          ))}
          {!loading && !shown.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{rows.length ? "No case in this view" : "No cases yet"}</b><p style={{ marginTop: 4 }}>{rows.length ? "Choose another view or clear the search." : "Open the first one with New case."}</p></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={`${open.code}, ${open.title}`} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span className="num">{open.code}</span><span style={{ marginLeft: "auto" }} />{open.href ? <Link href={open.href} className="nx-ib" aria-label="Open full case"><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{open.title}</h1><p>{open.kind} · {open.place} {open.resolved ? <Chip tone="ok">Resolved</Chip> : <Chip tone={SEV[open.severity] ?? "plain"}>{open.severity}</Chip>}</p></div></div>
              <h3 className="nx-h3">Details</h3>
              <dl className="nx-props">
                <div><dt>Case</dt><dd className="num">{open.code}</dd></div>
                <div><dt>Stage</dt><dd>{open.stage}</dd></div>
                <div><dt>Assigned to</dt><dd>{open.who}</dd></div>
                <div><dt>Next</dt><dd style={{ fontWeight: 400 }}>{open.next}</dd></div>
                <div><dt>Due</dt><dd style={{ fontWeight: 400 }}>{open.due ?? "No date"}</dd></div>
                <div><dt>Updated</dt><dd style={{ fontWeight: 400 }}>{open.updated}</dd></div>
                <div><dt>Record</dt><dd><TrustChip trust={open.trust} /></dd></div>
              </dl>
              {open.detail ? <><h3 className="nx-h3">Reported</h3><p style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{open.detail}</p></> : null}
              {open.href ? <><p style={{ marginTop: 18 }}><Link href={open.href} className="nx-btn is-quiet">Open full case</Link></p><p className="nx-foot">The full case, with its timeline and evidence, opens in the current app until the new case page reads live data.</p></> : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

function LiveCases() {
  const live = useLive();
  const org = live.orgFor("ngo") ?? live.org;
  const isNgo = org!.workspace === "ngo";
  const cases = useCases(isNgo ? org!.org_id : null);
  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo<Row[]>(() => (cases.rows ?? []).map((c) => {
    const due = c.due_at ?? c.follow_up_at;
    return { id: c.id, code: c.case_code && c.case_code.length <= 14 ? c.case_code : c.case_code ? `${c.case_code.slice(0, 4)}…${c.case_code.slice(-6)}` : c.id.slice(0, 8).toUpperCase(), title: c.title || "Untitled case", kind: word(c.category, "Uncategorised"), severity: word(c.severity, "Normal"), place: c.zone ?? c.city ?? "Not recorded", who: c.assignee_name ?? "Unassigned", stage: word(c.stage ?? c.status), next: c.next_action ?? "—", due: day(due), overdue: !!due && !c.resolved_at && due.slice(0, 10) < today, updated: day(c.last_activity_at ?? c.created_at) ?? "—", resolved: !!c.resolved_at, trust: (c.provenance && /import/i.test(c.provenance) ? "Imported" : "Recorded") as Trust, href: `/ngo/cases/${c.id}`, detail: c.description };
  }), [cases.rows, today]);
  if (!isNgo) return <Shell crumb={["NGO", "Cases"]}><div className="nx-page"><h1 className="nx-h1">Cases</h1><p className="nx-sub">{org!.name} is not an NGO workspace, so it has no case list of its own.</p></div></Shell>;
  return <CasesView rows={rows} sample={false} loading={cases.rows === null} error={cases.error} orgName={org!.name} />;
}

const SAMPLE: Row[] = CASES.map((c) => ({ ...c, overdue: false, detail: null }));

export function Cases() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["NGO", "Cases"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveCases /> : <CasesView rows={SAMPLE} sample loading={false} error={null} orgName="" />;
}
