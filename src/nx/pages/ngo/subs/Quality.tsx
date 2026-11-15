"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { ANIMAL_LIMIT, qualityQueues, readQuality, type QualityQueue } from "../../../data/ngo-submissions";
import { Failed, Skeleton, errText } from "../../../kit";
import { Chip } from "../../../ui";
import { Tools, type Who } from "../frame";
import { S_QUALITY } from "../sample";

/* Record quality: review queues for records likely to weaken matching, analysis or reporting, with why, each opening
   the record. The classic rules, unchanged. Read only: nothing here edits a record. */

const SHOW = 50;
export function QualityTab({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead(() => read(() => readQuality(ngoId!)), `ns:quality:${ngoId}`, !!ngoId && !who.sample);
  const queues: QualityQueue[] | null = useMemo(() => (who.sample ? S_QUALITY : r.data ? qualityQueues(r.data.animals, r.data.records) : null), [who.sample, r.data]);
  const [open, setOpen] = useState<string | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={7} label="Reading records" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} No queue is shown as zero.`} retry={r.reload} />;
  const qs = queues!;
  const total = qs.reduce((s, q) => s + q.items.length, 0);
  const empty = !who.sample && r.data && r.data.total === 0 && r.data.records.length === 0;
  return (
    <>
      <Tools><span className="ns-sum">{empty ? "Nothing to check yet." : total === 0 ? "Nothing to review in the records read." : <><b>{total}</b> {total === 1 ? "record" : "records"} to review{r.data?.partial ? `, from the ${r.data.animals.length} most recent animals` : ""}. The original source stays as it is.</>}</span></Tools>
      {empty ? <div className="nx-empty"><b>Nothing to check yet</b><p>Import your register and its records appear in these queues.</p><div className="nx-empty-a"><Link className="nx-btn" href="/ngo/import">Import your register</Link></div></div> : (
        <ul className="ns-conn" aria-label="Review queues">
          {[...qs].sort((a, b) => Number(b.items.length > 0) - Number(a.items.length > 0)).map((q) => {
            const on = open === q.title && q.items.length > 0;
            const id = `nsq-${q.title.replace(/\W+/g, "-").toLowerCase()}`;
            const head = <><ChevronRight size={14} style={{ color: "var(--ink-3)", transform: on ? "rotate(90deg)" : undefined, transition: "transform .14s", opacity: q.items.length ? 1 : 0 }} aria-hidden /><span className="ns-conn-t"><b>{q.title}</b><small>{q.detail}</small></span><span className="ns-conn-e">{q.items.length ? <Chip tone="warn">{q.items.length}</Chip> : <span className="nx-t3 num">0</span>}</span></>;
            return (
              <li key={q.title}>
                {q.items.length ? <button type="button" className="ns-conn-h" style={{ textAlign: "left", minHeight: 40 }} aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? null : q.title)}>{head}</button> : <div className="ns-conn-h">{head}</div>}
                {on ? <div id={id} className="ns-conn-x">
                  <ul className="nx-feed">{q.items.slice(0, SHOW).map((it) => <li key={it.key}><span className="nx-feed-i"><ChevronRight size={12} /></span><div>{it.href ? <Link href={it.href}><b>{it.label}</b></Link> : <b>{it.label}</b>}<p>{it.sub}</p></div></li>)}</ul>
                  {q.items.length > SHOW ? <p className="ns-small">and {q.items.length - SHOW} more. Open the register to see them all.</p> : null}
                </div> : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="nx-foot">Checks the {ANIMAL_LIMIT} most recently seen animals. Imported records and cases needing a decision are reviewed in <Link href="/ngo/cases" style={{ color: "var(--accent)" }}>Cases</Link>. Nothing here edits a record.</p>
    </>
  );
}
