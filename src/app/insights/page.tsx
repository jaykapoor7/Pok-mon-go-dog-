import Link from "next/link";
import { ArrowRight, AlertTriangle, GitCompare, Search, ShieldAlert } from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { SectionLabel, RankedBars, CoverageMeter, Figure, nf } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { pointsForMetric, nationalPoints, ranked, coverageOf } from "@/lib/platform/datasets";
import { METRICS } from "@/lib/platform/geography";

export const dynamic = "force-static";
export const metadata = {
  title: "Insights - StrayPaw",
  description: "What the data shows: sterilisation and vaccination gaps, the true scale of rabies under-reporting, and where information itself is missing. Derived from real, sourced datasets, never fabricated.",
};

export default function InsightsPage() {
  const popPoints = ranked("dog_population", "desc");
  const abcPoints = pointsForMetric("abc_coverage");
  const rabiesNational = nationalPoints("human_rabies_deaths");
  const reported = rabiesNational.find((p) => p.confidence === "high");
  const modelled = rabiesNational.find((p) => p.confidence === "low");
  const gapMultiple = reported && modelled ? Math.round(modelled.value / reported.value) : null;

  const gaps = METRICS.filter((m) => m.id !== "community_reports").map((m) => ({ m, ...coverageOf(m.id) })).sort((a, b) => a.withData - b.withData);

  return (
    <PlatformShell>
      <header className="max-w-3xl">
        <SectionLabel>Insights</SectionLabel>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">What the numbers actually say.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
          Every card below is <span className="font-medium text-bark-800 dark:text-bark-100">derived</span> from real, sourced datasets on Explore, computed, not invented. Where India simply doesn&apos;t publish the underlying data, we say so instead of filling the gap.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Rabies: reported vs modelled */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1] lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-status-injured"><ShieldAlert className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">The biggest single finding</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            {reported && modelled ? (
              <>Officially, {nf(reported.value)} people died of rabies in India in {reported.year}. Independent modelling puts the real number at roughly {nf(modelled.value)} a year{gapMultiple ? `, about ${gapMultiple}x higher` : ""}.</>
            ) : "Reported and modelled rabies deaths diverge sharply."}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-bark-600 dark:text-bark-300">
            The {reported?.value ?? "-"} figure comes from passive surveillance: cases that reach a hospital and get reported up through the system. The {modelled ? nf(modelled.value) : "-"} figure comes from a peer-reviewed community survey designed to catch the deaths that surveillance misses, mostly in rural areas with poor access to care. The gap between them is the clearest evidence that India&apos;s rabies burden is measured far less than it needs to be.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-6 sm:max-w-md">
            {reported && <Figure value={nf(reported.value)} label="Reported (2024)" sub={reported.source} />}
            {modelled && <Figure value={`~${nf(modelled.value)}`} label="Modelled estimate" sub="18,000-20,000/yr range" tone="text-status-injured" />}
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-bark-400">
            <SourceBadge type="government" /> NCDC, reported to Parliament · <SourceBadge type="research" /> peer-reviewed burden modelling, 2024
          </p>
        </article>

        {/* Population */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="mb-3 flex items-center gap-2 text-paw-600"><GitCompare className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">Population</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">
            {popPoints[0] ? <>{popPoints[0].geo.name} has the highest estimated street-dog population at {nf(popPoints[0].value)}.</> : "Population data is limited to a handful of states."}
          </h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">Combines NAPRE 2024-2025 state reporting, municipal dog censuses, and 20th Livestock Census baselines projected forward. All {popPoints.length} states covered; low-confidence projections are flagged.</p>
          <div className="mt-4"><RankedBars points={popPoints} max={8} /></div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-bark-400"><SourceBadge type="estimate" /> NAPRE reporting (2024-2025), municipal censuses, projected census baselines.</p>
        </article>

        {/* ABC: what little we know */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="mb-3 flex items-center gap-2 text-[#6b3f90]"><AlertTriangle className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">Sterilisation (ABC)</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">Only {abcPoints.length} places in the country have a citable ABC coverage figure at all.</h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">
            Delhi&apos;s own 2022-23 survey found fewer than half of its ~10 lakh community dogs sterilised. Lucknow, by contrast, reported 83% coverage in late 2024, but that&apos;s one city, not a state. In October 2025, the Supreme Court found only 2 of 28 states/UTs had even filed the sterilisation-compliance reports it ordered. Coverage is not just low in most of India; it is not tracked.
          </p>
          <div className="mt-4 space-y-2">
            {abcPoints.map((p) => (
              <div key={p.geo.code} className="flex items-center justify-between rounded-lg border border-black/[0.06] px-3 py-2 text-sm dark:border-white/[0.08]">
                <span className="font-medium text-bark-700 dark:text-bark-200">{p.geo.name}</span>
                <span className="font-display font-bold tabular-nums">{p.value}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-bark-400"><SourceBadge type="research" /> Delhi survey (2022-23) · <SourceBadge type="government" /> Lucknow Municipal Corporation (2024)</p>
        </article>

        {/* Data gaps */}
        <article className="rounded-2xl border border-black/[0.08] bg-paw-50 p-6 dark:border-white/[0.1] dark:bg-paw-900/15 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-paw-700 dark:text-paw-300"><Search className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">The biggest gap is data itself</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">Most states are missing most metrics, including the one metric they were ordered to publish.</h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">You can&apos;t manage what you can&apos;t measure. Closing these gaps, not adding another opinion about what should be done, is the highest-leverage thing this platform and its contributors can do.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {gaps.map(({ m, withData, total }) => <CoverageMeter key={m.id} withData={withData} total={total} label={m.short} />)}
          </div>
        </article>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/explore" className="btn-ghost px-6 py-3 text-base">Back to the data</Link>
        <Link href="/take-action" className="btn-primary px-6 py-3 text-base">Act on this <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </PlatformShell>
  );
}
