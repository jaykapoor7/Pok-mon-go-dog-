import Link from "next/link";
import { AnimalMark, StrayPawBadge } from "@/components/brand/Logo";
import {
  ArrowRight,
  MapPin,
  Building2,
  BadgeCheck,
  Activity,
  TrendingUp,
  CircleDot,
} from "lucide-react";
import { LandingShell } from "@/components/platform/hero/LandingShell";
import { SectionLabel, Figure, RankedBars, nf } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { ReportedDogsShowcase } from "@/components/platform/ReportedDogsShowcase";
import { LiveMapPreview } from "@/components/platform/LiveMapPreview";
import { ranked, nationalPoints } from "@/lib/platform/datasets";
import { ORGS } from "@/lib/platform/orgs";
import { getCityStats, getShowcaseDogs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw | Street-animal infrastructure for India",
  description:
    "StrayPaw connects the people, information, places, and actions around India's street animals. Report, find help, explore data, and act where it matters.",
};

/* ------------------------------------------------------------------ */
/*  V3 Homepage                                                       */
/*  HERO → DEMAND INTELLIGENCE → DATA → MARKETPLACE → REPORTED DOGS  */
/*  → PARTICIPATE → SCALE → FINAL CTA                                 */
/* ------------------------------------------------------------------ */

const DEMAND_BREAKDOWN = [
  { label: "Sterilisation", value: 780000, animals: 260, color: "#a8ddd0", pct: 42 },
  { label: "Vaccination", value: 420000, animals: 320, color: "#e9ac42", pct: 23 },
  { label: "Medical care", value: 360000, animals: 180, color: "#e06455", pct: 20 },
  { label: "Medicine / supplies", value: 180000, animals: 440, color: "#6b7280", pct: 10 },
  { label: "Transport", value: 100000, animals: 120, color: "#8b9eb5", pct: 5 },
];

const PROVIDER_TIERS = [
  { name: "NGOs & shelters", count: 18, state: "active", desc: "Animal birth control, emergency rescue, sterilisation camps" },
  { name: "Veterinary clinics", count: 9, state: "active", desc: "Medical care, surgeries, post-op recovery" },
  { name: "Community feeders", count: 7, state: "partial", desc: "Daily feeding rounds, first-notice of injured animals" },
];

const INVOLVE_ACTIONS = [
  { label: "Find an NGO", href: "/resources" },
  { label: "Volunteer", href: "/get-involved" },
  { label: "Donate", href: "/get-involved" },
  { label: "Report a sighting", href: "/map" },
  { label: "Contribute data", href: "/get-involved" },
];

export default async function HomePage() {
  const stats = await getCityStats();
  const showcaseDogs = await getShowcaseDogs(10);
  const popPoints = ranked("dog_population", "desc");
  const popTotal = nationalPoints("dog_population")[0];
  const rabies = nationalPoints("human_rabies_deaths");
  const reported = rabies.find((p) => p.confidence === "high");
  const modelled = rabies.find((p) => p.confidence === "low");


  return (
    <div className="min-h-dvh">
      {/* Nav — floats over the dark cinematic */}
      <div className="fixed left-0 right-0 top-0 z-50">
        <header style={{ borderBottom: "1px solid rgba(233,172,66,0.10)", background: "rgba(7,11,17,0.82)", backdropFilter: "blur(18px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", height: 52, alignItems: "center", padding: "0 24px", gap: 0 }}>
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
              <AnimalMark className="h-8 w-8" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ea", letterSpacing: "0.01em" }}>StrayPaw</span>
            </Link>

            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 20px", flexShrink: 0 }} />

            <nav style={{ display: "flex", gap: 2, flex: 1 }} className="hidden md:flex">
              {[
                { label: "Explore", href: "/explore" },
                { label: "Resources", href: "/resources" },
                { label: "Learn", href: "/learn" },
                { label: "About", href: "/about" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "rgba(244,241,234,0.45)", textDecoration: "none", borderRadius: 6, transition: "color 0.15s" }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/map"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e9ac42", color: "#070b11", borderRadius: 999, padding: "7px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.01em", flexShrink: 0 }}
              >
                Open app ↗
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CINEMATIC: TV Portal → Delhi Street → Platform              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <LandingShell />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BELOW THE FOLD                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">

        {/* ── 4. DEMAND INTELLIGENCE ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start">
            <div>
              <SectionLabel>Demand intelligence</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.6rem]">
                Animal need,<br />mapped to ₹ value.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                StrayPaw aggregates community sightings into geographic demand
                clusters, assigns ₹ cost-to-treat per need type, and surfaces
                unmet coverage. The result: a procurement-ready view of where
                animal-health supply needs to go.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                <Figure value="1,200" label="Community animals tracked" sub="Delhi NCR (illustrative)" />
                <Figure value="₹18.4L" label="Projected 12-month demand" tone="text-paw-600 dark:text-paw-400" />
                <Figure value="87%" label="Demand currently matched" />
                <Figure value="34" label="Active providers" tone="text-paw-600 dark:text-paw-400" />
              </div>
              <p className="mt-5 flex items-center gap-2 text-[11px] text-bark-400">
                <span className="rounded border border-bark-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bark-400 dark:border-white/10">
                  ILLUSTRATIVE
                </span>
                Demand figures are modelled examples, not live data
              </p>
            </div>

            {/* Demand breakdown card */}
            <div className="rounded-2xl border border-black/[0.06] p-6 dark:border-white/[0.08]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">
                  ₹ demand breakdown
                </p>
                <span className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-semibold text-mint dark:bg-mint/10" style={{ color: '#a8ddd0', background: 'rgba(168,221,208,0.10)' }}>
                  <Activity className="h-3 w-3" /> NETWORK LIVE
                </span>
              </div>
              <p className="mt-1 text-[11px] text-bark-400">Delhi NCR · 1,200 animals · 12-month projection · <span className="font-semibold">illustrative</span></p>

              <div className="mt-6 space-y-4">
                {DEMAND_BREAKDOWN.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-bark-800 dark:text-bark-100">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        {d.label}
                      </span>
                      <span className="tabular-nums text-bark-500 dark:text-bark-400">
                        ₹{(d.value / 100000).toFixed(1)}L
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-bark-100 dark:bg-white/[0.07]">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${d.pct}%`, background: d.color, opacity: 0.85 }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-bark-400">{d.animals} animals</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-bark-50/70 px-4 py-3 dark:bg-white/[0.04]">
                <span className="text-sm font-medium text-bark-700 dark:text-bark-300">Total demand</span>
                <span className="font-display text-lg font-bold text-bark-900 dark:text-bark-50">₹18.4L</span>
              </div>

              <Link
                href="/explore"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300"
              >
                Explore the data <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. DATA ── */}
        <section className="border-y border-black/[0.06] bg-bark-50/50 dark:border-white/[0.06] dark:bg-ink-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <SectionLabel>Data layer</SectionLabel>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Community reports become street-level intelligence.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                  Every sighting is a data point. Aggregated into demand clusters,
                  matched against provider coverage, and tracked to outcomes.
                  Government census meets real-time community intelligence.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <Figure
                    value={popTotal ? nf(popTotal.value) : "-"}
                    label="Street dogs nationally"
                    sub="20th Livestock Census"
                  />
                  <Figure
                    value={reported ? nf(reported.value) : "-"}
                    label="Reported rabies deaths/yr"
                    tone="text-status-injured"
                  />
                  <Figure
                    value={String(ORGS.length)}
                    label="Welfare orgs listed"
                    tone="text-paw-600 dark:text-paw-400"
                  />
                  <Figure
                    value={nf(stats.dogsSpotted)}
                    label="Community sightings"
                  />
                </div>
                <p className="mt-5 flex items-center gap-2 text-[11px] text-bark-400">
                  <SourceBadge type="government" /> Government census +
                  StrayPaw community data
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.06] p-6 dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionLabel>Population</SectionLabel>
                    <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight">
                      Street-dog population by state
                    </h3>
                  </div>
                  <SourceBadge type="government" />
                </div>
                <div className="mt-5">
                  <RankedBars points={popPoints} max={8} />
                </div>
                <Link
                  href="/explore"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300"
                >
                  Open interactive data <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. MARKETPLACE ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>Marketplace</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Demand matched to supply. Need routed to providers.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                NGOs, vets, and community rescuers are the supply side of this
                market. StrayPaw indexes them by capacity, geography, and
                specialisation — then matches incoming demand to the right
                provider and tracks funded outcomes.
              </p>
              <Link
                href="/resources"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-paw-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-paw-600"
              >
                View provider network <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {PROVIDER_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-2xl border border-black/[0.06] p-6 dark:border-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-bark-400" />
                      <h3 className="font-display text-base font-bold tracking-tight">
                        {tier.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CircleDot
                        className="h-3.5 w-3.5"
                        style={{ color: tier.state === 'active' ? '#a8ddd0' : '#e9ac42' }}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-bark-400">
                        {tier.count} {tier.state}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                    {tier.desc}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-paw-200 bg-paw-50/50 p-6 dark:border-paw-800/30 dark:bg-paw-900/10">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-paw-500" />
                  <h3 className="font-display text-base font-bold tracking-tight">
                    Verified providers
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                  Verified badge, dashboard access, and direct demand routing.
                  NGOs do not need to adopt StrayPaw to be listed — verification
                  unlocks the supply-side tools.
                </p>
                <p className="mt-3 text-[13px] font-medium text-paw-600 dark:text-paw-300">
                  Provider programme launching soon
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. REPORTED DOGS ── real photos, makes the platform feel real */}
        <section className="border-y border-black/[0.06] bg-bark-50/50 py-20 dark:border-white/[0.06] dark:bg-ink-surface/50 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>From the community</SectionLabel>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Dogs spotted nearby.
                </h2>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
                  Community members report sightings. Each one goes into the map,
                  feeds the demand layer, and can be connected to help.
                </p>
              </div>
              <Link
                href="/map"
                className="hidden items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300 sm:inline-flex"
              >
                See all on the map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
            <ReportedDogsShowcase dogs={showcaseDogs} />
          </div>
        </section>

        {/* ── 8. PARTICIPATE ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionLabel>Participate</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Every role in the network matters.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
            Community members generate the demand signal. NGOs and vets fulfil
            it. Funders close the gap. Every participant strengthens the
            infrastructure.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {INVOLVE_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-5 py-3 text-sm font-semibold text-bark-800 transition-colors hover:bg-bark-50 dark:border-white/[0.1] dark:text-bark-100 dark:hover:bg-white/[0.05]"
              >
                {a.label}
              </Link>
            ))}
          </div>

          <div className="mt-10 grid gap-6 rounded-2xl border border-black/[0.06] bg-bark-50/60 p-6 dark:border-white/[0.08] dark:bg-white/[0.03] lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">
                Community tool
              </p>
              <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-bark-900 dark:text-bark-50">
                Report sightings. Feed the network.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                Each report you submit becomes a data point in the demand layer.
                The more the community reports, the more precisely need can be
                matched to supply.
              </p>
              <Link
                href="/map"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-paw-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-paw-600"
              >
                Open the community app <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <LiveMapPreview dogs={showcaseDogs} />
          </div>
        </section>

        {/* ── 9. SCALE ── */}
        <section className="border-y border-black/[0.06] bg-bark-50/50 dark:border-white/[0.06] dark:bg-ink-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>The infrastructure layer</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.6rem]">
                Animal → need → demand → ₹ value → match → outcome → data.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                Every sighting strengthens the demand signal. Every funded
                outcome validates the model. StrayPaw is the infrastructure that
                makes each part of that chain legible, matchable, and
                measurable.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-bark-400">
                {["Animal", "Need", "Demand", "₹ Value", "Match"].map((step, i) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-full bg-paw-100 px-3 py-1 font-medium text-paw-700 dark:bg-paw-900/20 dark:text-paw-300">
                      {step}
                    </span>
                    {i < 4 && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                  </span>
                ))}
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="rounded-full bg-paw-500 px-3 py-1 font-medium text-white">
                  Outcome
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. FINAL CTA ── */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <div className="flex justify-center mb-8">
                <StrayPawBadge className="h-32 w-32" />
              </div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.2rem]">
                The network grows<br />with every signal.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/60">
                Notice an animal. Report it. That single observation enters the
                demand layer, gets matched to a provider, and — when funded —
                becomes an outcome. Infrastructure works when people use it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-bark-900 transition-colors hover:bg-bark-100"
                >
                  Open the app <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/resources"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-base font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Find providers
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
