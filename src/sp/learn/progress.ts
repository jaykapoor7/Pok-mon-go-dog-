"use client";

/* Progress through the Academy, kept on this device only (no account,
   no tracking). Cleared with the browser's site data. */

import { useCallback, useEffect, useState } from "react";

const KEY = "sp2.learn.done";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

export function useProgress() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    setDone(read());
    const on = (e: StorageEvent) => { if (e.key === KEY) setDone(read()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  const mark = useCallback((key: string) => {
    const next = [...new Set([...read(), key])];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setDone(next);
  }, []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch {} setDone([]); }, []);
  return { done, mark, reset, has: (k: string) => done.includes(k) };
}
