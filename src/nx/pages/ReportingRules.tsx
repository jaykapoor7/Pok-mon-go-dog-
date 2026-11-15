"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { byRule, DAYS, LIBRARY, type Template } from "@/lib/automations/library";
import { Chip } from "../ui";
import { Confirm, Empty, Field, Modal, Section, dayTime, useAct } from "../kit";
import type { Workspace } from "../live";

/* An NGO's reporting rules: the checks behind ABC reporting (incomplete evidence, procedures waiting for a
   veterinarian's sign-off, questions from the reviewing office, the report deadline, a drive going quiet). They run on
   the server once a day (`automation_due` / `automation_run`), tell people inside StrayPaw only, and change no record.
   Rules an organisation turned on earlier are listed here with the same controls they always had. Kaju can hand a filled
   sentence over as `?rule=&every=&notify=&min=`; the choice opens for a person to turn on. */

type Auto = { id: string; template: string; name: string; rule: string; every: "day" | "week"; weekday: number; min_count: number; notify: "leads" | "everyone"; status: "active" | "paused"; last_run_at: string | null };
type Run = { id: string; automation_id: string; status: "succeeded" | "skipped" | "failed"; delivered: number; summary: string; error: string | null; attempt: number; started_at: string };
type Draft = { t: Template; every: "day" | "week"; weekday: number; min: number; notify: "leads" | "everyone" };

/* Two of the older rules have a newer equivalent in the library above (follow-ups due, weekly summary). They are not
   offered again, but a rule already on stays listed and controllable. */
const SUPERSEDED = new Set(["overdue_followup", "digest"]);
const rhythm = (a: { every: string; weekday: number }) => (a.every === "week" ? `Every ${DAYS[a.weekday - 1]}` : "Every day");

export function ReportingRules({ org, manager }: { org: Workspace; manager: boolean }) {
  const db = getSupabase();
  const [autos, setAutos] = useState<Auto[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Auto | null>(null);
  const { busy, run } = useAct();

  const load = useCallback(async () => {
    if (!db) return;
    const [a, r] = await Promise.all([
      db.from("automations").select("id,template,name,rule,every,weekday,min_count,notify,status,last_run_at").eq("ngo_id", org.org_id).order("created_at"),
      db.from("automation_runs").select("id,automation_id,status,delivered,summary,error,attempt,started_at").eq("ngo_id", org.org_id).order("started_at", { ascending: false }).limit(20),
    ]);
    if (a.error) { setMissing(/does not exist|schema cache|PGRST205|42P01/i.test(`${a.error.code} ${a.error.message}`)); setAutos([]); return; }
    setAutos((a.data ?? []) as Auto[]); setRuns((r.data ?? []) as Run[]);
  }, [db, org.org_id]);
  useEffect(() => { void load(); }, [load]);

  /* A sentence Kaju filled in arrives as an address; it opens for a person to turn on. Nothing is turned on here. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const t = byRule(q.get("rule") ?? "");
    if (t && t.state === "ready") setDraft({ t, every: q.get("every") === "week" ? "week" : q.get("every") === "day" ? "day" : t.every, weekday: 1, min: Math.max(1, Math.min(1000, Number(q.get("min")) || t.min)), notify: q.get("notify") === "everyone" ? "everyone" : q.get("notify") === "leads" ? "leads" : t.notify });
  }, []);

  const on = useMemo(() => new Set((autos ?? []).map((a) => a.rule)), [autos]);
  const offer = LIBRARY.filter((t) => t.state === "ready" && t.rule && !SUPERSEDED.has(t.rule) && !on.has(t.rule));
  const name = (id: string) => autos?.find((a) => a.id === id)?.name ?? "Removed rule";

  const turnOn = (d: Draft) => run("rr-save", async () => await db!.rpc("automation_save", { p_template: d.t.id, p_name: d.t.name, p_rule: d.t.rule, p_every: d.every, p_weekday: d.weekday, p_min_count: d.min, p_notify: d.notify }), { ok: `${d.t.name} is on. It first runs with the next daily check, or press Run now.` }).then((r) => { if (r.ok) { setDraft(null); void load(); } });
  const setStatus = (a: Auto, s: "active" | "paused" | "removed") => run(`rr-${a.id}`, async () => await db!.rpc("automation_set_status", { p_id: a.id, p_status: s }), { ok: s === "removed" ? `${a.name} removed.` : s === "paused" ? `${a.name} paused.` : `${a.name} is on again.` }).then(() => { setRemoving(null); void load(); });
  const runNow = (a: Auto) => run(`rr-${a.id}`, async () => {
    const r = await db!.rpc("automation_run", { p_id: a.id, p_now: true });
    const x = (r.data ?? {}) as { status?: string; summary?: string; delivered?: number; error?: string };
    return r.error ? { error: r.error } : x.status === "failed" ? { error: x.error ?? "The run could not finish. It is recorded below." } : { data: x };
  }, { ok: (r) => { const x = ((r as { data?: { status?: string; summary?: string; delivered?: number } }).data ?? {}); return x.status === "succeeded" ? `Ran: ${x.summary}. ${x.delivered ?? 0} ${x.delivered === 1 ? "person" : "people"} told.` : `Ran: ${x.summary || "nothing to tell"}.`; } }).then(() => void load());

  if (missing) return null;
  return (
    <>
      <Section title="Reporting rules" count={(autos?.length ?? 0) + offer.length}>
        <p className="nx-sub" style={{ marginBottom: 10 }}>Checks behind ABC reporting. The server runs them once a day and tells people inside StrayPaw; no record is changed.</p>
        <ul className="nx-autos">
          {(autos ?? []).map((a) => (
            <li key={a.id} className={a.status === "active" ? "is-on" : ""}>
              <div className="nx-autos-h"><b>{a.name}</b><Chip tone={a.status === "active" ? "ok" : "plain"}>{a.status === "active" ? "On" : "Paused"}</Chip></div>
              <p className="nx-t3">{rhythm(a)} · tells {a.notify === "everyone" ? "everyone" : "leads and coordinators"} at {a.min_count} or more · {a.last_run_at ? `last ran ${dayTime(a.last_run_at)}` : "has not run yet"}</p>
              {manager ? <div className="nx-run-act">
                <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void runNow(a)}><Play size={12} />Run now</button>
                <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void setStatus(a, a.status === "active" ? "paused" : "active")}>{a.status === "active" ? <><Pause size={12} />Pause</> : <><Play size={12} />Resume</>}</button>
                <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setRemoving(a)}><Trash2 size={12} />Remove</button>
              </div> : null}
            </li>
          ))}
          {offer.map((t) => (
            <li key={t.id}>
              <div className="nx-autos-h"><b>{t.name}</b></div>
              <p>{t.does}</p>
              <p className="nx-t3">{t.for} · {t.every === "week" ? "Weekly" : "Daily"}</p>
              <div className="nx-run-act">{manager ? <button type="button" className="nx-btn is-sm" disabled={!!busy || autos === null} onClick={() => setDraft({ t, every: t.every, weekday: 1, min: t.min, notify: t.notify })}>Turn on</button> : <span className="nx-t3">A lead or coordinator can turn this on.</span>}</div>
            </li>
          ))}
        </ul>
      </Section>
      {runs.length ? <Section title="Reporting rule runs" count={runs.length}>
        <table className="nx-rtable"><thead><tr><th>When</th><th>Rule</th><th>Result</th><th>Told</th></tr></thead><tbody>{runs.map((r) => <tr key={r.id}><td>{dayTime(r.started_at)}</td><td>{name(r.automation_id)}</td><td><Chip tone={r.status === "succeeded" ? "ok" : r.status === "failed" ? "bad" : "plain"}>{r.status === "succeeded" ? "Told" : r.status === "failed" ? "Failed" : "Nothing found"}</Chip> <span className="nx-t3">{r.status === "failed" ? `${r.error ?? "Could not finish"} (attempt ${r.attempt})` : r.summary}</span></td><td className="num">{r.delivered}</td></tr>)}</tbody></table>
      </Section> : autos && autos.length ? <Section title="Reporting rule runs" count={0}><Empty title="No runs yet" hint="Each run appears here: what it found, who was told, and anything that failed." /></Section> : null}
      {draft ? <Modal title={`Turn on: ${draft.t.name}`} onClose={() => setDraft(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setDraft(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !manager} onClick={() => void turnOn(draft)}>Turn on</button></>}>
        <p>{draft.t.does}</p>
        <Field label="How often"><select value={draft.every} onChange={(e) => setDraft({ ...draft, every: e.target.value as "day" | "week" })}><option value="day">Every day</option><option value="week">Every week</option></select></Field>
        {draft.every === "week" ? <Field label="Which day"><select value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></Field> : null}
        <Field label="Who is told"><select value={draft.notify} onChange={(e) => setDraft({ ...draft, notify: e.target.value as "leads" | "everyone" })}><option value="leads">Leads and coordinators</option><option value="everyone">Everyone in the organisation</option></select></Field>
        <Field label="When at least this many are found"><input type="number" min={1} max={1000} value={draft.min} onChange={(e) => setDraft({ ...draft, min: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} /></Field>
        <p className="nx-t3">People are told inside StrayPaw only. No record is changed and nothing is sent outside.{manager ? "" : " Only a lead or coordinator can turn on rules."}</p>
      </Modal> : null}
      {removing ? <Confirm title={`Remove ${removing.name}?`} confirm="Remove" danger busy={!!busy} onClose={() => setRemoving(null)} onConfirm={() => void setStatus(removing, "removed")}>Its past runs are removed with it.</Confirm> : null}
    </>
  );
}
