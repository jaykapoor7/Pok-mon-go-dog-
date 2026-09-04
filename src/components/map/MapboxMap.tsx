"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
} from "react-map-gl";
import Supercluster from "supercluster";
import type { PointFeature } from "supercluster";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { dogLabel } from "@/lib/utils";
import { PhotoMarker } from "./PhotoMarker";
import { FeedingMarker } from "./FeedingMarker";
import type { Dog, FeedingZone } from "@/lib/types";

type Props = { id: string; cover: string; urgent: boolean; sightings: number };

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function MapboxMap({
  dogs,
  onSelect,
  center,
  preview,
  feedingZones = [],
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  preview?: boolean;
  feedingZones?: FeedingZone[];
}) {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();

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
  const [isDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(INDIA_ZOOM);

  const byId = useMemo(() => {
    const m: Record<string, Dog> = {};
    for (const d of dogs) m[d.id] = d;
    return m;
  }, [dogs]);

  // Build the cluster index from the dogs.
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

  // Recompute clusters only when movement settles → smooth, no jank.
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
      mapboxAccessToken={TOKEN}
      initialViewState={{
        longitude: center?.lng ?? INDIA_CENTER.lng,
        latitude: center?.lat ?? INDIA_CENTER.lat,
        zoom: center ? (preview ? 10.5 : 13) : INDIA_ZOOM,
      }}
      mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
      onLoad={sync}
      onMoveEnd={sync}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
    >
      {!preview && (
        <>
          <GeolocateControl
            position="bottom-right"
            trackUserLocation
            positionOptions={{ enableHighAccuracy: true }}
          />
          <NavigationControl position="bottom-right" showCompass={false} />
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
    </Map>
  );
}
