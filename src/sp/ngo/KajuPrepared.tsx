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
import { CalendarCheck, Check, CircleAlert, MapPin } from "lucide-react";
import { Btn, More, Panel, Row, Rows } from "@/ws/kit";
import { getSupabase } from "@/lib/supabase";
import { confirmMany, confirmVerified, type Saved as Result } from "@/sp3/ai/execute";
import type { Proposal } from "@/sp3/ai/types";
import type { LocalityGroup, PromisedReview, Stalled } from "@/sp3/ai/prepare";
import { Reading } from "../ui/Reading";
import "./cases.k.css";

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
    if (s?.state === "done") return <span className="kc-ok" role="status"><Check size={13} aria-hidden />Scheduled · verified{s.href && <> · <Link href={s.href}>open</Link></>}</span>;
    return <>
      {s?.state === "failed" && <small className="kc-err" role="alert">{s.error}</small>}
      <Btn small disabled={s?.state === "saving" || batch} onClick={() => void confirm(p)}>{s?.state === "saving" ? "Saving…" : verb}</Btn>
    </>;
  };

  if (failed) return <p className="kc-quiet" role="status">Prepared work could not be read. <button type="button" className="kc-link" onClick={() => void load()}>Try again</button></p>;
  if (!d) return <p className="kc-quiet" aria-busy="true"><Reading>Kaju is reading your cases</Reading></p>;

  /* One list, most urgent first: quiet critical cases, promised reviews, then place spellings. */
  type Item = { key: string; tone: "flame" | "amber" | "blue" | "plain"; icon: React.ReactNode; title: React.ReactNode; meta: string; side: React.ReactNode };
  const items: Item[] = [
    ...d.stalled.map((x) => ({ key: `s${x.caseId}`, tone: "flame" as const, icon: <CircleAlert size={12} />,
      title: <><Link className="kc-link" href={`/ngo/cases/${x.caseId}`}>{x.label}</Link> · no update for {x.quietDays} days</>,
      meta: [x.zone, x.holder ? `with ${x.holder}` : "unassigned"].filter(Boolean).join(" · "),
      side: action(proposalFor((p) => p.caseId === x.caseId && p.why.startsWith("Critical")), "Schedule check") })),
    ...d.reviews.items.map((r) => ({ key: `r${r.eventId}${r.promisedFor}`, tone: r.state === "missed" ? "amber" as const : "blue" as const, icon: <CalendarCheck size={12} />,
      title: <><Link className="kc-link" href={`/ngo/animals/${r.dogId}`}>{r.dogLabel}</Link> · review {r.state === "missed" ? `was due ${fmt(r.promisedFor)}` : `due ${fmt(r.promisedFor)}`}</>,
      meta: r.zone ?? "",
      side: action(proposalFor((x) => x.dogId === r.dogId && x.why.includes(r.state === "missed" ? r.promisedFor : r.quote)), "Schedule") })),
    ...(d.localities.length ? [{ key: "loc", tone: "plain" as const, icon: <MapPin size={12} />,
      title: <>{d.localities[0].canonical} · spelled {d.localities[0].variants.length} ways</>,
      meta: d.localities.length > 1 ? `${d.localities.length - 1} more places too` : "Place names",
      side: <Link className="kc-link" href="/ngo/quality">Review</Link> }] : []),
  ];
  return (
    <>
      <Panel>
        {items.length === 0 ? <p className="kc-quiet is-pad"><Check size={14} aria-hidden /> All quiet. No critical case has gone silent and no promised review is missed.</p> : (
          <More items={items} cap={3}>{(shown) => <Rows label="Prepared by Kaju">{shown.map((it) => <Row key={it.key} tone={it.tone} icon={it.icon} title={it.title} meta={it.meta || undefined} end={it.side} />)}</Rows>}</More>
        )}
      </Panel>
      {pending.length > 1 && <p className="kc-acts hm2-all"><Btn small disabled={batch} onClick={() => void confirmAll()}>{batch ? "Scheduling…" : `Schedule all ${pending.length}`}</Btn></p>}
      {(d.unavailable.length > 0 || stopped) && <p className="kc-quiet" role="status">{stopped ?? `Could not read ${d.unavailable.join(", ")}.`}</p>}
    </>
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
