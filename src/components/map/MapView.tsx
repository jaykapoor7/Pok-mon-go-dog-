"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MapCanvas } from "@/components/map/MapCanvas";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed } from "@/lib/actions";
import { filterDogs } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Dog, MapFilter } from "@/lib/types";

const FILTERS: { key: MapFilter; label: string; emoji: string }[] = [
  { key: "all", label: "All dogs", emoji: "🗺️" },
  { key: "recent", label: "Recent", emoji: "🕒" },
  { key: "friendly", label: "Friendly", emoji: "🥰" },
  { key: "needs_help", label: "Needs help", emoji: "🚑" },
  { key: "sterilised", label: "Sterilised", emoji: "✂️" },
  { key: "vaccinated", label: "Vaccinated", emoji: "💉" },
];

export function MapView({ dogs: allDogs }: { dogs: Dog[] }) {
  const [filter, setFilter] = useState<MapFilter>("all");
  const [toast, setToast] = useState<string | null>(null);

  const dogs = useMemo(() => filterDogs(allDogs, filter), [allDogs, filter]);

  function handleAction(dog: Dog, kind: "saw" | "fed") {
    celebrate();
    setToast(
      kind === "fed"
        ? `You logged a meal for ${dog.name} 🍗`
        : `Thanks! ${dog.name}'s last-seen was updated 🐾`
    );
    // Persist (best-effort; no-ops in local/demo mode).
    (kind === "fed" ? logFeed(dog.id) : logSeen(dog.id)).catch(() => {});
    setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      <div className="absolute inset-x-0 top-0 z-20 px-3 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "chip shrink-0 border shadow-card transition-all",
                filter === f.key
                  ? "border-paw-300 bg-paw-500 text-white"
                  : "border-white/60 bg-white/90 text-bark-700 hover:bg-white"
              )}
            >
              <span aria-hidden>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-28 right-3 z-20 md:bottom-4">
        <span className="chip bg-bark-900/85 text-white shadow-card">
          {dogs.length} {dogs.length === 1 ? "dog" : "dogs"} shown
        </span>
      </div>

      <MapCanvas dogs={dogs} onAction={handleAction} />

      {allDogs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-xs rounded-3xl bg-white/95 p-6 text-center shadow-warm">
            <div className="mb-2 text-4xl">🐾</div>
            <h2 className="font-display text-lg font-bold">No dogs yet</h2>
            <p className="mt-1 text-sm text-bark-500">
              This map is fresh. Add the first sighting to drop a pin on Delhi.
            </p>
            <Link href="/report" className="btn-primary mt-4 px-5 py-2.5 text-sm">
              Report a dog
            </Link>
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 md:bottom-6"
          >
            <div className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-bark-800 shadow-warm">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
