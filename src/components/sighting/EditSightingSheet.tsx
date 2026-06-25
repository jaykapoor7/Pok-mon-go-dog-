"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { updateMySighting } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { MOOD_META, type MoodTag } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOODS = Object.keys(MOOD_META) as MoodTag[];

export interface SightingEditValues {
  nickname: string | null;
  mood_tags: MoodTag[];
  notes: string | null;
}

/**
 * Bottom sheet to edit your own sighting (nickname, mood tags, notes).
 * Calls update_my_sighting, which is authorised by your signed-in session.
 */
export function EditSightingSheet({
  open,
  sightingId,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  sightingId: string;
  initial: SightingEditValues;
  onClose: () => void;
  onSaved: (next: SightingEditValues) => void;
}) {
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [moods, setMoods] = useState<MoodTag[]>(initial.mood_tags);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMood(m: MoodTag) {
    setMoods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const ok = await updateMySighting(sightingId, {
        nickname: nickname.trim() || null,
        moods,
        notes: notes.trim() || null,
      });
      if (!ok) {
        setError("You can only edit your own sightings while signed in.");
        haptic("error");
        setBusy(false);
        return;
      }
      haptic("success");
      onSaved({
        nickname: nickname.trim() || null,
        mood_tags: moods,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      haptic("error");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">Edit sighting</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-bark-400 hover:bg-bark-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-xs font-semibold text-bark-500">
              Nickname
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Brownie"
              className="mb-4 w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
            />

            <p className="mb-1.5 text-xs font-semibold text-bark-500">Mood</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const on = moods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMood(m)}
                    className={cn(
                      "chip border transition-colors",
                      on
                        ? "border-paw-400 bg-paw-100 text-paw-700"
                        : "border-bark-200 text-bark-600 dark:border-white/10 dark:text-bark-200"
                    )}
                  >
                    {MOOD_META[m].emoji} {MOOD_META[m].label}
                  </button>
                );
              })}
            </div>

            <label className="mb-1 block text-xs font-semibold text-bark-500">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything helpful for others…"
              className="mb-4 w-full resize-none rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
            />

            {error && (
              <p className="mb-3 text-sm font-medium text-status-injured">{error}</p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost flex-1 py-3">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="btn-primary flex-1 py-3"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
