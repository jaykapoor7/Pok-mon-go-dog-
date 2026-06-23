import { CountUp } from "@/components/ui/CountUp";
import type { CityStats } from "@/lib/types";

const ITEMS: { key: keyof CityStats; label: string; emoji: string }[] = [
  { key: "dogsSpotted", label: "Dogs spotted", emoji: "🐕" },
  { key: "dogsFed", label: "Meals logged", emoji: "🍗" },
  { key: "dogsSterilised", label: "Sterilised", emoji: "✂️" },
  { key: "dogsVaccinated", label: "Vaccinated", emoji: "💉" },
];

export function StatsStrip({ stats }: { stats: CityStats }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {ITEMS.map((item) => (
          <div
            key={item.key}
            className="card flex flex-col items-center justify-center gap-1 p-5 text-center"
          >
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            <CountUp
              value={stats[item.key]}
              className="font-display text-2xl font-extrabold text-bark-900 sm:text-3xl"
            />
            <span className="text-xs font-medium text-bark-500">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
