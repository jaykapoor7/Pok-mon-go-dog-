"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Field mode (decisions 021, 033, 043).

   The phone in one hand, on the street. Only what is yours today: the
   cases you hold and the follow-ups due on them, nearest deadline first,
   each with the one action that fits a thumb. A note typed with no signal
   is kept on this device as a draft, labelled "not sent", and sent only
   when you choose to once the connection is back. Pending is never saved.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WifiOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { Ack, State, day, since } from "../ui";
import { addNote, setFollowup, startWork, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

const KEY = "sp2.field.drafts";
type Draft = { caseId: string; code: string | null; note: string; at: string };
const loadDrafts = (): Draft[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const saveDrafts = (d: Draft[]) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

export function Field() {
  const { user } = useAuth();
  const [cases, setCases] = useState<OpenCase[] | null>(null);
  const [fus, setFus] = useState<DueFollowup[]>([]);
  const [online, setOnline] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [failed, setFailed] = useState(false);
  const [r, setR] = useState<Record<string, Receipt>>({});

  const load = useCallback(async () => {
    setFailed(false);
    try { const [c, f] = await Promise.all([openCases(), dueFollowups()]); setCases(c); setFus(f); } catch { setFailed(true); setCases([]); }
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => {
    setDrafts(loadDrafts()); setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const me = user?.name ?? "";
  const mine = useMemo(() => (cases ?? []).filter((c) => c.assignee_name === me && c.provenance !== "imported_historical_record"), [cases, me]);
  const myFus = useMemo(() => { const ids = new Set(mine.map((c) => c.id)); return fus.filter((f) => f.source === "scheduled" && (f.assignee_name === me || (f.case_id && ids.has(f.case_id)))).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)); }, [fus, mine, me]);
  const unowned = useMemo(() => (cases ?? []).filter((c) => !c.assignee_name && c.provenance !== "imported_historical_record").length, [cases]);
  const actor = user ? { id: user.id, name: user.name } : null;
  const done = (k: string, x: Receipt) => setR((m) => ({ ...m, [k]: x }));

  const note = async (c: OpenCase, text: string) => {
    if (!actor) return;
    if (!online) { const d = [...drafts, { caseId: c.id, code: c.case_code, note: text, at: new Date().toISOString() }]; setDrafts(d); saveDrafts(d); return; }
    done(`n${c.id}`, await addNote(c.id, actor, text));
  };
  const sendDrafts = async () => {
    if (!actor) return;
    const left: Draft[] = [];
    for (const d of drafts) { const x = await addNote(d.caseId, actor, d.note); if (!x.ok) left.push(d); done(`n${d.caseId}`, x); }
    setDrafts(left); saveDrafts(left);
  };

  return (
    <NgoGate title="Field mode" lede="Your cases and follow-ups for today, one hand, on the street.">
      <div className="fd">
        <header className="fd-head">
          <p className="k">Field · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
          <h1 className="serif">{cases === null ? "Reading your day…" : `${mine.length} case${mine.length === 1 ? "" : "s"}, ${myFus.length} follow-up${myFus.length === 1 ? "" : "s"}`}</h1>
          {!online && <p className="fd-off" role="status"><WifiOff size={15} aria-hidden /> No connection. Notes stay on this phone as drafts until you send them.</p>}
          {drafts.length > 0 && (
            <div className="fd-drafts">
              <Ack state="draft">{drafts.length} note{drafts.length === 1 ? "" : "s"} not sent</Ack>
              <button type="button" className="btn is-ink is-s" disabled={!online} onClick={() => void sendDrafts()}>{online ? "Send them now" : "Waiting for a connection"}</button>
            </div>
          )}
        </header>
        {failed && <State kind="error" title="Not read" action={<button type="button" className="btn" onClick={() => void load()}>Try again</button>}>Your cases could not be read. If you are offline, drafts still work.</State>}
        {myFus.length > 0 && <h2 className="fd-h">Due</h2>}
        <ul className="fd-cards">
          {myFus.map((f) => {
            const late = Date.parse(f.due_at) < Date.now();
            return (
              <li key={f.id} className={`fd-card${late ? " is-late" : ""}`}>
                <p className="k">{late ? `Late · due ${day(f.due_at)}` : `Due ${day(f.due_at)}`} · {f.case_code ?? "follow-up"}</p>
                <h3>{(f.kind ?? "Recheck").replace(/_/g, " ")}{f.animal_name ? ` · ${f.animal_name}` : ""}</h3>
                <p className="small">{[f.zone, f.note].filter(Boolean).join(" · ") || "No note"}</p>
                {r[`f${f.id}`]?.ok ? <Ack state="saved">{(r[`f${f.id}`] as { what: string }).what}</Ack> : (
                  <div className="fd-act">
                    <button type="button" className="btn is-ink" disabled={!online} onClick={async () => done(`f${f.id}`, await setFollowup(f.id, "done"))}>Done</button>
                    <button type="button" className="btn" disabled={!online} onClick={async () => done(`f${f.id}`, await setFollowup(f.id, "missed"))}>Missed</button>
                  </div>
                )}
                {r[`f${f.id}`] && !r[`f${f.id}`].ok && <Ack state="failed">Not saved: {(r[`f${f.id}`] as { error: string }).error}</Ack>}
              </li>
            );
          })}
        </ul>
        {mine.length > 0 && <h2 className="fd-h">Yours</h2>}
        <ul className="fd-cards">
          {mine.map((c) => <CaseCard key={c.id} c={c} online={online} receipt={r[`n${c.id}`]} startR={r[`s${c.id}`]} drafted={drafts.filter((d) => d.caseId === c.id).length} onStart={async () => actor && done(`s${c.id}`, await startWork(c.id, actor))} onNote={(t) => note(c, t)} />)}
        </ul>
        {cases !== null && !failed && !mine.length && !myFus.length && (
          <State art="ngo-empty" title="Nothing held by you" action={<Link className="btn is-ink" href="/ngo?focus=unowned">See {unowned} unowned case{unowned === 1 ? "" : "s"}</Link>}>Take a case from Work and it appears here for the field.</State>
        )}
        <p className="small fd-foot">Field mode shows only cases you hold. <Link className="link" href="/ngo">Open the full queue</Link>.</p>
      </div>
    </NgoGate>
  );
}

function CaseCard({ c, online, receipt, startR, drafted, onStart, onNote }: { c: OpenCase; online: boolean; receipt?: Receipt; startR?: Receipt; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="fd-card">
      <p className="k">{c.case_code ?? "Case"} · {c.status_class === "in_progress" ? "in progress" : "open"} · {since(c.occurred_at)}</p>
      <h3><Link href={`/ngo/cases/${c.id}`}>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Case"}</Link></h3>
      <p className="small">{[c.animal_name, c.zone].filter(Boolean).join(" · ") || "Animal and place not recorded"}</p>
      {open ? (
        <form className="fd-note" onSubmit={async (e) => { e.preventDefault(); if (!t.trim()) return; setBusy(true); await onNote(t.trim()); setBusy(false); setT(""); setOpen(false); }}>
          <textarea className="textarea" value={t} onChange={(e) => setT(e.target.value)} placeholder="What you saw or did" autoFocus aria-label="Note" />
          <div className="fd-act"><button type="submit" className="btn is-ink" disabled={busy || !t.trim()}>{online ? (busy ? "Sending…" : "Send note") : "Keep as draft"}</button><button type="button" className="btn is-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      ) : (
        <div className="fd-act">
          {c.status_class !== "in_progress" && !startR?.ok && <button type="button" className="btn is-ink" disabled={!online} onClick={onStart}>Start</button>}
          <button type="button" className="btn" onClick={() => setOpen(true)}>Add a note</button>
          <Link className="btn is-ghost" href={`/ngo/cases/${c.id}`}>Close or more</Link>
        </div>
      )}
      <div aria-live="polite">
        {startR && (startR.ok ? <Ack state="saved">{startR.what}</Ack> : <Ack state="failed">Not saved: {startR.error}</Ack>)}
        {receipt && (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not sent: {receipt.error}</Ack>)}
        {drafted > 0 && <Ack state="draft">{drafted} draft note{drafted === 1 ? "" : "s"} on this phone, not sent</Ack>}
      </div>
    </li>
  );
}
