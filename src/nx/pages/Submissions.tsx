"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Plus, X } from "lucide-react";
import { NotEnabled, PACKAGE_LABEL, offices, packages, type Package } from "@/lib/abc";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { SUBMISSIONS, type Tone } from "../fixtures";
import { useLive } from "../live";

/* What the organisation has sent, or is preparing to send, to a reviewing office. The office decides; this page
   shows where each package stands. Accepted means accepted by the office. It does not mean paid. */
type Row = { id: string; title: string; office: string; period: string; records: number; ready: number | null; state: string; tone: Tone; when: string; note: string; href?: string; bucket: "draft" | "with" | "decided" };
const COLS = "minmax(0, 1.7fr) minmax(0, 1fr) 120px 110px 140px 96px";
const TONE: Record<string, Tone> = { Draft: "plain", Submitted: "accent", "Query open": "warn", Accepted: "ok", Returned: "bad", "Partially accepted": "warn" };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const VIEWS = [
  { id: "all", label: "All", test: () => true },
  { id: "draft", label: "Being prepared", test: (r: Row) => r.bucket === "draft" },
  { id: "with", label: "With the reviewing office", test: (r: Row) => r.bucket === "with" },
  { id: "decided", label: "Decided", test: (r: Row) => r.bucket === "decided" },
] as const;

function SubmissionsView({ rows, sample, loading, note }: { rows: Row[]; sample: boolean; loading: boolean; note?: string | null }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const shown = useMemo(() => rows.filter(VIEWS.find((x) => x.id === view)!.test), [rows, view]);
  const open = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const asks = rows.filter((r) => r.state === "Query open" || r.state === "Returned").length;
  return (
    <Shell crumb={["NGO", "Submissions & Reports"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head">
          <div><h1 className="nx-h1">Submissions &amp; Reports{sample ? <Sample /> : null}</h1><p className="nx-sub">{loading ? "Reading packages…" : <><b className="num">{rows.length}</b> {rows.length === 1 ? "package" : "packages"}{asks ? <>, <b className="num">{asks}</b> waiting on you</> : null}. The reviewing office decides; accepted is not paid.</>}</p></div>
          {sample ? <Link href="/try" className="nx-btn" title="Opens the live demo, where this works"><Plus size={14} />New package</Link> : <Link href="/ngo/packages" className="nx-btn"><Plus size={14} />New package</Link>}
        </div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {VIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId="nx-sview" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{rows.filter(v.test).length}</span></span></button>)}
          </div>
        </div>
        {note ? <p className="nx-foot" role="status">{note}</p> : null}
        <div className="nx-table" role="table" aria-label="Packages">
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: COLS }}><span>Package</span><span>Reviewing office</span><span>Period</span><span>Records</span><span>State</span><span>Updated</span></div>
          {shown.map((r) => (
            <button key={r.id} type="button" role="row" className={`nx-tr ${openId === r.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setOpenId(r.id)} aria-label={`Open ${r.title}`}>
              <span className="nx-cell-main"><span><b>{r.title}</b><small>{r.note}<span className="nx-only-s"> · {r.office}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{r.office}</span>
              <span className="nx-t3 nx-hide-s">{r.period}</span>
              <span className="num nx-hide-s">{r.ready !== null && r.ready < r.records ? <>{r.ready}<span style={{ color: "var(--ink-3)" }}> of {r.records} ready</span></> : r.records}</span>
              <span><Chip tone={r.tone}>{r.state}</Chip></span>
              <span className="nx-t3 nx-hide-s">{r.when}</span>
            </button>
          ))}
          {!loading && !shown.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{rows.length ? "Nothing in this view" : "No packages yet"}</b><p style={{ marginTop: 4 }}>{rows.length ? "Choose another view." : "A package gathers a period's verified records for a reviewing office."}</p></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={open.title} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span>{open.office}</span><span style={{ marginLeft: "auto" }} />{open.href ? <Link href={open.href} className="nx-ib" aria-label="Open full package"><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{open.title}</h1><p>{open.period} <Chip tone={open.tone}>{open.state}</Chip></p></div></div>
              <p className="nx-note"><span>{open.note}</span></p>
              <h3 className="nx-h3">Details</h3>
              <dl className="nx-props"><div><dt>Office</dt><dd>{open.office}</dd></div><div><dt>Period</dt><dd style={{ fontWeight: 400 }}>{open.period}</dd></div><div><dt>Records</dt><dd className="num">{open.records}</dd></div>{open.ready !== null ? <div><dt>Ready</dt><dd className="num">{open.ready} of {open.records}</dd></div> : null}<div><dt>Updated</dt><dd style={{ fontWeight: 400 }}>{open.when}</dd></div></dl>
              {open.href ? <><p style={{ marginTop: 18 }}><Link href={open.href} className="nx-btn is-quiet">Open full package</Link></p><p className="nx-foot">The package, its records and the reviewer&apos;s questions open in the current app until the new page is built.</p></> : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

function LiveSubmissions() {
  const live = useLive();
  const org = live.orgFor("ngo") ?? live.org;
  const isNgo = org!.workspace === "ngo";
  const [state, setState] = useState<{ rows: Row[] | null; note: string | null }>({ rows: null, note: null });
  useEffect(() => {
    if (!isNgo) return;
    let alive = true;
    Promise.all([packages(), offices().catch(() => [])]).then(([ps, os]) => {
      if (!alive) return;
      const office = new Map(os.map((o) => [o.id, o.name]));
      const rows = ps.filter((p: Package) => p.ngo_id === org!.org_id).map((p: Package): Row => {
        const label = PACKAGE_LABEL[p.status] ?? p.status, n = p.summary?.records ?? p.case_ids?.length ?? 0;
        const bucket = p.status === "draft" ? "draft" : p.status === "submitted" || p.status === "queried" ? "with" : "decided";
        const note = p.status === "draft" ? "Not sent yet." : p.status === "queried" ? "The reviewer has asked a question." : p.status === "submitted" ? "Waiting for the reviewing office." : p.decided_by_name ? `${label} by ${p.decided_by_name}. Accepted is not paid.` : `${label}.`;
        return { id: p.id, title: p.title, office: office.get(p.office_id) ?? "Reviewing office", period: `${day(p.period_start)} – ${day(p.period_end)}`, records: n, ready: null, state: label, tone: TONE[label] ?? "plain", when: day(p.decided_at ?? p.submitted_at ?? p.created_at), note, href: `/ngo/packages/${p.id}`, bucket };
      });
      setState({ rows, note: null });
    }).catch((e: unknown) => { if (alive) setState({ rows: [], note: e instanceof NotEnabled ? "Verification is not switched on for this organisation yet." : "Packages could not be read just now." }); });
    return () => { alive = false; };
  }, [isNgo, org]);
  if (!isNgo) return <Shell crumb={["NGO", "Submissions & Reports"]}><div className="nx-page"><h1 className="nx-h1">Submissions &amp; Reports</h1><p className="nx-sub">{org!.name} is not an NGO workspace. Packages sent to you appear under Verification.</p></div></Shell>;
  return <SubmissionsView rows={state.rows ?? []} sample={false} loading={state.rows === null} note={state.note} />;
}

const SAMPLE: Row[] = SUBMISSIONS.map((s) => ({ ...s, bucket: s.state === "Draft" ? "draft" : s.state === "Submitted" || s.state === "Query open" ? "with" : "decided" }));

export function Submissions() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["NGO", "Submissions & Reports"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveSubmissions /> : <SubmissionsView rows={SAMPLE} sample loading={false} />;
}
