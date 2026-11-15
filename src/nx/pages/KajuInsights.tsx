"use client";

import { appHref } from "../kaju/state";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Info, RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { FINDINGS, WORKLOAD, type Finding } from "../fixtures";
import { useCases, useLive } from "../live";

/* Kaju's insights: the fixed checks Kaju runs over the organisation's own records (kaju_refresh_checks), each with
   its method written out, and how open cases are spread across people. No model writes these, no health record is
   read, and nothing here changes a record. */

const LABEL: Record<string, string> = {
  overdue_followup: "Follow-ups past their date",
  missing_evidence: "ABC records missing evidence",
  awaiting_vet: "Procedures waiting for a vet's sign-off",
  open_clarification: "Questions from the reviewing office",
  programme_activity: "Programmes with no recent records",
  reporting_deadline: "Reporting deadline",
};
const short = (s: string) => (/^[A-Z]{2,4}-[0-9A-F]{16,}$/.test(s) ? `${s.slice(0, s.indexOf("-") + 1)}…${s.slice(-6)}` : s);
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };

export function KajuInsights() {
  const live = useLive();
  const ngo = live.orgFor("ngo");
  const ngoId = live.org ? ngo?.org_id ?? null : null;
  const [run, setRun] = useState<{ id: string; at: string; findings: Finding[] } | null | undefined>(undefined);
  const [seenBy, setSeenBy] = useState<{ user_id: string; name: string; role: string; seen_at: string | null }[] | null>(null);
  const lead = !!ngo && ["admin", "coordinator", "lead"].includes(ngo.role);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cases = useCases(ngoId);
  const read = useCallback(async () => {
    const db = getSupabase(); if (!db || !ngoId) return;
    const { data, error } = await db.from("kaju_check_runs").select("id,checked_at,findings").eq("ngo_id", ngoId).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    if (error) { setMsg("The latest checks could not be read."); setRun(null); return; }
    setRun(data ? { id: data.id as string, at: data.checked_at as string, findings: (data.findings ?? []) as Finding[] } : null);
  }, [ngoId]);
  useEffect(() => { void read(); }, [read]);
  /* Opening the checks records that this person has seen the latest run; leads see who has. */
  useEffect(() => {
    const db = getSupabase(); if (!db || !run) return;
    let alive = true;
    void (async () => {
      await db.rpc("kaju_mark_check_seen", { p_run: run.id });
      if (!lead) return;
      const r = await db.rpc("kaju_check_delivery", { p_run: run.id });
      if (alive && !r.error) setSeenBy((r.data ?? []) as { user_id: string; name: string; role: string; seen_at: string | null }[]);
    })();
    return () => { alive = false; };
  }, [run, lead]);
  const workload = useMemo<[string, number][]>(() => {
    const open = (cases.rows ?? []).filter((c) => !c.resolved_at && !/imported_historical/.test(c.provenance ?? ""));
    const m = new Map<string, number>(); for (const c of open) { const k = c.assignee_name ?? "Unassigned"; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m].sort((a, b) => (a[0] === "Unassigned" ? 1 : b[0] === "Unassigned" ? -1 : b[1] - a[1]));
  }, [cases.rows]);

  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", "Insights"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && !ngo) return <Shell ws="kaju" crumb={["Kaju", "Insights"]}><div className="nx-page"><h1 className="nx-h1">Insights</h1><p className="nx-sub">Kaju&apos;s checks run on an NGO&apos;s records. Your account is not part of an NGO, so there are none here.</p></div></Shell>;
  const findings = sample ? FINDINGS : run?.findings ?? [];
  const load = sample ? WORKLOAD : workload;
  const openTotal = load.reduce((a, [, n]) => a + n, 0);
  const max = Math.max(1, ...load.map(([, n]) => n));
  const runNow = async () => {
    if (sample) { setMsg("Sample data: sign in to run the checks on your organisation's records."); return; }
    const db = getSupabase(); if (!db) return;
    setBusy(true); setMsg(null);
    const { error } = await db.rpc("kaju_refresh_checks");
    setBusy(false);
    if (error) { setMsg(/limited/i.test(error.message) ? "The checks ran several times recently. Try again in a few minutes." : "The checks could not run. Nothing was changed."); return; }
    await read(); setMsg("Checked just now.");
  };
  const waiting = findings.filter((f) => f.count > 0);
  return (
    <Shell ws="kaju" crumb={["Kaju", "Insights"]}>
      <div className="nx-page" style={{ maxWidth: 1000 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? "Kind Hour" : ngo!.name}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Insights</h1>
          <p className="nx-sub">{run === undefined && !sample ? "Reading Kaju's checks…" : sample || run ? <><b className="num">{waiting.length}</b> of {findings.length} checks found something{sample ? "" : <>, last run {ago(run!.at)}</>}. Each check says exactly what it counts.</> : "Kaju's checks have not run for this organisation yet."}</p></div>
          <button type="button" className="nx-btn is-keep" onClick={runNow} disabled={busy}><RefreshCw size={14} className={busy ? "nx-spin" : undefined} />{busy ? "Checking…" : "Run the checks now"}</button>
        </div>
        {msg ? <p className="nx-foot" role="status">{msg}</p> : null}
        <section className="nx-sec" aria-labelledby="ki-c" style={{ marginTop: 22 }}>
          <div className="nx-sec-h"><h2 id="ki-c">Checks</h2></div>
          <div className="nx-checks">
            {findings.map((f) => (
              <article key={f.rule} className={`nx-chk ${f.count ? "is-on" : ""}`}>
                <div className="nx-chk-h"><b className="num">{f.rule === "reporting_deadline" && !f.configured ? "—" : f.count}</b><span>{LABEL[f.rule] ?? f.rule.replace(/_/g, " ")}</span>{f.rule === "reporting_deadline" && !f.configured ? <Chip>Not set</Chip> : f.count ? <Chip tone="warn">Needs a look</Chip> : <Chip tone="ok">Clear</Chip>}</div>
                <p className="nx-chk-m"><Info size={12} />{f.rule === "reporting_deadline" && !f.configured ? "No reporting deadline has been set by the organisation lead, so none is assumed." : f.explanation}</p>
                {f.records.length ? <ul className="nx-chk-r">{f.records.slice(0, 5).map((r, i) => <li key={`${r.label}-${i}`}>{r.href ? <Link href={appHref(r.href)}>{short(r.label)}<ArrowRight size={11} /></Link> : <span>{short(r.label)}</span>}</li>)}{f.count > 5 ? <li className="nx-t3">and {f.count - 5} more</li> : null}</ul> : null}
              </article>
            ))}
          </div>
          {!findings.length && run !== undefined && !sample ? <p className="nx-sub">Run the checks to see what needs a look.</p> : null}
          {lead && seenBy && seenBy.length ? <p className="nx-foot">Seen by {seenBy.filter((d) => d.seen_at).length} of {seenBy.length}{seenBy.some((d) => !d.seen_at) ? <>: not yet {seenBy.filter((d) => !d.seen_at).slice(0, 6).map((d) => d.name).join(", ")}{seenBy.filter((d) => !d.seen_at).length > 6 ? " and others" : ""}</> : null}.</p> : null}
        </section>
        <section className="nx-sec" aria-labelledby="ki-w" style={{ marginTop: 30 }}>
          <div className="nx-sec-h"><h2 id="ki-w">Open cases per person</h2><span className="nx-count">{openTotal}</span></div>
          <div className="nx-bars" style={{ maxWidth: 640 }}>{load.map(([who, n]) => <div key={who} className="nx-barrow" style={{ gridTemplateColumns: "130px minmax(0, 1fr) 40px" }}><span className="nx-t2">{who}</span><span className="nx-bar-t"><span className={who === "Unassigned" ? "is-low" : ""} style={{ width: `${(n / max) * 100}%` }} /></span><em>{n}</em></div>)}</div>
          <p className="nx-foot">{sample ? "Sample figures." : `Open cases on ${ngo!.name}'s register, imported historical records left out${(cases.rows?.length ?? 0) >= 300 ? "; the 300 most recent cases were read" : ""}.`} A long bar is workload, not performance.</p>
        </section>
        <p className="nx-note" style={{ marginTop: 22, maxWidth: 700 }}><Info size={13} /><span>These checks are fixed rules over your organisation&apos;s own records. Kaju does not read health records, does not guess causes, and does not change anything from this page.</span></p>
      </div>
    </Shell>
  );
}
