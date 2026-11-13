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
import { ChevronRight, FileClock, ListChecks } from "lucide-react";
import type { PartnerRecordRow } from "@/lib/partner-record-explorer";
import { Btn, Empty, Head, More, Page, Panel, Row, Rows, Section, Split, Tag } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../../shell/Shell";
import { LocalitySpellings } from "../KajuPrepared";
import { day, n } from "../../ui";
import { SkelRows } from "../../abc/Pager";
import { NgoGate } from "../Gate";
import { ANIMAL_LIMIT, readQuality, type QualityInput } from "./read";
import "../ngo.css";
import "./Quality.k.css";
import { friendlyError } from "@/lib/friendly-error";

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
    { title: "Animals missing StrayPaw ID", detail: "These animals do not have a permanent StrayPaw ID yet. Search across registers and exports may miss them until they do.", href: "/ngo/animals", items: animals.filter((a) => !a.straypaw_id?.trim()).map(animalItem) },
    { title: "Animals missing source ID", detail: "The profile exists, but cannot be matched back to an NGO spreadsheet, clinic register or tag.", href: "/ngo/animals", items: animals.filter((a) => !a.code?.trim()).map(animalItem) },
    { title: "Animals missing locality", detail: "Cannot support ward or locality reporting, cluster analysis or repeat-hotspot work.", href: "/ngo/animals", items: animals.filter((a) => !a.zone?.trim()).map(animalItem) },
    { title: "Suspicious record dates", detail: "Unparseable, future or extreme outlier dates distort yearly figures and map activity. Check the source before changing it.", href: "/ngo", items: records.filter((r) => { const t = Date.parse(r.date); return !Number.isFinite(t) || t > now + 30 * DAY || Math.abs(t - median) > 5 * 365 * DAY; }).map(recordItem) },
    { title: "Open for 30+ days", detail: "Rescue records still open long after the recorded intake date.", href: "/ngo", items: records.filter((r) => r.kind === "rescue" && !closed(r) && now - (Date.parse(r.date) || now) > 30 * DAY).map(recordItem) },
    { title: "Completed without structured outcome", detail: "Closed cases whose result is not recorded as an outcome.", href: "/ngo/review", items: records.filter((r) => r.kind === "rescue" && closed(r) && r.caseId && !outcomeByCase.has(r.caseId)).map(recordItem) },
    { title: "Care recorded after last follow-up", detail: "Animals with medical care but no later review or follow-up entry.", href: "/ngo/work?focus=followup", items: animals.filter((a) => { const c = latestCare.get(a.id) || 0; return c > 0 && (latestFollow.get(a.id) || 0) < c; }).map(animalItem) },
  ];
}

const SHOW = 50;

export function Quality() {
  const mem = useMembership();
  const [d, setD] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; input: QualityInput }>({ state: "loading" });
  const [open, setOpen] = usePageState<string | null>("queue", null);
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
      <Page>
        <Head title="Animals" sum={d.state === "loading" ? "Reading your records…" : d.state === "failed" ? "Didn’t load. No queue is shown as zero." : total === 0 ? "Nothing to review in the records read." : <><b>{n(total)}</b> record{total === 1 ? "" : "s"} to review{d.state === "read" && d.input.partial ? <>, from the {n(checked)} most recent animals</> : null}. The original source stays as it is.</>} />
        <Split side={<>
          {/* One place for record quality: the related review screens and Kaju's spelling check. */}
          <Section title="Also to review">
            <Panel><Rows>
              <Row href="/ngo/review?cohort=history" icon={<FileClock size={14} />} title="Imported records" meta="Statuses from your registers, not yet confirmed" />
              <Row href="/ngo/review" icon={<ListChecks size={14} />} title="Cases needing a decision" meta="Open for months with nothing recorded" />
            </Rows></Panel>
          </Section>
          <div className="rq2-sp"><LocalitySpellings /></div>
        </>}>
          {d.state === "loading" && <Panel><SkelRows n={7} label="Reading records" /></Panel>}
          {d.state === "failed" && <Panel><div role="alert"><Empty title="Didn't load" action={<Btn onClick={load}>Try again</Btn>}>The review queues could not be read. {friendlyError(d.error)} No queue is shown as zero.</Empty></div></Panel>}
          {d.state === "read" && t && qs && (
            t.animals === 0 && t.cases === 0 ? (
              <Panel><Empty title="Nothing to check yet" action={<Btn variant="primary" href="/ngo/import">Import your workbook</Btn>}>Nothing to review yet.</Empty></Panel>
            ) : (
              <>
                <Panel><ul className="k-rows" aria-label="Review queues">
                  {[...qs].sort((a, b) => Number(b.items.length > 0) - Number(a.items.length > 0)).map((q) => {
                    const id = `rc-q-${q.title.replace(/\W+/g, "-").toLowerCase()}`;
                    const on = open === q.title && q.items.length > 0;
                    const inner = <><ChevronRight size={14} aria-hidden className={`rq2-chev${on ? " is-on" : ""}${q.items.length ? "" : " is-none"}`} /><span className="k-row-t"><b>{q.title}</b><small title={q.detail}>{q.detail}</small></span><span className="k-row-e">{q.items.length ? <Tag tone="amber">{n(q.items.length)}</Tag> : <span className="kx-none">0</span>}</span></>;
                    return (
                      <li key={q.title}>
                        {q.items.length ? <button type="button" className="k-row" aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? null : q.title)}>{inner}</button> : <div className="k-row">{inner}</div>}
                        {on && (
                          <div id={id} className="rq2-list">
                            <More items={q.items.slice(0, SHOW)} cap={8} noun="shown here">{(shown) => <ul className="k-rows">{shown.map((it) => (
                              <li key={it.key}>{it.href ? <Link href={it.href} className="k-row"><span className="k-row-t"><b>{it.label}</b><small>{it.sub}</small></span><ChevronRight size={14} aria-hidden className="k-row-go" /></Link> : <div className="k-row"><span className="k-row-t"><b>{it.label}</b><small>{it.sub}</small></span></div>}</li>
                            ))}</ul>}</More>
                            <p className="kx-quiet is-pad">{q.items.length > SHOW ? <>and {n(q.items.length - SHOW)} more. </> : null}<Link href={q.href}>Open the {q.href.startsWith("/ngo/animals") ? "register" : "records"}</Link>{q.items.length > SHOW ? " to see them all." : null}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul></Panel>
                <p className="kx-quiet is-top">Checks the {n(ANIMAL_LIMIT)} most recently seen animals. Nothing here edits a record.</p>
              </>
            )
          )}
        </Split>
      </Page>
    </NgoGate>
  );
}
