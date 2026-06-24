"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl";
import type { CircleLayer, SymbolLayer } from "react-map-gl";
import type { MapboxEvent } from "mapbox-gl";
import { DELHI_CENTER } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

// ── Clusters: soft, organic blobs (glow + core), smoothly sized ──
const clusterGlow: CircleLayer = {
  id: "cluster-glow",
  type: "circle",
  source: "dogs",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#0f0f12",
    "circle-opacity": 0.12,
    "circle-blur": 1,
    "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 26, 25, 46, 120, 70],
  },
};

const clusterCore: CircleLayer = {
  id: "clusters",
  type: "circle",
  source: "dogs",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#18181b",
    "circle-opacity": 0.92,
    "circle-blur": 0.25,
    "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 16, 25, 24, 120, 34],
  },
};

const clusterCount: SymbolLayer = {
  id: "cluster-count",
  type: "symbol",
  source: "dogs",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
  },
  paint: { "text-color": "#ffffff", "text-opacity": 0.95 },
};

// ── Markers: soft donuts. Urgent gets a calm static glow + weight ──
const markerGlow: CircleLayer = {
  id: "marker-glow",
  type: "circle",
  source: "dogs",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "urgent"], true]],
  paint: {
    "circle-color": ["get", "color"],
    "circle-opacity": 0.26,
    "circle-blur": 1,
    "circle-radius": 22,
  },
};

const markerShadow: CircleLayer = {
  id: "marker-shadow",
  type: "circle",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#0f0f12",
    "circle-opacity": 0.16,
    "circle-radius": ["case", ["==", ["get", "urgent"], true], 11, 9],
    "circle-blur": 0.7,
    "circle-translate": [0, 1],
  },
};

function markerDot(ring: string): CircleLayer {
  return {
    id: "marker-dot",
    type: "circle",
    source: "dogs",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["case", ["==", ["get", "urgent"], true], 8, 6],
      "circle-stroke-width": ["case", ["==", ["get", "urgent"], true], 3, 2.5],
      "circle-stroke-color": ring,
    },
  };
}

const markerCore: CircleLayer = {
  id: "marker-core",
  type: "circle",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#ffffff",
    "circle-opacity": 0.9,
    "circle-radius": 2,
  },
};

// Symbol/label layers to hide for a calm "canvas" base map.
const NOISE = /poi|transit|ferry|airport|natural-point|road-(number|exit)|road-label-(small|medium)/i;
const DIM_LABELS = /label|place|settlement|state|country/i;
const ROADS = /road|bridge|tunnel|street/i;

export function MapboxMap({
  token,
  dogs,
  onSelect,
}: {
  token: string;
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [isDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const ring = isDark ? "#0c0c0d" : "#ffffff";

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: dogs.map((d) => {
        const meta = markerMetaFor(d);
        return {
          type: "Feature" as const,
          properties: { id: d.id, color: meta.color, urgent: d.needs_help },
          geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
        };
      }),
    }),
    [dogs]
  );

  // Declutter the base style into a calm canvas: drop POI/transit noise, mute
  // labels, soften roads.
  const onLoad = useCallback((e: MapboxEvent) => {
    const map = e.target;
    for (const l of map.getStyle().layers ?? []) {
      try {
        if (l.type === "symbol") {
          if (NOISE.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none");
          else if (DIM_LABELS.test(l.id)) map.setPaintProperty(l.id, "text-opacity", 0.55);
        } else if (l.type === "line" && ROADS.test(l.id)) {
          map.setPaintProperty(l.id, "line-opacity", 0.45);
        }
      } catch {
        /* layer not paintable — skip */
      }
    }
  }, []);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const map = mapRef.current;
      if (!map) return;

      if (feature.properties?.point_count) {
        const clusterId = feature.properties.cluster_id;
        const src = map.getSource("dogs") as mapboxgl.GeoJSONSource | undefined;
        // @ts-expect-error getClusterExpansionZoom exists at runtime
        src?.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom + 0.5,
            duration: 700,
          });
        });
        return;
      }

      const dog = dogs.find((d) => d.id === feature.properties?.id);
      if (dog) onSelect?.(dog);
    },
    [dogs, onSelect]
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ ...DELHI_CENTER, zoom: 10.8 }}
      mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      interactiveLayerIds={["clusters", "marker-dot"]}
      onClick={onClick}
      onLoad={onLoad}
      style={{ width: "100%", height: "100%" }}
      cursor="pointer"
      attributionControl={false}
      fadeDuration={300}
      reuseMaps
    >
      <GeolocateControl position="bottom-left" />
      <NavigationControl position="bottom-left" showCompass={false} />

      <Source
        id="dogs"
        type="geojson"
        data={geojson}
        cluster
        clusterMaxZoom={14}
        clusterRadius={56}
      >
        <Layer {...clusterGlow} />
        <Layer {...clusterCore} />
        <Layer {...clusterCount} />
        <Layer {...markerGlow} />
        <Layer {...markerShadow} />
        <Layer {...markerDot(ring)} />
        <Layer {...markerCore} />
      </Source>
    </Map>
  );
}
