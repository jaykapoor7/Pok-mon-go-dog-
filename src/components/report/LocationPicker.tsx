"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Search, Crosshair, Loader2, Check, MapPin, X } from "lucide-react";
import { reverseGeocode, nearestCity, INDIA_CENTER } from "@/lib/delhi";
import type { FlyTarget } from "./LocationPickerMap";

const PickerMap = dynamic(
  () => import("./LocationPickerMap").then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-2xl bg-bark-100 dark:bg-bark-800" />
    ),
  }
);

interface Suggestion {
  lat: number;
  lng: number;
  label: string;
}

export interface PickedLocation {
  lat: number;
  lng: number;
  zone: string;
}

/**
 * Pick a sighting location three ways: search a place, use current GPS, or drag
 * the map to drop the pin. Keyless (Nominatim search + BigDataCloud reverse
 * geocode + OpenFreeMap tiles).
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  zone?: string | null;
  onChange: (loc: PickedLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [initial] = useState(value);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced forward geocoding (India-biased).
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(
            query.trim()
          )}`,
          { headers: { Accept: "application/json" } }
        );
        const data = (await res.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
        }>;
        setResults(
          data.map((d) => ({
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            label: d.display_name,
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Map centre changed (drag, search fly-to, or current location).
  function handleCenter(lat: number, lng: number) {
    setZoneLabel(nearestCity(lat, lng));
    onChange({ lat, lng, zone: nearestCity(lat, lng) });
    reverseGeocode(lat, lng).then((z) => {
      setZoneLabel(z);
      onChange({ lat, lng, zone: z });
    });
  }

  function selectResult(s: Suggestion) {
    setQuery(s.label.split(",").slice(0, 2).join(", "));
    setResults([]);
    setFlyTarget({ lat: s.lat, lng: s.lng, nonce: Date.now() });
  }

  function useCurrent() {
    setLocating(true);
    const done = (lat: number, lng: number) => {
      setLocating(false);
      setFlyTarget({ lat, lng, nonce: Date.now() });
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => done(pos.coords.latitude, pos.coords.longitude),
        () => done(INDIA_CENTER.lat, INDIA_CENTER.lng),
        { timeout: 6000 }
      );
    } else {
      done(INDIA_CENTER.lat, INDIA_CENTER.lng);
    }
  }

  return (
    <div className="space-y-2">
      {/* search + current location */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a place, area or address…"
            className="w-full rounded-2xl border border-bark-200 bg-white py-3 pl-9 pr-9 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-bark-400" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-bark-400 hover:bg-bark-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-bark-200 bg-white shadow-pop dark:border-white/10 dark:bg-bark-900">
              {results.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectResult(s)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-bark-50 dark:hover:bg-bark-800"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-paw-500" />
                    <span className="line-clamp-2">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={useCurrent}
          disabled={locating}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-bark-200 px-3 text-sm font-semibold text-bark-700 hover:bg-bark-50 disabled:opacity-50 dark:border-white/10 dark:text-bark-200"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Current</span>
        </button>
      </div>

      {/* map with centre pin */}
      <PickerMap initial={initial} flyTarget={flyTarget} onCenter={handleCenter} />

      {/* confirmation */}
      {value && (
        <div className="flex items-center gap-2 rounded-2xl bg-status-sterilised/10 px-4 py-2.5 text-sm font-medium text-bark-700 dark:text-bark-200">
          <Check className="h-4 w-4 text-status-sterilised" />
          {zoneLabel ?? "Pinned"} · {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}
