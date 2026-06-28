"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Utensils, Siren, Loader2 } from "lucide-react";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed, updateDogStatus } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

export function DogActions({
  dogId,
  name,
  needsHelp = false,
}: {
  dogId: string;
  name: string;
  needsHelp?: boolean;
}) {
  const { user, requireAuth } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  // Saw/Fed are activity logs — kept as session toggles so a mis-tap can be
  // undone (the log fires once; "undo" just clears your tap state).
  const [seen, setSeen] = useState(false);
  const [fed, setFed] = useState(false);
  // Needs-help is a real, persisted toggle (server-gated to contributors/NGOs).
  const [help, setHelp] = useState(needsHelp);
  const [busy, setBusy] = useState(false);

  const by = user?.name ? `by ${user.name}` : "";

  function fire(message: string, party = true) {
    if (party) celebrate();
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  }

  function toggleSeen() {
    if (!seen) {
      logSeen(dogId).catch(() => {});
      setSeen(true);
      fire(`Seen ${name} ${by} · just now 🐾`);
    } else {
      setSeen(false);
      fire(`Undid “saw ${name}”.`, false);
    }
  }

  function toggleFed() {
    if (!fed) {
      logFeed(dogId, user?.name).catch(() => {});
      setFed(true);
      fire(`Meal logged for ${name} ${by} · just now 🍗`);
    } else {
      setFed(false);
      fire(`Undid “fed ${name}”.`, false);
    }
  }

  function toggleHelp() {
    requireAuth(async () => {
      const next = !help;
      setBusy(true);
      try {
        const ok = await updateDogStatus(dogId, {
          status: null,
          needs_help: next,
          vaccinated: null,
          sterilised: null,
          is_friendly: null,
        });
        if (ok) {
          setHelp(next);
          fire(
            next
              ? `Flagged for help — rescuers can see ${name} now 🆘`
              : `Cleared the help flag for ${name}.`,
            next
          );
        } else {
          fire(
            "Log a sighting for this dog first — then you can flag it for help.",
            false
          );
        }
      } catch {
        fire("Couldn't update right now. Please try again.", false);
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <ActionButton active={seen} onClick={toggleSeen} icon={<Heart className="h-5 w-5 text-status-friendly" />}>
          {seen ? "Saw it · undo" : "I saw this dog"}
        </ActionButton>
        <ActionButton active={fed} onClick={toggleFed} icon={<Utensils className="h-5 w-5 text-status-hungry" />}>
          {fed ? "Fed it · undo" : "I fed this dog"}
        </ActionButton>
        <ActionButton
          active={help}
          onClick={toggleHelp}
          icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5 text-status-injured" />}
        >
          {help ? "Needs help · clear" : "Flag for help"}
        </ActionButton>
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

function ActionButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "btn-ghost flex-col gap-1 py-3 text-xs transition-colors",
        active && "border-paw-300 bg-paw-50 text-paw-700 dark:bg-bark-800"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
