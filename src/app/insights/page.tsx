import Link from "next/link";
import { ArrowRight, TrendingDown, AlertTriangle, GitCompare, Search } from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { SectionLabel, RankedBars, CoverageMeter } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { pointsForMetric, ranked, coverageOf, nationalRollup } from "@/lib/platform/datasets";
import { METRICS } from "@/lib/platform/geography";

export const dynamic = "force-static";
export const metadata = {
  title: "Insights — StrayPaw",
  description: "What the data shows: vaccination and sterilisation gaps, coverage rankings, and where information itself is missing. Derived from the underlying datasets — never fabricated.",
};

export default function InsightsPage() {
  const arv = pointsForMetric("arv_coverage");
  const belowVax = arv.filter((p) => p.value < 70).sort((a, b) => a.value - b.value);
  const abc = pointsForMetric("abc_coverage");
  const belowAbc = abc.filter((p) => p.value < 30).length;
  const bestAbc = ranked("abc_coverage", "desc")[0];
  const worstAbc = ranked("abc_coverage", "asc")[0];

  // Which metrics have the largest data gaps?
  const gaps = METRICS.filter((m) => m.id !== "community_reports").map((m) => ({ m, ...coverageOf(m.id) })).sort((a, b) => a.withData - b.withData);

  return (
    <PlatformShell>
      <header className="max-w-3xl">
        <SectionLabel>Insights</SectionLabel>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">What the numbers are telling us.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
          Every insight below is <span className="font-medium text-bark-800 dark:text-bark-100">derived</span> from the datasets on Explore — computed, not invented. Where the data is sample data, the analysis inherits that caveat.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Vaccination gap */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="mb-3 flex items-center gap-2 text-status-injured"><AlertTriangle className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">Coverage gap</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">
            {belowVax.length} of {arv.length} states with data are below the ~70% dog-vaccination threshold that WHO links to breaking rabies transmission.
          </h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">Sustained herd immunity — not one-off drives — is what ends dog-mediated rabies. These states have the furthest to go.</p>
          <div className="mt-4"><RankedBars points={belowVax} dir="asc" max={6} unit="%" /></div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-bark-400"><SourceBadge type="derived" /> Derived from ARV coverage (sample).</p>
        </article>

        {/* Sterilisation spread */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="mb-3 flex items-center gap-2 text-paw-600"><GitCompare className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">Comparison</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">
            Sterilisation coverage ranges from {worstAbc?.value}% to {bestAbc?.value}% — a {(bestAbc && worstAbc) ? (bestAbc.value - worstAbc.value) : 0}-point gap between states.
          </h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">{belowAbc} states with data sit under 30% coverage, where ABC has limited effect on population without sustained scale-up.</p>
          <div className="mt-4"><RankedBars points={abc} max={6} unit="%" /></div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-bark-400"><SourceBadge type="derived" /> Derived from ABC coverage (sample).</p>
        </article>

        {/* Rabies burden */}
        <article className="rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
          <div className="mb-3 flex items-center gap-2 text-[#6b3f90]"><TrendingDown className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">Burden</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">Reported rabies deaths track low vaccination — and are widely under-reported.</h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">States with the lowest vaccination coverage tend to carry the highest reported burden. Because surveillance is weakest exactly where the burden is highest, true numbers are likely higher.</p>
          <div className="mt-4"><RankedBars points={pointsForMetric("human_rabies_deaths")} max={6} /></div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-bark-400"><SourceBadge type="derived" /> Derived; under-reporting caveat applies.</p>
        </article>

        {/* Data gaps */}
        <article className="rounded-2xl border border-black/[0.08] bg-paw-50 p-6 dark:border-white/[0.1] dark:bg-paw-900/15">
          <div className="mb-3 flex items-center gap-2 text-paw-700 dark:text-paw-300"><Search className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-widest">The biggest gap is data itself</span></div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight">Most states are missing most metrics.</h2>
          <p className="mt-2 text-sm text-bark-600 dark:text-bark-300">You can&apos;t manage what you can&apos;t measure. Closing these gaps is the highest-leverage thing the platform — and its contributors — can do.</p>
          <div className="mt-5 space-y-4">
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
