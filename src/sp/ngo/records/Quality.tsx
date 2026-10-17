"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Data quality (1.0 /partner/quality).

   Fixable review queues, not scores. Each queue lists the records likely
   to weaken matching, analysis or reporting, with why, and opens them.
   The rules are the 1.0 rules unchanged; the source records stay intact.
   Read only. A failed or partial read says "Not read", never zero.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PartnerRecordRow } from "@/lib/partner-record-explorer";
import { useMembership } from "../../shell/Shell";
import { Method, State, day, n } from "../../ui";
import { NgoGate } from "../Gate";
import { ANIMAL_LIMIT, readQuality, type QualityInput } from "./read";
import "../ngo.css";
import "./records.css";

const DAY = 86_400_000;
type Animal = QualityInput["animals"][number];
type Item = { key: string; label: string; sub: string; href: string | null };
type Queue = { title: string; detail: string; href: string; items: Item[] };

const animalItem = (a: Animal): Item => ({ key: a.id, label: a.name || a.straypaw_id || a.code || "Unnamed animal", sub: [a.straypaw_id ?? "No StrayPaw ID", a.code ?? "no source ID", a.zone || "no locality"].join(" · "), href: `/ngo/animals/${a.id}` });
const recordItem = (r: PartnerRecordRow): Item => ({ key: r.id, label: r.title, sub: [r.date ? (Number.isFinite(Date.parse(r.date)) ? day(r.date) : `date "${r.date}"`) : "no date", r.animalLabel, r.locality, r.status].filter(Boolean).join(" · "), href: r.caseId ? `/ngo/cases/${r.caseId}` : r.animalId ? `/ngo/animals/${r.animalId}` : null });

/* The 1.0 rules, verbatim. */
function queues({ animals, records }: QualityInput): Queue[] {
  const now = Date.now();
  const outcomeByCase = new Set(records.filter((r) => r.kind === "outcome" && r.caseId).map((r) => r.caseId!));
  const latestCare = new Map<string, number>(), latestFollow = new Map<string, number>();
  const parsed = records.map((r) => Date.parse(r.date)).filter(Number.isFinite).sort((a, b) => a - b);
  const median = parsed.length ? parsed[Math.floor(parsed.length / 2)] : now;
  for (const r of records) {
    if (!r.animalId) continue;
    const t = Date.parse(r.date) || 0;
    if (r.kind === "care") latestCare.set(r.animalId, Math.max(latestCare.get(r.animalId) || 0, t));
    if (r.kind === "follow_up") latestFollow.set(r.animalId, Math.max(latestFollow.get(r.animalId) || 0, t));
  }
  const closed = (r: PartnerRecordRow) => /resolved|closed/i.test(r.status || "");
  return [
    { title: "Animals missing StrayPaw ID", detail: "Permanent identity is missing. Run the rollout migration before relying on cross-register search or exports.", href: "/ngo/animals", items: animals.filter((a) => !a.straypaw_id?.trim()).map(animalItem) },
    { title: "Animals missing source ID", detail: "The profile exists, but cannot be matched back to an NGO spreadsheet, clinic register or tag.", href: "/ngo/animals", items: animals.filter((a) => !a.code?.trim()).map(animalItem) },
    { title: "Animals missing locality", detail: "Cannot support ward or locality reporting, cluster analysis or repeat-hotspot work.", href: "/ngo/animals", items: animals.filter((a) => !a.zone?.trim()).map(animalItem) },
    { title: "Suspicious record dates", detail: "Unparseable, future or extreme outlier dates distort yearly figures and map activity. Check the source before changing it.", href: "/ngo", items: records.filter((r) => { const t = Date.parse(r.date); return !Number.isFinite(t) || t > now + 30 * DAY || Math.abs(t - median) > 5 * 365 * DAY; }).map(recordItem) },
    { title: "Open for 30+ days", detail: "Rescue records still open long after the recorded intake date.", href: "/ngo", items: records.filter((r) => r.kind === "rescue" && !closed(r) && now - (Date.parse(r.date) || now) > 30 * DAY).map(recordItem) },
    { title: "Completed without structured outcome", detail: "Closed cases whose result is not recorded as an outcome.", href: "/ngo/review", items: records.filter((r) => r.kind === "rescue" && closed(r) && r.caseId && !outcomeByCase.has(r.caseId)).map(recordItem) },
    { title: "Care recorded after last follow-up", detail: "Animals with medical care but no later review or follow-up entry.", href: "/ngo?focus=followup", items: animals.filter((a) => { const c = latestCare.get(a.id) || 0; return c > 0 && (latestFollow.get(a.id) || 0) < c; }).map(animalItem) },
  ];
}

const SHOW = 50;

export function Quality() {
  const mem = useMembership();
  const [d, setD] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; input: QualityInput }>({ state: "loading" });
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => {
    setD({ state: "loading" });
    readQuality().then((input) => setD({ state: "read", input })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(() => { if (mem.member) load(); }, [mem.member, load]);
  const qs = useMemo(() => (d.state === "read" ? queues(d.input) : null), [d]);
  const total = qs?.reduce((s, q) => s + q.items.length, 0) ?? null;
  const t = d.state === "read" ? d.input.totals : null;
  const checked = d.state === "read" ? d.input.animals.length : 0;

  return (
    <NgoGate title="Data quality" lede="Review queues for records that weaken matching, analysis or reporting.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · records</p><h1 className="serif">What needs cleaning</h1></div>
          <p className="ngo-sum">{d.state === "loading" ? "Reading your records…" : d.state === "failed" ? "Not read. No queue is shown as zero." : total === 0 ? "Nothing to review in the records read." : <><b>{n(total)}</b> record{total === 1 ? "" : "s"} to review. Queues, not scores: the original source stays intact.</>}</p>
        </header>
        <div className="rc-body">
          {d.state === "loading" && <div className="rc-skel" aria-label="Reading records"><span className="skel" /><span className="skel" /><span className="skel" /></div>}
          {d.state === "failed" && <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={load}>Try again</button>}>The review queues could not be read ({d.error}). No queue is shown as zero.</State>}
          {d.state === "read" && t && qs && (
            <div className="rc-stack">
              <Method items={[["Animals checked", checked < t.animals ? `${n(checked)} most recently seen of ${n(t.animals)}` : `all ${n(t.animals)}`], ["Records", `${n(t.cases)} cases, ${n(t.care)} care, ${n(t.followups)} follow-ups, ${n(t.outcomes)} outcomes`], ["Rules", "as in 1.0"]]} />
              {t.animals === 0 && t.cases === 0 ? (
                <State art="ngo-empty" title="Nothing to check yet" action={<Link className="btn is-ink" href="/ngo/import">Import your workbook</Link>}>Queues fill once your organisation has animals or cases. Import an existing register, or record work from the queue.</State>
              ) : (
                <ol className="rc-queues">
                  {qs.map((q) => {
                    const id = `rc-q-${q.title.replace(/\W+/g, "-").toLowerCase()}`;
                    const on = open === q.title;
                    return (
                      <li key={q.title} className={q.items.length ? "" : "is-clear"}>
                        <div className="rc-q-row">
                          <span className="rc-q-n serif" aria-hidden>{n(q.items.length)}</span>
                          <span className="rc-q-main"><b>{q.title}<span className="sr">: {q.items.length}</span></b><small>{q.detail}</small></span>
                          <span className="rc-q-act">
                            {q.items.length > 0 && <button type="button" className="btn is-s" aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? null : q.title)}>{on ? "Hide" : "Show"}</button>}
                            <Link className="btn is-ghost is-s" href={q.href}>{q.href.startsWith("/ngo/animals") ? "Register" : "Records"}</Link>
                          </span>
                        </div>
                        {on && (
                          <ul id={id} className="rc-q-list">
                            {q.items.slice(0, SHOW).map((it) => (
                              <li key={it.key}>
                                {it.href ? <Link href={it.href}><b>{it.label}</b><small className="mono">{it.sub}</small></Link> : <span><b>{it.label}</b><small className="mono">{it.sub}</small></span>}
                              </li>
                            ))}
                            {q.items.length > SHOW && <li className="small">and {n(q.items.length - SHOW)} more. Open the {q.href.startsWith("/ngo/animals") ? "register" : "records explorer"} to see them all.</li>}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className="small">Animal queues cover the {n(ANIMAL_LIMIT)} most recently seen animals, as before. Fix a record at its source; nothing here edits or merges.</p>
            </div>
          )}
        </div>
      </div>
    </NgoGate>
  );
}
