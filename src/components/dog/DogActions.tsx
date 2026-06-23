"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Utensils, Flag, GitMerge } from "lucide-react";
import { celebrate } from "@/lib/celebrate";

export function DogActions({ name }: { name: string }) {
  const [toast, setToast] = useState<string | null>(null);

  function fire(message: string, party = true) {
    if (party) celebrate();
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          onClick={() => fire(`Updated — you saw ${name} 🐾`)}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Heart className="h-5 w-5 text-status-friendly" />I saw this dog
        </button>
        <button
          onClick={() => fire(`Meal logged for ${name} 🍗`)}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Utensils className="h-5 w-5 text-status-hungry" />I fed this dog
        </button>
        <button
          onClick={() => fire(`Issue reported for ${name}. NGOs notified.`, false)}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Flag className="h-5 w-5 text-status-injured" />Report issue
        </button>
        <button
          onClick={() => fire(`Merge suggested — thanks for the tip!`, false)}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <GitMerge className="h-5 w-5 text-status-sterilised" />Same dog?
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
          >
            <div className="rounded-full bg-bark-900 px-5 py-3 text-sm font-semibold text-white shadow-warm">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
