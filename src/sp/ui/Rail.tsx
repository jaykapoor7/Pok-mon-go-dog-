"use client";

/* Where a record is in its line. One rail everywhere a record moves through
   stages: a case, a procedure record, a report package, a bite record, a
   laboratory sample. It states what is recorded; it never says what should
   happen clinically. The line fills to the current stage when the record
   opens and moves on when an action advances it. */

import Link from "next/link";
import { Check } from "lucide-react";
import "./rail.css";

export type RailStep = { title: string; /** Where this stage can be seen in full, if anywhere. */ href?: string; hint?: string };

export function Rail({ label, steps, at, end, ended = false, tone }: { /** What the line is, for a screen reader. */ label: string; steps: RailStep[]; /** Index of the stage it is at now. */ at: number; /** The name of the end of the line. */ end: string; /** True once the record has reached the end. */ ended?: boolean; /** The colour of the end once reached: green by default, flame for a result that needs action, plain for an ending that is neither. */ tone?: "green" | "flame" | "plain" }) {
  const cur = ended ? steps.length : Math.max(0, Math.min(at, steps.length - 1));
  return (
    <nav className="rail" aria-label={label}>
      <ol>
        {steps.map((s, i) => {
          const body = <><span className="rail-dot" aria-hidden>{i < cur ? <Check size={11} strokeWidth={3} /> : null}</span><span className="rail-t">{s.title}</span><span className="rail-sr">{i < cur ? " (done)" : i === cur ? " (now)" : " (later)"}</span></>;
          return (
            <li key={s.title} className={i < cur ? "is-done" : i === cur ? "is-now" : undefined}>
              {s.href ? <Link href={s.href} aria-current={i === cur ? "step" : undefined} title={s.hint}>{body}</Link> : <span aria-current={i === cur ? "step" : undefined}>{body}</span>}
            </li>
          );
        })}
        <li className={ended ? "is-now is-end" : "is-end"} data-tone={ended ? tone : undefined}><span aria-current={ended ? "step" : undefined}><span className="rail-dot" aria-hidden>{ended ? <Check size={11} strokeWidth={3} /> : null}</span><span className="rail-t">{end}</span><span className="rail-sr">{ended ? " (reached)" : " (the end of the line)"}</span></span></li>
      </ol>
    </nav>
  );
}
