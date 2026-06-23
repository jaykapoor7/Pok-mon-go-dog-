"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Share2,
  Flag,
  Heart,
  Utensils,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { markerMetaFor } from "@/lib/marker-state";
import { timeAgo } from "@/lib/utils";
import type { Dog } from "@/lib/types";

export function DogBottomSheet({
  dog,
  onClose,
  onAction,
}: {
  dog: Dog | null;
  onClose: () => void;
  onAction?: (dog: Dog, kind: "saw" | "fed") => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    if (!dog) return;
    const url = `${window.location.origin}/dog/${dog.id}`;
    const data = {
      title: `${dog.name} — StrayPaw Delhi`,
      text: `Meet ${dog.name}, a street dog around ${dog.zone}.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied to clipboard");
    } catch {
      /* user dismissed share sheet — ignore */
    }
  }

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2400);
  }

  const meta = dog ? markerMetaFor(dog) : null;

  const tags = dog
    ? [
        dog.is_friendly && "Friendly",
        dog.vaccinated && "Vaccinated",
        dog.sterilised && "Sterilised",
        dog.size && dog.size[0].toUpperCase() + dog.size.slice(1),
      ].filter(Boolean) as string[]
    : [];

  return (
    <AnimatePresence>
      {dog && meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-warm dark:bg-bark-900 sm:rounded-3xl"
          >
            {/* grab handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1.5 w-10 rounded-full bg-bark-200 dark:bg-bark-700" />
            </div>

            {/* image */}
            <div className="relative mx-3 mt-2 overflow-hidden rounded-2xl">
              <DogPhoto
                src={dog.cover_photo}
                alt={dog.name ?? "Street dog"}
                seed={dog.id}
                className="h-44 w-full"
              />
              <span
                className="chip absolute left-2 top-2 text-white shadow"
                style={{ backgroundColor: meta.color }}
              >
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div>
                <h2 className="font-display text-xl font-extrabold">
                  {dog.name ?? "Unnamed dog"}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bark-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {dog.zone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Last seen {timeAgo(dog.last_seen)}
                  </span>
                </div>
              </div>

              {/* tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="chip bg-bark-100 text-bark-600 dark:bg-bark-800 dark:text-bark-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* share + report */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={share} className="btn-ghost py-2.5 text-sm">
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button
                  onClick={() => flash("Thanks — flagged for review 🙏")}
                  className="btn-ghost py-2.5 text-sm"
                >
                  <Flag className="h-4 w-4" /> Report
                </button>
              </div>

              {/* secondary quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAction?.(dog, "saw")}
                  className="btn-ghost py-2.5 text-sm"
                >
                  <Heart className="h-4 w-4 text-status-friendly" /> I saw this
                </button>
                <button
                  onClick={() => onAction?.(dog, "fed")}
                  className="btn-ghost py-2.5 text-sm"
                >
                  <Utensils className="h-4 w-4 text-status-hungry" /> I fed this
                </button>
              </div>

              <Link href={`/dog/${dog.id}`} className="btn-primary w-full py-3">
                View full profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* inline toast */}
          <AnimatePresence>
            {note && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2"
              >
                <span className="flex items-center gap-2 rounded-full bg-bark-900 px-4 py-2.5 text-sm font-semibold text-white shadow-warm">
                  <Check className="h-4 w-4" /> {note}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
