import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  FileText,
  ScanSearch,
  ShieldCheck,
  MapPinned,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The evidence, StrayPaw",
  description:
    "What is known about India's street animals, what is missing, what an area needs, what a programme would cost, and what has actually worked.",
};

/* ════════════════════════════════════════════════════════════════════
   One door to six reference pages.

   These were six entries in the console's sidebar, which is how a sidebar
   ends up with twenty-three links and needs collapsing to be usable. They
   are not things you visit daily; they are things you go to on purpose,
   once you have a question. So they get one entry and a page that says
   which one answers which question.
   ════════════════════════════════════════════════════════════════════ */

const PAGES = [
  {
    href: "/gaps",
    Icon: ScanSearch,
    title: "Coverage and gaps",
    q: "What is known, and what still needs to be counted?",
    body: "District coverage, unanswered questions and the places where a programme needs better field evidence before it can be planned responsibly.",
  },
  {
    href: "/needs",
    Icon: MapPinned,
    title: "Local needs",
    q: "Where should field work go next?",
    body: "A practical view of reported needs by area, ready to take into a route plan, partner conversation or programme brief.",
  },
  {
    href: "/what-would-it-take",
    Icon: Calculator,
    title: "Cost a programme",
    q: "What would fixing one area cost?",
    body: "Animals, coverage, and a costed plan built from real figures. Where the data is thin it says so rather than estimating over it.",
  },
  {
    href: "/studies",
    Icon: FileText,
    title: "Published studies",
    q: "What has been researched, and by whom?",
    body: "Government, academic and NGO work on street dogs and rabies in India, indexed and cited.",
  },
  {
    href: "/interventions",
    Icon: Wrench,
    title: "What has been tried",
    q: "What do other people do, and does it work?",
    body: "Interventions on record, with what they cost and what changed afterwards.",
  },
  {
    href: "/outcomes",
    Icon: ShieldCheck,
    title: "Verified outcomes",
    q: "What actually got done?",
    body: "Work an organisation reported as finished, recorded against the animal it was done to, with the proof attached.",
  },
];

export default function EvidencePage() {
  return (
    <div className="ev">
      <header>
        <h1>The evidence</h1>
        <p>
          A working index for planning, not a second navigation system. Start
          with the question in front of you; each view keeps its sources and
          uncertainty attached to the work.
        </p>
      </header>

      <div className="ev-ledger" role="list" aria-label="Evidence workspaces">
        <div className="ev-ledger-head"><span>Question</span><span>Use it for</span><span /></div>
        {PAGES.map(({ href, Icon, title, q, body }) => (
          <Link key={href} href={href} className="ev-row" role="listitem">
            <Icon size={19} strokeWidth={1.5} />
            <div><b>{title}</b><span>{q}</span></div>
            <p>{body}</p>
            <span className="ev-open">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
