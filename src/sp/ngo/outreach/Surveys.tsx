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
import { Btn, Empty, Head, More, Note, Page, Panel, Table, Tag, type Col } from "@/ws/kit";
import { useMembership } from "../../shell/Shell";
import { Ack, day, n } from "../../ui";
import { Reading } from "../../ui/Reading";
import { startSurvey, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../org.k.css";

/* Kept for callers: Projects and Surveys are now views of Drives in the frame, which draws the tabs. */
export function RegisterTabs(_: { on: "projects" | "surveys" }) {
  return null;
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
  const none = !!rows && rows.length === 0;

  const cols: Col<Survey>[] = [
    { key: "title", label: "Survey", width: "minmax(0, 1.2fr)", render: (s) => s.title },
    { key: "what", label: "What is counted", width: "minmax(0, 1.4fr)", render: (s) => `Dog census${s.description ? ` · ${s.description.slice(0, 120)}` : ""}` },
    { key: "status", label: "Status", width: "96px", render: (s) => <Tag tone={s.status === "active" ? "green" : "plain"}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</Tag> },
    { key: "created", label: "Created", width: "112px", render: (s) => day(s.created_at) },
    { key: "acts", label: "", width: "auto", keep: true, align: "end", render: (s) => <span className="og-acts"><Btn small href={`/surveys/${s.id}`}>Open</Btn><Btn small variant="quiet" href={`/surveys/${s.id}/collect`}>Collect</Btn></span> },
  ];

  return (
    <NgoGate title="Surveys and census" lede="Structured dog counts across wards, villages and districts.">
      <Page>
        <Head title="Drives"
          sum={<>{rows ? <><b>{n(rows.length)}</b> survey{rows.length === 1 ? "" : "s"}. </> : failed ? "Your surveys could not be read. Nothing is shown as none. " : <><Reading>Reading your surveys</Reading>{" "}</>}Counts across wards, villages and districts, drawn on the map as they are collected.</>}
          actions={<Btn variant={making || none ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={making || none} onClick={() => setMaking((v) => !v)}>New survey</Btn>} />
        {(making || none) && <Panel pad><NewSurvey onCancel={rows && rows.length ? () => setMaking(false) : undefined} onDone={load} /></Panel>}
        {failed ? (
          <Note tone="flame" action={<Btn small onClick={() => void load()}>Try again</Btn>}>Didn&rsquo;t load. {failed}</Note>
        ) : rows === null ? (
          <div className="og-skel" aria-busy="true"><i /><i /><i /></div>
        ) : (
          <Panel>
            <More items={rows} cap={12} noun="surveys">{(shown) => (
              <Table label="Surveys" cols={cols} rows={shown} rowKey={(s) => s.id}
                empty={<Empty title="No surveys yet">Create one above, then add the areas your team will cover and collect counts on the map.</Empty>} />
            )}</More>
          </Panel>
        )}
        {all >= 200 && <p className="og-hint">Showing the 200 most recent surveys and projects.</p>}
      </Page>
    </NgoGate>
  );
}

function NewSurvey({ onCancel, onDone }: { onCancel?: () => void; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<(Receipt & { id?: string }) | null>(null);
  return (
    <form className="og-form" aria-label="A new survey" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; setBusy(true); setR(null); const x = await startSurvey(title.trim(), desc.trim()); setR(x); setBusy(false); if (x.ok) { setTitle(""); setDesc(""); await onDone(); } }}>
      <div className="og-f"><label htmlFor="sv-t">Title</label><input id="sv-t" className="og-in" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Bengaluru stray dog census 2026" /></div>
      <div className="og-f"><label htmlFor="sv-d">What is counted, and how <span className="og-opt">optional</span></label><input id="sv-d" className="og-in" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="og-go">
        <Btn type="submit" variant="primary" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create the survey"}</Btn>
        {onCancel && <Btn onClick={onCancel}>Cancel</Btn>}
        <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}. {r.id && <Link className="og-a" href={`/surveys/${r.id}`}>Open it to add areas</Link>}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span>
      </div>
    </form>
  );
}
