import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LatLng } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Haversine distance between two coordinates, in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Friendly relative time, e.g. "3h ago", "2d ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Deterministic pseudo-random from a string seed (stable across renders/SSR). */
export function seededRandom(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

export function pluralize(n: number, singular: string, plural?: string) {
  return n === 1 ? singular : plural ?? `${singular}s`;
}

/**
 * Display label for a (stray) dog. Most street dogs have no name, so we identify
 * them by area. A genuinely user-given nickname is still honoured when present.
 */
export function dogLabel(dog: { name?: string | null; zone?: string | null }): string {
  const name = dog.name?.trim();
  /* Names come from whatever the reporter typed on their phone, so a good
     share of them arrive all in lower case — the animal leading the hero
     is recorded as "pinky". Capitalising a name that carries no capitals
     of its own is a display nicety, not a correction: anything the
     reporter did capitalise is left exactly as they wrote it, so
     "McDonald" or "Kaali B" survive untouched. */
  if (name) return name === name.toLowerCase() ? capitaliseWords(name) : name;
  const zone = dog.zone?.trim();
  return zone ? `Dog near ${zone}` : "Street dog";
}

/** Upper-cases the first letter of each word, leaving the rest alone. */
function capitaliseWords(value: string): string {
  return value.replace(/(^|[\s\-'])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/**
 * The name to show against a sighting, or null when there is not one.
 *
 * This used to pick a name out of a list of twenty — Priya, Rohit, Aisha —
 * keyed off the sighting id, and the comment said why: "so the public feed
 * looks real". It made the feed look busier than it was by inventing the
 * people in it. Every one of those attributions was a claim that a named
 * person had gone out and reported an animal, and none of them had.
 *
 * A sighting with no reporter is a real and ordinary thing: reporting on
 * StrayPaw does not require an account. It reads as anonymous, which is
 * true, rather than as somebody who does not exist.
 */
export function displayReporter(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}
