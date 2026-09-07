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
  Map as MapLibreInstance,
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { INDIA_CENTER, INDIA_ZOOM } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { FeedingMarker } from "./FeedingMarker";
import {
  dogIdFromIcon,
  iconIdFor,
  renderFallbackIcon,
  renderPhotoIcon,
  type DogIconSpec,
} from "./dogIcon";
import type { Dog, FeedingZone } from "@/lib/types";
import { stateCoverage, STATUS_META } from "@/lib/platform/coverage";
import {
  WARD_METRICS,
  WARD_RAMP,
  WARD_UNSURVEYED,
  getIndiaMask,
  type MaskCollection,
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

   The basemap is CARTO Voyager, arrived at by getting it wrong twice.

   Liberty was a full-colour street map, every road class its own hue, which
   the animal dots had to compete with. Positron went too far the other way:
   a near-white sheet that read as a page which had failed to load. Dark
   Matter went further still and came out black, and worse, it fights the
   thing this map exists for — ward polygons are a choropleth, and a
   choropleth needs a light ground for its colours to mean anything.

   Voyager is the middle one and the right one. Light enough for ward fills
   to read as data, with enough colour of its own — water, parks, road
   hierarchy — that it is legibly a map of somewhere at first glance
   instead of an empty sheet.
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
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" +
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
const PHOTO_LAYER = "dog-photos";
const MASK_SRC = "india-mask";
const MASK_FILL = "india-mask-fill";
const MASK_LINE = "india-outline";
const WARD_SRC = "wards";
const WARD_FILL = "ward-fill";
const WARD_LINE = "ward-line";
const INTERACTIVE = [PHOTO_LAYER];
const INTERACTIVE_WITH_WARDS = [PHOTO_LAYER, WARD_FILL];

/** Imperative handles the surrounding UI drives its own controls with. */
export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  toggle3D: () => boolean;
  fitIndia: () => void;
  /** Where the camera is pointed, for "report an animal here". */
  getCenter: () => { lat: number; lng: number } | null;
};

/* The record you have open, ringed on the map. Without this the bottom
   sheet tells you about an animal and the map gives you no way to see which
   of them it is talking about. */
const selectedLayer: CircleLayerSpecification = {
  id: "dog-selected",
  type: "circle",
  source: SRC,
  filter: ["==", ["get", "id"], "__none__"],
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    /* Tracks the icon-size ramp below, four pixels wider at each stop. A
       ring drawn inside the marker reads as part of it and stops pointing
       anything out. */
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      4, 15,
      8, 21,
      12, 28,
      15, 32,
    ],
    "circle-stroke-width": 3,
    "circle-stroke-color": "#1b46b0",
  },
};

/* The animal's own photograph, ringed in its status colour — the marker the
   map had before performance work replaced every one of them with a dot.

   It is a symbol layer, so the photograph is a texture MapLibre already has
   uploaded rather than a DOM node it has to move each frame. icon-image
   names an image that does not exist yet; MapLibre asks for it once, through
   styleimagemissing, and draws it as soon as it is handed over.

   Every animal, at every zoom. There is no clustering and no plain-dot
   fallback beneath it: the photograph IS the marker, and it shrinks with
   distance rather than being replaced by something that is not a dog. */
const photoLayer: SymbolLayerSpecification = {
  id: PHOTO_LAYER,
  type: "symbol",
  source: SRC,
  layout: {
    "icon-image": ["get", "icon"],
    /* Small when the whole country is on screen, full size once you are
       looking at a street. No lower bound on the zoom: an animal is worth
       seeing wherever you are looking from, and shrinking is how a national
       view stays legible without hiding anything. */
    "icon-size": [
      "interpolate", ["linear"], ["zoom"],
      4, 0.4,
      8, 0.6,
      12, 0.85,
      15, 1,
    ],
    /* Two animals on the same doorstep should both be visible; hiding one
       would quietly under-report the street. */
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
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

/* Everything that is not India, dimmed.

   maxBounds fences the camera, but a rectangle drawn around India contains
   parts of Pakistan, Nepal, Bangladesh and Myanmar, and a map of India that
   opens on another country's territory rendered exactly like our own is not
   a map of India.

   Dimmed rather than hidden, deliberately. The neighbours are still there —
   they are just not what this map reports on, and painting them out
   entirely would be drawing a political claim we have no business making.
   The border here comes from Census 2011 district boundaries and is a
   cartographic convenience, not a statement about anything disputed. */
const maskFillLayer: FillLayerSpecification = {
  id: MASK_FILL,
  type: "fill",
  source: MASK_SRC,
  paint: {
    "fill-color": "#f2f3f6",
    "fill-opacity": 0.82,
  },
};

/* A quiet edge, so the country reads as a shape rather than as the place
   where the dimming happens to stop. */
const maskLineLayer: LineLayerSpecification = {
  id: MASK_LINE,
  type: "line",
  source: MASK_SRC,
  paint: {
    "line-color": "#8d96a8",
    "line-width": 0.8,
    "line-opacity": 0.55,
  },
};

const wardLineLayer: LineLayerSpecification = {
  id: WARD_LINE,
  type: "line",
  source: WARD_SRC,
  paint: {
    "line-color": "#33415c",
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
  bounds,
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
  /** Extent of a searched area. Framed in preference to center. */
  bounds?: [[number, number], [number, number]] | null;
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
  /* Fetched once per mount and never again: the national outline does not
     change while somebody is looking at it. Null until it arrives, and null
     for good if boundaries have not been loaded, in which case the map
     simply is not masked rather than being covered over. */
  const [mask, setMask] = useState<MaskCollection | null>(null);
  useEffect(() => {
    if (preview) return;
    let alive = true;
    getIndiaMask()
      .then((m) => alive && setMask(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [preview]);

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
  /* Serialised so an equal-but-new array does not re-animate the camera on
     every render, the same reason center is depended on by coordinate
     rather than by object. */
  const boundsKey = bounds ? bounds.flat().join(",") : null;
  useEffect(() => {
    if (preview) return;
    if (!boundsKey && (centerLat == null || centerLng == null)) return;

    /* Waits for the map, rather than reading mapRef.current once and giving
       up. On a fresh page load that ref is null when this first runs — the
       same trap the icon listener fell into — and because none of the
       dependencies change afterwards the effect never ran again. A link
       carrying ?bbox= therefore landed on the default national view instead
       of the area it named, which is every search result for a ward or a
       district. */
    let raf = 0;
    const move = () => {
      const map = mapRef.current;
      if (!map) {
        raf = requestAnimationFrame(move);
        return;
      }
      /* An extent beats a point. A ward is a few square kilometres and a
         district a few thousand, and no single zoom frames both; fitBounds
         works out the zoom from the shape itself. */
      if (boundsKey) {
        const n = boundsKey.split(",").map(Number);
        map.fitBounds(
          [
            [n[0], n[1]],
            [n[2], n[3]],
          ],
          { duration: 900, padding: 48, maxZoom: 15 }
        );
        return;
      }
      map.easeTo({
        center: [centerLng as number, centerLat as number],
        zoom: 13,
        duration: 900,
      });
    };
    move();
    return () => cancelAnimationFrame(raf);
  }, [centerLat, centerLng, boundsKey, preview]);

  const byId = useMemo(() => {
    const m: Record<string, Dog> = {};
    for (const d of dogs) m[d.id] = d;
    return m;
  }, [dogs]);

  /* Everything an icon needs, without holding the whole animal. Kept in a ref
     so the styleimagemissing handler can be registered once and still see
     current data: re-binding that listener on every dogs change would drop
     requests that were in flight. */
  const iconSpecs = useRef<Record<string, DogIconSpec>>({});
  iconSpecs.current = useMemo(() => {
    const m: Record<string, DogIconSpec> = {};
    for (const d of dogs) {
      m[iconIdFor(d.id)] = {
        photo: d.cover_photo ?? null,
        color: markerMetaFor(d).color,
        urgent: Boolean(d.needs_help),
        seed: d.id,
      };
    }
    return m;
  }, [dogs]);

  /* MapLibre asks for an image the moment it first needs to draw one, which
     is exactly the laziness this wants: only animals on screen are ever
     fetched, and no viewport state has to be tracked to achieve it.

     The ring is added synchronously so the marker appears at once, then the
     photograph replaces it in place when it arrives. A marker that waited for
     the network would blink into existence halfway through a pan. */
  const iconPending = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = iconPending.current;

    const onMissing = (e: { id: string }) => {
      const iconId = e.id;
      if (!dogIdFromIcon(iconId) || pending.has(iconId)) return;
      const spec = iconSpecs.current[iconId];
      if (!spec) return;
      pending.add(iconId);

      const m = mapRef.current?.getMap?.();
      if (!m) return;
      if (!m.hasImage(iconId)) {
        const placeholder = renderFallbackIcon(spec);
        if (placeholder) m.addImage(iconId, placeholder, { pixelRatio: 2 });
      }

      renderPhotoIcon(spec)
        .then((withPhoto) => {
          /* The style can be swapped or the component unmounted while a
             photograph is still downloading, and updating an image on a map
             that has moved on throws. */
          if (!withPhoto || !m.hasImage(iconId)) return;
          m.updateImage(iconId, withPhoto);
        })
        .catch(() => {});
    };

    /* Attached once the map instance actually exists.
     *
     * The first version of this read mapRef.current inside an effect with an
     * empty dependency list and returned early when it was null — which it
     * always is on the first commit, because react-map-gl assigns the ref
     * while rendering its own child. So the listener was never attached at
     * all, no icon was ever built, and the symbol layer pointed at images
     * that did not exist: every animal silently drew nothing.
     *
     * Same requestAnimationFrame wait the camera controls below use, for
     * the same reason. */
    let map: MapLibreInstance | null = null;
    let raf = 0;
    const attach = () => {
      map = mapRef.current?.getMap?.() ?? null;
      if (!map) {
        raf = requestAnimationFrame(attach);
        return;
      }
      map.on("styleimagemissing", onMissing);
    };
    attach();

    return () => {
      cancelAnimationFrame(raf);
      map?.off("styleimagemissing", onMissing);
    };
  }, []);

  /* An icon is drawn once and then cached by MapLibre forever, so an animal
     that is marked as needing help keeps its old ring colour until something
     drops the stale image. Signatures are compared rather than images
     rebuilt: almost every re-render changes nothing here. */
  const iconSigs = useRef<Record<string, string>>({});
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    for (const [iconId, spec] of Object.entries(iconSpecs.current)) {
      const sig = `${spec.photo ?? ""}|${spec.color}|${spec.urgent}`;
      if (iconSigs.current[iconId] === sig) continue;
      iconSigs.current[iconId] = sig;
      /* Removing it is enough. MapLibre asks again the next time it needs to
         paint that animal, and the handler above builds the current one. */
      if (map.hasImage?.(iconId)) map.removeImage(iconId);
      /* And let it be requested again. Without this the icon is removed,
         styleimagemissing fires, the handler sees the id already in
         `pending` and returns early — so an animal whose status changed
         would lose its marker for good rather than getting a new one. */
      iconPending.current.delete(iconId);
    }
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
        /* No feature id. MapLibre wants a number there and quietly rejects
           a UUID string; nothing here uses feature-state, and the selection
           ring matches on the id PROPERTY below instead. */
        properties: {
          id: d.id,
          urgent: Boolean(d.needs_help),
          color: markerMetaFor(d).color,
          /* Named here, drawn later. The image behind this name is built the
             first time MapLibre needs to paint it — see the styleimagemissing
             effect below — so a thousand animals cost a thousand names and
             only as many photographs as are actually on screen. */
          icon: iconIdFor(d.id),
        },
        geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
      })),
    }),
    [dogs]
  );

  /* Tap a photograph, open that animal's record. There is no second kind of
     thing to tap any more: the cluster branch that used to live here zoomed
     you in and left you looking at another cluster. */
  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current;
      const f = e.features?.[0];
      if (!map || !f) return;

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
      {/* The mask goes down first: it belongs to the basemap, and both the
          ward shading and the animals have to draw over it. */}
      {mask && !preview && (
        <Source id={MASK_SRC} type="geojson" data={mask}>
          <Layer {...maskFillLayer} />
          <Layer {...maskLineLayer} />
        </Source>
      )}

      {/* Wards next so the animal dots draw on top of their own shading. */}
      {wards && !preview && (
        <Source id={WARD_SRC} type="geojson" data={wards} promoteId="ward_id">
          <Layer {...wardFillLayer(wardMetric)} />
          <Layer {...wardLineLayer} />
        </Source>
      )}

      {/* No clustering. Every animal is its own photograph at every zoom.

          Clusters answered "how many are around here", which is a question
          the ward map answers properly, with boundaries and a denominator.
          What they cost was the thing this map is for: a blue disc with a
          number on it is not an animal you can recognise, and tapping one
          only ever got you a slightly smaller disc. */}
      <Source id={SRC} type="geojson" data={data}>
        <Layer {...photoLayer} />
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
