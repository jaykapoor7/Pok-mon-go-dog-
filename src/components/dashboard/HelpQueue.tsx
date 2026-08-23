"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Syringe, Scissors, HeartPulse, ClipboardList, Loader2 } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { StatusBadge } from "@/components/ui/Badges";
import { celebrate } from "@/lib/celebrate";
import { ngoSetDogCare } from "@/lib/actions";
import { timeAgo, cn, dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

const BULK = [
  { key: "vaccinated", label: "Mark vaccinated", icon: Syringe, patch: { vaccinated: true } },
  { key: "sterilised", label: "Mark sterilised", icon: Scissors, patch: { sterilised: true } },
  { key: "cleared", label: "Clear needs-help", icon: HeartPulse, patch: { needs_help: false } },
] as const;

export function HelpQueue({ dogs }: { dogs: Dog[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function applyBulk(
    label: string,
    patch: { vaccinated?: boolean; sterilised?: boolean; needs_help?: boolean }
  ) {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      const ids = [...selected];
      const results = await Promise.all(
        ids.map((id) => ngoSetDogCare(id, patch).catch(() => false))
      );
      const ok = results.filter(Boolean).length;
      if (ok === 0) {
        setToast("Verified partners only, sign in as an NGO to update records.");
      } else {
        setToast(`${label} · ${ok} dog ${ok === 1 ? "record" : "records"} updated`);
        celebrate();
        setSelected(new Set());
        router.refresh(); // reflect DB truth
      }
    } catch {
      setToast("Couldn't update. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const visible = dogs;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-bark-100 p-4">
        <div>
          <h3 className="font-display font-bold">Dogs needing help</h3>
          <p className="text-xs text-bark-400">
            {visible.length} in queue · {selected.size} selected
          </p>
        </div>
      </div>

      {/* bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-bark-100 bg-paw-50"
          >
            <div className="flex flex-wrap gap-2 p-3">
              {BULK.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.key}
                    onClick={() => applyBulk(b.label, b.patch)}
                    disabled={busy}
                    className="chip border border-paw-200 bg-white text-paw-700 hover:bg-paw-100 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                    {b.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="divide-y divide-bark-100">
        {visible.map((dog) => {
          const isSel = selected.has(dog.id);
          return (
            <li
              key={dog.id}
              className={cn(
                "flex items-center gap-3 p-3 transition-colors",
                isSel && "bg-paw-50"
              )}
            >
              <button
                onClick={() => toggle(dog.id)}
                aria-label="select"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  isSel
                    ? "border-paw-500 bg-paw-500 text-white"
                    : "border-bark-200"
                )}
              >
                {isSel && <Check className="h-4 w-4" />}
              </button>
              <DogPhoto
                src={dog.cover_photo}
                alt="dog"
                seed={dog.id}
                className="h-12 w-12 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dog/${dog.id}`}
                  className="text-sm font-semibold hover:text-paw-600"
                >
                  {dogLabel(dog)}
                </Link>
                <p className="text-xs text-bark-400">
                  {dog.zone} · seen {timeAgo(dog.last_seen)}
                </p>
              </div>
              <StatusBadge status={dog.status} />
              <Link
                href={`/cases/new?dog=${dog.id}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paw-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-paw-600"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Open case
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="p-8 text-center text-sm text-bark-400">
            No dogs flagged for help right now.
          </li>
        )}
      </ul>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
          >
            <div className="rounded-full bg-bark-900 px-5 py-3 text-sm font-semibold text-white shadow-warm">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
