import {
  CalendarRange,
  ClipboardList,
  Inbox,
  Map as MapIcon,
  Stethoscope,
  Sun,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   The console, drawn — with sample data.

   This panel is an illustration, and it is the only thing on the site
   that is. Everything else — the map, the hero wall, the counts, the
   feed — reads the live register and draws thin when the register is
   thin, which is the rule this project runs on.

   The exception is deliberate and narrow. This panel's job is to show
   an organisation the SHAPE of the workspace: a rail, a coverage ring,
   bars by locality, a queue of animals waiting on a decision. Wired to
   a young register it drew "0 / 0 / no localities recorded yet", which
   teaches a visiting NGO nothing about the software and quietly argues
   against it. A showroom photographs the sofa in a furnished room; it
   is not claiming you own the room.

   WHAT KEEPS THAT HONEST IS THE LABEL. The frame used to say "Live
   register". With invented rows behind it that would have stopped being
   an illustration and become a false statement on the page. It says
   "Sample workspace" now, and the section caption says the same. The
   line never to cross is an invented number presented as a
   measurement — so nothing here is cited anywhere, totalled into a
   claim, or repeated as evidence.

   The figures are sized like a real mid-size city NGO a year or two in,
   not like a success story: 214 animals, roughly three-quarters
   examined, and a backlog that is visibly not finished. Somebody
   running field work should recognise their own week in it.
   ════════════════════════════════════════════════════════════════════ */

const RAIL = [
  { label: "Today", Icon: Sun },
  { label: "Incoming", Icon: Inbox },
  { label: "Animals", Icon: ClipboardList },
  { label: "Cases", Icon: Stethoscope },
  { label: "Drives", Icon: CalendarRange },
  { label: "Coverage", Icon: MapIcon },
];

/* Sample, and internally consistent: the care split sits inside TOTAL,
   and the locality counts sum to a plausible share of it. */
const TOTAL = 214;
const STERILISED = 128;
const NOT_STERILISED = 34;

const ZONES: [string, number][] = [
  ["Lajpat Nagar", 41],
  ["Karol Bagh", 36],
  ["Dwarka", 28],
  ["Rohini", 24],
  ["Saket", 19],
  ["Najafgarh", 12],
];

/* Described the way the register actually labels an animal nobody has
   named yet — a coat, a condition, a locality — rather than as invented
   pets with invented names. */
const QUEUE: { name: string; zone: string; urgent: boolean }[] = [
  { name: "Brindle female, limping", zone: "Lajpat Nagar", urgent: true },
  { name: "Tan male, torn ear", zone: "Karol Bagh", urgent: true },
  { name: "Black and white, pups nearby", zone: "Dwarka", urgent: false },
  { name: "Cream female", zone: "Rohini", urgent: false },
];

export function ConsoleMock() {
  const zoneMax = ZONES[0][1];

  /* One sweep, drawn with a dash offset rather than an arc path, so the
     proportion is arithmetic instead of trigonometry. */
  const C = 2 * Math.PI * 34;
  const known = STERILISED + NOT_STERILISED;
  const knownSweep = (known / TOTAL) * C;

  return (
    <div
      className="cm"
      role="img"
      aria-label={`Sample view of the StrayPaw organisation console: ${STERILISED} sterilised and ${NOT_STERILISED} not sterilised out of ${TOTAL}, coverage by locality, and a queue of animals waiting on a decision. Example data, not a live register.`}
    >
      <div className="cm-frame">
        <div className="cm-bar">
          <span className="cm-dot" aria-hidden />
          <b>Organisation console</b>
          {/* Says what it is. With invented rows behind it, "Live
              register" would have been a claim rather than a picture. */}
          <span className="cm-chip">Sample workspace</span>
        </div>

        <div className="cm-body">
          <nav className="cm-rail" aria-hidden>
            {RAIL.map(({ label, Icon }, i) => (
              <span key={label} className={i === 0 ? "on" : ""}>
                <Icon size={14} strokeWidth={1.7} />
                {label}
              </span>
            ))}
          </nav>

          <div className="cm-main">
            {/* ── Care status, as a ring ──────────────────────────── */}
            <section className="cm-card cm-ring-card">
              <header>
                <b>Care status</b>
                <span>every animal on the register</span>
              </header>
              <div className="cm-ring-row">
                <svg viewBox="0 0 80 80" className="cm-ring" aria-hidden>
                  <circle cx="40" cy="40" r="34" className="cm-ring-track" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="cm-ring-known"
                    style={{ strokeDasharray: `${knownSweep} ${C}` }}
                  />
                </svg>
                <ul className="cm-key">
                  <li>
                    <i className="k-ster" />
                    Sterilised<b>{STERILISED}</b>
                  </li>
                  <li>
                    <i className="k-not" />
                    Not sterilised<b>{NOT_STERILISED}</b>
                  </li>
                  {/* The remainder — the animals nobody has examined —
                      is the unfilled arc of the ring, and is deliberately
                      not printed as a figure. A proportion can be read
                      and judged at a glance; the same fact as a bare
                      integer beside two smaller ones reads as a
                      scoreboard. */}
                </ul>
              </div>
            </section>

            {/* ── Coverage by locality ────────────────────────────── */}
            <section className="cm-card cm-zones">
              <header>
                <b>Where the records are</b>
                <span>busiest localities</span>
              </header>
              <ul>
                {ZONES.map(([zone, n], i) => (
                  <li key={zone} style={{ "--i": i } as React.CSSProperties}>
                    <span className="cm-zone-name">{zone}</span>
                    <span className="cm-track">
                      <i style={{ "--w": `${(n / zoneMax) * 100}%` } as React.CSSProperties} />
                    </span>
                    <span className="cm-zone-n">{n}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── The queue ───────────────────────────────────────── */}
            <section className="cm-card cm-queue">
              <header>
                <b>Waiting on a decision</b>
                <span>flagged first</span>
              </header>
              <ul>
                {QUEUE.map(({ name, zone, urgent }, i) => (
                  <li key={name} style={{ "--i": i } as React.CSSProperties}>
                    <i style={{ background: urgent ? "#f05b40" : "#5f8ce0" }} aria-hidden />
                    <span className="cm-q-name">{name}</span>
                    <span className="cm-q-zone">{zone}</span>
                    <span className={`cm-q-tag${urgent ? " urgent" : ""}`}>
                      {urgent ? "Needs help" : "Not examined"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
