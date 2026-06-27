"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
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
import type { Dog } from "@/lib/types";

// Free, keyless, full-detail OpenStreetMap vector style (Google-Maps-like).
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type Props = { id: string; cover: string; urgent: boolean; sightings: number };

export function MapLibreMap({
  dogs,
  onSelect,
  center,
  drift,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  drift?: boolean;
}) {
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(INDIA_ZOOM);

  // Fly to a searched place when it changes.
  useEffect(() => {
    if (center) {
      mapRef.current?.easeTo({
        center: [center.lng, center.lat],
        zoom: 13,
        duration: 900,
      });
    }
  }, [center?.lat, center?.lng]);

  // Gentle idle rotation for the non-interactive home preview — keeps the map
  // feeling alive without trapping page scroll. Centre stays put (markers never
  // leave view); we just ease the bearing round very slowly.
  useEffect(() => {
    if (!drift) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      mapRef.current?.setBearing(((now - start) / 1000) * 0.7); // ~0.7°/sec
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drift]);

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

  const sync = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (b) setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setZoom(map.getZoom());
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: center?.lng ?? INDIA_CENTER.lng,
        latitude: center?.lat ?? INDIA_CENTER.lat,
        zoom: center ? 13 : INDIA_ZOOM,
      }}
      mapStyle={STYLE_URL}
      onLoad={sync}
      onMoveEnd={drift ? undefined : sync}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
      // Disable the default full-width bar; the full map adds a compact,
      // collapsible attribution below so OSM/MapLibre stay credited without the
      // bulky end-to-end strip (which looked oversized on the small preview).
      attributionControl={false}
    >
      {/* The home preview is non-interactive, so it skips the map controls
          and attribution; the full map keeps both. */}
      {!drift && (
        <>
          <GeolocateControl
            position="bottom-right"
            trackUserLocation
            positionOptions={{ enableHighAccuracy: true }}
          />
          <NavigationControl position="bottom-right" showCompass={false} />
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
    </Map>
  );
}
