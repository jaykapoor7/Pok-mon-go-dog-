import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  ClipboardList,
  Inbox,
  Map as MapIcon,
  Stethoscope,
  Syringe,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   What the console actually does.

   What stood here was a small copy of the organisation dashboard with
   three live figures in it — "on the register", "never checked",
   "organisations". Two things were wrong with that, and the second is
   the one that matters.

   The small one: "85 never checked" is a true count of our own database
   and reads, on a landing page, as a claim about the state of the world.
   Nobody outside this project knows the denominator, so the number says
   nothing and invites the reader to think it says something.

   The real one: a picture of a dashboard is not a dashboard. Three
   figures and a list of four rows is what every SaaS landing page puts
   in a browser frame, and it tells somebody nothing about whether this
   software would help them. What an organisation wants to know is not
   how many rows we have. It is: what happens to a report after somebody
   sends it?

   So this section answers that instead, and it is the only honest
   dashboard visual available to a product this young — the SHAPE of the
   work rather than a snapshot of its volume. Six stations, which are six
   real screens in the console, in the order a single animal passes
   through them. No numbers at all, so there is nothing here that can
   drift away from the truth or be read as a boast.

   The claim it makes is the one thing StrayPaw genuinely does that a
   WhatsApp group does not: a sighting does not stop at a pin. It becomes
   work, and the work leaves a record behind it.
   ════════════════════════════════════════════════════════════════════ */

const STATIONS = [
  {
    Icon: Inbox,
    href: "/partner/incoming",
    label: "Incoming",
    line: "A neighbour's report lands in the queue for the streets you cover.",
  },
  {
    Icon: ClipboardList,
    href: "/partner/animals",
    label: "The animal",
    line: "It stops being a message and becomes a record that keeps its history.",
  },
  {
    Icon: Stethoscope,
    href: "/partner/cases",
    label: "A case",
    line: "Somebody's name is on it, with a status you can answer for.",
  },
  {
    Icon: Syringe,
    href: "/partner/medical",
    label: "Care history",
    line: "Sterilisation, vaccination and treatment, each with a date behind it.",
  },
  {
    Icon: CalendarRange,
    href: "/partner/drives",
    label: "The next drive",
    line: "The animal joins a round that is planned rather than remembered.",
  },
  {
    Icon: MapIcon,
    href: "/partner/reports",
    label: "Coverage",
    line: "And the map finally shows which roads have actually been worked.",
  },
];

export function ConsoleShowcase() {
  return (
    <section className="cx" aria-labelledby="cx-title">
      {/* Drawn rather than photographed: a faint contour field, so the
          section has a ground of its own without a decorative gradient. */}
      <div className="cx-field" aria-hidden />

      <div className="cx-inner">
        <header className="cx-head">
          <span className="field-eyebrow">Inside the organisation console</span>
          <h2 id="cx-title">
            A sighting does not stop<br />
            <em>at a pin on a map.</em>
          </h2>
          <p>
            Every screen below is one the field team already works in. This is
            the route one animal takes through them — from a stranger&apos;s
            photograph to a road somebody can prove was covered.
          </p>
        </header>

        <ol className="cx-rail">
          {STATIONS.map(({ Icon, href, label, line }, i) => (
            <li key={label} style={{ "--i": i } as React.CSSProperties}>
              <Link href={href}>
                <span className="cx-node">
                  <Icon size={19} strokeWidth={1.6} />
                </span>
                <span className="cx-step">{String(i + 1).padStart(2, "0")}</span>
                <b>{label}</b>
                <span className="cx-line">{line}</span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="cx-foot">
          <p>
            No screenshot here is a mock-up of a feature we intend to build.
            Each one is a link.
          </p>
          <Link href="/for-ngos" className="cx-cta">
            See the workspace <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
