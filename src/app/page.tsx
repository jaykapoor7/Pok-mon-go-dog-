import Link from "next/link";
import { ArrowRight, MapPin, ClipboardList, HeartHandshake, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — a home for India's street animals",
  description:
    "A community-run map and toolkit for India's street animals. Report sightings, track rescues, and back the organizations doing the work.",
};

const CONTACT_EMAIL = "jaykapoor7@outlook.com";
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=Partnering%20with%20StrayPaw`;

const NAV = [
  { label: "What we do", href: "#what" },
  { label: "Our journey", href: "#journey" },
  { label: "About", href: "#journey" },
  { label: "Contact", href: "#contact" },
];

export default async function LandingPage() {
  const stats = await getCityStats();
  const nf = new Intl.NumberFormat("en-IN");

  return (
    <div className="min-h-dvh bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
      {/* ── Floating bubble nav ── */}
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav className="glass flex items-center gap-1 rounded-full border border-black/[0.06] py-1.5 pl-2 pr-1.5 shadow-card dark:border-white/10">
          <Link href="/" aria-label="StrayPaw" className="px-1.5">
            <Logo size="sm" />
          </Link>
          <div className="mx-1 hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-bark-600 transition-colors hover:bg-black/[0.05] hover:text-bark-900 dark:text-bark-300 dark:hover:bg-white/[0.06] dark:hover:text-bark-50"
              >
                {n.label}
              </a>
            ))}
          </div>
          <Link href="/app" className="btn-primary px-4 py-2 text-sm">
            Open app <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>

      {/* ── Hero (single screen) ── */}
      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
        {/* soft cerulean glow — one tasteful accent, not gradient slop */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paw-300/40 blur-[120px] dark:bg-paw-600/25"
        />
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
              For NGOs
            </a>
          </div>

          {/* three real numbers, understated */}
          <div className="mx-auto mt-14 flex max-w-md items-center justify-center gap-8 text-center">
            <div>
              <div className="font-display text-2xl font-extrabold tracking-tightest">{nf.format(stats.dogsSpotted)}</div>
              <div className="text-xs text-bark-500">tracked</div>
            </div>
            <div className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
            <div>
              <div className="font-display text-2xl font-extrabold tracking-tightest">{nf.format(stats.dogsFed)}</div>
              <div className="text-xs text-bark-500">care actions</div>
            </div>
            <div className="h-8 w-px bg-black/[0.08] dark:bg-white/10" />
            <div>
              <div className="font-display text-2xl font-extrabold tracking-tightest">{nf.format(stats.dogsSterilised)}</div>
              <div className="text-xs text-bark-500">sterilised</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What we do (compact) ── */}
      <section id="what" className="mx-auto max-w-4xl scroll-mt-24 px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tightest">What we do</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, title: "Spot & report", body: "A photo and a location puts any street animal on the shared map in seconds." },
            { icon: ClipboardList, title: "Track rescues", body: "Every case documented — condition, treatment, cost and outcome." },
            { icon: HeartHandshake, title: "Back the work", body: "Verified organizations raise for real needs, straight to their own channels." },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{c.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Our journey (short) ── */}
      <section id="journey" className="mx-auto max-w-2xl scroll-mt-24 px-5 py-16 text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tightest">Our journey</h2>
        <p className="mt-5 text-lg leading-relaxed text-bark-600 dark:text-bark-300">
          The people who care for street animals do extraordinary work that lives
          in WhatsApp groups and notebooks — invisible and uncounted. StrayPaw
          started as one open map to change that. Now organizations are joining to
          document their cases and raise for what matters, on a platform their
          supporters can trust.
        </p>
        <p className="mt-4 font-display text-lg font-bold tracking-tight text-paw-600 dark:text-paw-300">
          For the animals — for the people, by the people.
        </p>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="mx-auto max-w-2xl scroll-mt-24 px-5 pb-20">
        <div className="rounded-3xl border border-black/[0.06] bg-white/70 p-8 text-center dark:border-white/10 dark:bg-bark-900/50 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tightest sm:text-3xl">
            Run an animal-welfare organization?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-bark-600 dark:text-bark-300">
            Bring your work to StrayPaw — a profile, documented cases, and
            campaigns you can share with your own supporters.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={MAILTO} className="btn-primary px-6 py-3 text-base">
              <Mail className="h-4 w-4" /> Talk to us
            </a>
            <Link href="/orgs" className="btn-ghost px-6 py-3 text-base">
              See organizations
            </Link>
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center gap-3 text-center">
          <Logo size="sm" />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-bark-500">
            <Link href="/app" className="hover:text-paw-600">Open app</Link>
            <Link href="/orgs" className="hover:text-paw-600">Organizations</Link>
            <Link href="/fundraisers" className="hover:text-paw-600">Fundraisers</Link>
            <Link href="/privacy" className="hover:text-paw-600">Privacy</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-paw-600">Contact</a>
          </nav>
          <p className="text-xs text-bark-400">© {new Date().getFullYear()} StrayPaw</p>
        </footer>
      </section>
    </div>
  );
}
