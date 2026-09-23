"use client";

/* 3D City: the real city, streamed.

   Google Photorealistic 3D Tiles (the photogrammetry behind Google Earth's
   3D cities), rendered with CesiumJS. Nothing here is modelled by us: the
   buildings, streets and trees are Google's mesh. StrayPaw only adds what
   it knows — the dog, its neighbours, open cases, and when asked, its cells.

   CesiumJS is loaded from the jsDelivr CDN the first time 3D is opened, so
   none of it ships with the 2D map. Coverage is measured, not assumed:
   while the city streams in, every loaded tile near the dog is checked; if
   no fine-grained photogrammetry arrives, the parent falls back to the
   OpenStreetMap 3D buildings in MapLibre and says so. */

import { useEffect, useRef, useState } from "react";

const CESIUM_VERSION = "1.121.0";
const BASE = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;

export type City3DPoint = { lng: number; lat: number; kind: "dog" | "help" | "case" | "abc" | "other" };
export type City3DCell = { ring: [number, number][]; rgba: [number, number, number, number] };
export type Step = "dog" | "cluster" | "locality" | "city";
export type Coverage = "checking" | "photoreal" | "none" | "error";

type CesiumNS = any;

let loading: Promise<CesiumNS> | null = null;
function loadCesium(): Promise<CesiumNS> {
  const w = window as unknown as { Cesium?: CesiumNS; CESIUM_BASE_URL?: string };
  if (w.Cesium) return Promise.resolve(w.Cesium);
  if (loading) return loading;
  w.CESIUM_BASE_URL = BASE;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = `${BASE}Widgets/widgets.css`; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = `${BASE}Cesium.js`; js.async = true;
    js.onload = () => (w.Cesium ? resolve(w.Cesium) : reject(new Error("Cesium did not load")));
    js.onerror = () => reject(new Error("Cesium CDN unreachable"));
    document.head.appendChild(js);
  });
  return loading;
}

const HEIGHT: Record<Step, number> = { dog: 380, cluster: 1400, locality: 4200, city: 26000 };

export function City3D({ apiKey, focus, points, cells, step, onCoverage, onPick }: {
  apiKey: string;
  focus: { lng: number; lat: number; records: number };
  points: City3DPoint[];
  cells: City3DCell[];
  step: Step;
  onCoverage: (c: Coverage, detail?: string) => void;
  onPick?: (i: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumNS>(null);
  const layer = useRef<{ pts?: CesiumNS; cells?: CesiumNS }>({});
  const [ready, setReady] = useState(false);
  const cb = useRef(onCoverage); cb.current = onCoverage;

  useEffect(() => {
    let dead = false, told = false;
    // Coverage is reported once per city: the first verdict wins.
    const tell = (c: Coverage, d?: string) => { if (dead || told) return; told = true; cb.current(c, d); };
    loadCesium().then(async (Cesium) => {
      if (dead || !el.current) return;
      const viewer = new Cesium.Viewer(el.current, {
        baseLayer: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        animation: false, timeline: false, fullscreenButton: false, baseLayerPicker: false, infoBox: false, selectionIndicator: false,
        requestRenderMode: true, maximumRenderTimeChange: Infinity,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#081631");
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#081631");
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      try {
        Cesium.GoogleMaps.defaultApiKey = apiKey;
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        if (dead) return;
        viewer.scene.primitives.add(tileset);
        viewer.scene.globe.show = false;
        // Coverage, measured: fine tiles (under ~250 m across) arriving near the dog mean real photogrammetry here.
        const dogC = Cesium.Cartesian3.fromDegrees(focus.lng, focus.lat, 0);
        let fine = 0, near = 0;
        tileset.tileLoad.addEventListener((tile: CesiumNS) => {
          const bs = tile.boundingSphere;
          if (Cesium.Cartesian3.distance(bs.center, dogC) < 3000) { near++; if (bs.radius < 250) fine++; }
        });
        tileset.tileFailed?.addEventListener(() => tell("error", "Google refused a tile request: check the key and its restrictions."));
        setTimeout(() => tell(fine > 0 ? "photoreal" : "none", `${fine} fine tiles of ${near} within 3 km`), 12000);
      } catch (e) {
        tell("error", String(e).slice(0, 160));
      }
      layer.current.pts = new Cesium.CustomDataSource("dogs");
      layer.current.cells = new Cesium.CustomDataSource("cells");
      // Wide views aggregate; close views separate. Cesium clusters on screen distance.
      const cl = layer.current.pts.clustering;
      cl.enabled = true; cl.pixelRange = 36; cl.minimumClusterSize = 3;
      cl.clusterEvent.addEventListener((ids: CesiumNS[], c: CesiumNS) => {
        c.label.show = true; c.label.text = String(ids.length); c.label.font = "600 12px IBM Plex Mono, monospace";
        c.label.fillColor = Cesium.Color.fromCssColorString("#0b1e3d"); c.label.style = Cesium.LabelStyle.FILL;
        c.label.verticalOrigin = Cesium.VerticalOrigin.CENTER; c.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
        c.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        c.billboard.show = false;
        c.point.show = true; c.point.pixelSize = 14 + Math.min(18, ids.length); c.point.color = Cesium.Color.fromCssColorString("#f3ede4").withAlpha(0.92);
        c.point.outlineColor = Cesium.Color.fromCssColorString("#0b1e3d"); c.point.outlineWidth = 2; c.point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      });
      viewer.dataSources.add(layer.current.cells);
      viewer.dataSources.add(layer.current.pts);
      viewer.screenSpaceEventHandler.setInputAction((m: CesiumNS) => {
        const picked = viewer.scene.pick(m.position);
        const i = picked?.id?.properties?.i?.getValue?.();
        if (typeof i === "number") onPick?.(i);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      setReady(true);
    }).catch((e) => tell("error", String(e.message ?? e)));
    return () => { dead = true; try { viewerRef.current?.destroy(); } catch { /* gone */ } viewerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Points: the dog, its neighbours, open cases. Clamped to whatever surface is there — the photogrammetry roofs and streets.
  useEffect(() => {
    const Cesium = (window as unknown as { Cesium?: CesiumNS }).Cesium; const v = viewerRef.current; const ds = layer.current.pts;
    if (!ready || !Cesium || !v || !ds) return;
    ds.entities.removeAll();
    const col: Record<City3DPoint["kind"], string> = { dog: "#f05b40", help: "#f05b40", case: "#f7a08c", abc: "#93b1f0", other: "#f3ede4" };
    points.forEach((p, i) => {
      if (p.kind === "dog") return;
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat), properties: { i },
        point: { pixelSize: p.kind === "case" ? 9 : 7, color: Cesium.Color.fromCssColorString(col[p.kind]), outlineColor: Cesium.Color.fromCssColorString("#0b1e3d"), outlineWidth: 1.5, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
    });
    // The dog itself: a thin marker standing on the real street, taller the more it has been recorded.
    const dogPos = Cesium.Cartesian3.fromDegrees(focus.lng, focus.lat);
    v.entities.removeAll();
    v.entities.add({ position: dogPos, point: { pixelSize: 16, color: Cesium.Color.fromCssColorString("#f05b40"), outlineColor: Cesium.Color.WHITE, outlineWidth: 3, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    v.scene.clampToHeightMostDetailed([dogPos.clone()]).then((out: CesiumNS[]) => {
      const g = Cesium.Cartographic.fromCartesian(out[0] ?? dogPos);
      const base = Number.isFinite(g.height) ? g.height : 0;
      v.entities.add({ polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights([focus.lng, focus.lat, base, focus.lng, focus.lat, base + 40 + focus.records * 8]), width: 3, material: Cesium.Color.fromCssColorString("#f05b40") } });
      v.scene.requestRender();
    }).catch(() => {});
    v.scene.requestRender();
  }, [ready, points, focus]);

  // Cells, only when the mode asks for them: draped onto the photogrammetry as a classification.
  useEffect(() => {
    const Cesium = (window as unknown as { Cesium?: CesiumNS }).Cesium; const v = viewerRef.current; const ds = layer.current.cells;
    if (!ready || !Cesium || !v || !ds) return;
    ds.entities.removeAll();
    cells.forEach((c) => ds.entities.add({ polygon: { hierarchy: Cesium.Cartesian3.fromDegreesArray(c.ring.flat()), material: new Cesium.Color(c.rgba[0] / 255, c.rgba[1] / 255, c.rgba[2] / 255, c.rgba[3]), classificationType: Cesium.ClassificationType.BOTH } }));
    v.scene.requestRender();
  }, [ready, cells]);

  // Camera: dog → cluster → locality → city, always looking at the dog.
  useEffect(() => {
    const Cesium = (window as unknown as { Cesium?: CesiumNS }).Cesium; const v = viewerRef.current;
    if (!ready || !Cesium || !v) return;
    const h = HEIGHT[step];
    const back = h * 0.9 / 111000; // offset south so the camera looks north at the dog
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(focus.lng, focus.lat - back, h),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(step === "city" ? -55 : -38), roll: 0 },
      duration: 3,
    });
  }, [ready, step, focus]);

  return <div ref={el} className="sp-cesium" />;
}
