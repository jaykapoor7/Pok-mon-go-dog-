import { animalTag, givenName } from "./animal-name";
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
    // Register dates and date-only medical events use their recorded UTC day.
    // Browser time zones must not move an October 1 record into September 30.
    timeZone: "UTC",
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
export function dogLabel(dog: { name?: string | null; zone?: string | null; straypaw_id?: string | null; id?: string | null }): string {
  /* A given name, else the animal's StrayPaw tag. See lib/animal-name. */
  return givenName(dog.name) ?? (dog.straypaw_id || dog.id ? animalTag(dog) : "Unnamed");
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

/** A locality as people should read it. Ward numbers are written once and
    after the name: "Ward Ward 28" (an import that prefixed a value that
    already said Ward) becomes "Ward 28", and "Gandhipuram, Ward 12" or
    "Ward 12 Gandhipuram" becomes "Gandhipuram (Ward 12)". A ward with no
    recorded name stays "Ward 28": a name is never guessed. */
export function cleanPlace(raw: string | null | undefined): string {
  let s = String(raw ?? "").replace(/\s+/g, " ").trim();
  /* Imports cut some cells short: "Nava India," or "Arumuga Goundanur (near
     selvapuram". Trailing separators go, and an open bracket is closed. */
  s = s.replace(/[\s,;\-–·]+$/, "").replace(/\s+([,)])/g, "$1");
  if ((s.match(/\(/g) ?? []).length > (s.match(/\)/g) ?? []).length) s += ")";
  if (!s) return "";
  s = s.replace(/\b(?:ward|wd)\.?\s+(?:(?:ward|wd)\.?\s+)+/gi, "Ward ");
  const m = /^(.*?)[\s,\-–·(]*\b(?:ward|wd)\.?\s*(?:no\.?\s*)?(\d+[a-z]?)\b[\s,\-–·)]*(.*)$/i.exec(s);
  if (!m) return s;
  const name = [m[1], m[3]].map((x) => x.replace(/^[\s,\-–·]+|[\s,\-–·]+$/g, "")).filter(Boolean).join(" ");
  return name ? `${name} (Ward ${m[2].toUpperCase()})` : `Ward ${m[2].toUpperCase()}`;
}

/** A place written from parts that may already contain each other —
    "Saket, Delhi" and "Delhi" — without saying any part twice. */
export function placeLine(...parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    for (const bit of cleanPlace(part).split(/,(?![^(]*\))/)) {
      const b = bit.trim();
      const k = b.toLowerCase();
      if (!b || seen.has(k)) continue;
      seen.add(k);
      out.push(b);
    }
  }
  return out.join(", ");
}
