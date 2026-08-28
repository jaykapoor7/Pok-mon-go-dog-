import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
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

const FLOW = [
  { n: "01", t: "Existing data", d: "Government, research, NGO and community sources." },
  { n: "02", t: "Organise", d: "Normalised to one model with full provenance." },
  { n: "03", t: "Visualise", d: "Maps, rankings and comparisons by geography." },
  { n: "04", t: "Analyse", d: "Trends, hotspots and intervention coverage." },
  { n: "05", t: "Identify gaps", d: "Where data — or care — is missing." },
  { n: "06", t: "Enable action", d: "Evidence-based next steps, by place." },
];

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
      {/* Hero */}
      <section className="max-w-3xl pt-6 sm:pt-10">
        <SectionLabel>Street-dog data, intelligence &amp; action · India</SectionLabel>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Better knowledge, <span className="text-paw-600 dark:text-paw-400">better action</span> for India&apos;s street dogs.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-bark-600 dark:text-bark-300">
          StrayPaw makes fragmented street-dog information understandable. We bring together public, government, research and community data, organise it with full provenance, and turn it into insight you can act on.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/explore" className="btn-primary px-6 py-3 text-base">Explore the data <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/insights" className="btn-ghost px-6 py-3 text-base">Read the insights</Link>
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

      {/* Core flow */}
      <section className="mt-14">
        <SectionLabel>How StrayPaw works</SectionLabel>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">From scattered data to action.</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-black/[0.08] bg-black/[0.06] sm:grid-cols-2 lg:grid-cols-3 dark:border-white/[0.1] dark:bg-white/[0.08]">
          {FLOW.map((s) => (
            <div key={s.n} className="bg-paper p-5 dark:bg-ink">
              <span className="font-mono text-[12px] font-semibold tracking-widest text-paw-500">{s.n}</span>
              <h3 className="mt-1.5 font-semibold tracking-tight text-bark-900 dark:text-white">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{s.d}</p>
            </div>
          ))}
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
