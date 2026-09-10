"use client";

import { useState } from "react";
import { toast } from "sonner";
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

  // Confirm persisted activity before marking an action complete.
  const [seen, setSeen] = useState(false);
  const [fed, setFed] = useState(false);
  // Needs-help is a real, persisted toggle (server-gated to contributors/NGOs).
  const [help, setHelp] = useState(needsHelp);
  const [busy, setBusy] = useState(false);


  /* Was local state plus a setTimeout plus a fixed-position div, which meant
     a second action inside three seconds replaced the first one's message and
     nothing was announced to a screen reader. sonner queues them and renders
     into an aria-live region. */
  function fire(message: string, party = true) {
    if (party) celebrate();
    toast(message);
  }

  async function recordActivity(kind: "seen" | "fed") {
    if (busy || (kind === "seen" ? seen : fed)) return;
    setBusy(true);
    try {
      const ok = kind === "seen" ? await logSeen(dogId) : await logFeed(dogId, user?.name);
      if (!ok) { fire("This update wasn’t saved. Please try again.", false); return; }
      if (kind === "seen") setSeen(true); else setFed(true);
      fire(kind === "seen" ? `Sighting recorded for ${name}.` : `Meal recorded for ${name}.`);
    } catch { fire("This update wasn’t saved. Please try again.", false); }
    finally { setBusy(false); }
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
              ? `Flagged for help, rescuers can see ${name} now 🆘`
              : `Cleared the help flag for ${name}.`,
            next
          );
        } else {
          fire(
            "Log a sighting for this dog first, then you can flag it for help.",
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
        <ActionButton active={seen} disabled={busy || seen} onClick={() => recordActivity("seen")} icon={<Heart className="h-5 w-5 text-status-friendly" />}>
          {seen ? "Sighting recorded" : "I saw this dog"}
        </ActionButton>
        <ActionButton active={fed} disabled={busy || fed} onClick={() => recordActivity("fed")} icon={<Utensils className="h-5 w-5 text-status-hungry" />}>
          {fed ? "Meal recorded" : "I fed this dog"}
        </ActionButton>
        <ActionButton
          disabled={busy}
          active={help}
          onClick={toggleHelp}
          icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5 text-status-injured" />}
        >
          {help ? "Needs help · clear" : "Flag for help"}
        </ActionButton>
      </div>

    </>
  );
}

function ActionButton({
  active,
  disabled = false,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
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
