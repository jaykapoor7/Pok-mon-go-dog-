"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { STATUS_META, type Dog } from "@/lib/types";
import { projectToBox, DELHI_ZONES } from "@/lib/delhi";
import { DogQuickCard } from "./DogQuickCard";

/**
 * Zero-dependency stylised map of Delhi. Renders when no Mapbox token is
 * configured so the map experience never breaks. Pins are projected into the
 * Delhi bounding box; tapping one opens the same quick card as the real map.
 */
export function FallbackMap({
  dogs,
  onAction,
}: {
  dogs: Dog[];
  onAction?: (dog: Dog, kind: "saw" | "fed") => void;
}) {
  const [active, setActive] = useState<Dog | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e8efe6]">
      {/* faux terrain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #f0f4ec 0, #e3ebe0 60%), repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 40px)",
        }}
      />
      {/* Yamuna river */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M62 0 C 58 20, 70 35, 64 50 C 58 65, 68 85, 60 100"
          stroke="#a5c8e1"
          strokeWidth="3.5"
          fill="none"
          opacity="0.7"
          strokeLinecap="round"
        />
        <path
          d="M0 70 C 25 64, 45 72, 70 60 C 85 53, 95 58, 100 54"
          stroke="#cdd9c4"
          strokeWidth="6"
          fill="none"
          opacity="0.5"
        />
      </svg>

      {/* zone labels */}
      {DELHI_ZONES.map((z) => {
        const { x, y } = projectToBox(z.lat, z.lng);
        return (
          <span
            key={z.name}
            className="pointer-events-none absolute -translate-x-1/2 text-[9px] font-medium text-bark-400"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            {z.name}
          </span>
        );
      })}

      {/* dog pins */}
      {dogs.map((dog) => {
        const { x, y } = projectToBox(dog.lat, dog.lng);
        const meta = STATUS_META[dog.status];
        return (
          <button
            key={dog.id}
            onClick={() => setActive(dog)}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 hover:z-20 focus:z-20"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            aria-label={`${dog.name} — ${meta.label}`}
          >
            {dog.needs_help && (
              <span
                className="absolute inset-0 -z-10 rounded-full animate-pulse-ring"
                style={{ backgroundColor: meta.color }}
              />
            )}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm shadow-md"
              style={{ backgroundColor: meta.color }}
            >
              {meta.emoji}
            </span>
          </button>
        );
      })}

      {/* legend */}
      <div className="absolute left-3 top-3 glass rounded-2xl px-3 py-2 text-[10px] shadow-card">
        <p className="mb-1 font-semibold text-bark-700">Stylised map</p>
        <p className="text-bark-400">Add a Mapbox token for the live map</p>
      </div>

      {/* quick card */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-end justify-center bg-black/30 p-4 sm:items-center"
            onClick={() => setActive(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <DogQuickCard
                dog={active}
                onAction={(kind) => onAction?.(active, kind)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
