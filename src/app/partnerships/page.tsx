import Link from "next/link";
import {
  ClipboardList, PawPrint, Users, Map as MapIcon, ClipboardCheck, Stethoscope,
  HeartHandshake, FileBarChart, ShieldCheck, ArrowRight, Building2,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "Partnerships, StrayPaw",
  description:
    "What StrayPaw offers animal-welfare organizations: a full operations dashboard, case management, an animal registry, field ops, fundraising, analytics, and a public profile, free for verified NGOs.",
};

const OFFERINGS = [
  { icon: ClipboardList, title: "Case management", body: "Incoming community reports land in one queue, sorted by severity. Claim, assign, work, and resolve, with a full activity timeline and follow-ups on every case." },
  { icon: PawPrint, title: "Animal registry", body: "A living record for every animal you handle: IDs, photos, location, owner or community info, and a complete medical history in one place." },
  { icon: Stethoscope, title: "Medical tracking", body: "Log vaccinations, deworming, sterilisations, and wound care. Coverage and herd-immunity stats are calculated for you." },
  { icon: Users, title: "Field operations", body: "Coordinate field workers and volunteers, schedule vet camps, and manage the day-to-day tasks that keep rescues moving." },
  { icon: MapIcon, title: "Geographic intelligence", body: "See your cases and animals on a map, spot hotspots, and plan coverage ward by ward." },
  { icon: ClipboardCheck, title: "Surveys & census", body: "Run population surveys and census drives, and turn the data into reports for municipalities and funders." },
  { icon: HeartHandshake, title: "Fundraising", body: "Run campaigns for real needs that link straight to your own donation channel, tied to the cases donors can actually see." },
  { icon: FileBarChart, title: "Analytics & reports", body: "Resolution rates, response times, and impact metrics, exportable to CSV and PDF for your board and your donors." },
  { icon: Building2, title: "A public profile", body: "A credible organization page with your mission, verification badge, live impact, and shareable case and campaign pages." },
];

const STEPS = [
  { n: "01", t: "Request access", b: "Tell us about your organization and the area you cover. It takes a couple of minutes." },
  { n: "02", t: "Get verified", b: "We review each partner before enabling the operations tools, so the network stays trustworthy." },
  { n: "03", t: "Set up your team", b: "Your team lead adds members and assigns roles, and your secluded dashboard is ready to go." },
];

export default function PartnershipsPage() {
  return (
    <MarketingShell
      eyebrow="Partnerships"
      title="An operating system for animal-welfare organizations."
      intro="StrayPaw gives NGOs and rescues a real operations tool, not a generic admin panel. Everything below is included, free for verified partners."
    >
      {/* offerings */}
      <div className="grid gap-3 sm:grid-cols-2">
        {OFFERINGS.map((o) => {
          const Icon = o.icon;
          return (
            <div key={o.title} className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 dark:border-white/10 dark:bg-bark-900/40">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-paw-400 to-paw-600 text-white shadow-warm">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h2 className="mt-3 font-semibold tracking-tight text-bark-900 dark:text-bark-50">{o.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{o.body}</p>
            </div>
          );
        })}
      </div>

      {/* who it's for */}
      <div className="mt-10 rounded-2xl border border-black/[0.06] bg-white/60 p-6 dark:border-white/10 dark:bg-bark-900/40">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-bark-400">Who it&apos;s for</p>
        <p className="mt-2 text-[15px] leading-relaxed text-bark-700 dark:text-bark-200">
          Street-animal rescues, ABC and vaccination programmes, feeders&apos; collectives, and municipal welfare teams, from a two-person group to a city-wide operation. Your data stays your own: each organization gets a secluded dashboard, and only your team can see and manage your work.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-paw-700 dark:text-paw-300">
          <ShieldCheck className="h-4 w-4" /> Verified, secluded per organization, and free to use.
        </div>
      </div>

      {/* how to join */}
      <div className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-bark-400">How to join</p>
        <ol className="relative mt-4">
          {STEPS.map((s, idx) => {
            const last = idx === STEPS.length - 1;
            return (
              <li key={s.n} className="relative flex gap-4 pb-6 last:pb-0">
                {!last && <span aria-hidden className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px -translate-x-1/2 bg-gradient-to-b from-paw-300/70 to-paw-200/0 dark:from-paw-500/40" />}
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paw-50 font-mono text-[12px] font-semibold text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">{s.n}</span>
                <div className="flex-1 pt-1.5">
                  <h3 className="font-semibold tracking-tight text-bark-900 dark:text-bark-50">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{s.b}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/partner" className="btn-primary px-6 py-3.5 text-base">
          Request partner access <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/contact" className="btn-ghost px-6 py-3.5 text-base">
          Talk to us
        </Link>
      </div>
    </MarketingShell>
  );
}
