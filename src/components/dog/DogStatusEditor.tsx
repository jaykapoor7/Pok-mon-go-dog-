"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, Loader2, Check } from "lucide-react";
import { updateDogStatus } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { haptic } from "@/lib/haptics";
import { STATUS_META, type DogStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES = Object.keys(STATUS_META) as DogStatus[];

interface DogStatusState {
  status: DogStatus;
  needs_help: boolean;
  vaccinated: boolean;
  sterilised: boolean;
  is_friendly: boolean;
}

/**
 * Lets a signed-in contributor (someone who has reported a sighting for this
 * dog) update its care status. Only rendered for contributors; the RPC also
 * re-checks ownership server-side via auth.uid().
 */
export function DogStatusEditor({
  dogId,
  contributorIds,
  initial,
}: {
  dogId: string;
  contributorIds: string[];
  initial: DogStatusState;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DogStatusState>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = Boolean(user && contributorIds.includes(user.id));
  if (!canEdit) return null;

  function set<K extends keyof DogStatusState>(key: K, value: DogStatusState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const ok = await updateDogStatus(dogId, state);
      if (!ok) {
        setError("Only contributors can update this dog (sign in on the device you posted from).");
        haptic("error");
        setBusy(false);
        return;
      }
      haptic("success");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      haptic("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-paw-200 bg-paw-50 px-4 py-3 text-sm font-semibold text-paw-700 dark:border-white/10 dark:bg-bark-800 dark:text-paw-300"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Update this dog&apos;s status
        </span>
        <span className="text-xs text-paw-500">{open ? "Hide" : "Edit"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card mt-3 space-y-4 p-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-bark-500">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      className={cn(
                        "chip border transition-colors",
                        state.status === s
                          ? "border-paw-400 bg-paw-100 text-paw-700"
                          : "border-bark-200 text-bark-600 dark:border-white/10 dark:text-bark-200"
                      )}
                    >
                      {STATUS_META[s].emoji} {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Toggle
                  label="Needs help"
                  on={state.needs_help}
                  onChange={(v) => set("needs_help", v)}
                />
                <Toggle
                  label="Vaccinated"
                  on={state.vaccinated}
                  onChange={(v) => set("vaccinated", v)}
                />
                <Toggle
                  label="Sterilised"
                  on={state.sterilised}
                  onChange={(v) => set("sterilised", v)}
                />
                <Toggle
                  label="Friendly"
                  on={state.is_friendly}
                  onChange={(v) => set("is_friendly", v)}
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-status-injured">{error}</p>
              )}

              <button
                onClick={save}
                disabled={busy}
                className="btn-primary w-full py-3"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saved ? "Saved" : "Save status"}
              </button>
              <p className="text-center text-[11px] text-bark-400">
                Changes are live immediately. Refresh to see them reflected across the app.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm"
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-paw-500" : "bg-bark-200 dark:bg-bark-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-[1.375rem]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
