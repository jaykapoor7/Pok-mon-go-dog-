"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSighting, deleteMySighting } from "@/lib/actions";
import { ownsSighting } from "@/lib/ownership";
import { useAuth } from "@/components/auth/AuthProvider";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Delete control for a sighting you own — either because you created it on this
 * device (per-device token) or because it's attached to your signed-in account
 * (cross-device). Confirms, deletes, then calls onDeleted so the parent can
 * remove it from the UI immediately.
 */
export function DeleteSightingButton({
  sightingId,
  ownerUserId,
  onDeleted,
  variant = "icon",
  className,
}: {
  sightingId: string;
  ownerUserId?: string | null;
  onDeleted: () => void;
  variant?: "icon" | "text";
  className?: string;
}) {
  const { user } = useAuth();
  const [deviceOwned, setDeviceOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage is client-only — resolve device ownership after mount to
  // avoid a hydration mismatch.
  useEffect(() => {
    setDeviceOwned(ownsSighting(sightingId));
  }, [sightingId]);

  const accountOwned = Boolean(user && ownerUserId && user.id === ownerUserId);
  if (!deviceOwned && !accountOwned) return null;

  async function handleDelete() {
    if (busy) return;
    const ok = window.confirm("Delete this sighting? This can't be undone.");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      if (accountOwned) await deleteMySighting(sightingId);
      else await deleteSighting(sightingId);
      haptic("success");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      haptic("error");
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
