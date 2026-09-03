"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export interface FlyTarget {
  lat: number;
  lng: number;
  nonce: number;
}

/**
 * Keyless map with a fixed centre crosshair: whatever sits under the pin is the
 * chosen point. Pan/zoom to drop the pin precisely; `flyTarget` recentres it
 * (from search or current location). Reports the centre on move-end.
 */
export function LocationPickerMap({
  initial,
  flyTarget,
  onCenter,
}: {
  initial?: { lat: number; lng: number } | null;
  flyTarget: FlyTarget | null;
  onCenter: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [tilesFailed, setTilesFailed] = useState(false);

  // Same third-party basemap as the main console. Catch a load failure here so
  // it does not escape as an unhandled rejection — picking a location by search
  // or by current position still works without tiles.
  const handleMapError = useCallback((e: { error?: Error }) => {
    const msg = e?.error?.message ?? "";
    if (/fetch|network|load|tile|style/i.test(msg)) setTilesFailed(true);
  }, []);

  useEffect(() => {
    if (flyTarget) {
      mapRef.current?.easeTo({
        center: [flyTarget.lng, flyTarget.lat],
        zoom: 15,
        duration: 700,
      });
    }
  }, [flyTarget]);

  const handleMoveEnd = useCallback(() => {
    const c = mapRef.current?.getCenter();
    if (c) onCenter(c.lat, c.lng);
  }, [onCenter]);

  return (
    <div className="relative h-56 w-full overflow-hidden rounded border border-bark-200 dark:border-white/10">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: initial?.lng ?? INDIA_CENTER.lng,
          latitude: initial?.lat ?? INDIA_CENTER.lat,
          zoom: initial ? 14 : INDIA_ZOOM,
        }}
        mapStyle={STYLE_URL}
        onMoveEnd={handleMoveEnd}
        onError={handleMapError}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      />
      {tilesFailed && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-3 bottom-3 rounded border border-vermilion/40 bg-ink/90 px-3 py-2 text-center"
        >
          <p className="m-0 text-[11px] leading-snug text-paper/80">
            Basemap unavailable. Search or use your current location to set the
            point.
          </p>
        </div>
      )}
      {/* fixed centre pin */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <MapPin
          className="h-9 w-9 -translate-y-3 text-paw-600 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
          fill="currentColor"
          strokeWidth={1.5}
        />
      </div>
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-bark-900/75 px-3 py-1 text-[11px] font-medium text-white">
        Drag the map to place the pin
      </span>
    </div>
  );
}
