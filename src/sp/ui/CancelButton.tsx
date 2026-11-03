"use client";

/* Cancel for any form that opens on demand: closes the section it sits in
   (a <details> fold, or the caller's own state through onCancel); with
   neither, it goes back to the previous page. Nothing is saved. */

import { useRouter } from "next/navigation";

export function CancelButton({ onCancel, label = "Cancel", disabled }: { onCancel?: () => void; label?: string; disabled?: boolean }) {
  const router = useRouter();
  return (
    <button type="button" className="btn" disabled={disabled} onClick={(e) => {
      if (onCancel) { onCancel(); return; }
      const fold = e.currentTarget.closest("details");
      if (fold) { fold.open = false; fold.querySelector("summary")?.focus(); return; }
      router.back();
    }}>{label}</button>
  );
}
