"use client";

import { useCallback, useEffect, useState } from "react";

// Device-local "followed dogs" — no account needed, so it works for guests too
// (mirrors how report ownership is kept on-device). Synced across components on
// the page via a custom event, and across tabs via the storage event.
const KEY = "straypaw.follows";
const EVENT = "straypaw:follows";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useFollows() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
    write(next);
    setIds(next);
  }, []);

  const isFollowing = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFollowing };
}
