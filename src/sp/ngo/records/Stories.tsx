"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Public case stories (1.0 /partner/stories).

   Turn a resolved or closed case into a short public story. Publishing
   is an explicit editorial choice and goes through the existing server
   route, which checks the case belongs to the organisation and is
   resolved. Only the title, locality, summary and outcome timeline are
   public; intake notes, contacts, staff and import rows never are. The
   receipt says what the server answered.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPartnerCasesPage } from "@/lib/cases";
import type { Case } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack, State, day, n } from "../../ui";
import { publishStory, type StoryStage } from "../../data/work-records";
import type { Receipt } from "../../data/work";
import { NgoGate } from "../Gate";
import { readOwnStories, type OwnStory } from "./read";
import "../ngo.css";
import "./records.css";

const blank = (): StoryStage[] => [{ label: "Reported", date: "" }, { label: "Care completed", date: "" }, { label: "Outcome", date: "" }];
const MAX_STAGES = 7; /* the server keeps at most seven */
type Cursor = { at: string; id: string } | null;

export function Stories() {
  const mem = useMembership();
  const [cases, setCases] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; read: number; rows: Case[]; next: Cursor }>({ state: "loading" });
  const [more, setMore] = useState(false);
  const [own, setOwn] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; rows: OwnStory[] }>({ state: "loading" });
  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [stages, setStages] = useState<StoryStage[]>(blank);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);

  const page = useCallback(async (cursor: Cursor, prev: Case[], read: number) => {
    const p = await getPartnerCasesPage({ limit: 100, cursor });
    setCases({ state: "read", read: read + p.items.length, rows: [...prev, ...p.items.filter((c) => c.status === "resolved" || c.status === "closed")], next: p.nextCursor });
  }, []);
  const loadCases = useCallback(() => { setCases({ state: "loading" }); page(null, [], 0).catch((e: unknown) => setCases({ state: "failed", error: e instanceof Error ? e.message : "The read failed." })); }, [page]);
  const loadOwn = useCallback(() => { setOwn({ state: "loading" }); readOwnStories().then((rows) => setOwn({ state: "read", rows })).catch((e: unknown) => setOwn({ state: "failed", error: e instanceof Error ? e.message : "The read failed." })); }, []);
  useEffect(() => { if (mem.member) { loadCases(); loadOwn(); } }, [mem.member, loadCases, loadOwn]);

  const rows = useMemo(() => (cases.state === "read" ? cases.rows : []), [cases]);
  const selected = useMemo(() => rows.find((c) => c.id === caseId), [rows, caseId]);
  const told = useMemo(() => new Set(own.state === "read" ? own.rows.map((s) => s.case_id) : []), [own]);
  function choose(id: string) { setCaseId(id); setR(null); const c = rows.find((x) => x.id === id); if (c) { setTitle(c.title); setLocation(c.zone ?? ""); setSummary(c.outcome_note ?? c.description ?? ""); } }
  const setStage = (i: number, k: keyof StoryStage, v: string) => setStages((all) => all.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const ready = !!selected && !!title.trim() && !!summary.trim();

  async function publish() {
    if (!ready) return;
    setBusy(true); setR(null);
    const x = await publishStory({ caseId, title, publicSummary: summary, locationLabel: location, stages });
    setBusy(false); setR(x);
    if (x.ok) { setCaseId(""); setTitle(""); setSummary(""); setLocation(""); setStages(blank()); loadOwn(); }
  }

  return (
    <NgoGate title="Public case stories" lede="Turn a resolved case into a short public story.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · stories</p><h1 className="serif">Public case stories</h1></div>
          <p className="ngo-sum">Turn a completed case into a short public story for your page, reports and posts. Only what you write below is public: never intake notes, contacts, staff details or import rows.</p>
          <div className="row"><Link className="btn is-s" href="/community/stories">Public story feed</Link></div>
        </header>
        <div className="rc-body rc-story">
          <form className="rc-form" onSubmit={(e) => { e.preventDefault(); void publish(); }}>
            <h2 className="h3">Feature a resolved case</h2>
            {cases.state === "failed" && <State kind="error" title="Cases not read" action={<button type="button" className="btn is-s" onClick={loadCases}>Try again</button>}>Your resolved cases could not be read ({cases.error}). This is not the same as having none.</State>}
            {cases.state === "loading" && <span className="skel" style={{ height: 46 }} />}
            {cases.state === "read" && (
              <div className="field">
                <label htmlFor="rc-case">Resolved case</label>
                <select id="rc-case" className="select" value={caseId} onChange={(e) => choose(e.target.value)}>
                  <option value="">{rows.length ? "Choose a completed case" : "No resolved cases read"}</option>
                  {rows.map((c) => <option key={c.id} value={c.id}>{c.title}{c.zone ? ` · ${c.zone}` : ""}{told.has(c.id) ? " · already has a story" : ""}</option>)}
                </select>
                <span className="hint">{rows.length ? `${n(rows.length)} resolved or closed, from the ${n(cases.read)} most recently active cases.` : `None of the ${n(cases.read)} most recently active cases is resolved. Resolve a case first, then feature it when the team approves the wording.`}</span>
                {cases.next && <button type="button" className="btn is-ghost is-s rc-left" disabled={more} onClick={async () => { setMore(true); try { await page(cases.next, cases.rows, cases.read); } catch (e) { setCases({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }); } setMore(false); }}>{more ? "Reading…" : "Look further back"}</button>}
              </div>
            )}
            <div className="rc-two">
              <div className="field"><label htmlFor="rc-title">Story title</label><input id="rc-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A clear, factual headline" /></div>
              <div className="field"><label htmlFor="rc-loc">Public locality</label><input id="rc-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Neighbourhood or city" /><span className="hint">Not a precise address.</span></div>
            </div>
            <div className="field"><label htmlFor="rc-sum">Public summary <span className="small mono">{summary.length}/900</span></label><textarea id="rc-sum" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={900} rows={5} placeholder="What happened, what care was given and the verified outcome." /></div>
            <fieldset className="rc-stages">
              <legend>Outcome timeline</legend>
              {stages.map((s, i) => (
                <div key={i} className="rc-stage">
                  <input className="input" value={s.label} onChange={(e) => setStage(i, "label", e.target.value)} maxLength={90} placeholder="Stage" aria-label={`Stage ${i + 1}`} />
                  <input className="input" value={s.date} onChange={(e) => setStage(i, "date", e.target.value)} maxLength={40} placeholder="Date or month" aria-label={`Stage ${i + 1} date`} />
                  <button type="button" className="btn is-ghost is-s" onClick={() => setStages((all) => all.filter((_, j) => j !== i))} aria-label={`Remove stage ${i + 1}`}>Remove</button>
                </div>
              ))}
              {stages.length < MAX_STAGES && <button type="button" className="btn is-ghost is-s rc-left" onClick={() => setStages((all) => [...all, { label: "", date: "" }])}>Add a stage</button>}
              <span className="hint">Stages without a name are left out.</span>
            </fieldset>
            <div className="rc-send">
              <button type="submit" className="btn is-ink" disabled={busy || !ready}>{busy ? "Publishing…" : "Publish story"}</button>
              <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not published: {r.error}</Ack>) : !ready ? <Ack state="draft">Choose a case, add a title and a summary.</Ack> : null}</span>
            </div>
            <p className="small">Any member of your organisation can publish. The server checks the case is yours and resolved. A published story cannot be withdrawn from here.</p>
          </form>

          <aside className="rc-side">
            <section aria-label="What the public will see" className="rc-preview">
              <p className="k">Public preview</p>
              <h3 className="serif rc-pv-title">{title.trim() || "Story title"}</h3>
              <p className="k">{location.trim() || selected?.zone || "Locality"}</p>
              <p className="body rc-pre">{summary.trim() || "The public summary appears here."}</p>
              {stages.some((s) => s.label.trim()) && <ol className="chrono">{stages.filter((s) => s.label.trim()).map((s, i) => <li key={i} className="is-care"><time className="mono">{s.date.trim() || "no date"}</time><span>{s.label}</span></li>)}</ol>}
            </section>
            <section className="rc-published">
              <h2 className="h3">Published</h2>
              {own.state === "loading" && <span className="skel" style={{ height: 80 }} />}
              {own.state === "failed" && <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={loadOwn}>Try again</button>}>Your published stories could not be read ({own.error}).</State>}
              {own.state === "read" && !own.rows.length && <p className="small">Nothing published yet. Your first story appears here and on the public feed.</p>}
              {own.state === "read" && own.rows.length > 0 && (
                <ol className="chrono">
                  {own.rows.map((s) => <li key={s.id}><time className="mono">{s.published_at ? day(s.published_at) : "not published"}</time><b>{s.title}</b>{s.location_label && <small>{s.location_label}</small>}{s.case_id && <Link className="link small" href={`/ngo/cases/${s.case_id}`}>Open the case</Link>}</li>)}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </NgoGate>
  );
}
