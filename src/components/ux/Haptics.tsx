"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Subtle, app-wide haptic feedback: a light tap on any interactive press.
 * No-ops on devices without the Vibration API (e.g. iOS) and under
 * reduced-motion. Stronger patterns (success/error) are triggered explicitly
 * at key moments.
 */
export function Haptics() {
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = (e.target as HTMLElement | null)?.closest(
        "button, a[href], [role='button'], label, input[type='checkbox'], input[type='radio']"
      ) as HTMLButtonElement | null;
      if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
      haptic("light");
    }
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
