import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  FileText,
  ListChecks,
  ScanSearch,
  ShieldCheck,
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
    title: "Where data is missing",
    q: "Which districts has nobody counted?",
    body: "Absence shown as clearly as presence. A district with no data is not a district without need, and this is usually where a programme should be scoped.",
  },
  {
    href: "/needs",
    Icon: ListChecks,
    title: "What areas need",
    q: "What does this place's own data say it needs?",
    body: "Sterilisation, vaccination, feeding, treatment, ranked by what the records for that area actually show.",
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
          Six questions, and where each is answered. Everything here is built
          from published sources or from records organisations have entered
          themselves, and every figure carries where it came from.
        </p>
      </header>

      <div className="ev-grid">
        {PAGES.map(({ href, Icon, title, q, body }) => (
          <Link key={href} href={href} className="ev-card">
            <Icon size={19} strokeWidth={1.5} />
            <b>{title}</b>
            <em>{q}</em>
            <span>{body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
