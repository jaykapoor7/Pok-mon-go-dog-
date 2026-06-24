"use client";

import { useCallback, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
} from "react-map-gl";
import type { MapboxEvent } from "mapbox-gl";
import { DELHI_CENTER } from "@/lib/delhi";
import { DogMarker } from "./DogMarker";
import type { Dog } from "@/lib/types";

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

  // Declutter the base style into a calm canvas under the playful markers.
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

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ ...DELHI_CENTER, zoom: 11.2 }}
      mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      onLoad={onLoad}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      fadeDuration={300}
      reuseMaps
    >
      <GeolocateControl
        position="bottom-left"
        trackUserLocation
        showUserHeading
        positionOptions={{ enableHighAccuracy: true }}
      />
      <NavigationControl position="bottom-left" showCompass={false} />

      {dogs.map((dog, i) => (
        <Marker
          key={dog.id}
          longitude={dog.lng}
          latitude={dog.lat}
          anchor="bottom"
        >
          <DogMarker dog={dog} onSelect={onSelect} delay={Math.min(i * 35, 700)} />
        </Marker>
      ))}
    </Map>
  );
}
