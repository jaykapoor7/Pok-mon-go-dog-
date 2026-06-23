"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl";
import type { CircleLayer, SymbolLayer } from "react-map-gl";
import { DELHI_CENTER } from "@/lib/delhi";
import { STATUS_META, type Dog } from "@/lib/types";
import { DogQuickCard } from "./DogQuickCard";

const clusterLayer: CircleLayer = {
  id: "clusters",
  type: "circle",
  source: "dogs",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#f97316",
    "circle-opacity": 0.85,
    "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 32],
    "circle-stroke-width": 4,
    "circle-stroke-color": "#ffedd5",
  },
};

const clusterCountLayer: SymbolLayer = {
  id: "cluster-count",
  type: "symbol",
  source: "dogs",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 14,
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
  },
  paint: { "text-color": "#ffffff" },
};

const unclusteredCircle: CircleLayer = {
  id: "unclustered-point",
  type: "circle",
  source: "dogs",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": 14,
    "circle-stroke-width": 3,
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
    "text-size": 14,
    "text-allow-overlap": true,
  },
};

export function MapboxMap({
  token,
  dogs,
  onAction,
}: {
  token: string;
  dogs: Dog[];
  onAction?: (dog: Dog, kind: "saw" | "fed") => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<Dog | null>(null);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: dogs.map((d) => ({
        type: "Feature" as const,
        properties: {
          id: d.id,
          color: STATUS_META[d.status].color,
          emoji: STATUS_META[d.status].emoji,
        },
        geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
      })),
    }),
    [dogs]
  );

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) {
        setSelected(null);
        return;
      }
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

      // Single dog → open card.
      const dog = dogs.find((d) => d.id === feature.properties?.id);
      if (dog) setSelected(dog);
    },
    [dogs]
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
        <Layer {...unclusteredCircle} />
        <Layer {...unclusteredEmoji} />
      </Source>

      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          anchor="bottom"
          offset={20}
          closeButton
          closeOnClick={false}
          onClose={() => setSelected(null)}
          maxWidth="300px"
        >
          <DogQuickCard
            dog={selected}
            onAction={(kind) => onAction?.(selected, kind)}
          />
        </Popup>
      )}
    </Map>
  );
}
