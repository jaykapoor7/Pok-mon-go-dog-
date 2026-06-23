import Link from "next/link";
import { ArrowRight, Camera, MapPinned, Sparkles } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { SightingCard } from "@/components/feed/SightingCard";
import { getAllDogs, getCityStats, getRecentSightings } from "@/lib/data";

const STEPS = [
  {
    icon: Camera,
    title: "Spot & snap",
    body: "See a dog on the street? Take a photo. Your location is added automatically.",
  },
  {
    icon: Sparkles,
    title: "We aggregate",
    body: "Sightings cluster into a single dog profile — tracking health, feeding and care over time.",
  },
  {
    icon: MapPinned,
    title: "Help happens",
    body: "NGOs see who needs feeding, vaccination or rescue, and act on the ground.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dogs, stats, recent] = await Promise.all([
    getAllDogs(),
    getCityStats(),
    getRecentSightings(6),
  ]);

  return (
    <div>
      <Hero dogs={dogs} />
      <StatsStrip stats={stats} />

      {/* how it works */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="card p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paw-100 text-paw-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-sm font-bold text-bark-300">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-bark-600">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* recent sightings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Recent sightings
            </h2>
            <p className="text-sm text-bark-500">
              Fresh from the community, across Delhi
            </p>
          </div>
          <Link
            href="/feed"
            className="hidden items-center gap-1 text-sm font-semibold text-paw-600 hover:text-paw-700 sm:flex"
          >
            See the feed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((s) => (
            <SightingCard key={s.id} sighting={s} />
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link href="/feed" className="btn-ghost px-6 py-3">
            See the full feed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-paw-500 to-status-friendly p-8 text-center text-white shadow-warm sm:p-14">
          <div className="pointer-events-none absolute -right-8 -top-8 text-9xl opacity-20">
            🐾
          </div>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Be the reason a dog gets seen.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/90">
            It takes ten seconds. One photo can mean a meal, a vaccine, or a
            rescue for a dog who has no one else.
          </p>
          <Link
            href="/report"
            className="btn mt-6 bg-white px-8 py-3 text-paw-600 hover:bg-paw-50"
          >
            Report your first dog <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-bark-100 py-8 text-center text-sm text-bark-400">
        <p>
          StrayPaw Delhi — built with 🧡 for the city&apos;s street dogs.
        </p>
        <p className="mt-1 text-xs">
          A community map · feeding · vaccination · sterilisation · rescue
        </p>
      </footer>
    </div>
  );
}
