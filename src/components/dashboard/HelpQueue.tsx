"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Syringe, Scissors, Utensils } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { StatusBadge } from "@/components/ui/Badges";
import { celebrate } from "@/lib/celebrate";
import { timeAgo, cn, dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

const BULK = [
  { key: "fed", label: "Mark fed", icon: Utensils },
  { key: "vaccinated", label: "Mark vaccinated", icon: Syringe },
  { key: "sterilised", label: "Mark sterilised", icon: Scissors },
] as const;

export function HelpQueue({ dogs }: { dogs: Dog[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyBulk(label: string) {
    if (selected.size === 0) return;
    setResolved((prev) => new Set([...prev, ...selected]));
    setToast(`${label} · ${selected.size} dog records updated`);
    celebrate();
    setSelected(new Set());
    setTimeout(() => setToast(null), 2800);
  }

  const visible = dogs.filter((d) => !resolved.has(d.id));

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
                    onClick={() => applyBulk(b.label)}
                    className="chip border border-paw-200 bg-white text-paw-700 hover:bg-paw-100"
                  >
                    <Icon className="h-3.5 w-3.5" />
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
