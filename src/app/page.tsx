import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Search,
  Compass,
  BookOpen,
  Users,
  Heart,
  Building2,
  BadgeCheck,
} from "lucide-react";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { ScrollExperience } from "@/components/platform/hero/ScrollExperience";
import { SectionLabel, Figure, RankedBars, nf } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { ranked, nationalPoints } from "@/lib/platform/datasets";
import { ORGS } from "@/lib/platform/orgs";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw | Street-animal infrastructure for India",
  description:
    "StrayPaw connects the people, information, places, and actions around India's street animals. Report, find help, explore data, and act where it matters.",
};

/* ------------------------------------------------------------------ */
/*  V3 Homepage                                                       */
/*  HERO (3D scroll) -> PLATFORM -> DATA -> RESOURCES -> LEARN ->     */
/*  GET INVOLVED -> SCALE -> FINAL CTA                                */
/* ------------------------------------------------------------------ */

const PLATFORM_CARDS = [
  {
    icon: MapPin,
    title: "Report",
    body: "Spot a street animal that needs help? One tap creates a shared record.",
    href: "/report",
  },
  {
    icon: Search,
    title: "Find Help",
    body: "Locate nearby NGOs, vets, shelters, and rescue resources instantly.",
    href: "/resources",
  },
  {
    icon: Compass,
    title: "Explore",
    body: "Browse the live map of sightings, reports, and community activity.",
    href: "/map",
  },
  {
    icon: BookOpen,
    title: "Learn",
    body: "Practical guidance on coexisting with, caring for, and helping street animals.",
    href: "/learn",
  },
  {
    icon: Users,
    title: "Volunteer",
    body: "Find where your time matters most. Connect with organisations near you.",
    href: "/get-involved",
  },
  {
    icon: Heart,
    title: "Support",
    body: "Back the organisations doing the work. Every contribution is tracked.",
    href: "/get-involved",
  },
];

const INVOLVE_ACTIONS = [
  { label: "Report a sighting", href: "/report", primary: true },
  { label: "Find an NGO", href: "/resources" },
  { label: "Volunteer", href: "/get-involved" },
  { label: "Explore the map", href: "/map" },
  { label: "Learn about street animals", href: "/learn" },
  { label: "Share StrayPaw", href: "/" },
];

export default async function HomePage() {
  const stats = await getCityStats();
  const popPoints = ranked("dog_population", "desc");
  const popTotal = nationalPoints("dog_population")[0];
  const rabies = nationalPoints("human_rabies_deaths");
  const reported = rabies.find((p) => p.confidence === "high");
  const modelled = rabies.find((p) => p.confidence === "low");


  return (
    <div className="min-h-dvh">
      {/* Nav sits on top of the dark hero */}
      <div className="fixed left-0 right-0 top-0 z-50">
        <header className="border-b border-white/[0.07] bg-ink/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
            <Link href="/" className="shrink-0 text-lg font-bold text-white">
              StrayPaw
            </Link>
            <nav className="ml-2 hidden items-center gap-1 md:flex">
              {[
                { label: "Map", href: "/map" },
                { label: "Explore", href: "/explore" },
                { label: "Resources", href: "/resources" },
                { label: "Learn", href: "/learn" },
                { label: "About", href: "/about" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-white/50 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <Link
                href="/report"
                className="rounded-full bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600"
              >
                Report
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1-3. HERO + PROBLEM + HOW IT WORKS (scroll-driven 3D)        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ScrollExperience />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BELOW THE FOLD: light sections                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
        {/* ── 4. PLATFORM CAPABILITIES ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <SectionLabel>The platform</SectionLabel>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.6rem]">
              One surface. Every capability.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
              StrayPaw collects community reports, finds existing resources,
              connects people to the right help, presents data as actionable
              intelligence, and enables everyone to act.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CARDS.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="group rounded-2xl border border-black/[0.06] p-6 transition-all hover:-translate-y-0.5 hover:border-black/[0.1] hover:shadow-card dark:border-white/[0.08] dark:hover:border-white/[0.15]"
              >
                <c.icon className="h-5 w-5 text-paw-500" />
                <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                  {c.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-paw-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-paw-300">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 5. DATA ── */}
        <section className="border-y border-black/[0.06] bg-bark-50/50 dark:border-white/[0.06] dark:bg-ink-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <SectionLabel>Data + intelligence</SectionLabel>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Community reports become street-level intelligence.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                  Every sighting contributes to maps, statistics, trends, and
                  geographic insights. Government census data meets real-time
                  community reporting.
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
                    <SectionLabel>Explore</SectionLabel>
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

        {/* ── 6. RESOURCES ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>Resources</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                The ecosystem already has pieces. We make them findable.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                NGOs, vets, shelters, rescuers, sterilisation drives,
                volunteers. StrayPaw indexes and presents them so anyone can
                find the right help for their situation.
              </p>
              <Link
                href="/resources"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-paw-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-paw-600"
              >
                Browse resources <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {/* Listed NGOs */}
              <div className="rounded-2xl border border-black/[0.06] p-6 dark:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-bark-400" />
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    Listed organisations
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                  Discoverable public profiles. Any welfare organisation
                  working with street animals can be listed, making them
                  findable by people who need them.
                </p>
                <p className="mt-3 text-[13px] font-medium text-bark-500">
                  {ORGS.length} organisations listed
                </p>
              </div>
              {/* Verified/Partnered */}
              <div className="rounded-2xl border border-paw-200 bg-paw-50/50 p-6 dark:border-paw-800/30 dark:bg-paw-900/10">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-paw-500" />
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    Verified + partnered
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                  Verified badge, optional dashboard access, and deeper
                  StrayPaw integration. NGOs do not need to adopt StrayPaw
                  for it to be useful. Verification is an option, not a
                  requirement.
                </p>
                <p className="mt-3 text-[13px] font-medium text-paw-600 dark:text-paw-300">
                  Verification programme launching soon
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. LEARN ── */}
        <section className="border-y border-black/[0.06] dark:border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <SectionLabel>Learn</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Street-animal education that actually helps.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                Practical guidance on coexisting with street animals, what to
                do when you find an injured dog, how sterilisation drives
                work, and why this problem needs infrastructure, not just
                compassion.
              </p>
              <Link
                href="/learn"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-semibold text-bark-800 transition-colors hover:bg-bark-50 dark:border-white/[0.1] dark:text-bark-100 dark:hover:bg-white/[0.05]"
              >
                Start learning <BookOpen className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 8. GET INVOLVED ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionLabel>Get involved</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pick your entry point.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
            You do not need to be an expert, a rescuer, or have any
            experience. Notice something? That is enough.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {INVOLVE_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={
                  a.primary
                    ? "inline-flex items-center gap-2 rounded-full bg-paw-500 px-5 py-3 text-sm font-semibold text-white hover:bg-paw-600"
                    : "inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-5 py-3 text-sm font-semibold text-bark-800 transition-colors hover:bg-bark-50 dark:border-white/[0.1] dark:text-bark-100 dark:hover:bg-white/[0.05]"
                }
              >
                {a.label}
                {a.primary && <ArrowRight className="h-4 w-4" />}
              </Link>
            ))}
          </div>
        </section>

        {/* ── 9. SCALE ── */}
        <section className="border-y border-black/[0.06] bg-bark-50/50 dark:border-white/[0.06] dark:bg-ink-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>The bigger picture</SectionLabel>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.6rem]">
                One report. One story. One connection. One action. A bigger
                ecosystem.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300 sm:text-base">
                Every observation feeds the picture. Every connection
                strengthens the network. StrayPaw grows with every person
                who notices and every organisation that participates. The
                infrastructure gets better the more people use it.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3 text-sm text-bark-400">
                <span className="rounded-full bg-paw-100 px-3 py-1 font-medium text-paw-700 dark:bg-paw-900/20 dark:text-paw-300">
                  Collect
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full bg-paw-100 px-3 py-1 font-medium text-paw-700 dark:bg-paw-900/20 dark:text-paw-300">
                  Find
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full bg-paw-100 px-3 py-1 font-medium text-paw-700 dark:bg-paw-900/20 dark:text-paw-300">
                  Connect
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full bg-paw-100 px-3 py-1 font-medium text-paw-700 dark:bg-paw-900/20 dark:text-paw-300">
                  Present
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full bg-paw-500 px-3 py-1 font-medium text-white">
                  Act
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. FINAL CTA ── */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.2rem]">
                See something?
                <br />
                Start there.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/60">
                You do not need permission to care. If you notice a street
                animal, that single observation is the beginning of its
                record and its connection to help.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/report"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-bark-900 transition-colors hover:bg-bark-100"
                >
                  Report a sighting <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-base font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Explore the map
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
