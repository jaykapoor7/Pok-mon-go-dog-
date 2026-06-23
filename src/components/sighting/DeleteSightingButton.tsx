"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSighting } from "@/lib/actions";
import { ownsSighting } from "@/lib/ownership";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Shows a delete control only for sightings created on this device (proved by
 * a local ownership token). Confirms, deletes, then calls onDeleted so the
 * parent can remove it from the UI immediately.
 */
export function DeleteSightingButton({
  sightingId,
  onDeleted,
  variant = "icon",
  className,
}: {
  sightingId: string;
  onDeleted: () => void;
  variant?: "icon" | "text";
  className?: string;
}) {
  const { isAuthed } = useAuth();
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage is client-only — resolve ownership after mount to avoid
  // a hydration mismatch.
  useEffect(() => {
    setOwned(ownsSighting(sightingId));
  }, [sightingId]);

  // Editing/deleting your own posts requires being signed in.
  if (!owned || !isAuthed) return null;

  async function handleDelete() {
    if (busy) return;
    const ok = window.confirm(
      "Delete this sighting? This can't be undone."
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSighting(sightingId);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleDelete}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold text-status-injured hover:underline disabled:opacity-50",
          className
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {error ?? "Delete"}
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      title={error ?? "Delete your sighting"}
      aria-label="Delete your sighting"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-status-injured shadow-sm transition-colors hover:bg-status-injured hover:text-white disabled:opacity-50",
        className
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
