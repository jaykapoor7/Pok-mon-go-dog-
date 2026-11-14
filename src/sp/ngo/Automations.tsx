"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Automations.

   Rules the organisation turns on. Each watches one of Kaju's checks and
   tells people inside StrayPaw when it finds enough. The server runs them
   once a day; every run is kept below, including the ones that found
   nothing and the ones that failed. Nothing is on until a lead or
   coordinator turns it on here, and nothing here sends a message outside
   StrayPaw or changes a record.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, Trash2, Zap } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { byRule, DAYS, LIBRARY, type Template } from "@/lib/automations/library";
import { Btn, Empty, Head, Note, Page, Panel, Row, Rows, Section, Table, Tag, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../shell/Shell";
import { NgoGate } from "./Gate";
import "./automations.k.css";

type Auto = { id: string; template: string; name: string; rule: string; every: "day" | "week"; weekday: number; min_count: number; notify: "leads" | "everyone"; status: "active" | "paused"; last_run_at: string | null };
type Run = { id: string; automation_id: string; status: "succeeded" | "skipped" | "failed"; found: number | null; delivered: number; summary: string; error: string | null; attempt: number; started_at: string; items: { label: string; href: string }[] };
type Draft = { t: Template; every: "day" | "week"; weekday: number; min: number; notify: "leads" | "everyone" };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const rhythm = (a: { every: string; weekday: number }) => (a.every === "week" ? `Every ${DAYS[a.weekday - 1]}` : "Every day");

export function Automations() {
  const mem = useMembership();
  const can = mem.role === "admin" || mem.role === "coordinator";
  const [autos, setAutos] = useState<Auto[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [state, setState] = useState<"reading" | "ready" | "setup" | "failed">("reading");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [lane, setLane] = usePageState<"all" | "failed">("runs", "all");

  const load = useCallback(async () => {
    const db = getSupabase(); if (!db) { setState("failed"); return; }
    const [a, r] = await Promise.all([
      db.from("automations").select("id, template, name, rule, every, weekday, min_count, notify, status, last_run_at").order("created_at"),
      db.from("automation_runs").select("id, automation_id, status, found, delivered, summary, error, attempt, started_at, items").order("started_at", { ascending: false }).limit(40),
    ]);
    /* The tables arrive with a database change that an owner approves; until then the page says so instead of failing. */
    if (a.error) { setState(/does not exist|schema cache|PGRST205|42P01/i.test(`${a.error.code} ${a.error.message}`) ? "setup" : "failed"); return; }
    setAutos((a.data ?? []) as Auto[]); setRuns(((r.data ?? []) as Run[])); setState("ready");
  }, []);
  useEffect(() => { void load(); }, [load]);

  /* Kaju hands a filled sentence over as an address: the choice opens here for the person to turn on. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const t = byRule(q.get("rule") ?? "");
    if (t && t.state === "ready") setDraft({ t, every: q.get("every") === "week" ? "week" : q.get("every") === "day" ? "day" : t.every, weekday: 1, min: Math.max(1, Math.min(1000, Number(q.get("min")) || t.min)), notify: q.get("notify") === "everyone" ? "everyone" : q.get("notify") === "leads" ? "leads" : t.notify });
  }, []);

  const act = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>, done: (d: unknown) => string) => {
    setBusy(key); setMsg(null);
    const r = await fn();
    setMsg(r.error ? { ok: false, text: r.error.message } : { ok: true, text: done(r.data) });
    setBusy(null); await load();
  };
  const db = getSupabase();
  const turnOn = (d: Draft) => db && act("save", () => db.rpc("automation_save", { p_template: d.t.id, p_name: d.t.name, p_rule: d.t.rule, p_every: d.every, p_weekday: d.weekday, p_min_count: d.min, p_notify: d.notify }), () => { setDraft(null); return `${d.t.name} is on. It first runs with the next daily check, or press Run now.`; });
  const setStatus = (a: Auto, s: "active" | "paused" | "removed") => db && act(a.id, () => db.rpc("automation_set_status", { p_id: a.id, p_status: s }), () => (s === "removed" ? `${a.name} removed.` : s === "paused" ? `${a.name} paused.` : `${a.name} is on again.`));
  const runNow = (a: Auto) => db && act(a.id, () => db.rpc("automation_run", { p_id: a.id, p_now: true }), (d) => { const x = (d ?? {}) as { status?: string; summary?: string; delivered?: number }; return x.status === "succeeded" ? `Ran: ${x.summary}. ${x.delivered ?? 0} ${x.delivered === 1 ? "person" : "people"} told.` : x.status === "failed" ? "The run could not finish. It is recorded below." : `Ran: ${x.summary || "nothing to tell"}.`; });

  const on = useMemo(() => new Set((autos ?? []).map((a) => a.rule)), [autos]);
  const name = (id: string) => autos?.find((a) => a.id === id)?.name ?? "Removed automation";
  const shown = lane === "failed" ? runs.filter((r) => r.status === "failed") : runs;
  const failed = runs.filter((r) => r.status === "failed").length;
  const cols: Col<Run>[] = [
    { key: "what", label: "Automation", width: "minmax(0, 1.2fr)", render: (r) => name(r.automation_id) },
    { key: "status", label: "Result", width: "112px", keep: true, render: (r) => <Tag tone={r.status === "succeeded" ? "green" : r.status === "failed" ? "flame" : "plain"}>{r.status === "succeeded" ? "Told people" : r.status === "failed" ? "Failed" : "Nothing to tell"}</Tag> },
    { key: "sum", label: "What it found", width: "minmax(0, 2fr)", render: (r) => r.status === "failed" ? `${r.error ?? "Could not finish"} (attempt ${r.attempt})` : r.summary },
    { key: "to", label: "Told", width: "64px", align: "end", render: (r) => r.delivered },
    { key: "at", label: "When", width: "128px", align: "end", render: (r) => when(r.started_at) },
  ];

  return (
    <NgoGate title="Automations" lede="Rules that watch the work and tell the right people.">
      <Page>
        <Head title="Automations"
          sum={state === "reading" ? "Reading your automations…" : state === "setup" ? "Automations are built but not yet switched on for this database." : state === "failed" ? "Automations could not be read. Check the connection and reload." : autos!.length === 0 ? "Nothing is on. Choose one from the library; nothing runs until you turn it on." : <><b>{autos!.filter((a) => a.status === "active").length}</b> on{autos!.some((a) => a.status === "paused") ? `, ${autos!.filter((a) => a.status === "paused").length} paused` : ""}. The server runs them once a day{failed ? <>, <span className="is-hot">{failed} recent {failed === 1 ? "run" : "runs"} failed</span></> : null}.</>} />
        {state === "setup" ? <Note tone="amber">This needs a database change that the owner approves before it is applied. Until then nothing can be turned on. The library below shows what will be available.</Note> : null}
        {msg ? <p className={`au-msg${msg.ok ? "" : " is-err"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p> : null}

        {draft ? (
          <Section title={`Turn on: ${draft.t.name}`}>
            <Panel pad>
              <p className="au-sentence">
                <select aria-label="How often" value={draft.every} onChange={(e) => setDraft({ ...draft, every: e.target.value as "day" | "week" })}><option value="day">Every day</option><option value="week">Every week</option></select>
                {draft.every === "week" ? <> on <select aria-label="Which day" value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></> : null}
                , tell <select aria-label="Who is told" value={draft.notify} onChange={(e) => setDraft({ ...draft, notify: e.target.value as "leads" | "everyone" })}><option value="leads">leads and coordinators</option><option value="everyone">everyone in the organisation</option></select>
                {" "}when at least <input aria-label="At least how many" type="number" min={1} max={1000} value={draft.min} onChange={(e) => setDraft({ ...draft, min: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} /> {draft.min === 1 ? "is" : "are"} found.
              </p>
              <p className="au-fine">{draft.t.does} People are told inside StrayPaw only. No record is changed and nothing is sent outside.</p>
              <p className="au-acts"><Btn variant="primary" disabled={!can || state !== "ready" || busy === "save"} onClick={() => turnOn(draft)}>{busy === "save" ? "Turning on…" : "Turn on"}</Btn><Btn onClick={() => setDraft(null)}>Cancel</Btn>{!can ? <span className="au-fine">Only a lead or coordinator can turn on automations.</span> : null}</p>
            </Panel>
          </Section>
        ) : null}

        {/* What is on, then the library, then what ran: a section appears only when it has something in it. */}
        {autos?.length ? <>
          <Section title="Yours" count={autos?.length ?? 0}>
            {<Panel><Rows>
                {(autos ?? []).map((a) => (
                  <Row key={a.id} icon={<Zap size={16} aria-hidden />} title={a.name}
                    meta={`${rhythm(a)} · tells ${a.notify === "everyone" ? "everyone" : "leads and coordinators"} at ${a.min_count} or more · ${a.last_run_at ? `last ran ${when(a.last_run_at)}` : "has not run yet"}`}
                    end={<span className="au-row-acts">
                      {a.status === "paused" ? <Tag tone="amber">Paused</Tag> : null}
                      {can ? <>
                        <Btn small disabled={busy === a.id} onClick={() => runNow(a)}>Run now</Btn>
                        <Btn small disabled={busy === a.id} icon={a.status === "active" ? <Pause size={14} /> : <Play size={14} />} aria-label={a.status === "active" ? `Pause ${a.name}` : `Resume ${a.name}`} onClick={() => setStatus(a, a.status === "active" ? "paused" : "active")}><span className="sr-only">{a.status === "active" ? "Pause" : "Resume"}</span></Btn>
                        <Btn small disabled={busy === a.id} icon={<Trash2 size={14} />} aria-label={`Remove ${a.name}`} onClick={() => { if (window.confirm(`Remove “${a.name}”? Its past runs are removed with it.`)) void setStatus(a, "removed"); }}><span className="sr-only">Remove</span></Btn>
                      </> : null}
                    </span>} />
                ))}
              </Rows></Panel>}
          </Section>
        </> : null}
          <Section title="Library" count={LIBRARY.filter((t) => t.state === "ready").length}>
            <Panel><Rows>
              {LIBRARY.map((t) => (
                <Row key={t.id} title={t.name} meta={t.state === "ready" ? `${t.for} · ${t.does}` : `${t.for} · Not yet built. ${t.why}`}
                  end={t.state !== "ready" ? <Tag tone="plain">Not yet</Tag> : on.has(t.rule!) ? <Tag tone="green">On</Tag> : <Btn small disabled={state !== "ready" || !can} onClick={() => setDraft({ t, every: t.every, weekday: 1, min: t.min, notify: t.notify })}>Set up</Btn>} />
              ))}
            </Rows></Panel>
          </Section>
        {runs.length ? <>
          <Section title="Activity" count={runs.length} action={failed ? <Btn small onClick={() => setLane(lane === "failed" ? "all" : "failed")}>{lane === "failed" ? "Show all" : `Only failed (${failed})`}</Btn> : undefined}>
            {shown.length ? <Panel><Table label="Automation runs" cols={cols} rows={shown} rowKey={(r) => r.id} /></Panel>
              : <Empty title="No runs yet">Each run appears here: what it found, who was told, and anything that failed.</Empty>}
          </Section>
        </> : null}
      </Page>
    </NgoGate>
  );
}
