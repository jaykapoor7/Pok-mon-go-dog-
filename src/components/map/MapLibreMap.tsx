"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Marker,
  GeolocateControl,
  AttributionControl,
  type MapRef,
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import type { PointFeature } from "supercluster";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { dogLabel } from "@/lib/utils";
import { PhotoMarker } from "./PhotoMarker";
import { FeedingMarker } from "./FeedingMarker";
import type { Dog, FeedingZone } from "@/lib/types";
import { stateCoverage, STATUS_META } from "@/lib/platform/coverage";

// Free, keyless, full-detail OpenStreetMap vector style (Google-Maps-like).
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/* StrayPaw is an India-wide network, so the camera stays over India: panning
   is fenced to the subcontinent and you cannot zoom out to the whole globe.
   Padded well beyond the coastline so the edges never feel clipped. */
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [64.0, 4.0],
  [102.0, 39.0],
];
const MIN_ZOOM = 3.6;

/** Imperative handles the surrounding UI drives its own controls with. */
export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  toggle3D: () => boolean;
  fitIndia: () => void;
};

type Props = { id: string; cover: string; urgent: boolean; sightings: number };

export function MapLibreMap({
  dogs,
  onSelect,
  center,
  preview,
  feedingZones = [],
  onReady,
  showGaps = false,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  preview?: boolean;
  feedingZones?: FeedingZone[];
  onReady?: (api: MapApi) => void;
  /** Overlay showing what each state has actually published. */
  showGaps?: boolean;
}) {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(INDIA_ZOOM);
  const [tilesFailed, setTilesFailed] = useState(false);

  // The basemap is fetched from a third party. If it is unreachable (offline,
  // a blocked network, the tile host down) MapLibre surfaces the failure here, // otherwise it escapes as an unhandled rejection and the console just sits
  // blank with no explanation.
  const handleMapError = useCallback((e: { error?: Error }) => {
    const msg = e?.error?.message ?? "";
    if (/fetch|network|load|tile|style/i.test(msg)) setTilesFailed(true);
  }, []);

  /* Fly to a searched place when it changes. Depends on the coordinates
     rather than the object, so a re-render carrying an equal-but-new center
     does not re-animate the camera; the static preview is already framed by
     initialViewState and stays put. */
  const centerLat = center?.lat;
  const centerLng = center?.lng;
  useEffect(() => {
    if (centerLat == null || centerLng == null || preview) return;
    mapRef.current?.easeTo({
      center: [centerLng, centerLat],
      zoom: 13,
      duration: 900,
    });
  }, [centerLat, centerLng, preview]);

  const byId = useMemo(() => {
    const m: Record<string, Dog> = {};
    for (const d of dogs) m[d.id] = d;
    return m;
  }, [dogs]);

  const index = useMemo(() => {
    const points: PointFeature<Props>[] = dogs.map((d) => ({
      type: "Feature",
      properties: {
        id: d.id,
        cover: d.cover_photo,
        urgent: d.needs_help,
        sightings: d.sightings_count,
      },
      geometry: { type: "Point", coordinates: [d.lng, d.lat] },
    }));
    const sc = new Supercluster<Props>({ radius: 70, maxZoom: 16 });
    sc.load(points);
    return sc;
  }, [dogs]);

  const clusters = useMemo(
    () => (bounds ? index.getClusters(bounds, Math.floor(zoom)) : []),
    [index, bounds, zoom]
  );

  /* onMove fires every frame of a pan. Re-clustering that often is wasted
     work, supercluster returns the same result for sub-pixel changes, so
     the view is only pushed to state when it moved enough to matter. */
  const lastView = useRef<{ b: [number, number, number, number]; z: number } | null>(null);
  const sync = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const next: [number, number, number, number] = [
      b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
    ];
    const z = map.getZoom();
    const prev = lastView.current;
    if (prev) {
      const span = Math.max(next[2] - next[0], 1e-6);
      const moved = next.some((v, i) => Math.abs(v - prev.b[i]) > span / 200);
      if (!moved && Math.abs(z - prev.z) < 0.05) return;
    }
    lastView.current = { b: next, z };
    setBounds(next);
    setZoom(z);
  }, []);

  const handleLoad = useCallback(() => sync(), [sync]);

  /* The camera controls only need the map instance, not a finished basemap.
     Publishing them on mount rather than on style load keeps zoom and tilt
     working while tiles are still streaming, or never arrive at all, on a
     slow connection or a blocked tile host. */
  useEffect(() => {
    if (!onReady) return;
    let raf = 0;
    const publish = () => {
      if (!mapRef.current) {
        raf = requestAnimationFrame(publish);
        return;
      }
      onReady({
        zoomIn: () => mapRef.current?.zoomIn({ duration: 260 }),
        zoomOut: () => mapRef.current?.zoomOut({ duration: 260 }),
        toggle3D: () => {
          const m = mapRef.current;
          if (!m) return false;
          const on = m.getPitch() < 20;
          m.easeTo({ pitch: on ? 55 : 0, duration: 520 });
          return on;
        },
        fitIndia: () =>
          mapRef.current?.fitBounds(INDIA_BOUNDS, { duration: 700, padding: 24 }),
      });
    };
    publish();
    return () => cancelAnimationFrame(raf);
  }, [onReady]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: center?.lng ?? INDIA_CENTER.lng,
        latitude: center?.lat ?? INDIA_CENTER.lat,
        // Preview frames a covered city (wider than a search fly); full map
        // opens to all India unless a place was searched.
        zoom: center ? (preview ? 10.5 : 13) : INDIA_ZOOM,
      }}
      mapStyle={STYLE_URL}
      maxBounds={INDIA_BOUNDS}
      minZoom={MIN_ZOOM}
      maxZoom={18}
      /* Clusters follow the camera while it moves rather than snapping only
         once it stops, which is what made panning feel static. The handler is
         already rAF-coalesced, and re-clustering is skipped unless the view
         actually changed enough to alter the result. */
      onLoad={handleLoad}
      onMove={sync}
      onMoveEnd={sync}
      onError={handleMapError}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
      // Disable the default full-width bar; the full map adds a compact,
      // collapsible attribution below so OSM/MapLibre stay credited without the
      // bulky end-to-end strip (which looked oversized on the small preview).
      attributionControl={false}
    >
      {/* Data-gap layer: one marker per state, coloured by whether anything
          has actually been published about it. */}
      {showGaps && !preview &&
        stateCoverage().map((st) => {
          const meta = STATUS_META[st.status];
          return (
            <Marker key={st.code} longitude={st.lng} latitude={st.lat} anchor="center">
              <button
                type="button"
                onClick={() => router.push(`/gaps?state=${st.code}`)}
                title={`${st.name}, ${meta.label}. ${meta.note}`}
                aria-label={`${st.name}: ${meta.label}`}
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  border: `2px solid ${meta.colour}`,
                  background: `${meta.colour}2e`,
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            </Marker>
          );
        })}

      {/* The home preview is a static, non-interactive thumbnail, so it skips
          the map controls and attribution; the full map keeps both. */}
      {!preview && (
        <>
          <GeolocateControl
            position="bottom-right"
            trackUserLocation
            positionOptions={{ enableHighAccuracy: true }}
          />
          <AttributionControl compact position="bottom-left" />
        </>
      )}

      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;

        if ("cluster" in c.properties) {
          const clusterId = c.properties.cluster_id;
          const count = c.properties.point_count;
          const leaf = index.getLeaves(clusterId, 1)[0] as PointFeature<Props>;
          const leafDog = leaf ? byId[leaf.properties.id] : undefined;
          return (
            <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat} anchor="center">
              <PhotoMarker
                photo={leaf?.properties.cover}
                seed={`cluster-${clusterId}`}
                count={count}
                ringColor={leafDog ? markerMetaFor(leafDog).color : "#9A9C88"}
                label={`${count} dogs here`}
                onClick={() => {
                  const z = Math.min(index.getClusterExpansionZoom(clusterId), 16);
                  mapRef.current?.easeTo({ center: [lng, lat], zoom: z, duration: 500 });
                }}
              />
            </Marker>
          );
        }

        const props = c.properties;
        const dog = byId[props.id];
        return (
          <Marker key={props.id} longitude={lng} latitude={lat} anchor="center">
            <PhotoMarker
              photo={props.cover}
              seed={props.id}
              count={props.sightings}
              ringColor={dog ? markerMetaFor(dog).color : "#9A9C88"}
              urgent={props.urgent}
              label={dog ? dogLabel(dog) : "Dog"}
              onClick={() => {
                if (!dog) return;
                mapRef.current?.easeTo({
                  center: [lng, lat],
                  zoom: Math.max(zoom, 13.5),
                  duration: 650,
                });
                onSelect?.(dog);
              }}
            />
          </Marker>
        );
      })}

      {feedingZones.map((z) => (
        <Marker key={z.id} longitude={z.lng} latitude={z.lat} anchor="center">
          <FeedingMarker label={z.name} onClick={() => router.push(`/feeding/${z.id}`)} />
        </Marker>
      ))}

      {tilesFailed && !preview && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 5,
            maxWidth: 320,
            padding: "16px 18px",
            textAlign: "center",
            background: "rgba(11,16,32,0.92)",
            border: "1px solid rgba(143,183,255,0.28)",
            borderRadius: 4,
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#ff6a4f",
            }}
          >
            Basemap unavailable
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "rgba(244,245,247,0.72)" }}>
            The map tiles could not be reached. Records are still live, pins and
            case data are unaffected.
          </p>
        </div>
      )}
    </Map>
  );
}
