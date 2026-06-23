"use client";

// ─────────────────────────────────────────────────────────────
// Local ownership of sightings (no login).
//
// On upload the browser generates a secret token and remembers it here, keyed
// by sighting id. The server only ever stores a SHA-256 hash of the token, so
// possessing the token in this device's localStorage is what proves ownership
// and authorises deletion.
// ─────────────────────────────────────────────────────────────

const KEY = "straypaw.sighting_owners";

type OwnerMap = Record<string, string>;

function read(): OwnerMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as OwnerMap;
  } catch {
    return {};
  }
}

function write(map: OwnerMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

export function newOwnerToken(): string {
  return crypto.randomUUID();
}

export function rememberOwner(sightingId: string, token: string) {
  const map = read();
  map[sightingId] = token;
  write(map);
}

export function getOwnerToken(sightingId: string): string | null {
  return read()[sightingId] ?? null;
}

export function ownsSighting(sightingId: string): boolean {
  return !!read()[sightingId];
}

export function forgetOwner(sightingId: string) {
  const map = read();
  delete map[sightingId];
  write(map);
}
