import Link from "next/link";
import { ArrowRight, MapPin, ClipboardList, HeartHandshake, Mail, Building2, LineChart, Share2 } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SlideDeck } from "@/components/marketing/SlideDeck";
import { FlipBoard } from "@/components/marketing/FlipBoard";
import { AnimalMark } from "@/components/brand/Logo";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — a home for India's street animals",
  description:
    "A community-run map and operations platform for India's street animals — report sightings, track rescues, and back the organizations doing the work.",
};

const MAILTO = "/contact";

export default async function LandingPage() {
  const stats = await getCityStats();
  const nf = new Intl.NumberFormat("en-IN");

  const slides = [
    // 1 — Cover
    <div key="cover" className="mx-auto max-w-2xl text-center">
      <span className="mx-auto mb-7 block h-20 w-20 overflow-hidden rounded-3xl shadow-warm sm:h-24 sm:w-24">
        <AnimalMark className="h-full w-full" />
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-bark-600 shadow-sm dark:border-white/10 dark:bg-bark-900/60 dark:text-bark-300">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paw-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-paw-500" /></span>
        Built in India · community-run · open
      </span>
      <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tightest sm:text-7xl">
        A home for<br />street animals.
      </h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-bark-600 dark:text-bark-300 sm:text-lg">
        Report a stray, follow a rescue from injury to recovery, and back the people doing the work — all on one open platform.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/app" className="btn-primary px-7 py-3.5 text-base">Open the app <ArrowRight className="h-4 w-4" /></Link>
        <a href={MAILTO} className="btn-ghost px-6 py-3.5 text-base"><Mail className="h-4 w-4" /> For NGOs</a>
      </div>
      <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-8">
        <Stat value={nf.format(stats.dogsSpotted)} label="tracked" />
        <span className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
        <Stat value={nf.format(stats.dogsFed)} label="care actions" />
        <span className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
        <Stat value={nf.format(stats.dogsSterilised)} label="sterilised" />
      </div>
    </div>,

    // 2 — What we do
    <div key="what" className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">What we do</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">The whole journey of care, in one place.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MapPin, t: "Spot & report", b: "A photo and a location puts any street animal on the shared map in seconds." },
          { icon: ClipboardList, t: "Track rescues", b: "Every case documented — condition, treatment, cost, a photo timeline and an outcome." },
          { icon: HeartHandshake, t: "Back the work", b: "Verified organizations raise for real needs, straight to their own channels." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.t} className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{c.b}</p>
            </div>
          );
        })}
      </div>
    </div>,

    // 3 — For organizations
    <div key="orgs" className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <span className="chip bg-paw-100 font-semibold text-paw-700 dark:bg-paw-900/40 dark:text-paw-300"><Building2 className="h-3.5 w-3.5" /> For animal-welfare organizations</span>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">The operating system for field animal care.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Building2, t: "A profile that builds trust", b: "Mission, verification, and live impact — a page you can send any funder." },
          { icon: ClipboardList, t: "Cases, animals & medical", b: "Individual records, treatment logs, follow-ups and outcomes — your work, on the record." },
          { icon: LineChart, t: "Census & analytics", b: "Ward-level surveys, coverage maps and reports for municipalities and donors." },
          { icon: Share2, t: "Bring your own supporters", b: "Share a campaign or case page with the people who already back you." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.t} className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
              <Icon className="h-5 w-5 text-paw-600 dark:text-paw-300" />
              <h3 className="mt-3 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{c.b}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-7 text-center">
        <a href={MAILTO} className="btn-primary px-6 py-3 text-base"><Mail className="h-4 w-4" /> Partner with StrayPaw</a>
      </div>
    </div>,

    // 4 — Our journey
    <div key="journey" className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">Our journey</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">Making invisible work visible.</h2>
      <p className="mt-6 text-lg leading-relaxed text-bark-600 dark:text-bark-300">
        The people who care for street animals do extraordinary work that lives in WhatsApp groups and notebooks — uncounted. StrayPaw started as one open map to change that. Now organizations are joining to document their cases and raise for what matters, on a platform their supporters can trust.
      </p>
      <p className="mt-5 font-display text-lg font-bold tracking-tight text-paw-600 dark:text-paw-300">For the animals — for the people, by the people.</p>
    </div>,

    // 5 — Contact
    <div key="contact" className="mx-auto max-w-xl text-center">
      <span className="mx-auto mb-6 block h-14 w-14 overflow-hidden rounded-2xl shadow-warm"><AnimalMark className="h-full w-full" /></span>
      <h2 className="font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">Let&apos;s get to work.</h2>
      <p className="mx-auto mt-4 max-w-md text-bark-600 dark:text-bark-300">Spot dogs, rescue them, or run an organization — there&apos;s a place for you here.</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/app" className="btn-primary px-6 py-3.5 text-base">Open the app <ArrowRight className="h-4 w-4" /></Link>
        <a href={MAILTO} className="btn-ghost px-6 py-3.5 text-base"><Mail className="h-4 w-4" /> Talk to us</a>
      </div>
      <div className="mt-8 flex items-center justify-center gap-5 text-sm text-bark-400">
        <Link href="/orgs" className="hover:text-paw-600">Organizations</Link>
        <Link href="/fundraisers" className="hover:text-paw-600">Fundraisers</Link>
        <Link href="/what-we-do" className="hover:text-paw-600">What we do</Link>
      </div>
    </div>,
  ];

  return (
    <>
      <MarketingNav />
      <SlideDeck slides={slides} />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <FlipBoard value={value} className="text-xl font-bold tabular-nums sm:text-2xl" />
      <div className="mt-2 text-xs text-bark-500">{label}</div>
    </div>
  );
}
