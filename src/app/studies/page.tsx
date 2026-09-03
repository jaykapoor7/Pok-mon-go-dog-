import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PreLaunch } from "@/components/app/PreLaunch";
import { UNKNOWNS } from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studies, StrayPaw",
  description:
    "Funded studies turn a geographic question into structured field evidence. No study has been commissioned yet.",
};

export default function StudiesPage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / studies</span>
          <h1>
            Fund the <em>question.</em>
          </h1>
        </div>
        <Link href="/partner-apply" className="spa-cta">
          Propose a study <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        A study names a geography, a question, a method and an executing
        partner. Findings stay attached to the records they came from.
      </p>

      <PreLaunch
        Icon={FileText}
        what="studies"
        fills="A study appears here once a funder commissions one and a partner organisation is assigned to run the fieldwork."
      />

      <section className="queue">
        <h2 className="queue-head">
          <span className="spa-mono">Ready to be scoped</span>
          Questions a first study could answer
        </h2>
        <p className="queue-lede">
          These are real, unanswered questions — not a backlog we generated.
          Each is a candidate brief.
        </p>
        <ol className="queue-list">
          {UNKNOWNS.map((u) => (
            <li key={u.id}>
              <b>{u.question}</b>
              <span>{u.resolvedBy}</span>
            </li>
          ))}
        </ol>
        <Link href="/gaps" className="tlink">
          Why each of these is unanswered <ArrowUpRight size={12} />
        </Link>
      </section>
    </AppShell>
  );
}
