"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Home · "Kaju prepared".

   Work Kaju found and got ready before anyone went looking: critical
   cases that went quiet, reviews promised in care notes but never
   scheduled, and one place typed several ways. Follow-ups are prepared,
   not saved: one tap confirms one, or every prepared follow-up at once.
   Each runs through the same audited confirm path as any Kaju action and
   is read back independently before it shows "Scheduled".
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, Check, CircleAlert, MapPin, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { confirmMany, confirmVerified, type Saved as Result } from "@/sp3/ai/execute";
import type { Proposal } from "@/sp3/ai/types";
import type { LocalityGroup, PromisedReview, Stalled } from "@/sp3/ai/prepare";

type Prepared = {
  checkedAt: string; unavailable: string[]; partial: string[];
  stalled: Stalled[];
  reviews: { missed: number; upcoming: number; items: PromisedReview[] };
  localities: LocalityGroup[];
  proposals: Extract<Proposal, { kind: "schedule_followup" }>[];
  done: string[];
  rules: Record<"stalled" | "reviews" | "localities", string>;
};
type Status = { state: "saving" } | { state: "done"; href?: string } | { state: "failed"; error: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function KajuPrepared({ actor }: { actor: { id: string; name: string } }) {
  const [d, setD] = useState<Prepared | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [batch, setBatch] = useState(false);

  const load = useCallback(async () => {
    setFailed(null);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) throw Error("Sign in again to see prepared work.");
      const r = await fetch("/api/ai/prepared", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(j.error ?? "Prepared work could not be read.");
      setD(j as Prepared);
      setStatus(Object.fromEntries((j as Prepared).done.map((id) => [id, { state: "done" } as Status])));
    } catch (e) { setFailed(e instanceof Error ? e.message : "Prepared work could not be read."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const [stopped, setStopped] = useState<string | null>(null);
  const record = (p: Proposal, r: Result) => setStatus((s) => ({ ...s, [p.id]: r.ok && r.verified ? { state: "done", href: r.href } : { state: "failed", error: r.ok ? "Saved, but not yet verified. Tap again to check." : r.error ?? "Not saved." } }));
  const confirm = async (p: Proposal) => { setStatus((s) => ({ ...s, [p.id]: { state: "saving" } })); record(p, await confirmVerified(p, actor)); };
  const pending = d ? d.proposals.filter((p) => status[p.id]?.state !== "done") : [];
  const confirmAll = async () => {
    setBatch(true); setStopped(null);
    const r = await confirmMany(pending, actor, (p, res) => record(p, res), async (p, a) => { setStatus((s) => ({ ...s, [p.id]: { state: "saving" } })); return confirmVerified(p, a); });
    if (r.stopped) setStopped(`${r.done} scheduled. Stopped: ${r.stopped} The rest are still prepared.`);
    setBatch(false);
  };

  const proposalFor = (why: (p: Prepared["proposals"][number]) => boolean) => d?.proposals.find(why);
  const action = (p: Proposal | undefined, verb: string) => {
    if (!p) return null;
    const s = status[p.id];
    if (s?.state === "done") return <span className="kp-done" role="status"><Check size={13} aria-hidden />Scheduled · verified{s.href && <> · <Link href={s.href}>open</Link></>}</span>;
    return <>
      <button type="button" className="kp-act" disabled={s?.state === "saving" || batch} onClick={() => void confirm(p)}>{s?.state === "saving" ? "Saving…" : verb}</button>
      {s?.state === "failed" && <small className="kp-err" role="alert">{s.error}</small>}
    </>;
  };

  if (failed) return <section className="br-sec kp" aria-labelledby="kp-h"><h2 id="kp-h" className="br-h">Kaju prepared</h2><p className="br-empty" role="status">{failed} Nothing has changed. <button type="button" className="ai3-inline" onClick={() => void load()}>Try again</button></p></section>;
  if (!d) return <section className="br-sec kp" aria-labelledby="kp-h" aria-busy="true"><h2 id="kp-h" className="br-h">Kaju prepared</h2><p className="br-empty">Kaju is reading cases, care notes and localities…</p></section>;

  const nothing = !d.stalled.length && !d.reviews.items.length && !d.localities.length;
  return (
    <section className="br-sec kp" aria-labelledby="kp-h">
      <h2 id="kp-h" className="br-h"><Sparkles size={14} aria-hidden /> Kaju prepared</h2>
      {d.unavailable.length > 0 && <p className="br-empty" role="status">Could not read: {d.unavailable.join(", ")}. Those checks are unknown, not clear.</p>}
      {d.partial.length > 0 && <p className="br-empty" role="status">Checked only part of: {d.partial.join(", ")}. More may exist.</p>}
      {nothing && !d.unavailable.length && <p className="br-empty">No quiet critical cases, unscheduled reviews or split localities found.</p>}

      {d.stalled.length > 0 && <ul className="br-list kp-list">{d.stalled.map((s) => (
        <li key={s.caseId}><div className="kp-row">
          <span className="br-sq t-flame" aria-hidden><CircleAlert size={10} strokeWidth={2.4} /></span>
          <span className="br-t"><span><Link href={`/ngo/cases/${s.caseId}`}><b>{s.label}</b></Link> is critical and has had no update for {s.quietDays} days</span>
            <small>{[s.zone, s.holder ? `held by ${s.holder}` : "no one holds it", `last recorded ${fmt(s.lastActivity)}`].filter(Boolean).join(" · ")}</small></span>
          <span className="kp-side">{action(proposalFor((p) => p.caseId === s.caseId && p.why.startsWith("Critical")), "Schedule a check tomorrow")}</span>
        </div></li>))}</ul>}

      {d.reviews.items.length > 0 && <>
        <p className="kp-lede"><CalendarClock size={13} aria-hidden /> <b>{d.reviews.missed}</b> review{d.reviews.missed === 1 ? "" : "s"} promised in care notes passed with nothing recorded{d.reviews.upcoming ? <>; <b>{d.reviews.upcoming}</b> coming up are not scheduled</> : null}.</p>
        <ul className="br-list kp-list">{d.reviews.items.slice(0, 6).map((r) => {
          const p = proposalFor((x) => x.dogId === r.dogId && x.why.includes(r.state === "missed" ? r.promisedFor : r.quote));
          return <li key={`${r.eventId}${r.promisedFor}`}><div className="kp-row">
            <span className={`br-sq ${r.state === "missed" ? "t-amber" : "t-blue"}`} aria-hidden><CalendarCheck size={10} strokeWidth={2.4} /></span>
            <span className="br-t"><span><Link href={`/ngo/animals/${r.dogId}`}><b>{r.dogLabel}</b></Link>: “{r.quote}”</span>
              <small>{[r.zone, r.state === "missed" ? `was due ${fmt(r.promisedFor)}` : `due ${fmt(r.promisedFor)}`, r.caseId ? null : "no case linked, so it cannot be scheduled here"].filter(Boolean).join(" · ")}</small></span>
            <span className="kp-side">{action(p, r.state === "missed" ? "Schedule for tomorrow" : "Schedule it")}</span>
          </div></li>;
        })}</ul>
      </>}

      {d.localities.length > 0 && <>
        <p className="kp-lede"><MapPin size={13} aria-hidden /> One place, several spellings. Ward and locality counts are split until these are made consistent at the source.</p>
        <ul className="kp-places">{d.localities.slice(0, 4).map((g) => (
          <li key={g.canonical}><b>{g.canonical}</b> <small>{g.total} animals across {g.variants.length} spellings: {g.variants.slice(0, 5).map((v) => `${v.zone} (${v.count})`).join(", ")}{g.variants.length > 5 ? `, and ${g.variants.length - 5} more` : ""}</small></li>
        ))}</ul>
      </>}

      <div className="br-chips">
        {pending.length > 1 && <button type="button" onClick={() => void confirmAll()} disabled={batch}><Check size={12} aria-hidden />{batch ? "Scheduling…" : `Schedule all ${pending.length} prepared follow-ups`}</button>}
        {d.localities.length > 0 && <Link href="/ngo/quality">Open data quality</Link>}
      </div>
      {stopped && <p className="kp-err" role="alert" style={{ textAlign: "left", maxWidth: "none" }}>{stopped}</p>}
      <details className="kp-how"><summary>How Kaju found these</summary><ul>{Object.values(d.rules).map((r) => <li key={r}>{r}</li>)}</ul><p>Checked {new Date(d.checkedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Each follow-up is saved under your name with an audit entry, then read back before it shows as scheduled. Nothing is closed, merged or renamed automatically.</p></details>
    </section>
  );
}
