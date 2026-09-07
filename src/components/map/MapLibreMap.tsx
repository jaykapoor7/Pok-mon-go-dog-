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
import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { FeedingMarker } from "./FeedingMarker";
import type { Dog, FeedingZone } from "@/lib/types";
import { stateCoverage, STATUS_META } from "@/lib/platform/coverage";
import {
  WARD_METRICS,
  WARD_RAMP,
  WARD_UNSURVEYED,
  type WardFeatureCollection,
  type WardMetric,
} from "@/lib/wards";

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

   The basemap is CARTO Dark Matter. Liberty, the previous one, was a
   full-colour street map — every road class its own hue — which the animal
   dots had to compete with. Positron fixed that but went too far the other
   way: a near-white sheet inside a navy console reads as a page that failed
   to load, especially at country zoom where there is little on it. Dark
   Matter is the same quiet cartography on the console's own ground, and a
   bright dot on it is unmistakable.
   ════════════════════════════════════════════════════════════════════ */

/* CARTO began enforcing API keys on basemaps.cartocdn.com in late August
   2026. Vector tiles still serve without one today — verified — but raster
   already returns an "API KEY REQUIRED" watermark, and vector is a switch
   they can throw. A key is free up to five million tiles a month, so this
   reads one if it is set and carries on without it if it is not, rather
   than waiting to find out the hard way in front of a pilot.

   Request one at https://carto.com/basemaps/apikey/ and set
   NEXT_PUBLIC_CARTO_API_KEY. Attribution is required either way and is
   already rendered by AttributionControl below. */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" +
  (CARTO_KEY ? `?api_key=${encodeURIComponent(CARTO_KEY)}` : "");

/* India's own extent, lightly padded: roughly 68.1E to 97.4E and 6.7N to
   35.7N.

   The previous box ran to 64E and 102E, which is Tajikistan on one side and
   deep into Myanmar on the other. maxBounds does not merely stop you panning
   out of it — MapLibre keeps the whole viewport inside the box, so on a wide
   screen it fitted THAT, and the map opened over Afghanistan with India down
   in the corner. Fencing to the country instead means the country is what
   fills the screen. */
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [67.0, 5.5],
  [98.5, 37.5],
];
const MIN_ZOOM = 3.4;

const SRC = "dogs";
const CLUSTER_LAYER = "dog-clusters";
const CLUSTER_COUNT_LAYER = "dog-cluster-count";
const POINT_LAYER = "dog-points";
const WARD_SRC = "wards";
const WARD_FILL = "ward-fill";
const WARD_LINE = "ward-line";
const INTERACTIVE = [CLUSTER_LAYER, POINT_LAYER];
const INTERACTIVE_WITH_WARDS = [CLUSTER_LAYER, POINT_LAYER, WARD_FILL];

/** Imperative handles the surrounding UI drives its own controls with. */
export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  toggle3D: () => boolean;
  fitIndia: () => void;
  /** Where the camera is pointed, for "report an animal here". */
  getCenter: () => { lat: number; lng: number } | null;
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
/* The record you have open, ringed on the map. Without this the bottom
   sheet tells you about an animal and the map gives you no way to see which
   of the dots it is talking about. */
const selectedLayer: CircleLayerSpecification = {
  id: "dog-selected",
  type: "circle",
  source: SRC,
  filter: ["==", ["get", "id"], "__none__"],
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"], 6, 11, 11, 15, 16, 20,
    ],
    "circle-stroke-width": 3,
    "circle-stroke-color": "#1b46b0",
  },
};

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


/* A choropleth needs its bands and its legend to come from one place, so the
   ramp is built from the same breaks the legend prints. Unsurveyed wards are
   pulled out first with a `case`, before the ramp is consulted at all: they
   are not a low value, they are the absence of a value, and painting them
   the palest blue would tell a funder an unvisited ward is a quiet one. */
function wardFillLayer(metric: WardMetric): FillLayerSpecification {
  const { breaks } = WARD_METRICS[metric];

  /* step(input, out0, stop0, out1, stop1, ... outN). Five colours need four
     stops and a final output: building it as pairs and forgetting the tail
     produces an expression MapLibre silently refuses to paint. */
  const step: unknown[] = ["step", ["to-number", ["get", metric], 0], WARD_RAMP[0]];
  breaks.forEach((b, i) => step.push(b, WARD_RAMP[i + 1]));

  return {
    id: WARD_FILL,
    type: "fill",
    source: WARD_SRC,
    paint: {
      "fill-color": [
        "case",
        // Nobody has been here. Not a low number, no number.
        ["!", ["get", "surveyed"]], WARD_UNSURVEYED,
        // A rate with no denominator — a surveyed ward where nothing was
        // checked — reads the same way. to-number's fallback carries null
        // through as -1, because an expression cannot compare against null.
        ["<", ["to-number", ["get", metric], -1], 0], WARD_UNSURVEYED,
        step,
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false], 0.9,
        ["!", ["get", "surveyed"]], 0.45,
        0.72,
      ],
    },
  } as unknown as FillLayerSpecification;
}

const wardLineLayer: LineLayerSpecification = {
  id: WARD_LINE,
  type: "line",
  source: WARD_SRC,
  paint: {
    "line-color": "#7d8ba6",
    "line-width": [
      "case", ["boolean", ["feature-state", "hover"], false], 2.2, 0.6,
    ],
    "line-opacity": 0.75,
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
  wards = null,
  wardMetric = "animals",
  onWardSelect,
  selectedId = null,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  preview?: boolean;
  feedingZones?: FeedingZone[];
  onReady?: (api: MapApi) => void;
  /** Overlay showing what each state has actually published. */
  showGaps?: boolean;
  /** Ward polygons with their counts. Absent until a city has boundaries. */
  wards?: WardFeatureCollection | null;
  /** Which number the wards are shaded by. */
  wardMetric?: WardMetric;
  onWardSelect?: (ward: Record<string, unknown> | null) => void;
  /** Id of the animal whose record is open, ringed on the map. */
  selectedId?: string | null;
}) {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const [tilesFailed, setTilesFailed] = useState(false);

  /* The basemap is fetched from a third party, and when it genuinely cannot
     be reached the console should say so rather than sit blank.

     But the first version of this matched any error message containing
     "fetch", "network", "load", "tile" or "style", which is very nearly all
     of them. MapLibre raises errors for ordinary things — a sprite that
     404s, a tile aborted because you panned away from it — so a fully
     working map was showing BASEMAP UNAVAILABLE over the top of the
     basemap it had just drawn.

     A loaded style is proof the basemap is reachable, so nothing raised
     after that counts, and onLoad clears any earlier complaint. */
  const handleMapError = useCallback((e: { error?: Error }) => {
    if (mapRef.current?.getMap?.().isStyleLoaded?.()) return;
    const msg = e?.error?.message ?? "";
    if (/failed to fetch|networkerror|load failed|not be loaded/i.test(msg)) {
      setTilesFailed(true);
    }
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

      if (f.layer?.id === WARD_FILL) {
        onWardSelect?.(f.properties ?? null);
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
    [byId, onSelect, onWardSelect]
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
        getCenter: () => {
          const c = mapRef.current?.getCenter();
          return c ? { lat: c.lat, lng: c.lng } : null;
        },
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
      onLoad={() => setTilesFailed(false)}
      onError={handleMapError}
      interactiveLayerIds={preview ? undefined : wards ? INTERACTIVE_WITH_WARDS : INTERACTIVE}
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
      {/* Wards first so the animal dots draw on top of their own shading. */}
      {wards && !preview && (
        <Source id={WARD_SRC} type="geojson" data={wards} promoteId="ward_id">
          <Layer {...wardFillLayer(wardMetric)} />
          <Layer {...wardLineLayer} />
        </Source>
      )}

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
        <Layer
          {...selectedLayer}
          filter={["==", ["get", "id"], selectedId ?? "__none__"]}
        />
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
