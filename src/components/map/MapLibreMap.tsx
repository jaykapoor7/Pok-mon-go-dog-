"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Layer,
  Marker,
  Source,
  GeolocateControl,
  AttributionControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { FeedingMarker } from "./FeedingMarker";
import type { Dog, FeedingZone } from "@/lib/types";
import { stateCoverage, STATUS_META } from "@/lib/platform/coverage";

/* ════════════════════════════════════════════════════════════════════
   WHY THIS MAP DRAWS THE WAY IT DOES

   Every animal used to be a React <Marker>: a DOM node, carrying a
   photograph, that MapLibre had to reposition on every frame of a pan. On
   top of that, onMove pushed the viewport into React state mid-gesture,
   which re-ran supercluster and reconciled the whole marker list while your
   finger was still moving. Two compounding costs per frame, and the reason
   scrolling the map felt like dragging something heavy.

   Now the animals are a GeoJSON source with MapLibre's own clustering, drawn
   by GL circle and symbol layers. Panning is GPU work against a buffer that
   is already uploaded; React does nothing at all during a gesture. The only
   DOM markers left are the handful that genuinely are few — feeding zones,
   and the state coverage dots.

   The basemap is CARTO Positron rather than OpenFreeMap Liberty. Liberty is
   a full-colour street map: every road classified in its own hue, every
   landuse tinted. Beautiful, and completely wrong underneath a layer whose
   entire job is to show where animals are, because the dots had to compete
   with it. Positron is greyscale and deliberately quiet, so the colour on
   screen is the data.
   ════════════════════════════════════════════════════════════════════ */

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/* StrayPaw is an India-wide network, so the camera stays over India: panning
   is fenced to the subcontinent and you cannot zoom out to the whole globe.
   Padded well beyond the coastline so the edges never feel clipped. */
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [64.0, 4.0],
  [102.0, 39.0],
];
const MIN_ZOOM = 3.6;

const SRC = "dogs";
const CLUSTER_LAYER = "dog-clusters";
const CLUSTER_COUNT_LAYER = "dog-cluster-count";
const POINT_LAYER = "dog-points";
const INTERACTIVE = [CLUSTER_LAYER, POINT_LAYER];

/** Imperative handles the surrounding UI drives its own controls with. */
export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  toggle3D: () => boolean;
  fitIndia: () => void;
};

/* Sized by how many are inside, in steps rather than a smooth ramp: a
   continuous radius makes 30 and 40 indistinguishable, while steps read as
   "that group is bigger than this one" across a whole screen. */
const clusterLayer: CircleLayerSpecification = {
  id: CLUSTER_LAYER,
  type: "circle",
  source: SRC,
  filter: ["has", "point_count"],
  paint: {
    /* Red the moment anything inside needs help, so urgency survives being
       clustered instead of being averaged away. */
    "circle-color": ["case", [">", ["get", "urgent"], 0], "#e04a2f", "#1b46b0"],
    "circle-radius": [
      "step", ["get", "point_count"],
      16, 10, 21, 50, 27, 200, 34, 1000, 42,
    ],
    "circle-opacity": 0.92,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#ffffff",
  },
};

const clusterCountLayer: SymbolLayerSpecification = {
  id: CLUSTER_COUNT_LAYER,
  type: "symbol",
  source: SRC,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["Open Sans Bold"],
    "text-size": ["step", ["get", "point_count"], 12, 50, 13, 200, 14],
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#ffffff" },
};

/* One animal: a solid dot in its status colour with a white collar, which is
   what keeps it legible over a pale street and a dark park alike. A halo
   underneath the ones needing help, so they carry at a glance. */
const pointLayer: CircleLayerSpecification = {
  id: POINT_LAYER,
  type: "circle",
  source: SRC,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      6, 4.5,
      11, 7,
      16, 10,
    ],
    "circle-stroke-width": ["case", ["get", "urgent"], 3, 2],
    "circle-stroke-color": ["case", ["get", "urgent"], "#e04a2f", "#ffffff"],
    "circle-opacity": 0.95,
  },
};

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
  const [tilesFailed, setTilesFailed] = useState(false);

  // The basemap is fetched from a third party. If it is unreachable (offline,
  // a blocked network, the tile host down) MapLibre surfaces the failure here,
  // otherwise it escapes as an unhandled rejection and the console just sits
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

  /* Built once per dogs change and handed to the GL source. Colour is baked
     into each feature rather than resolved by a match expression at paint
     time, because the status rules live in markerMetaFor and should stay in
     one place. */
  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: dogs.map((d) => ({
        type: "Feature" as const,
        id: d.id,
        properties: {
          id: d.id,
          urgent: Boolean(d.needs_help),
          color: markerMetaFor(d).color,
        },
        geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
      })),
    }),
    [dogs]
  );

  /* One handler for both layers. A cluster zooms to the point where it breaks
     apart; a single animal opens its record. */
  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current;
      const f = e.features?.[0];
      if (!map || !f) return;

      if (f.properties?.cluster) {
        const src = map.getSource(SRC) as unknown as {
          getClusterExpansionZoom: (id: number) => Promise<number>;
        };
        const clusterId = f.properties.cluster_id as number;
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        Promise.resolve(src.getClusterExpansionZoom(clusterId))
          .then((z) =>
            map.easeTo({ center: [lng, lat], zoom: Math.min(z, 16), duration: 500 })
          )
          .catch(() => {
            map.easeTo({ center: [lng, lat], zoom: map.getZoom() + 2, duration: 500 });
          });
        return;
      }

      const dog = byId[f.properties?.id as string];
      if (!dog) return;
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 13.5),
        duration: 650,
      });
      onSelect?.(dog);
    },
    [byId, onSelect]
  );

  /* Anything clickable should say so before it is clicked. */
  const setCursor = useCallback((cursor: string) => {
    const c = mapRef.current?.getCanvas();
    if (c) c.style.cursor = cursor;
  }, []);

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
      /* No onMove handler. The viewport used to be pushed into React state on
         every frame of a pan so that supercluster could re-run; clustering is
         the GL source's job now, and React staying still during a gesture is
         most of why this scrolls smoothly. */
      onError={handleMapError}
      interactiveLayerIds={preview ? undefined : INTERACTIVE}
      onClick={preview ? undefined : handleClick}
      onMouseEnter={preview ? undefined : () => setCursor("pointer")}
      onMouseLeave={preview ? undefined : () => setCursor("")}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
      // Disable the default full-width bar; the full map adds a compact,
      // collapsible attribution below so OSM/MapLibre stay credited without the
      // bulky end-to-end strip (which looked oversized on the small preview).
      attributionControl={false}
    >
      {/* clusterProperties totals the urgent flag as MapLibre builds each
          cluster, so "does anything in here need help" costs nothing to ask
          at paint time. */}
      <Source
        id={SRC}
        type="geojson"
        data={data}
        cluster
        clusterRadius={55}
        clusterMaxZoom={15}
        clusterProperties={{
          urgent: ["+", ["case", ["get", "urgent"], 1, 0]],
        }}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...pointLayer} />
      </Source>

      {/* Data-gap layer: one marker per state, coloured by whether anything
          has actually been published about it. Thirty-odd DOM nodes, which is
          a number the browser does not mind. */}
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
              fontSize: 11.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#ff8a6b",
            }}
          >
            Basemap unavailable
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#dbe3f0" }}>
            The map tiles could not be reached. Records are still live, pins and
            case data are unaffected.
          </p>
        </div>
      )}
    </Map>
  );
}
