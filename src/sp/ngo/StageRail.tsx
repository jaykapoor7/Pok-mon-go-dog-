"use client";

/* Where a record is in the line of work. The same stages, names and order as
   the Pipeline board; each stage opens the board at that stage, so a person
   can step from one record to everything else waiting beside it. The line
   fills to the current stage when the record opens and moves on when an
   action advances it. */

import Link from "next/link";
import { Check } from "lucide-react";
import { STAGES, stageHref, type StageId } from "./pipeline";
import "./pipeline.css";

export function StageRail({ stages, at, end, ended = false }: { /** The stages this kind of record passes through. */ stages: StageId[]; /** The stage it is at now. */ at: StageId; /** The name of the end of the line (Closed, Reported). */ end: string; /** True once the record has reached the end. */ ended?: boolean }) {
  const steps = stages.map((id) => STAGES.find((s) => s.id === id)!);
  const cur = ended ? steps.length : Math.max(0, stages.indexOf(at));
  return (
    <nav className="rail" aria-label="Where this record is in the line of work">
      <ol>
        {steps.map((s, i) => (
          <li key={s.id} className={i < cur ? "is-done" : i === cur ? "is-now" : undefined}>
            <Link href={stageHref(s.id)} aria-current={i === cur ? "step" : undefined} title={`See everything at “${s.title}” on the board`}>
              <span className="rail-dot" aria-hidden>{i < cur ? <Check size={11} strokeWidth={3} /> : null}</span>
              <span className="rail-t">{s.title}</span>
              <span className="rail-sr">{i < cur ? " (done)" : i === cur ? " (now)" : " (later)"}</span>
            </Link>
          </li>
        ))}
        <li className={ended ? "is-now is-end" : "is-end"}><span><span className="rail-dot" aria-hidden>{ended ? <Check size={11} strokeWidth={3} /> : null}</span><span className="rail-t">{end}</span><span className="rail-sr">{ended ? " (reached)" : " (the end of the line)"}</span></span></li>
      </ol>
    </nav>
  );
}
