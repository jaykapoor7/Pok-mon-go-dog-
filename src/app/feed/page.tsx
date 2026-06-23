import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { SightingCard } from "@/components/feed/SightingCard";
import { getAllSightings } from "@/lib/data";

export const metadata = {
  title: "Sightings Feed — StrayPaw Delhi",
  description: "An Instagram-style feed of street dog sightings across Delhi.",
};

export default function FeedPage() {
  const sightings = getAllSightings();

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
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

      <div className="space-y-6">
        {sightings.map((s) => (
          <SightingCard key={s.id} sighting={s} />
        ))}
      </div>
    </div>
  );
}
