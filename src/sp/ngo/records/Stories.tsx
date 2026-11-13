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

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPartnerCasesPage } from "@/lib/cases";
import type { Case } from "@/lib/types";
import { Btn, Empty, Head, More, Note, Page, Panel, Section, Split, Table, type Col } from "@/ws/kit";
import { useMembership } from "../../shell/Shell";
import { Ack, day, n } from "../../ui";
import { Reading } from "../../ui/Reading";
import { publishStory, type StoryStage } from "../../data/work-records";
import type { Receipt } from "../../data/work";
import { NgoGate } from "../Gate";
import { readOwnStories, type OwnStory } from "./read";
import "../org.k.css";
import { friendlyError } from "@/lib/friendly-error";

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
  const [writing, setWriting] = useState(false);

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

  const cols: Col<OwnStory>[] = [
    { key: "title", label: "Story", width: "minmax(0, 1.6fr)", render: (x) => x.title },
    { key: "loc", label: "Public locality", render: (x) => x.location_label || <span className="og-nr">not given</span> },
    { key: "at", label: "Published", width: "120px", keep: true, render: (x) => (x.published_at ? day(x.published_at) : "not published") },
    { key: "case", label: "", width: "auto", align: "end", render: (x) => (x.case_id ? <Btn small variant="quiet" href={`/ngo/cases/${x.case_id}`}>Open the case</Btn> : null) },
  ];

  return (
    <NgoGate title="Public case stories" lede="Turn a resolved case into a short public story.">
      <Page>
        <Head title="Stories"
          sum={<>{own.state === "read" ? <><b>{n(own.rows.length)}</b> published. </> : own.state === "failed" ? "Your published stories could not be read. " : <><Reading>Reading your stories</Reading>{" "}</>}Short public stories from completed cases. Only what you write here is public; never intake notes or contacts.</>}
          actions={<><Btn href="/community/stories">Public story feed</Btn><Btn variant={writing ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={writing} onClick={() => setWriting((v) => !v)}>Feature a resolved case</Btn></>} />

        {writing && (
          <Split side={
            <Section title="Public preview">
              <Panel pad>
                <div className="st-pv" aria-label="What the public will see">
                  <b>{title.trim() || "Story title"}</b>
                  <small>{location.trim() || selected?.zone || "Locality"}</small>
                  <p>{summary.trim() || "The public summary appears here."}</p>
                  {stages.some((x) => x.label.trim()) && <ol>{stages.filter((x) => x.label.trim()).map((x, i) => <li key={i}><time>{x.date.trim() || "no date"}</time><span>{x.label}</span></li>)}</ol>}
                </div>
              </Panel>
            </Section>}>
            <form className="og-form st-form" aria-label="Feature a resolved case" onSubmit={(e) => { e.preventDefault(); void publish(); }}>
              {cases.state === "failed" && <Note tone="flame" action={<Btn small onClick={loadCases}>Try again</Btn>}>Your resolved cases could not be read. {friendlyError(cases.error)} This is not the same as having none.</Note>}
              {cases.state === "loading" && <div className="og-skel" aria-busy="true"><i /></div>}
              {cases.state === "read" && (
                <div className="og-f">
                  <label htmlFor="rc-case">Resolved case</label>
                  <select id="rc-case" className="og-in" value={caseId} onChange={(e) => choose(e.target.value)}>
                    <option value="">{rows.length ? "Choose a completed case" : "No resolved cases read"}</option>
                    {rows.map((c) => <option key={c.id} value={c.id}>{c.title}{c.zone ? ` · ${c.zone}` : ""}{told.has(c.id) ? " · already has a story" : ""}</option>)}
                  </select>
                  <span className="og-hint">{rows.length ? `${n(rows.length)} resolved or closed, from the ${n(cases.read)} most recently active cases.` : `None of the ${n(cases.read)} most recently active cases is resolved. Resolve a case first, then feature it when the team approves the wording.`}</span>
                  {cases.next && <div className="og-go"><Btn small variant="quiet" disabled={more} onClick={async () => { setMore(true); try { await page(cases.next, cases.rows, cases.read); } catch (e) { setCases({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }); } setMore(false); }}>{more ? "Reading…" : "Look further back"}</Btn></div>}
                </div>
              )}
              <div className="og-two">
                <div className="og-f"><label htmlFor="rc-title">Story title</label><input id="rc-title" className="og-in" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A clear, factual headline" /></div>
                <div className="og-f"><label htmlFor="rc-loc">Public locality</label><input id="rc-loc" className="og-in" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Neighbourhood or city" /><span className="og-hint">Not a precise address.</span></div>
              </div>
              <div className="og-f"><label htmlFor="rc-sum">Public summary <span className="og-opt">{summary.length}/900</span></label><textarea id="rc-sum" className="og-in" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={900} rows={4} placeholder="What happened, what care was given and the verified outcome." /></div>
              <fieldset className="og-f">
                <legend>Outcome timeline</legend>
                {stages.map((x, i) => (
                  <div key={i} className="st-stage">
                    <input className="og-in" value={x.label} onChange={(e) => setStage(i, "label", e.target.value)} maxLength={90} placeholder="Stage" aria-label={`Stage ${i + 1}`} />
                    <input className="og-in" value={x.date} onChange={(e) => setStage(i, "date", e.target.value)} maxLength={40} placeholder="Date or month" aria-label={`Stage ${i + 1} date`} />
                    <Btn small variant="quiet" onClick={() => setStages((all) => all.filter((_, j) => j !== i))} aria-label={`Remove stage ${i + 1}`}>Remove</Btn>
                  </div>
                ))}
                <div className="og-go">{stages.length < MAX_STAGES && <Btn small variant="quiet" onClick={() => setStages((all) => [...all, { label: "", date: "" }])}>Add a stage</Btn>}<span className="og-hint">Stages without a name are left out.</span></div>
              </fieldset>
              <div className="og-go">
                <Btn type="submit" variant="primary" disabled={busy || !ready}>{busy ? "Publishing…" : "Publish story"}</Btn>
                <Btn onClick={() => setWriting(false)} disabled={busy}>Close</Btn>
                <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not published: {r.error}</Ack>) : !ready ? <Ack state="draft">Choose a case, add a title and a summary.</Ack> : null}</span>
              </div>
              <p className="og-hint">Published stories appear on your public page.</p>
            </form>
          </Split>
        )}

        <Section title="Published">
          {own.state === "loading" && <div className="og-skel" aria-busy="true"><i /><i /></div>}
          {own.state === "failed" && <Note tone="flame" action={<Btn small onClick={loadOwn}>Try again</Btn>}>Your published stories could not be read. {friendlyError(own.error)}</Note>}
          {own.state === "read" && (
            <Panel>
              <More items={own.rows} cap={10} noun="stories">{(shown) => (
                <Table label="Published stories" cols={cols} rows={shown} rowKey={(x) => x.id}
                  empty={<Empty title="Nothing published yet">Your first story appears here and on the public feed.</Empty>} />
              )}</More>
            </Panel>
          )}
        </Section>
      </Page>
    </NgoGate>
  );
}
