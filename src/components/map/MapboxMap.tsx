"use client";

import { useCallback, useMemo, useRef } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl";
import type { CircleLayer, SymbolLayer } from "react-map-gl";
import { DELHI_CENTER } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

const clusterLayer: CircleLayer = {
  id: "clusters",
  type: "circle",
  source: "dogs",
  filter: ["has", "point_count"],
  paint: {
    // High-contrast, premium neutral clusters.
    "circle-color": "#101012",
    "circle-opacity": 0.92,
    "circle-radius": ["step", ["get", "point_count"], 17, 5, 22, 15, 28],
    "circle-stroke-width": 3,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-opacity": 0.9,
  },
};

const clusterCountLayer: SymbolLayer = {
  id: "cluster-count",
  type: "symbol",
  source: "dogs",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 13,
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
  },
  paint: { "text-color": "#ffffff" },
};

// Soft shadow under each point for subtle elevation.
const unclusteredShadow: CircleLayer = {
  id: "unclustered-shadow",
  type: "circle",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#101012",
    "circle-opacity": 0.18,
    "circle-radius": 13,
    "circle-blur": 0.8,
    "circle-translate": [0, 1],
  },
};

const unclusteredCircle: CircleLayer = {
  id: "unclustered-point",
  type: "circle",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": 11,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#ffffff",
  },
};

const unclusteredEmoji: SymbolLayer = {
  id: "unclustered-emoji",
  type: "symbol",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "text-field": ["get", "emoji"],
    "text-size": 12,
    "text-allow-overlap": true,
  },
};

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

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: dogs.map((d) => {
        const meta = markerMetaFor(d);
        return {
          type: "Feature" as const,
          properties: { id: d.id, color: meta.color, emoji: meta.emoji },
          geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
        };
      }),
    }),
    [dogs]
  );

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const map = mapRef.current;
      if (!map) return;

      // Cluster → zoom in to expand.
      if (feature.properties?.point_count) {
        const clusterId = feature.properties.cluster_id;
        const src = map.getSource("dogs") as mapboxgl.GeoJSONSource | undefined;
        // @ts-expect-error getClusterExpansionZoom exists at runtime
        src?.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom + 0.5,
            duration: 600,
          });
        });
        return;
      }

      // Single dog → bubble up to open the bottom sheet.
      const dog = dogs.find((d) => d.id === feature.properties?.id);
      if (dog) onSelect?.(dog);
    },
    [dogs, onSelect]
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ ...DELHI_CENTER, zoom: 10.6 }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      interactiveLayerIds={["clusters", "unclustered-point", "unclustered-emoji"]}
      onClick={onClick}
      style={{ width: "100%", height: "100%" }}
      cursor="pointer"
      attributionControl={false}
    >
      <GeolocateControl position="top-right" />
      <NavigationControl position="top-right" showCompass={false} />

      <Source
        id="dogs"
        type="geojson"
        data={geojson}
        cluster
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredShadow} />
        <Layer {...unclusteredCircle} />
        <Layer {...unclusteredEmoji} />
      </Source>
    </Map>
  );
}
