"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { orgIncoming, type Incoming } from "@/lib/campaigns";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { REPORTS, type Tone } from "../fixtures";
import { useLive } from "../live";

/* Everything that arrives from outside, in one queue. A report is not yet a case and not yet an animal:
   a person decides which, and a suggested match stays a suggestion until they confirm it. */
type Row = { id: string; what: string; note: string; place: string; from: string; source: string; state: string; tone: Tone; when: string; open: boolean; match?: string; photo?: string | null };
const COLS = "minmax(0, 1.9fr) 112px minmax(0, 1fr) 132px 140px 84px";
const word = (v: string) => v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : m < 2880 ? "Yesterday" : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const VIEWS = [
  { id: "open", label: "To triage", test: (r: Row) => r.open },
  { id: "match", label: "Possible match", test: (r: Row) => r.open && !!r.match },
  { id: "done", label: "Handled", test: (r: Row) => !r.open },
  { id: "all", label: "All", test: () => true },
] as const;

function InboxView({ rows, sample, loading, note }: { rows: Row[]; sample: boolean; loading: boolean; note?: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("open");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const shown = useMemo(() => { const v = VIEWS.find((x) => x.id === view)!; const n = q.trim().toLowerCase(); return rows.filter((r) => v.test(r) && (!n || `${r.what} ${r.note} ${r.place} ${r.from}`.toLowerCase().includes(n))); }, [rows, view, q]);
  const open = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const waiting = rows.filter((r) => r.open).length;
  return (
    <Shell crumb={["NGO", "Inbox"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head"><div><h1 className="nx-h1">Inbox{sample ? <Sample /> : null}</h1><p className="nx-sub">{loading ? "Reading reports…" : <><b className="num">{waiting}</b> to triage of {rows.length}. Reports from residents and partners arrive here before they become a case.</>}</p></div></div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {VIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId="nx-iview" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{rows.filter(v.test).length}</span></span></button>)}
          </div>
          <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a report" aria-label="Find a report" /></label>
        </div>
        {note ? <p className="nx-foot" role="status">{note}</p> : null}
        <div className="nx-table" role="table" aria-label="Reports">
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: COLS }}><span>Report</span><span>Place</span><span>From</span><span>Source</span><span>State</span><span>Received</span></div>
          {shown.map((r) => (
            <button key={r.id} type="button" role="row" className={`nx-tr ${openId === r.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setOpenId(r.id)} aria-label={`Open report: ${r.what}`}>
              <span className="nx-cell-main"><span><b>{r.what}</b><small>{r.match ? "Possible match · " : ""}{r.note || "No note"}<span className="nx-only-s"> · {r.place}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{r.place}</span>
              <span className="nx-t2 nx-hide-s">{r.from}</span>
              <span className="nx-t2 nx-hide-s">{r.source}</span>
              <span><Chip tone={r.tone}>{r.state}</Chip></span>
              <span className="nx-t3 nx-hide-s">{r.when}</span>
            </button>
          ))}
          {!loading && !shown.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{rows.length ? "Nothing in this view" : "No reports yet"}</b><p style={{ marginTop: 4 }}>{rows.length ? "Choose another view or clear the search." : "Reports from residents appear here as they are sent."}</p></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={open.what} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span>{open.source}</span><span style={{ marginLeft: "auto" }} /><button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{open.what}</h1><p>{open.place} · {open.when} <Chip tone={open.tone}>{open.state}</Chip></p></div></div>
              {open.photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={open.photo} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10, marginBottom: 16 }} /> : null}
              <h3 className="nx-h3">What was reported</h3>
              <p style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{open.note || "The reporter left no note."}</p>
              <h3 className="nx-h3">Details</h3>
              <dl className="nx-props"><div><dt>From</dt><dd>{open.from}</dd></div><div><dt>Source</dt><dd>{open.source}</dd></div><div><dt>Place</dt><dd>{open.place}</dd></div><div><dt>Received</dt><dd style={{ fontWeight: 400 }}>{open.when}</dd></div></dl>
              {open.match ? <><h3 className="nx-h3"><Sparkles size={12} style={{ color: "var(--accent)" }} />Could be an animal already on the register</h3><p className="nx-note"><span><b style={{ color: "var(--ink)" }}>{open.match}</b><br />Suggested from the place and the description. Nothing is linked until a person confirms it.</span></p></> : null}
              <p style={{ marginTop: 18, display: "flex", gap: 6, flexWrap: "wrap" }}>{sample ? <><button type="button" className="nx-btn">Open a case</button><button type="button" className="nx-btn is-quiet">Link to an animal</button><button type="button" className="nx-btn is-quiet">Dismiss with a reason</button></> : <Link href="/ngo/inbox" className="nx-btn">Triage this report</Link>}</p>
              {sample ? null : <p className="nx-foot">Triage opens in the current app until the new actions are built here.</p>}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

function LiveInbox() {
  const { org } = useLive();
  const isNgo = org!.workspace === "ngo";
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!isNgo) return;
    let alive = true;
    Promise.all([orgIncoming("ours"), orgIncoming("community")]).then(([ours, community]) => {
      if (!alive) return;
      const shape = (source: string) => (r: Incoming): Row => { const open = !/closed|resolved|dismiss|done|linked|convert/i.test(r.status); return { id: r.id, what: r.nickname || (r.notes ? r.notes.split(/[.\n]/)[0].slice(0, 80) : "Sighting without a note"), note: r.notes ?? "", place: r.zone ?? "Place not recorded", from: r.reported_by || "Not recorded", source, state: word(r.status || "new"), tone: open ? "accent" : "plain", when: ago(r.created_at), open, photo: r.photo_url }; };
      const seen = new Set<string>(); setRows([...ours.map(shape("Sent to you")), ...community.map(shape("Community report"))].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
    });
    return () => { alive = false; };
  }, [isNgo]);
  if (!isNgo) return <Shell crumb={["NGO", "Inbox"]}><div className="nx-page"><h1 className="nx-h1">Inbox</h1><p className="nx-sub">{org!.name} is not an NGO workspace, so it has no report inbox.</p></div></Shell>;
  return <InboxView rows={rows ?? []} sample={false} loading={rows === null} note={rows && rows.length === 200 ? "Showing the 200 most recent." : undefined} />;
}

const SAMPLE: Row[] = REPORTS.map((r) => ({ ...r, open: r.state !== "Closed" && r.state !== "Assigned" }));

export function Inbox() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["NGO", "Inbox"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveInbox /> : <InboxView rows={SAMPLE} sample loading={false} />;
}
