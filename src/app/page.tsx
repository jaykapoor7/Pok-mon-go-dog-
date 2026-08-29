import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { JourneyHero } from "@/components/platform/JourneyHero";
import { SectionLabel, Figure, RankedBars, nf } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { ranked, nationalPoints } from "@/lib/platform/datasets";
import { ORGS } from "@/lib/platform/orgs";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — street-dog data, intelligence & action",
  description:
    "StrayPaw makes fragmented street-dog information understandable — and helps turn better knowledge into better action. Explore data, read the evidence, and act where it matters.",
};

export default async function HomePage() {
  const stats = await getCityStats();
  const popPoints = ranked("dog_population", "desc");
  const popTotal = nationalPoints("dog_population")[0];
  const rabies = nationalPoints("human_rabies_deaths");
  const reported = rabies.find((p) => p.confidence === "high");
  const modelled = rabies.find((p) => p.confidence === "low");
  const gapMultiple = reported && modelled ? Math.round(modelled.value / reported.value) : null;

  return (
    <PlatformShell>
      {/* Hero — text-first placeholder. A custom 3D piece will drop into the
          right column here later; the section is sized to accept it without
          disturbing the layout below. */}
      <section className="grid gap-6 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-14">
        <div className="flex flex-col justify-center">
          <SectionLabel>Street-animal platform · India</SectionLabel>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Where India&apos;s street animals become <span className="text-paw-600 dark:text-paw-400">visible</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-bark-600 dark:text-bark-300">
            Every dog, every sighting, every act of care — on one shared surface. StrayPaw connects the people, places, information and action around India&apos;s street animals, so no observation and no dog is lost between the cracks.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary px-6 py-3 text-base">Open the map <ArrowRight className="h-4 w-4" /></Link>
            <Link href="#how-we-work" className="btn-ghost px-6 py-3 text-base">See how it works</Link>
          </div>
        </div>
        {/* Reserved slot for the future 3D model — kept explicit so the
            layout doesn't collapse and the visual space is already sized. */}
        <div
          aria-hidden
          className="hidden min-h-[52vh] items-center justify-center rounded-3xl border border-dashed border-black/[0.08] text-[11px] font-medium uppercase tracking-[0.2em] text-bark-300 dark:border-white/[0.1] lg:flex"
        >
          Hero visual — reserved
        </div>
      </section>

      {/* Statistics */}
      <section className="mt-14 border-y border-black/[0.08] py-8 dark:border-white/[0.1]">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Figure value={popTotal ? nf(popTotal.value) : "—"} label="Street dogs, last national count" sub="20th Livestock Census, 2019" />
          <Figure value={reported ? nf(reported.value) : "—"} label="Reported rabies deaths" sub={reported ? `${reported.year}, officially reported` : undefined} tone="text-status-injured" />
          <Figure value={String(ORGS.length)} label="Named welfare orgs in our directory" sub="verified, sourced — growing" tone="text-paw-600 dark:text-paw-400" />
          <Figure value={nf(stats.dogsSpotted)} label="Community observations" sub="contributed via StrayPaw" />
        </div>
        <p className="mt-5 flex items-center gap-2 text-[12px] text-bark-400">
          <SourceBadge type="government" /> Government census &amp; surveillance data, combined with StrayPaw&apos;s own community reporting. Every figure is sourced on Explore.
        </p>
      </section>

      {/* Map preview + featured insight */}
      <section className="mt-14 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>Explore</SectionLabel>
              <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight">Street-dog population by state</h2>
            </div>
            <SourceBadge type="government" />
          </div>
          <div className="mt-5"><RankedBars points={popPoints} max={8} /></div>
          <Link href="/explore" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300">
            Open the interactive map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Link href="/insights" className="group flex flex-col rounded-2xl border border-black/[0.08] bg-paw-50 p-6 transition-colors hover:bg-paw-100/70 dark:border-white/[0.1] dark:bg-paw-900/15">
          <SectionLabel>Featured insight</SectionLabel>
          <p className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight">
            {reported && modelled ? <>Officially {nf(reported.value)} rabies deaths a year. Modelling puts the real toll {gapMultiple ? `${gapMultiple}x` : "far"} higher.</> : "Reported vs. real rabies burden."}
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-paw-700 dark:text-paw-300">
            See the analysis <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      </section>

      {/* How we work — the scroll-driven journey of one street animal */}
      <section id="how-we-work" className="mt-20 border-t border-black/[0.08] pt-10 dark:border-white/[0.1]">
        <div className="max-w-2xl">
          <SectionLabel>How we work</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            One dog&apos;s journey through the platform.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
            Scroll to follow a single street animal from the first sighting to a shared record on the map. It&apos;s the whole platform in one story.
          </p>
        </div>
        <div className="mt-8">
          <JourneyHero />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1] sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Turn knowledge into action.</h2>
          <p className="mt-1 text-sm text-bark-600 dark:text-bark-300">Find what your area needs, the organisations working there, and how to help.</p>
        </div>
        <Link href="/take-action" className="btn-primary shrink-0 px-6 py-3 text-base">Take action <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </PlatformShell>
  );
}
