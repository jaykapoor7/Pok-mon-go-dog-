import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "Our journey, StrayPaw",
  description:
    "Why StrayPaw exists: making the invisible work of street-animal care visible, counted, and shared across India.",
};

const CHAPTERS = [
  {
    year: "The problem",
    title: "Care that nobody could see",
    body: "It started on a walk. A limping dog on a familiar street, a quick photo, and then the hard part: who do you even tell? The people who feed, rescue, and treat India's street animals do extraordinary work, but it lives in WhatsApp groups and paper notebooks. There was no shared record, no way to hand off a case, no way to know if help ever arrived.",
  },
  {
    year: "The idea",
    title: "Open the map",
    body: "So we built one. A place where anyone can drop a pin on an animal in under a minute, and anyone can see what is already being done. The coverage and care data that used to sit locked inside individual organizations, opened up for the people, by the people. No account, no gatekeeping, no cost to report.",
  },
  {
    year: "Today",
    title: "From a pin to a record",
    body: "A sighting is only the start. Each one can become a documented case with a condition, a treatment, a cost, a photo timeline, and a clear outcome. Feeding zones get mapped. Animals get profiles. The quiet, daily work finally leaves a trail that others can build on.",
  },
  {
    year: "Next",
    title: "A home for the organizations doing the work",
    body: "Now welfare organizations are joining to run their operations and raise for the needs that matter, on a platform their supporters can trust. Each rescue becomes a record. Each campaign becomes a page you can share. This chapter is just beginning, and it is being written across India.",
  },
];

export default function JourneyPage() {
  return (
    <MarketingShell
      eyebrow="Our journey"
      title="Making invisible work visible."
      intro="StrayPaw exists to count the care that already happens on India's streets, and to give the people doing it the tools they have never had."
    >
      <ol className="relative mt-2">
        {CHAPTERS.map((c, idx) => {
          const last = idx === CHAPTERS.length - 1;
          return (
            <li key={c.year} className="relative flex gap-5 pb-9 last:pb-0">
              {!last && (
                <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-paw-200 dark:bg-paw-500/30" />
              )}
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-paw-600 ring-4 ring-paper dark:ring-ink" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">{c.year}</p>
                <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-bark-900 dark:text-bark-50">{c.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-bark-600 dark:text-bark-200">{c.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 font-display text-xl font-bold tracking-tight text-paw-600 dark:text-paw-300">
        For the animals, for the people, by the people.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/what-we-do" className="btn-primary px-6 py-3.5 text-base">
          See what we do <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/orgs" className="btn-ghost px-6 py-3.5 text-base">
          Meet the organizations
        </Link>
      </div>
    </MarketingShell>
  );
}
