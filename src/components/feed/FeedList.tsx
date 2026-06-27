"use client";

import { PawPrint, PlusCircle } from "lucide-react";
import { SightingCard } from "@/components/feed/SightingCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <EmptyState
        icon={<PawPrint className="h-7 w-7" />}
        title="No sightings yet"
        description="Be the very first to put a street dog on the map."
        action={{ href: "/report", label: "Report a dog", icon: <PlusCircle className="h-4 w-4" /> }}
      />
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
