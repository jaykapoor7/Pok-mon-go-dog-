import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { SightingCard } from "@/components/feed/SightingCard";
import { getAllSightings } from "@/lib/data";

export const metadata = {
  title: "Sightings Feed — StrayPaw Delhi",
  description: "An Instagram-style feed of street dog sightings across Delhi.",
};

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const sightings = await getAllSightings();

  return (
    <div className="mx-auto max-w-xl px-4 pb-12 pt-24 sm:px-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Sightings
          </h1>
          <p className="text-sm text-bark-500">
            {sightings.length} moments from Delhi&apos;s streets
          </p>
        </div>
        <Link href="/report" className="btn-primary px-4 py-2 text-sm">
          <PlusCircle className="h-4 w-4" /> Add
        </Link>
      </header>

      {sightings.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <div className="mb-3 text-5xl">🐾</div>
          <h2 className="font-display text-lg font-bold">No sightings yet</h2>
          <p className="mt-1 text-sm text-bark-500">
            Be the very first to put a Delhi street dog on the map.
          </p>
          <Link href="/report" className="btn-primary mt-5 px-6 py-3">
            <PlusCircle className="h-4 w-4" /> Report a dog
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sightings.map((s) => (
            <SightingCard key={s.id} sighting={s} />
          ))}
        </div>
      )}
    </div>
  );
}
