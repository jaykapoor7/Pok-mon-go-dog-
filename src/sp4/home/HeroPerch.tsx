"use client";

/* Kaju on the product window. He keeps his own slow routine, and answers the
   two hero buttons: a wag when the pointer (or focus) reaches the main action,
   a tilt of the head for the second. Still under reduced motion. */
import { useEffect, useState } from "react";
import { KajuPresence } from "@/kaju/Presence";
import type { KajuState } from "@/kaju/poses";

export function HeroPerch() {
  const [mood, setMood] = useState<KajuState | null>(null);
  useEffect(() => {
    const links = [...document.querySelectorAll<HTMLElement>(".s6-hero .s4-actions a")];
    let t = 0;
    const enter = links.map((_, i) => () => { window.clearTimeout(t); setMood(i === 0 ? "tailWag" : "headTilt"); });
    const leave = () => { window.clearTimeout(t); t = window.setTimeout(() => setMood(null), 700); };
    links.forEach((l, i) => { l.addEventListener("pointerenter", enter[i]); l.addEventListener("focus", enter[i]); l.addEventListener("pointerleave", leave); l.addEventListener("blur", leave); });
    return () => { window.clearTimeout(t); links.forEach((l, i) => { l.removeEventListener("pointerenter", enter[i]); l.removeEventListener("focus", enter[i]); l.removeEventListener("pointerleave", leave); l.removeEventListener("blur", leave); }); };
  }, []);
  return mood ? <KajuPresence key="mood" state={mood} size={112} /> : <KajuPresence key="perch" sequence="perch" loop size={112} />;
}
