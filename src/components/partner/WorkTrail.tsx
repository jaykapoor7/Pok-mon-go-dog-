import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import "./worktrail.css";

/* Where this screen sits in an organisation's work, and the one step that
   comes next: Dashboard → Case → Animal → Care → Outcome. Every step that
   has somewhere to go links there; the current one is marked; the steps
   already done are ticked. */

export type TrailStep = "dashboard" | "case" | "animal" | "care" | "outcome";

const LABEL: Record<TrailStep, string> = { dashboard: "Dashboard", case: "Case", animal: "Animal", care: "Care", outcome: "Outcome" };
const ORDER: TrailStep[] = ["dashboard", "case", "animal", "care", "outcome"];

export function WorkTrail({ at, done = [], links, next }: {
  at: TrailStep;
  done?: TrailStep[];
  links: Partial<Record<TrailStep, string>>;
  next?: { label: string; href: string } | null;
}) {
  return (
    <nav className="wt" aria-label="Where this is in the work">
      <ol>
        {ORDER.map((s) => {
          const state = s === at ? "is-here" : done.includes(s) ? "is-done" : "";
          const body = <>{done.includes(s) && s !== at ? <Check size={12} aria-hidden /> : null}{LABEL[s]}</>;
          return (
            <li key={s} className={state}>
              {links[s] && s !== at ? <Link href={links[s]!}>{body}</Link> : <span aria-current={s === at ? "step" : undefined}>{body}</span>}
            </li>
          );
        })}
      </ol>
      {next && <Link href={next.href} className="wt-next">{next.label} <ArrowRight size={14} /></Link>}
    </nav>
  );
}
