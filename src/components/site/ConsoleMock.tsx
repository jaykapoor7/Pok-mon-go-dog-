import {
  CalendarRange,
  ClipboardList,
  Inbox,
  Map as MapIcon,
  Stethoscope,
  Sun,
} from "lucide-react";
import { dogLabel } from "@/lib/utils";
import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The console, drawn.

   A rendering of the organisation workspace: the rail an NGO navigates,
   the three panels it opens on, the coverage map and the queue of
   animals waiting on a decision.

   Everything inside it is read from the live register. The bars are the
   real distribution of sterilisation status; the zone chart is the real
   count per locality; the queue rows are real animals with their real
   localities and their real marker colours. Nothing is typed in, which
   is the only way a picture of a dashboard is allowed to exist on a page
   that claims the product is honest — if the register is thin, this
   draws thin, and that is the correct behaviour.

   No headline figure sits on its own. A number with no denominator is
   the thing that made the last version of this section unreadable: a
   visitor has no idea whether it is a large number or a small one, so it
   communicates nothing and asks to be taken as a boast. Here every
   quantity is inside a shape that carries its own scale — a bar against
   the total, a ring against the whole — which is what makes it legible
   rather than decorative.
   ════════════════════════════════════════════════════════════════════ */

const RAIL = [
  { label: "Today", Icon: Sun },
  { label: "Incoming", Icon: Inbox },
  { label: "Animals", Icon: ClipboardList },
  { label: "Cases", Icon: Stethoscope },
  { label: "Drives", Icon: CalendarRange },
  { label: "Coverage", Icon: MapIcon },
];

export function ConsoleMock({ dogs }: { dogs: Dog[] }) {
  const total = dogs.length || 1;

  /* The care-status split, exactly as the console's own filter groups it. */
  const sterilised = dogs.filter((d) => d.sterilisation_status === "sterilised").length;
  const notSterilised = dogs.filter((d) => d.sterilisation_status === "not_sterilised").length;
  const unknown = total - sterilised - notSterilised;

  /* Coverage by locality: the six busiest, longest bar first. A field
     team reads this to decide where the next drive goes. */
  const byZone = Object.entries(
    dogs.reduce<Record<string, number>>((acc, d) => {
      const z = (d.zone || "").trim();
      if (z) acc[z] = (acc[z] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const zoneMax = byZone[0]?.[1] ?? 1;

  /* The queue: flagged animals first, then the ones nobody has examined. */
  const queue = [
    ...dogs.filter((d) => d.needs_help),
    ...dogs.filter(
      (d) => !d.needs_help && (!d.sterilisation_status || d.sterilisation_status === "unknown")
    ),
  ].slice(0, 4);

  /* The ring: one sweep, drawn with a dash offset rather than an arc
     path, so the proportion is arithmetic instead of trigonometry. */
  const C = 2 * Math.PI * 34;
  const known = sterilised + notSterilised;
  const knownSweep = (known / total) * C;

  return (
    <div className="cm" role="img" aria-label="The StrayPaw organisation console, drawn from the live register">
      <div className="cm-frame">
        <div className="cm-bar">
          <span className="cm-dot" aria-hidden />
          <b>Organisation console</b>
          <span className="cm-chip">Live register</span>
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
                    Sterilised<b>{sterilised}</b>
                  </li>
                  <li>
                    <i className="k-not" />
                    Not sterilised<b>{notSterilised}</b>
                  </li>
                  <li>
                    <i className="k-unk" />
                    Not examined<b>{unknown}</b>
                  </li>
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
                {byZone.map(([zone, n], i) => (
                  <li key={zone} style={{ "--i": i } as React.CSSProperties}>
                    <span className="cm-zone-name">{zone}</span>
                    <span className="cm-track">
                      <i style={{ "--w": `${(n / zoneMax) * 100}%` } as React.CSSProperties} />
                    </span>
                    <span className="cm-zone-n">{n}</span>
                  </li>
                ))}
                {byZone.length === 0 && <li className="cm-thin">No localities recorded yet.</li>}
              </ul>
            </section>

            {/* ── The queue ───────────────────────────────────────── */}
            <section className="cm-card cm-queue">
              <header>
                <b>Waiting on a decision</b>
                <span>flagged first</span>
              </header>
              <ul>
                {queue.map((d, i) => (
                  <li key={d.id} style={{ "--i": i } as React.CSSProperties}>
                    <i style={{ background: markerMetaFor(d).color }} aria-hidden />
                    <span className="cm-q-name">{dogLabel(d)}</span>
                    <span className="cm-q-zone">{d.zone || "Location on record"}</span>
                    <span className={`cm-q-tag${d.needs_help ? " urgent" : ""}`}>
                      {d.needs_help ? "Needs help" : "Not examined"}
                    </span>
                  </li>
                ))}
                {queue.length === 0 && <li className="cm-thin">Nothing open.</li>}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
