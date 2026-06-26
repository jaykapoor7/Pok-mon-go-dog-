"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Utensils, Siren } from "lucide-react";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed, updateDogStatus } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";

export function DogActions({ dogId, name }: { dogId: string; name: string }) {
  const { user, requireAuth } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  // Attribution shown on the action toast (and persisted for "fed").
  const by = user?.name ? `by ${user.name}` : "";

  function fire(message: string, party = true) {
    if (party) celebrate();
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function flagForHelp() {
    requireAuth(async () => {
      try {
        const ok = await updateDogStatus(dogId, {
          status: null,
          needs_help: true,
          vaccinated: null,
          sterilised: null,
          is_friendly: null,
        });
        if (ok) {
          fire(`Flagged for help — rescuers can see ${name} now 🆘`);
        } else {
          // The RPC only lets verified contributors change a dog's status.
          fire(
            "Log a sighting for this dog first — then you can flag it for help.",
            false
          );
        }
      } catch {
        fire("Couldn't flag right now. Please try again.", false);
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            logSeen(dogId).catch(() => {});
            fire(`Seen ${name} ${by} · just now 🐾`);
          }}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Heart className="h-5 w-5 text-status-friendly" />I saw this dog
        </button>
        <button
          onClick={() => {
            logFeed(dogId, user?.name).catch(() => {});
            fire(`Meal logged for ${name} ${by} · just now 🍗`);
          }}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Utensils className="h-5 w-5 text-status-hungry" />I fed this dog
        </button>
        <button
          onClick={flagForHelp}
          className="btn-ghost flex-col gap-1 py-3 text-xs"
        >
          <Siren className="h-5 w-5 text-status-injured" />Flag for help
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
