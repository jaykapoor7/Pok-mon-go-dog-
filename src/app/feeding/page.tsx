import Link from "next/link";
import { ArrowLeft, Plus, Utensils } from "lucide-react";
import { getFeedingZones } from "@/lib/feeding-zones";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedingZoneCard } from "@/components/feeding/FeedingZoneCard";

export const metadata = {
  title: "Feeding zones, StrayPaw",
  description:
    "Community feeding spots for street dogs, see who's covering each one and sign up to feed.",
};

export const dynamic = "force-dynamic";

export default async function FeedingZonesPage() {
  const zones = await getFeedingZones();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/app"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tightest">Feeding zones</h1>
          <p className="mt-1 text-sm text-bark-500">
            Regular feeding spots the community keeps going, see who&apos;s covering
            each one, sign up for a day, or mark one fed today.
          </p>
        </div>
      </header>

      <Link href="/feeding/new" className="btn-primary mb-6 w-full py-3">
        <Plus className="h-4 w-4" /> Add a feeding zone
      </Link>

      {zones.length === 0 ? (
        <EmptyState
          icon={<Utensils className="h-7 w-7" />}
          title="No feeding zones yet"
          description="Add an existing spot the community feeds, a colony, a corner, a market backside."
          action={{ href: "/feeding/new", label: "Add the first one", icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <div className="space-y-3">
          {zones.map((z) => (
            <FeedingZoneCard key={z.id} zone={z} />
          ))}
        </div>
      )}
    </div>
  );
}
