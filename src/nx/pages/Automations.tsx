"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Zap } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Confirm, Empty, Field, Modal, Section, Skeleton, dayTime, useAct } from "../kit";
import { useLive } from "../live";
import { getSupabase } from "@/lib/supabase";
import { ELSEWHERE, ENTRIES, type Entry } from "@/lib/automations/v2";

/* Automations: fixed rules an organisation turns on. Each counts something and tells the right people inside
   StrayPaw, on a schedule the database keeps whether or not anyone has the app open. A lead or coordinator turns them
   on; nothing is on by default; every run is listed with what it found and whom it told. */

type Auto = { id: string; rule: string; name: string; every: string; params: Record<string, number>; audience: string; status: string; last_run_at: string | null };
type Run = { id: string; automation_id: string; status: string; found: number | null; delivered: number; summary: string; error: string | null; started_at: string };
type RunOut = { status?: string; summary?: string; found?: number; delivered?: number; error?: string } | null;
const EVERY: Record<string, string> = { hour: "Every hour", day: "Every morning", week: "Mondays" };
const WHO: Record<string, string> = { leads: "Leads and coordinators", everyone: "Everyone in the organisation", clinical: "Clinical staff", lab: "Laboratory staff" };

export function KajuAutomations() {
  const live = useLive();
  const org = live.org;
  const db = getSupabase();
  const [autos, setAutos] = useState<Auto[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const [setup, setSetup] = useState<Entry | null>(null);
  const [param, setParam] = useState<number>(0);
  const [removing, setRemoving] = useState<Auto | null>(null);
  const { busy, run } = useAct();
  const manager = !!org && ["admin", "lead", "coordinator"].includes(org.role);
  useEffect(() => {
    if (!db || !org) return;
    void Promise.all([
      db.from("nx_automations").select("id,rule,name,every,params,audience,status,last_run_at").eq("org_id", org.org_id),
      db.from("nx_automation_runs").select("id,automation_id,status,found,delivered,summary,error,started_at").eq("org_id", org.org_id).order("started_at", { ascending: false }).limit(30),
    ]).then(([a, r]) => { if (a.error && /does not exist|schema cache/i.test(a.error.message)) { setMissing(true); setAutos([]); return; } setAutos((a.data ?? []) as Auto[]); setRuns((r.data ?? []) as Run[]); });
  }, [db, org, tick]);
  const library = useMemo(() => ENTRIES.filter((e) => !org || (e.ws.includes(org.workspace) && (!e.kinds || e.kinds.includes(org.kind)))), [org]);
  const mine = (rule: string) => autos?.find((a) => a.rule === rule) ?? null;
  const runNow = (a: Auto) => run(`r${a.id}`, async () => {
    const r = await db!.rpc("nx_automation_run", { p_id: a.id, p_now: true });
    const d = r.data as RunOut;
    return r.error ? { error: r.error } : d?.status === "failed" ? { error: d.error ?? "The run failed." } : { data: d };
  }, { ok: (r) => { const d = (r as { data?: RunOut }).data; return d?.status === "skipped" ? "Ran: nothing to tell. Nobody was notified." : `Ran: ${d?.summary ?? "done"}. ${d?.delivered ?? 0} told.`; } }).then(reload);

  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", "Automations"]}><div className="nx-page"><Skeleton /></div></Shell>;
  return (
    <Shell ws="kaju" crumb={["Kaju", "Automations"]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{org ? org.name : <>Sample library<Sample /></>}</p><h1 className="nx-h1">Automations</h1><p className="nx-sub">Rules that watch for routine work and tell the right people inside StrayPaw. They count and remind; decisions stay with people.</p></div></div>
        {missing ? <p className="nx-note"><Zap size={13} /><span>Automations are not set up on this database yet.</span></p> : null}
        <Section title={org ? "Available here" : "The library"} count={library.length}>
          {autos === null && org ? <Skeleton rows={5} /> : <ul className="nx-autos">{library.map((e) => { const a = mine(e.rule); return (
            <li key={e.rule} className={a?.status === "active" ? "is-on" : ""}>
              <div className="nx-autos-h"><b>{e.name}</b>{a ? <Chip tone={a.status === "active" ? "ok" : "plain"}>{a.status === "active" ? "On" : "Paused"}</Chip> : null}{e.needs ? <Chip tone="warn">Needs: {e.needs}</Chip> : null}</div>
              <p>{e.does}</p>
              <p className="nx-t3">{e.boundary} · {EVERY[e.every]} · tells {WHO[a?.audience ?? e.audience].toLowerCase()}{a?.last_run_at ? ` · last ran ${dayTime(a.last_run_at)}` : ""}</p>
              <div className="nx-run-act">
                {!org ? <Link href="/try" className="nx-btn is-quiet is-sm" title="Opens the live demo, where this works">Try it in the demo</Link>
                  : !manager ? <span className="nx-t3">{a ? "" : "A lead or coordinator can turn this on."}</span>
                  : !a ? <button type="button" className="nx-btn is-sm" disabled={!!busy || missing} onClick={() => { setParam(e.param?.value ?? 0); setSetup(e); }}>Turn on</button>
                  : <>
                    <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void runNow(a)}><Play size={12} />Run now</button>
                    <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run(`p${a.id}`, async () => await db!.rpc("nx_automation_set", { p_id: a.id, p_status: a.status === "active" ? "paused" : "active" }), { ok: a.status === "active" ? "Paused." : "On again." }).then(reload)}>{a.status === "active" ? "Pause" : "Turn on again"}</button>
                    <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRemoving(a)}>Remove</button>
                  </>}
              </div>
            </li>); })}</ul>}
        </Section>
        {org ? <Section title="Recent runs" count={runs.length}>
          {!runs.length ? <Empty title="No runs yet" hint="Runs appear here with what each found and how many people it told." /> : <table className="nx-rtable"><thead><tr><th>When</th><th>Rule</th><th>Result</th><th>Told</th></tr></thead><tbody>{runs.map((r) => <tr key={r.id}><td>{dayTime(r.started_at)}</td><td>{autos?.find((a) => a.id === r.automation_id)?.name ?? "Removed rule"}</td><td><Chip tone={r.status === "succeeded" ? "ok" : r.status === "failed" ? "bad" : "plain"}>{r.status === "succeeded" ? "Told" : r.status === "failed" ? "Failed" : "Nothing found"}</Chip> <span className="nx-t3">{r.error ?? r.summary}</span></td><td className="num">{r.delivered}</td></tr>)}</tbody></table>}
          <p className="nx-foot">The database runs these on schedule. Times are in India Standard Time.</p>
        </Section> : null}
        <Section title="Other routine work Kaju takes on" count={ELSEWHERE.length}>
          <ul className="nx-feed">{ELSEWHERE.map((x) => <li key={x.row} style={{ gridTemplateColumns: "minmax(0,1fr)" }}><div><b>{x.what}</b><small>{x.where}</small></div></li>)}</ul>
        </Section>
      </div>
      {setup ? <Modal title={`Turn on: ${setup.name}`} onClose={() => setSetup(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setSetup(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy} onClick={() => void run("save", async () => await db!.rpc("nx_automation_save", { p_org: org!.org_id, p_rule: setup.rule, p_name: setup.name, p_every: setup.every, p_params: setup.param ? { [setup.param.key]: param } : {}, p_audience: setup.audience }), { ok: `${setup.name} is on.` }).then((r) => { if (r.ok) { setSetup(null); reload(); } })}>Turn on</button></>}>
        <p>{setup.does}</p>
        <p className="nx-t3">{setup.boundary}</p>
        {setup.param ? <Field label={setup.param.label}><input type="number" min={1} max={setup.param.key === "hours" ? 240 : 90} value={param} onChange={(e) => setParam(Math.max(1, Number(e.target.value) || 1))} /></Field> : null}
        <p className="nx-t3">{EVERY[setup.every]}, telling {WHO[setup.audience].toLowerCase()}. You can pause or remove it at any time.</p>
      </Modal> : null}
      {removing ? <Confirm title={`Remove ${removing.name}?`} confirm="Remove" danger busy={!!busy} onClose={() => setRemoving(null)} onConfirm={() => void run("rm", async () => await db!.rpc("nx_automation_set", { p_id: removing.id, p_status: "removed" }), { ok: "Removed. Its runs are removed with it." }).then(() => { setRemoving(null); reload(); })}><p>It stops running. Its run history is removed with it; notifications already sent stay.</p></Confirm> : null}
    </Shell>
  );
}
