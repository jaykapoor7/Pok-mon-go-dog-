import { SectionLabel } from "@/components/platform/viz";
import {
  NoticeIllustration,
  MakeVisibleIllustration,
  UnderstandIllustration,
  ConnectIllustration,
  ActIllustration,
  ScaleIllustration,
} from "./JourneyIllustrations";

// ─────────────────────────────────────────────────────────────
// One dog's journey through the platform.
//
// A quiet editorial story, six panels: Notice → Make visible →
// Understand → Connect → Act → Scale. Each panel pairs a custom
// SVG illustration with copy that carries the V3 positioning.
// No scroll pinning, no 3D — the story flows top to bottom.
// ─────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  illustration: () => React.ReactElement;
}

const STAGES: Stage[] = [
  {
    id: "notice",
    eyebrow: "01 · Notice",
    headline: "It starts with someone noticing.",
    body: "A street dog on a corner. A limp. A litter. Every act of care starts here — with one person paying attention.",
    illustration: NoticeIllustration,
  },
  {
    id: "visible",
    eyebrow: "02 · Make visible",
    headline: "One tap turns a private moment into a shared record.",
    body: "A photo, a location, what they need. StrayPaw captures the sighting as data — where, when, what condition — in the same time it takes to send a text.",
    illustration: MakeVisibleIllustration,
  },
  {
    id: "understand",
    eyebrow: "03 · Understand",
    headline: "The dog becomes a real animal on the record.",
    body: "Sightings from strangers, feeders and rescuers add up to one animal with a history — not another one-off report to lose.",
    illustration: UnderstandIllustration,
  },
  {
    id: "connect",
    eyebrow: "04 · Connect",
    headline: "The right people find each other around this one dog.",
    body: "The person who reported. An NGO working the area. A vet who can treat. A volunteer who can transport. Instead of a WhatsApp forward chain, one connected thread.",
    illustration: ConnectIllustration,
  },
  {
    id: "act",
    eyebrow: "05 · Act",
    headline: "Treatment, vaccination, follow-ups — all in one thread.",
    body: "Every intervention attaches to the same record. Nothing is lost. Nothing is repeated. Anyone helping later starts where the last person stopped.",
    illustration: ActIllustration,
  },
  {
    id: "scale",
    eyebrow: "06 · Scale",
    headline: "One dog is one node in a living network.",
    body: "Multiply this journey by every street in India. StrayPaw is the shared surface that makes each animal legible — and adds up to a picture worth acting on.",
    illustration: ScaleIllustration,
  },
];

export function JourneyHero() {
  return (
    <div className="space-y-14 lg:space-y-20">
      {STAGES.map((s, i) => {
        const Illo = s.illustration;
        const flip = i % 2 === 1;
        return (
          <article
            key={s.id}
            className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${flip ? "lg:[&>div:first-child]:order-2" : ""}`}
          >
            {/* Illustration panel */}
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[#faf7f2] shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:border-white/[0.08]">
              <Illo />
            </div>

            {/* Copy panel */}
            <div>
              <SectionLabel>{s.eyebrow}</SectionLabel>
              <h3 className="mt-3 font-display text-[1.6rem] font-extrabold leading-snug tracking-tight sm:text-[1.85rem] lg:text-[2rem]">
                {s.headline}
              </h3>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                {s.body}
              </p>
            </div>
          </article>
        );
      })}

      {/* Closing beat — V3 positioning stated plainly */}
      <article className="mx-auto max-w-2xl border-t border-black/[0.07] pt-10 text-center dark:border-white/[0.08]">
        <SectionLabel>What this actually is</SectionLabel>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2rem]">
          StrayPaw doesn&apos;t manage dogs. It connects the people, places, information and action around them.
        </h3>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
          Not an NGO&apos;s tool. Not a reporting app. A shared surface where citizens, rescuers, welfare groups, vets, volunteers and public data sit on top of the same picture — so every street animal carries a real record from the first sighting onward.
        </p>
      </article>
    </div>
  );
}
