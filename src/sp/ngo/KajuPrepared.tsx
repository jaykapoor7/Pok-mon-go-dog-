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
import { CalendarCheck, Check, CircleAlert, MapPin, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { confirmMany, confirmVerified, type Saved as Result } from "@/sp3/ai/execute";
import type { Proposal } from "@/sp3/ai/types";
import type { LocalityGroup, PromisedReview, Stalled } from "@/sp3/ai/prepare";
import { Reading } from "../ui/Reading";

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

  const [all, setAll] = useState(false);
  if (failed) return <p className="kx-note" role="status">Prepared work could not be read. <button type="button" className="ai3-inline" onClick={() => void load()}>Try again</button></p>;
  if (!d) return <p className="kx-note" aria-busy="true"><Reading>Kaju is reading your cases</Reading></p>;

  /* One list, most urgent first: quiet critical cases, promised reviews, then place spellings. */
  type Item = { key: string; tone: string; icon: React.ReactNode; title: React.ReactNode; meta: string; side: React.ReactNode };
  const items: Item[] = [
    ...d.stalled.map((x) => ({ key: `s${x.caseId}`, tone: "flame", icon: <CircleAlert size={11} strokeWidth={2.4} />,
      title: <><Link href={`/ngo/cases/${x.caseId}`}>{x.label}</Link> · no update for {x.quietDays} days</>,
      meta: [x.zone, x.holder ? `with ${x.holder}` : "unassigned"].filter(Boolean).join(" · "),
      side: action(proposalFor((p) => p.caseId === x.caseId && p.why.startsWith("Critical")), "Schedule check") })),
    ...d.reviews.items.map((r) => ({ key: `r${r.eventId}${r.promisedFor}`, tone: r.state === "missed" ? "amber" : "blue", icon: <CalendarCheck size={11} strokeWidth={2.4} />,
      title: <><Link href={`/ngo/animals/${r.dogId}`}>{r.dogLabel}</Link> · review {r.state === "missed" ? `was due ${fmt(r.promisedFor)}` : `due ${fmt(r.promisedFor)}`}</>,
      meta: r.zone ?? "",
      side: action(proposalFor((x) => x.dogId === r.dogId && x.why.includes(r.state === "missed" ? r.promisedFor : r.quote)), "Schedule") })),
    ...(d.localities.length ? [{ key: "loc", tone: "slate", icon: <MapPin size={11} strokeWidth={2.4} />,
      title: <>{d.localities[0].canonical} · spelled {d.localities[0].variants.length} ways</>,
      meta: d.localities.length > 1 ? `${d.localities.length - 1} more places too` : "Place names",
      side: <Link className="kx-link" href="/ngo/quality">Review</Link> }] : []),
  ];
  const shown = all ? items : items.slice(0, 3);
  return (
    <div className="kx-block">
      {items.length === 0 ? <p className="kx-calm"><Check size={14} aria-hidden /> All quiet. No critical case has gone silent and no promised review is missed.</p> : (
        <ul className="kx-list">{shown.map((it) => (
          <li key={it.key}>
            <span className={`br-sq t-${it.tone}`} aria-hidden>{it.icon}</span>
            <span className="kx-t"><span>{it.title}</span>{it.meta && <small>{it.meta}</small>}</span>
            <span className="kx-side">{it.side}</span>
          </li>))}</ul>
      )}
      <div className="kx-foot">
        {items.length > 3 && <button type="button" className="kx-more" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `${items.length - 3} more`}</button>}
        {pending.length > 1 && <button type="button" className="kx-more" onClick={() => void confirmAll()} disabled={batch}>{batch ? "Scheduling…" : `Schedule all ${pending.length}`}</button>}
      </div>
      {(d.unavailable.length > 0 || stopped) && <p className="kx-note" role="status">{stopped ?? `Could not read ${d.unavailable.join(", ")}.`}</p>}
    </div>
  );
}

/** Data quality: Kaju's locality spelling clusters on their own. Candidates
 *  only; correcting them happens at the source, never by automatic merge. */
export function LocalitySpellings() {
  const [g, setG] = useState<LocalityGroup[] | null | "failed">(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
        if (!token) throw Error();
        const r = await fetch("/api/ai/prepared", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.unavailable?.includes("localities")) throw Error();
        if (live) setG(j.localities as LocalityGroup[]);
      } catch { if (live) setG("failed"); }
    })();
    return () => { live = false; };
  }, []);
  if (g === null) return <p className="rq-sp" role="status">Kaju is comparing locality spellings…</p>;
  if (g === "failed") return <p className="rq-sp" role="status">Locality spellings could not be compared just now.</p>;
  if (!g.length) return null;
  return (
    <section className="rq-sp" aria-labelledby="rq-sp-h">
      <h2 id="rq-sp-h"><MapPin size={14} aria-hidden /> One place, several spellings</h2>
      <p>Fix the spelling at its source to merge these.</p>
      <ul>{g.map((x) => <li key={x.canonical}><b>{x.canonical}</b> <small>{x.total} animals · {x.variants.map((v) => `${v.zone} (${v.count})`).join(", ")}</small></li>)}</ul>
    </section>
  );
}
