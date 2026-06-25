// Lightweight haptic feedback (Android/Chromium support navigator.vibrate;
// iOS Safari ignores it — degrades gracefully). Respects reduced-motion.

type Kind = "light" | "medium" | "select" | "success" | "error";

const PATTERNS: Record<Kind, number | number[]> = {
  select: 5,
  light: 9,
  medium: 16,
  success: [12, 40, 20],
  error: [28, 30, 28],
};

export function haptic(kind: Kind = "light") {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* not supported — ignore */
  }
}
