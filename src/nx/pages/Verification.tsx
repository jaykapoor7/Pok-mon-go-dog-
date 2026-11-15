"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Maximize2, ShieldCheck, X } from "lucide-react";
import { NotEnabled, PACKAGE_LABEL, orgNames, packages, type Package } from "@/lib/abc";
import { isVisibleToOffice } from "@/lib/machines/package";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { REVIEWS, type Tone } from "../fixtures";
import { useLive } from "../live";
import { Denied } from "../kit";

/* The reviewing office's queue. Packages arrive here when an operator submits them; the office decides.
   Nothing on this page approves or returns anything: the decision is a signed step taken by a named reviewer. */
type Row = { id: string; title: string; operator: string; period: string; records: number; vet: number | null; evidence: number | null; state: string; tone: Tone; waiting: string; days: number; flags: string[]; href?: string; bucket: "waiting" | "operator" | "decided" };
const COLS = "minmax(0, 1.6fr) minmax(0, 1fr) 104px 96px 130px 96px";
const TONE: Record<string, Tone> = { Submitted: "accent", "Query open": "warn", Accepted: "ok", Returned: "bad", "Partially accepted": "warn" };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const VIEWS = [
  { id: "waiting", label: "Waiting for you", test: (r: Row) => r.bucket === "waiting" },
  { id: "operator", label: "With the operator", test: (r: Row) => r.bucket === "operator" },
  { id: "decided", label: "Decided", test: (r: Row) => r.bucket === "decided" },
  { id: "all", label: "All", test: () => true },
] as const;
const bucketOf = (state: string): Row["bucket"] => (state === "Submitted" ? "waiting" : state === "Query open" ? "operator" : "decided");

function VerificationView({ rows, sample, loading, note, office }: { rows: Row[]; sample: boolean; loading: boolean; note?: string | null; office: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("waiting");
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const shown = useMemo(() => rows.filter(VIEWS.find((x) => x.id === view)!.test).sort((a, b) => b.days - a.days), [rows, view]);
  const open = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const waiting = rows.filter((r) => r.bucket === "waiting");
  const oldest = waiting.reduce((m, r) => Math.max(m, r.days), 0);
  return (
    <Shell ws="gov" crumb={["Government", "Verification"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{office}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Verification</h1><p className="nx-sub">{loading ? "Reading the queue…" : <><b className="num">{waiting.length}</b> {waiting.length === 1 ? "package waits" : "packages wait"} for a decision{oldest ? <>, the oldest for <b className="num">{oldest}</b> {oldest === 1 ? "day" : "days"}</> : null}. Decisions are signed by a named reviewer.</>}</p></div></div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {VIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId="nx-vview" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{rows.filter(v.test).length}</span></span></button>)}
          </div>
        </div>
        {note ? <p className="nx-foot" role="status">{note}</p> : null}
        <div className="nx-table" role="group" aria-label="Packages to review">
          <div className="nx-tr nx-th" aria-hidden="true" style={{ gridTemplateColumns: COLS }}><span>Package</span><span>Operator</span><span>Period</span><span>Records</span><span>State</span><span>Waiting</span></div>
          {shown.map((r) => (
            <button key={r.id} type="button" className={`nx-tr ${openId === r.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setOpenId(r.id)} aria-label={`Open ${r.title} from ${r.operator}`}>
              <span className="nx-cell-main"><span><b>{r.title}</b><small>{r.flags.length ? <span style={{ color: "var(--warn)" }}>{r.flags.length} {r.flags.length === 1 ? "thing" : "things"} to check</span> : "No exceptions flagged"}<span className="nx-only-s"> · {r.operator}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{r.operator}</span>
              <span className="nx-t3 nx-hide-s">{r.period}</span>
              <span className="num nx-hide-s">{r.records}</span>
              <span><Chip tone={r.tone}>{r.state}</Chip></span>
              <span className="nx-t3 nx-hide-s" style={r.days >= 5 ? { color: "var(--bad)", fontWeight: 500 } : undefined}>{r.waiting}</span>
            </button>
          ))}
          {!loading && !shown.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{rows.length ? "Nothing in this view" : "No packages have been sent to this office"}</b><p style={{ marginTop: 4 }}>{rows.length ? "Choose another view." : "They appear here when an operator submits one."}</p></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={`${open.title}, ${open.operator}`} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span>{open.operator}</span><span style={{ marginLeft: "auto" }} />{open.href ? <Link href={open.href} className="nx-ib" aria-label="Open the review"><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{open.title}</h1><p>{open.operator} · {open.period} <Chip tone={open.tone}>{open.state}</Chip></p></div></div>
              <h3 className="nx-h3">What was submitted</h3>
              <dl className="nx-props">
                <div><dt>Records</dt><dd className="num">{open.records}</dd></div>
                {open.vet !== null ? <div><dt>Surgeon signed</dt><dd className="num">{open.vet} of {open.records}</dd></div> : null}
                {open.evidence !== null ? <div><dt>Evidence items</dt><dd className="num">{open.evidence}</dd></div> : null}
                <div><dt>Waiting</dt><dd style={{ fontWeight: 400 }}>{open.waiting}</dd></div>
              </dl>
              <h3 className="nx-h3">To check</h3>
              {open.flags.length ? <ul className="nx-feed">{open.flags.map((f) => <li key={f}><span className="nx-feed-i" style={{ color: "var(--warn)" }}><AlertTriangle size={12} /></span><div><p style={{ color: "var(--ink)" }}>{f}</p></div></li>)}</ul> : <p className="nx-foot" style={{ marginTop: 0 }}>{open.vet !== null ? "No exceptions flagged by the fixed checks." : "Open the review to run the fixed checks on each record."}</p>}
              <p className="nx-note" style={{ marginTop: 14 }}><ShieldCheck size={13} /><span>Accept, return or ask a question is a signed decision by a named reviewer, recorded with the reason. Kaju can list what to check; it never decides.</span></p>
              <p style={{ marginTop: 16 }}>{open.href ? <Link href={open.href} className="nx-btn">Open the review</Link> : null}</p>
              <p className="nx-foot">The review shows each record&apos;s evidence beside the checks and the decision.</p>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

function LiveVerification() {
  const live = useLive();
  /* A person can sit in a reviewing office and in a programme; the office is what this page is for. */
  const office = live.orgs.find((o) => o.source === "review_office") ?? null;
  const isOffice = !!office;
  const [state, setState] = useState<{ rows: Row[] | null; note: string | null }>({ rows: null, note: null });
  useEffect(() => {
    if (!isOffice || !office) return;
    let alive = true;
    packages().then(async (ps) => {
      const mine = ps.filter((p: Package) => p.office_id === office.org_id && isVisibleToOffice(p.status));
      const names = await orgNames([...new Set(mine.map((p) => p.ngo_id))]).catch(() => ({} as Record<string, string>));
      if (!alive) return;
      const now = Date.now();
      setState({ note: null, rows: mine.map((p): Row => {
        const label = PACKAGE_LABEL[p.status] ?? p.status, since = p.submitted_at ?? p.created_at, days = p.status === "submitted" ? Math.max(0, Math.floor((now - Date.parse(since)) / 864e5)) : 0;
        return { id: p.id, title: p.title, operator: names[p.ngo_id] ?? "Operator", period: `${day(p.period_start)} – ${day(p.period_end)}`, records: p.summary?.records ?? p.case_ids?.length ?? 0, vet: p.summary?.vet_authorised ?? null, evidence: p.summary?.evidence_items ?? null, state: label, tone: TONE[label] ?? "plain", waiting: p.status === "submitted" ? (days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`) : day(p.decided_at), days, flags: p.summary?.vet_authorised != null && p.summary.records != null && p.summary.vet_authorised < p.summary.records ? [`${p.summary.records - p.summary.vet_authorised} records without a surgeon's authorisation`] : [], href: `/gov/verification/${p.id}`, bucket: bucketOf(label) };
      }) });
    }).catch((e: unknown) => { if (alive) setState({ rows: [], note: e instanceof NotEnabled ? "Verification is not switched on for this office yet." : "The queue could not be read just now." }); });
    return () => { alive = false; };
  }, [isOffice, office]);
  if (!isOffice) return <Shell ws="gov" crumb={["Government", "Verification"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Verification</h1><Denied what="Verification is the work of a reviewing office" why={`Your account${live.orgFor("government") ? ` works in ${live.orgFor("government")!.name}, which` : ""} is not a reviewer at any office, so there is nothing to decide here. An office adds its reviewers; the role cannot be chosen from a menu.`} back={{ href: "/gov/overview", label: "Back to the overview" }} /></div></Shell>;
  return <VerificationView rows={state.rows ?? []} sample={false} loading={state.rows === null} note={state.note} office={office!.name} />;
}

const SAMPLE: Row[] = REVIEWS.map((r) => ({ ...r, tone: TONE[r.state] ?? "plain", bucket: bucketOf(r.state), href: `/gov/verification/${r.id}` }));

export function Verification() {
  const live = useLive();
  if (!live.ready) return <Shell ws="gov" crumb={["Government", "Verification"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveVerification /> : <VerificationView rows={SAMPLE} sample loading={false} office="East Zone office · Government & Programmes" />;
}
