import { SectionLabel } from "@/components/platform/viz";

// ─────────────────────────────────────────────────────────────
// One dog's journey through the platform.
//
// A quiet, type-driven editorial layout: big decorative stage
// numbers, generous whitespace, hairline dividers between beats.
// No illustrations of ours - the story stands on typography.
// A real illustration or photo can drop into the space next to
// each headline later without changing the structure.
// ─────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  short: string;   // Notice / Make visible / …
  headline: string;
  body: string;
  aside?: string;  // one-line human note that lands the beat
}

const STAGES: Stage[] = [
  {
    id: "notice",
    short: "Notice",
    headline: "It starts with someone noticing.",
    body: "A street dog on a corner. A limp. A litter. Every act of care begins here - with one person paying attention.",
    aside: "The neighbour, the shopkeeper, the runner on their morning loop.",
  },
  {
    id: "visible",
    short: "Make visible",
    headline: "One tap turns a private moment into a shared record.",
    body: "A photo, a location, what they need. StrayPaw captures the sighting as data - where, when, what condition - in the same time it takes to send a text.",
    aside: "The report is the interface.",
  },
  {
    id: "understand",
    short: "Understand",
    headline: "The dog becomes a real animal on the record.",
    body: "Sightings from strangers, feeders and rescuers add up to one animal with a history - not another one-off report to lose.",
    aside: "Same dog. Different eyes. One profile.",
  },
  {
    id: "connect",
    short: "Connect",
    headline: "The right people find each other around this one dog.",
    body: "The person who reported. An NGO working the area. A vet who can treat. A volunteer who can transport. Instead of a WhatsApp forward chain, one connected thread.",
    aside: "Citizen · NGO · Vet · Volunteer - no gatekeeper.",
  },
  {
    id: "act",
    short: "Act",
    headline: "Treatment, vaccination, follow-ups - all in one thread.",
    body: "Every intervention attaches to the same record. Nothing is lost. Nothing is repeated. Anyone helping later starts where the last person stopped.",
    aside: "One record. Every visit. Every year.",
  },
  {
    id: "scale",
    short: "Scale",
    headline: "One dog is one node in a living network.",
    body: "Multiply this journey by every street in India. StrayPaw is the shared surface that makes each animal legible - and adds up to a picture worth acting on.",
    aside: "1 → 1,000 → 15 million.",
  },
];

export function JourneyHero() {
  return (
    <div className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
      {STAGES.map((s, i) => (
        <article
          key={s.id}
          className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-16 lg:py-16"
        >
          {/* Decorative number + short label - reads as a chapter mark */}
          <div className="flex flex-col">
            <span
              aria-hidden
              className="font-display text-[4.5rem] font-extrabold leading-none tracking-tight text-paw-500/20 dark:text-paw-300/20 sm:text-[5.5rem] lg:text-[6rem]"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <SectionLabel>{s.short}</SectionLabel>
          </div>

          {/* Copy column */}
          <div>
            <h3 className="font-display text-[1.7rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2rem] lg:text-[2.4rem]">
              {s.headline}
            </h3>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
              {s.body}
            </p>
            {s.aside && (
              <p className="mt-4 max-w-2xl text-[13px] italic leading-relaxed text-bark-400">
                {s.aside}
              </p>
            )}
          </div>
        </article>
      ))}

      {/* Closing beat - the V3 positioning stated plainly */}
      <div className="py-14 text-center lg:py-20">
        <SectionLabel>What this actually is</SectionLabel>
        <h3 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
          StrayPaw doesn&apos;t manage dogs. It connects the people, places, information and action around them.
        </h3>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
          Not an NGO&apos;s tool. Not a reporting app. A shared surface where citizens, rescuers, welfare groups, vets, volunteers and public data sit on top of the same picture - so every street animal carries a real record from the first sighting onward.
        </p>
      </div>
    </div>
  );
}
