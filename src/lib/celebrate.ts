"use client";

import confetti from "canvas-confetti";
import { haptic } from "@/lib/haptics";

const WARM = ["#6E7A45", "#8f9c5f", "#D9A441", "#C06A86", "#3E8473"];

/** A warm burst of confetti for successful helpful actions. */
export function celebrate() {
  haptic("success");
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.7 },
    colors: WARM,
    scalar: 1.1,
    ticks: 220,
  });
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: WARM,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: WARM,
    });
  }, 150);
}

/** Paw-shaped emoji confetti — used on a fresh sighting upload. */
export function pawBurst() {
  haptic("success");
  const paw = confetti.shapeFromText
    ? confetti.shapeFromText({ text: "🐾", scalar: 2 })
    : undefined;
  confetti({
    particleCount: 24,
    spread: 90,
    origin: { y: 0.6 },
    scalar: 2,
    ticks: 200,
    ...(paw ? { shapes: [paw] } : { colors: WARM }),
  });
}
