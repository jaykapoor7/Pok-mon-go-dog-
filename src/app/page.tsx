import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  ClipboardList,
  HeartHandshake,
  Utensils,
  ShieldCheck,
  Building2,
  LineChart,
  Share2,
  Mail,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getCityStats, getNGOs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — Open-sourcing stray-dog care in India",
  description:
    "A community-run map and toolkit for India's street animals. Report sightings, track rescue cases, run transparent fundraising campaigns, and partner as a verified animal-welfare organization.",
};

const CONTACT_EMAIL = "jaykapoor7@outlook.com";

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50 sm:text-3xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-bark-500">{label}</div>
    </div>
  );
}

const OFFERINGS = [
  {
    icon: MapPin,
    title: "Live map & reporting",
    body: "Anyone can report a street dog in seconds — a photo and a location is enough. Every sighting lands on one shared, public map.",
  },
  {
    icon: ClipboardList,
    title: "Cases & rescue tracking",
    body: "Turn a sighting into a documented case: condition, treatment, cost and outcome — a transparent record from rescue to recovery.",
  },
  {
    icon: HeartHandshake,
    title: "Fundraisers & campaigns",
    body: "Verified organizations raise for real needs — vet medicines, sterilisation drives, an ambulance. Funds go straight to the NGO.",
  },
  {
    icon: Utensils,
    title: "Feeding zones",
    body: "Map the spots that already get fed and the volunteers who show up, so no corner and no dog gets missed.",
  },
];

const ORG_POINTS = [
  {
    icon: Building2,
    title: "A profile that builds trust",
    body: "Your mission, areas of work, verification status and live impact — a page you can send to any supporter or funder.",
  },
  {
    icon: ClipboardList,
    title: "Document every case",
    body: "Log animals, treatments, costs and outcomes with photos and a clear timeline. Your work, on the record.",
  },
  {
    icon: LineChart,
    title: "Transparent impact",
    body: "Numbers pulled from what you actually did — animals treated, cases resolved — not a marketing claim.",
  },
  {
    icon: Share2,
    title: "Bring your own supporters",
    body: "Share a campaign or case page with the people who already back you. They discover StrayPaw through your work.",
  },
];

export default async function LandingPage() {
  const [stats, ngos] = await Promise.all([getCityStats(), getNGOs()]);
  const verifiedCount = ngos.filter((n) => n.verified).length;

  const nf = new Intl.NumberFormat("en-IN");
  const heroStats = [
    { value: nf.format(stats.dogsSpotted), label: "dogs tracked" },
    { value: nf.format(stats.dogsFed), label: "care actions logged" },
    { value: nf.format(stats.dogsSterilised), label: "sterilised" },
    ...(verifiedCount > 0
      ? [{ value: nf.format(verifiedCount), label: "partner NGOs" }]
      : [{ value: nf.format(stats.volunteers), label: "volunteers" }]),
  ];

  return (
    <div className="min-h-dvh bg-paper dark:bg-ink">
      {/* ── Landing nav ── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-paper/80 backdrop-blur-md dark:border-white/10 dark:bg-ink/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="StrayPaw" className="flex items-center">
            <Logo size="md" />
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href={`mailto:${CONTACT_EMAIL}?subject=Partnering%20with%20StrayPaw`}
              className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-bark-600 transition-colors hover:text-paw-600 dark:text-bark-300 sm:inline-flex"
            >
              Partner with us
            </Link>
            <Link href="/app" className="btn-primary px-4 py-2 text-sm">
              Open app <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-paw-50 to-transparent dark:from-paw-900/20"
        />
        <div className="mx-auto max-w-3xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-paw-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-paw-700 shadow-sm dark:border-paw-800 dark:bg-bark-900/60 dark:text-paw-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paw-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-paw-500" />
            </span>
            Community-run · open data · built in India
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tightest text-bark-900 dark:text-bark-50 sm:text-6xl">
            Every street animal,
            <br className="hidden sm:block" /> on one open map.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-bark-600 dark:text-bark-300 sm:text-lg">
            StrayPaw is a shared, public platform for India&apos;s street animals —
            report a sighting, track a rescue from injury to recovery, and back the
            organizations doing the work with transparent, direct fundraising.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/app" className="btn-primary w-full px-6 py-3.5 text-base sm:w-auto">
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`mailto:${CONTACT_EMAIL}?subject=Partnering%20with%20StrayPaw`}
              className="btn-ghost w-full px-6 py-3.5 text-base sm:w-auto"
            >
              Partner as an NGO
            </Link>
          </div>

          {/* real numbers — never fabricated */}
          <div className="mx-auto mt-12 grid max-w-lg grid-cols-4 gap-3 border-t border-black/[0.06] pt-8 dark:border-white/10">
            {heroStats.map((s) => (
              <StatItem key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── What StrayPaw offers ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50 sm:text-4xl">
            One place for the whole journey of care
          </h2>
          <p className="mt-3 text-bark-600 dark:text-bark-300">
            From the first sighting on the street to a resolved case with a clear
            outcome — StrayPaw keeps it visible, shared and accountable.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERINGS.map((o) => {
            const Icon = o.icon;
            return (
              <div
                key={o.title}
                className="card card-interactive p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-bark-900 dark:text-bark-50">
                  {o.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                  {o.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── For organizations ── */}
      <section className="border-y border-black/[0.06] bg-white/60 dark:border-white/10 dark:bg-bark-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="lg:sticky lg:top-24">
              <span className="chip bg-paw-100 font-semibold text-paw-700 dark:bg-paw-900/40 dark:text-paw-300">
                <Building2 className="h-3.5 w-3.5" /> For animal-welfare organizations
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50 sm:text-4xl">
                Built for the people who show up for the animals
              </h2>
              <p className="mt-4 text-bark-600 dark:text-bark-300">
                Whether you run medical camps for working donkeys in Marathwada or
                respond to accident calls in your city, StrayPaw gives your work a
                credible home — a profile, documented cases, and campaigns you can
                share with your own supporters.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`mailto:${CONTACT_EMAIL}?subject=Partnering%20with%20StrayPaw`}
                  className="btn-primary px-6 py-3 text-base"
                >
                  <Mail className="h-4 w-4" /> Partner with StrayPaw
                </Link>
                <Link href="/dashboard" className="btn-ghost px-6 py-3 text-base">
                  See the partner dashboard
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-bark-500">
                <ShieldCheck className="h-4 w-4 text-paw-600" />
                Organizations are shown as verified only after real due diligence.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {ORG_POINTS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-black/[0.06] bg-paper p-5 dark:border-white/10 dark:bg-ink"
                  >
                    <Icon className="h-5 w-5 text-paw-600 dark:text-paw-300" />
                    <h3 className="mt-3 font-semibold text-bark-900 dark:text-bark-50">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
                      {p.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Our story ── */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <span className="chip bg-bark-100 font-semibold text-bark-600 dark:bg-bark-800 dark:text-bark-300">
          Our story
        </span>
        <div className="mt-5 space-y-5 text-lg leading-relaxed text-bark-700 dark:text-bark-200">
          <p>
            StrayPaw started with a simple frustration: the people who care for
            street animals — feeders, rescuers, small NGOs — do extraordinary work,
            but it lives in WhatsApp groups and notebooks, invisible and
            uncounted.
          </p>
          <p>
            So we built an open map. Anyone can report a dog. Anyone can see what&apos;s
            being done. The coverage and care data that used to sit locked inside
            organizations is opened up —{" "}
            <span className="font-semibold text-bark-900 dark:text-bark-50">
              for the people, by the people.
            </span>
          </p>
          <p>
            Now organizations are joining to document their cases and raise for the
            needs that matter, on a platform their supporters can trust. That&apos;s the
            next chapter — and it&apos;s just beginning.
          </p>
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-paw-200 bg-gradient-to-br from-paw-500 to-paw-700 px-6 py-12 text-center shadow-warm dark:border-paw-800 sm:px-12 sm:py-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
            Whether you spot dogs or rescue them, there&apos;s a place for you here.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="btn w-full bg-white px-6 py-3.5 text-base text-paw-700 hover:bg-white/90 sm:w-auto"
            >
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`mailto:${CONTACT_EMAIL}?subject=Partnering%20with%20StrayPaw`}
              className="btn w-full border border-white/40 bg-white/10 px-6 py-3.5 text-base text-white hover:bg-white/20 sm:w-auto"
            >
              <Mail className="h-4 w-4" /> Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/[0.06] bg-white/50 dark:border-white/10 dark:bg-bark-900/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-bark-500">
            <Link href="/app" className="hover:text-paw-600">Open app</Link>
            <Link href="/fundraisers" className="hover:text-paw-600">Fundraisers</Link>
            <Link href="/about" className="hover:text-paw-600">About</Link>
            <Link href="/privacy" className="hover:text-paw-600">Privacy</Link>
            <Link href="/terms" className="hover:text-paw-600">Terms</Link>
            <Link href={`mailto:${CONTACT_EMAIL}`} className="hover:text-paw-600">Contact</Link>
          </nav>
          <p className="text-xs text-bark-400">
            © {new Date().getFullYear()} StrayPaw
          </p>
        </div>
      </footer>
    </div>
  );
}
