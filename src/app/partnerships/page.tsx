import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "Partnerships, StrayPaw",
  description:
    "Everything an animal-welfare organisation needs to run day to day, in one place. Free for verified partners.",
};

const OFFERINGS = [
  { title: "Case management", body: "Community reports land in one queue, sorted by severity. Claim, assign, work and resolve, with a full activity timeline and follow-ups on every case." },
  { title: "Animal registry", body: "A living record for every animal you handle: IDs, photos, location, owner or community info, and a complete medical history." },
  { title: "Medical tracking", body: "Log vaccinations, deworming, sterilisations and wound care. Coverage and herd-immunity stats are worked out for you." },
  { title: "Field operations", body: "Coordinate field workers and volunteers, schedule vet camps, and manage the day-to-day tasks that keep rescues moving." },
  { title: "Geographic intelligence", body: "See your cases and animals on a map, spot hotspots, and plan coverage ward by ward." },
  { title: "Surveys & census", body: "Run population surveys and census drives, and turn the data into reports for municipalities and funders." },
  { title: "Fundraising", body: "Run campaigns for real needs that link straight to your own donation channel, tied to the cases donors can see." },
  { title: "Analytics & reports", body: "Resolution rates, response times and impact metrics, exportable to CSV and PDF for your board and donors." },
  { title: "A public profile", body: "A credible organisation page with your mission, verification badge, live impact, and shareable case pages." },
];

const STEPS = [
  { n: "01", t: "Apply", b: "Tell us about your organisation, the area you cover, and upload your documents. No account needed." },
  { n: "02", t: "Get verified", b: "We review every application personally before enabling the tools, so the network stays trustworthy." },
  { n: "03", t: "Set up your team", b: "Your team lead adds members and assigns roles, and your private dashboard is ready to go." },
];

export default function PartnershipsPage() {
  return (
    <MarketingShell
      wide
      eyebrow="Partnerships"
      title="Run your whole operation in one place."
      intro="Case management, an animal registry, medical records, field operations, fundraising and analytics, built for the way rescues and NGOs actually work. Free for verified partners."
    >
      {/* Free banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded border border-paw-200 bg-paw-50 p-6 dark:border-paw-500/30 dark:bg-paw-900/20 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-xl tracking-tight text-bark-900 dark:text-white">Free for verified animal-welfare organisations.</p>
          <p className="mt-1 text-sm text-bark-600 dark:text-bark-300">No subscription, no per-seat fees. Your data stays private to your team.</p>
        </div>
        <Link href="/partner-apply" className="btn-primary shrink-0 px-6 py-3 text-base">Apply to partner <ArrowRight className="h-4 w-4" /></Link>
      </div>

      {/* offerings - horizontal grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFERINGS.map((o) => (
          <div key={o.title} className="rounded border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
            <h2 className="font-display text-[17px] tracking-tight text-bark-900 dark:text-white">{o.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{o.body}</p>
          </div>
        ))}
      </div>

      {/* who it's for */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-black/[0.06] bg-white/70 p-6 dark:border-white/10 dark:bg-bark-900/50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">Who it&apos;s for</p>
          <p className="mt-2 text-[15px] leading-relaxed text-bark-700 dark:text-bark-200">
            Street-animal rescues, ABC and vaccination programmes, feeders&apos; collectives, and municipal welfare teams, from a two-person group to a city-wide operation.
          </p>
        </div>
        <div className="rounded border border-black/[0.06] bg-white/70 p-6 dark:border-white/10 dark:bg-bark-900/50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">Your data, your rules</p>
          <p className="mt-2 text-[15px] leading-relaxed text-bark-700 dark:text-bark-200">
            Each organisation gets a private dashboard. Only your team can see and manage your cases, animals and members. Nothing is shared without you.
          </p>
        </div>
      </div>

      {/* How to join - horizontal pathway */}
      <div className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">How to join</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, idx) => (
            <div key={s.n} className="relative rounded border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-paw-500">{s.n}</span>
                {idx < STEPS.length - 1 && <ArrowRight className="ml-auto hidden h-5 w-5 text-bark-300 sm:block" />}
              </div>
              <h3 className="mt-2 font-semibold tracking-tight text-bark-900 dark:text-white">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{s.b}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/partner-apply" className="btn-primary px-6 py-3.5 text-base">Apply to partner <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/contact" className="btn-ghost px-6 py-3.5 text-base">Talk to us</Link>
      </div>
    </MarketingShell>
  );
}
