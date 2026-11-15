"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Pause, Play, Trash2, Zap } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DAYS, LIBRARY, type Template } from "@/lib/automations/library";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import type { Tone } from "../fixtures";
import { useLive } from "../live";

/* Kaju's automations: rules an organisation turns on. Each watches one of Kaju's explainable checks and tells people
   inside StrayPaw when it finds enough. Nothing is on by default, nothing is sent outside StrayPaw and no record is
   changed. Only a lead or coordinator can turn one on; every run is kept, including the empty and failed ones. */

type Auto = { id: string; template: string; name: string; rule: string; every: "day" | "week"; weekday: number; min_count: number; notify: "leads" | "everyone"; status: "active" | "paused"; last_run_at: string | null };
type Run = { id: string; automation_id: string; status: "succeeded" | "skipped" | "failed"; found: number | null; delivered: number; summary: string; error: string | null; started_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const RUN_TONE: Record<Run["status"], Tone> = { succeeded: "ok", skipped: "plain", failed: "bad" };
const RUN_WORD: Record<Run["status"], string> = { succeeded: "Told people", skipped: "Nothing to tell", failed: "Failed" };
const rhythm = (a: { every: string; weekday: number }) => (a.every === "week" ? `Every ${DAYS[a.weekday - 1]}` : "Every day");

const SAMPLE_AUTOS: Auto[] = [
  { id: "sa1", template: "followups", name: "Overdue follow-ups", rule: "overdue_followup", every: "day", weekday: 1, min_count: 1, notify: "leads", status: "active", last_run_at: "2026-11-15T03:30:00Z" },
  { id: "sa2", template: "digest", name: "Weekly summary", rule: "digest", every: "week", weekday: 1, min_count: 1, notify: "everyone", status: "paused", last_run_at: "2026-11-10T03:30:00Z" },
];
const SAMPLE_RUNS: Run[] = [
  { id: "sr1", automation_id: "sa1", status: "succeeded", found: 7, delivered: 2, summary: "7 follow-ups are past the due date", error: null, started_at: "2026-11-15T03:30:00Z" },
  { id: "sr2", automation_id: "sa1", status: "skipped", found: 0, delivered: 0, summary: "Nothing found", error: null, started_at: "2026-11-14T03:30:00Z" },
  { id: "sr3", automation_id: "sa2", status: "succeeded", found: 13, delivered: 6, summary: "7 overdue followup, 5 missing evidence, 1 open clarification", error: null, started_at: "2026-11-10T03:30:00Z" },
];

export function KajuAutomations() {
  const live = useLive();
  const ngo = live.orgFor("ngo");
  const ngoId = live.org ? ngo?.org_id ?? null : null;
  const can = !!ngo && (ngo.role === "admin" || ngo.role === "coordinator");
  const [autos, setAutos] = useState<Auto[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [state, setState] = useState<"reading" | "ready" | "setup" | "failed">("reading");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [opening, setOpening] = useState<{ t: Template; every: "day" | "week"; weekday: number; notify: "leads" | "everyone" } | null>(null);

  const load = useCallback(async () => {
    const db = getSupabase(); if (!db || !ngoId) return;
    const [a, r] = await Promise.all([
      db.from("automations").select("id,template,name,rule,every,weekday,min_count,notify,status,last_run_at").eq("ngo_id", ngoId).order("created_at"),
      db.from("automation_runs").select("id,automation_id,status,found,delivered,summary,error,started_at").eq("ngo_id", ngoId).order("started_at", { ascending: false }).limit(30),
    ]);
    if (a.error) { setState(/does not exist|schema cache|PGRST205|42P01/i.test(`${a.error.code} ${a.error.message}`) ? "setup" : "failed"); return; }
    setAutos((a.data ?? []) as Auto[]); setRuns((r.data ?? []) as Run[]); setState("ready");
  }, [ngoId]);
  useEffect(() => { void load(); }, [load]);

  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", "Automations"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && !ngo) return <Shell ws="kaju" crumb={["Kaju", "Automations"]}><div className="nx-page"><h1 className="nx-h1">Automations</h1><p className="nx-sub">Automations watch an NGO&apos;s records. Your account is not part of an NGO, so there are none here.</p></div></Shell>;

  const list = sample ? SAMPLE_AUTOS : autos ?? [];
  const runList = sample ? SAMPLE_RUNS : runs;
  const byTemplate = (t: Template) => list.find((a) => a.rule === t.rule) ?? null;
  const act = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>, done: (d: unknown) => string) => {
    if (sample) { setMsg({ ok: false, text: "Sample data: sign in as a lead or coordinator to turn automations on." }); return; }
    setBusy(key); setMsg(null);
    const r = await fn();
    setMsg(r.error ? { ok: false, text: r.error.message } : { ok: true, text: done(r.data) });
    setBusy(null); await load();
  };
  const db = getSupabase();
  const turnOn = (o: NonNullable<typeof opening>) => act("save", () => db!.rpc("automation_save", { p_template: o.t.id, p_name: o.t.name, p_rule: o.t.rule, p_every: o.every, p_weekday: o.weekday, p_min_count: o.t.min, p_notify: o.notify }), () => { setOpening(null); return `${o.t.name} is on. Press Run now to see what it would tell people today.`; });
  const setStatus = (a: Auto, s: "active" | "paused" | "removed") => act(`${a.id}:${s}`, () => db!.rpc("automation_set_status", { p_id: a.id, p_status: s }), () => (s === "removed" ? `${a.name} was removed. Its past runs are removed with it.` : s === "paused" ? `${a.name} is paused.` : `${a.name} is on again.`));
  const runNow = (a: Auto) => act(`${a.id}:run`, () => db!.rpc("automation_run", { p_id: a.id, p_now: true }), (d) => { const x = (d ?? {}) as { status?: string; summary?: string; delivered?: number; found?: number }; return x.status === "succeeded" ? `Ran: ${x.summary}. ${x.delivered ?? 0} ${x.delivered === 1 ? "person" : "people"} told inside StrayPaw.` : x.status === "failed" ? "The run could not finish. It is recorded below." : x.summary === "Already ran for this period" ? "It already ran for this period." : `Ran: nothing to tell${typeof x.found === "number" ? ` (${x.found} found)` : ""}. Nobody was notified.`; });
  const ready = LIBRARY.filter((t) => t.state === "ready");
  const notOffered = LIBRARY.filter((t) => t.state !== "ready");
  const on = list.filter((a) => a.status === "active").length;

  return (
    <Shell ws="kaju" crumb={["Kaju", "Automations"]}>
      <div className="nx-page" style={{ maxWidth: 1000 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? "Kind Hour" : ngo!.name}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Automations</h1>
          <p className="nx-sub">{!sample && state === "reading" ? "Reading automations…" : <><b className="num">{on}</b> on. Each one watches one of Kaju&apos;s checks and tells people inside StrayPaw. Nothing is on until a lead or coordinator turns it on.</>}</p></div></div>
        {msg ? <p className="nx-foot" role="status" style={{ color: msg.ok ? undefined : "var(--bad)" }}>{msg.text}</p> : null}
        {!sample && state === "setup" ? <p className="nx-note" style={{ marginTop: 18 }}><Info size={13} /><span>Automations are not set up on this database yet. Nothing runs and nothing can be turned on until they are.</span></p> : null}
        {!sample && state === "failed" ? <p className="nx-foot" role="alert">Automations could not be read. Try again.</p> : null}
        {!sample && !can && state === "ready" ? <p className="nx-note" style={{ marginTop: 18 }}><Info size={13} /><span>You can see these. A lead or coordinator turns them on, pauses them or runs them.</span></p> : null}

        {sample || state === "ready" ? <section className="nx-sec" aria-labelledby="au-l" style={{ marginTop: 22 }}>
          <div className="nx-sec-h"><h2 id="au-l">Library</h2><span className="nx-count">{ready.length}</span></div>
          <div className="nx-checks">
            {ready.map((t) => { const a = byTemplate(t); const last = a ? runList.find((r) => r.automation_id === a.id) : null; return (
              <article key={t.id} className={`nx-chk ${a?.status === "active" ? "is-on" : ""}`}>
                <div className="nx-chk-h"><Zap size={15} style={{ color: a?.status === "active" ? "var(--accent)" : "var(--ink-3)" }} /><span>{t.name}</span>{a ? <Chip tone={a.status === "active" ? "ok" : "plain"}>{a.status === "active" ? "On" : "Paused"}</Chip> : <Chip>Off</Chip>}</div>
                <p className="nx-chk-m">{t.does}</p>
                {a ? <p className="nx-chk-m" style={{ marginTop: 6 }}>{rhythm(a)} · tells {a.notify === "everyone" ? "everyone" : "leads and coordinators"}{last ? <> · last: {RUN_WORD[last.status].toLowerCase()}, {when(last.started_at)}</> : " · not run yet"}</p> : null}
                {(sample || can) ? <div className="nx-chk-a">
                  {a ? <>
                    <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => runNow(a)}><Play size={12} />{busy === `${a.id}:run` ? "Running…" : "Run now"}</button>
                    <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setStatus(a, a.status === "active" ? "paused" : "active")}>{a.status === "active" ? <><Pause size={12} />Pause</> : <><Play size={12} />Turn on</>}</button>
                    <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setStatus(a, "removed")} aria-label={`Remove ${t.name}`}><Trash2 size={12} /></button>
                  </> : opening?.t.id === t.id ? <form className="nx-chk-f" onSubmit={(e) => { e.preventDefault(); void turnOn(opening); }}>
                    <label>How often<select value={opening.every} onChange={(e) => setOpening({ ...opening, every: e.target.value as "day" | "week" })}><option value="day">Every day</option><option value="week">Every week</option></select></label>
                    {opening.every === "week" ? <label>On<select value={opening.weekday} onChange={(e) => setOpening({ ...opening, weekday: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label> : null}
                    <label>Tell<select value={opening.notify} onChange={(e) => setOpening({ ...opening, notify: e.target.value as "leads" | "everyone" })}><option value="leads">Leads and coordinators</option><option value="everyone">Everyone</option></select></label>
                    <button type="submit" className="nx-btn is-sm" disabled={busy === "save"}>{busy === "save" ? "Turning on…" : "Turn on"}</button>
                    <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setOpening(null)}>Cancel</button>
                  </form> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setOpening({ t, every: t.every, weekday: 1, notify: t.notify })}>Set up</button>}
                </div> : null}
              </article>); })}
          </div>
        </section> : null}

        {sample || state === "ready" ? <section className="nx-sec" aria-labelledby="au-r" style={{ marginTop: 30 }}>
          <div className="nx-sec-h"><h2 id="au-r">Runs</h2><span className="nx-count">{runList.length}</span></div>
          {runList.length ? <ul className="nx-feed" style={{ maxWidth: 760 }}>{runList.map((r) => { const a = list.find((x) => x.id === r.automation_id); return <li key={r.id}><span className="nx-feed-i"><Zap size={12} /></span><div><b>{a?.name ?? "Automation"}</b><p>{r.summary || RUN_WORD[r.status]}{r.status === "failed" && r.error ? ` (${r.error})` : ""}</p><small><Chip tone={RUN_TONE[r.status]}>{RUN_WORD[r.status]}</Chip> {r.found !== null ? `${r.found} found · ` : ""}{r.delivered} told · {when(r.started_at)}</small></div></li>; })}</ul> : <p className="nx-sub">No runs yet. Turn one on and press Run now.</p>}
        </section> : null}

        <section className="nx-sec" aria-labelledby="au-n" style={{ marginTop: 30 }}>
          <div className="nx-sec-h"><h2 id="au-n">Not offered, and why</h2></div>
          <ul className="nx-feed" style={{ maxWidth: 760 }}>{notOffered.map((t) => <li key={t.id}><span className="nx-feed-i"><Info size={12} /></span><div><b>{t.name}</b><p>{t.why}</p></div></li>)}</ul>
        </section>
        <p className="nx-note" style={{ marginTop: 22, maxWidth: 760 }}><Info size={13} /><span>Run now works whenever you press it. A daily schedule is configured for the live site but has not been checked on this database, so StrayPaw does not promise that it runs on its own yet.</span></p>
      </div>
    </Shell>
  );
}
