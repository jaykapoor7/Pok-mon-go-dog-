"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { SightingCard } from "@/components/feed/SightingCard";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import type { Sighting } from "@/lib/types";

/**
 * Renders the feed. Demo sightings are only included when Demo Mode is on
 * (shared toggle), so turning demo off removes them here too.
 */
export function FeedList({ real, demo }: { real: Sighting[]; demo: Sighting[] }) {
  const { demoOn } = useDemoMode();

  const sightings = (demoOn ? [...real, ...demo] : real).sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );

  if (sightings.length === 0) {
    return (
      <div className="card mt-2 p-10 text-center">
        <div className="mb-3 text-5xl">🐾</div>
        <h2 className="font-display text-lg font-bold">No sightings yet</h2>
        <p className="mt-1 text-sm text-bark-500">
          Be the very first to put a street dog on the map.
        </p>
        <Link href="/report" className="btn-primary mt-5 px-6 py-3">
          <PlusCircle className="h-4 w-4" /> Report a dog
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-bark-500">
        {sightings.length} moments from India&apos;s streets
      </p>
      <div className="space-y-6">
        {sightings.map((s) => (
          <SightingCard key={s.id} sighting={s} />
        ))}
      </div>
    </>
  );
}
