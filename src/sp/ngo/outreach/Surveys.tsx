"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Surveys (1.0 /partner/surveys).

   Structured dog counts across wards, villages and districts. A survey
   is opened, given areas and collected on its own map pages
   (/surveys/[id], /surveys/[id]/collect); this page lists the
   organisation's surveys and starts new ones through create_survey.
   Projects (registers with their own fields) are kept as surveys with a
   marker and live on the Projects tab.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getSurveys, isProjectSurvey } from "@/lib/surveys";
import type { Survey } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack, State, day, n } from "../../ui";
import { startSurvey, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./outreach.css";

export function RegisterTabs({ on }: { on: "projects" | "surveys" }) {
  return (
    <nav className="tabs or-tabs" aria-label="Field registers">
      <Link href="/ngo/projects" aria-current={on === "projects" ? "page" : undefined}>Projects</Link>
      <Link href="/ngo/surveys" aria-current={on === "surveys" ? "page" : undefined}>Surveys and census</Link>
    </nav>
  );
}

export function Surveys() {
  const mem = useMembership();
  const [rows, setRows] = useState<Survey[] | null>(null);
  const [all, setAll] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const load = useCallback(async () => {
    setFailed(null);
    try { const s = await getSurveys(); setAll(s.length); setRows(s.filter((x) => !isProjectSurvey(x))); }
    catch (e) { setRows(null); setFailed(e instanceof Error ? e.message : "The surveys could not be read."); }
  }, []);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);

  return (
    <NgoGate title="Surveys and census" lede="Structured dog counts across wards, villages and districts.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · field registers</p><h1 className="serif">Surveys</h1></div>
          <p className="ngo-sum">{rows ? <><b>{n(rows.length)}</b> survey{rows.length === 1 ? "" : "s"}. </> : failed ? "Your surveys could not be read. Nothing is shown as none. " : "Reading your surveys… "}Counts across wards, villages and districts, drawn on the map as they are collected.</p>
          <div className="row"><button type="button" className="btn is-flame" aria-expanded={making} onClick={() => setMaking((v) => !v)}><Plus size={15} aria-hidden /> New survey</button></div>
        </header>
        <RegisterTabs on="surveys" />
        {(making || (rows && rows.length === 0)) && <NewSurvey onCancel={rows && rows.length ? () => setMaking(false) : undefined} onDone={load} />}

        {failed ? (
          <State kind="error" title="Not read" action={<button type="button" className="btn is-ink" onClick={() => void load()}>Try again</button>}>{failed}</State>
        ) : rows === null ? (
          <div style={{ padding: "18px 28px" }}><div className="skel" style={{ height: 140 }} /></div>
        ) : rows.length === 0 ? (
          <State art="ngo-empty" title="No surveys yet">Create one above, then add the areas your team will cover and collect counts on the map.</State>
        ) : (
          <div className="or-scroll" role="region" aria-label="Surveys" tabIndex={0}>
            <table className="or-table" style={{ minWidth: 640 }}>
              <thead><tr><th>Survey</th><th>Status</th><th>Created</th><th /></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.title}</b><small>Dog census{s.description ? ` · ${s.description.slice(0, 120)}` : ""}</small></td>
                    <td><span className={`pill ${s.status === "active" ? "is-care" : "is-plain"}`} style={{ textTransform: "capitalize" }}>{s.status}</span></td>
                    <td className="mono">{day(s.created_at)}</td>
                    <td><div className="or-acts"><Link className="btn is-s" href={`/surveys/${s.id}`}>Open</Link><Link className="btn is-ghost is-s" href={`/surveys/${s.id}/collect`}>Collect</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {all >= 200 && <p className="small ngo-foot" style={{ paddingTop: 12 }}>Showing the 200 most recent surveys and projects.</p>}
        <p className="small ngo-foot" style={{ paddingTop: 12 }}>Any member of your organisation can create a survey and collect counts; the database checks membership on every write.</p>
      </div>
    </NgoGate>
  );
}

function NewSurvey({ onCancel, onDone }: { onCancel?: () => void; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<(Receipt & { id?: string }) | null>(null);
  return (
    <form className="or-band" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; setBusy(true); setR(null); const x = await startSurvey(title.trim(), desc.trim()); setR(x); setBusy(false); if (x.ok) { setTitle(""); setDesc(""); await onDone(); } }}>
      <h2>A new survey</h2>
      <div className="or-form">
        <div className="field"><label htmlFor="sv-t">Title</label><input id="sv-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Bengaluru stray dog census 2026" /></div>
        <div className="field"><label htmlFor="sv-d">What is counted, and how <span className="small">optional</span></label><input id="sv-d" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      </div>
      <div className="or-send">
        <button type="submit" className="btn is-ink" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create the survey"}</button>
        {onCancel && <button type="button" className="btn is-ghost" onClick={onCancel}>Cancel</button>}
        <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}. {r.id && <Link className="link" href={`/surveys/${r.id}`}>Open it to add areas</Link>}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span>
      </div>
    </form>
  );
}
