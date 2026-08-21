import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — a home for India's street animals",
  description:
    "A community-run map and toolkit for India's street animals. Report sightings, track rescues, and back the organizations doing the work.",
};

const MAILTO = "mailto:jaykapoor7@outlook.com?subject=Partnering%20with%20StrayPaw";

export default async function LandingPage() {
  const stats = await getCityStats();
  const nf = new Intl.NumberFormat("en-IN");

  return (
    // A single viewport — no scrolling. The pill nav links out to the story pages.
    <div className="relative flex h-dvh flex-col overflow-hidden bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
      <MarketingNav />

      {/* soft cerulean glow — the one accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paw-300/40 blur-[120px] dark:bg-paw-600/25"
      />

      <main className="relative flex flex-1 items-center justify-center px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-bark-600 shadow-sm dark:border-white/10 dark:bg-bark-900/60 dark:text-bark-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paw-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-paw-500" />
            </span>
            Built in India · community-run · open
          </span>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tightest sm:text-7xl">
            A home for
            <br />
            street animals.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-bark-600 dark:text-bark-300 sm:text-lg">
            Report a stray, follow a rescue from injury to recovery, and back the
            people doing the work — all on one open map.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/app" className="btn-primary px-7 py-3.5 text-base">
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={MAILTO} className="btn-ghost px-6 py-3.5 text-base">
              <Mail className="h-4 w-4" /> For NGOs
            </a>
          </div>

          <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-8">
            <Stat value={nf.format(stats.dogsSpotted)} label="tracked" />
            <span className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
            <Stat value={nf.format(stats.dogsFed)} label="care actions" />
            <span className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
            <Stat value={nf.format(stats.dogsSterilised)} label="sterilised" />
          </div>
        </div>
      </main>

      <footer className="relative flex items-center justify-center gap-x-5 gap-y-1 pb-5 text-xs text-bark-400">
        <Link href="/what-we-do" className="hover:text-paw-600">What we do</Link>
        <Link href="/journey" className="hover:text-paw-600">Our journey</Link>
        <Link href="/orgs" className="hover:text-paw-600">Organizations</Link>
        <span>© {new Date().getFullYear()} StrayPaw</span>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold tracking-tightest">{value}</div>
      <div className="text-xs text-bark-500">{label}</div>
    </div>
  );
}
