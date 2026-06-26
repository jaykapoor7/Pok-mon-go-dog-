"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Result {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Search any area/city in India and jump the map there. Keyless (Nominatim).
 * On select it navigates to /map?lat&lng, and the map flies to the place.
 */
export function PlaceSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=6&q=${encodeURIComponent(
            q.trim()
          )}`,
          { headers: { Accept: "application/json" } }
        );
        const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        setResults(
          data.map((d) => ({
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            label: d.display_name,
          }))
        );
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function select(r: Result) {
    setQ(r.label.split(",").slice(0, 2).join(", "));
    setResults([]);
    setOpen(false);
    router.push(`/map?lat=${r.lat.toFixed(5)}&lng=${r.lng.toFixed(5)}`);
  }

  return (
    <div ref={box} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search an area or city…"
        className="w-full rounded-full border border-black/[0.08] bg-white/80 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900/60"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-bark-400" />
      ) : q ? (
        <button
          onClick={() => {
            setQ("");
            setResults([]);
          }}
          aria-label="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-bark-400 hover:bg-bark-100"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1.5 max-h-72 w-full min-w-[16rem] overflow-auto rounded-2xl border border-black/10 bg-white shadow-pop dark:border-white/10 dark:bg-bark-900">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => select(r)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-bark-50 dark:hover:bg-bark-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-paw-500" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
