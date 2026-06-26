"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import type { PointFeature } from "supercluster";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { PhotoMarker } from "./PhotoMarker";
import type { Dog } from "@/lib/types";

// Free, keyless, full-detail OpenStreetMap vector style (Google-Maps-like).
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type Props = { id: string; cover: string; urgent: boolean; sightings: number };

export function MapLibreMap({
  dogs,
  onSelect,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(INDIA_ZOOM);

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
      initialViewState={{ longitude: INDIA_CENTER.lng, latitude: INDIA_CENTER.lat, zoom: INDIA_ZOOM }}
      mapStyle={STYLE_URL}
      onLoad={sync}
      onMoveEnd={sync}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
    >
      <GeolocateControl
        position="bottom-right"
        trackUserLocation
        positionOptions={{ enableHighAccuracy: true }}
      />
      <NavigationControl position="bottom-right" showCompass={false} />

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
              label={dog?.name ?? "Dog"}
              onClick={() => dog && onSelect?.(dog)}
            />
          </Marker>
        );
      })}
    </Map>
  );
}
