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
import { markerMetaFor, fedRecently } from "@/lib/marker-state";
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
      title: `${dog.name} — StrayPaw`,
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
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-sheet dark:bg-bark-900 sm:rounded-[28px]"
          >
            {/* grab handle */}
            <div className="flex justify-center pb-1 pt-3">
              <span className="h-1 w-9 rounded-full bg-bark-300/70 dark:bg-bark-600" />
            </div>

            {/* image */}
            <div className="relative mx-4 mt-2 overflow-hidden rounded-[20px]">
              <DogPhoto
                src={dog.cover_photo}
                alt={dog.name ?? "Street dog"}
                seed={dog.id}
                className="h-48 w-full"
              />
              <span
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight tracking-tightest">
                  {dog.name ?? "Unnamed dog"}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-bark-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {dog.zone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> Seen {timeAgo(dog.last_seen)}
                  </span>
                </div>
                {/* time-aware feeding status */}
                <div className="mt-2">
                  {fedRecently(dog) ? (
                    <span className="chip bg-status-vaccinated/15 font-semibold text-status-vaccinated">
                      <Utensils className="h-3.5 w-3.5" /> Fed {timeAgo(dog.last_fed_at!)}
                    </span>
                  ) : (
                    <span className="chip bg-status-hungry/15 font-semibold text-status-hungry">
                      <Utensils className="h-3.5 w-3.5" />
                      {dog.last_fed_at ? `Needs feeding · last fed ${timeAgo(dog.last_fed_at)}` : "Not fed yet"}
                    </span>
                  )}
                </div>
              </div>

              {/* note (human-written) */}
              {dog.community_notes[0] && (
                <p className="rounded-2xl bg-bark-900/[0.04] px-4 py-3 text-sm text-bark-700 dark:bg-white/[0.05] dark:text-bark-200">
                  “{dog.community_notes[0]}”
                </p>
              )}

              {/* tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="chip bg-bark-900/[0.05] text-bark-600 dark:bg-white/[0.06] dark:text-bark-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <Link href={`/dog/${dog.id}`} className="btn-primary w-full py-3.5">
                View full profile <ArrowRight className="h-4 w-4" />
              </Link>

              {/* actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={share} className="btn-ghost py-3 text-sm">
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button
                  onClick={() => flash("Thanks — flagged for review 🙏")}
                  className="btn-ghost py-3 text-sm"
                >
                  <Flag className="h-4 w-4" /> Report
                </button>
                <button
                  onClick={() => onAction?.(dog, "saw")}
                  className="btn-ghost py-3 text-sm"
                >
                  <Heart className="h-4 w-4 text-status-friendly" /> I saw this
                </button>
                <button
                  onClick={() => onAction?.(dog, "fed")}
                  className="btn-ghost py-3 text-sm"
                >
                  <Utensils className="h-4 w-4 text-status-hungry" /> I fed this
                </button>
              </div>
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
