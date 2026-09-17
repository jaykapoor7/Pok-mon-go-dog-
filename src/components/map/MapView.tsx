"use client";

import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Minus, Maximize2, Layers3 } from "lucide-react";
import { MapAnimalDetails } from "./MapAnimalDetails";
import { MapCanvas } from "@/components/map/MapCanvas";
import { orgAnimals } from "@/lib/programme";
import { distanceMeters } from "@/lib/utils";
import type { Dog, FeedingZone, FieldActivity } from "@/lib/types";
import type { MapApi } from "@/components/map/MapLibreMap";
import "./map.css";

const SAFFRON = "#8fb7ff";
const MINT = "#66c5d5";
const DANGER = "#ff6a4f";
const VIOLET = "#a68cff";
type Lens = "density" | "urgent" | "arv_gap" | "abc_gap" | null;

type Hotspot = {
  key:string; lat:number; lng:number; total:number; urgent:number; arvGap:number; abcGap:number; label:string;
};

export function MapView({
  dogs: allDogs,
  feedingZones = [],
  fieldActivity = [],
}: {
  dogs: Dog[];
  feedingZones?: FeedingZone[];
  fieldActivity?: FieldActivity[];
}) {
  const [selected, setSelected] = useState<Dog | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const [mapApi, setMapApi] = useState<MapApi | null>(null);
  const [tilted, setTilted] = useState(false);
  const [only, setOnly] = useState<"needs" | "sterilised" | "vaccinated" | null>(null);
  const [lens,setLens]=useState<Lens>(null);
  const params = useSearchParams();
  const router = useRouter();

  const sLat = parseFloat(params.get("lat") ?? "");
  const sLng = parseFloat(params.get("lng") ?? "");
  const urlCentre = Number.isFinite(sLat) && Number.isFinite(sLng) ? { lat: sLat, lng: sLng } : null;

  const bboxParam = params.get("bbox");
  const urlBounds = (() => {
    if (!bboxParam) return null;
    const n = bboxParam.split(",").map(Number);
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return null;
    return [[n[0], n[1]],[n[2], n[3]]] as [[number, number], [number, number]];
  })();

  const [orgCentre, setOrgCentre] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    let live = true;
    orgAnimals({ limit: 300 })
      .then((rows) => {
        if (!live) return;
        const pts = rows.filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && r.lat !== 0 && r.lng !== 0);
        if (pts.length === 0) return;
        setOrgCentre({ lat: pts.reduce((n, r) => n + (r.lat as number), 0) / pts.length, lng: pts.reduce((n, r) => n + (r.lng as number), 0) / pts.length });
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const center = urlCentre ?? orgCentre ?? coords;
  const hasPlace = Boolean(urlCentre || bboxParam || orgCentre || coords);
  const recordBounds = useMemo(() => {
    if (hasPlace) return null;
    const pts = [...allDogs, ...fieldActivity].filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng) && (d.lat !== 0 || d.lng !== 0));
    if (pts.length < 2) return null;
    return [[Math.min(...pts.map((d) => d.lng)), Math.min(...pts.map((d) => d.lat))],[Math.max(...pts.map((d) => d.lng)), Math.max(...pts.map((d) => d.lat))]] as [[number, number], [number, number]];
  }, [hasPlace, allDogs, fieldActivity]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),() => {},{ timeout: 6000 });
  }, []);

  function handleSelect(dog: Dog | null) {
    lastTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(dog); setDrawerOpen(!!dog); if (dog) mapApi?.focusAnimal(dog);
  }
  function closeDrawer() { setDrawerOpen(false); setSelected(null); lastTrigger.current?.focus(); }
  useEffect(() => {
    if (!drawerOpen) return;
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawerOpen(false); setSelected(null); lastTrigger.current?.focus(); } };
    addEventListener("keydown", escape); return () => removeEventListener("keydown", escape);
  }, [drawerOpen]);

  const lensDogs = useMemo(()=>{
    if(lens==="urgent")return allDogs.filter(d=>d.needs_help);
    if(lens==="arv_gap")return allDogs.filter(d=>!d.vaccinated);
    if(lens==="abc_gap")return allDogs.filter(d=>!d.sterilised);
    return allDogs;
  },[allDogs,lens]);

  const dogs = useMemo(() => {
    if (only === "needs") return lensDogs.filter((d) => d.needs_help);
    if (only === "sterilised") return lensDogs.filter((d) => d.sterilised);
    if (only === "vaccinated") return lensDogs.filter((d) => d.vaccinated);
    return lensDogs;
  }, [lensDogs, only]);

  const counts = useMemo(() => {
    const needsHelp = allDogs.filter((d) => d.needs_help).length;
    const sterilised = allDogs.filter((d) => d.sterilised).length;
    const vaccinated = allDogs.filter((d) => d.vaccinated).length;
    return [
      { key: null, value: String(allDogs.length), label: "ALL ANIMALS", color: SAFFRON },
      { key: "needs", value: String(needsHelp), label: "NEED HELP", color: DANGER },
      { key: "sterilised", value: String(sterilised), label: "STERILISED", color: MINT },
      { key: "vaccinated", value: String(vaccinated), label: "VACCINATED", color: VIOLET },
    ] as const;
  }, [allDogs]);

  const hotspots=useMemo<Hotspot[]>(()=>{
    const cell=.03;
    const bins=new Map<string,{lat:number;lng:number;total:number;urgent:number;arvGap:number;abcGap:number;zones:Map<string,number>}>();
    for(const d of allDogs){if(!Number.isFinite(d.lat)||!Number.isFinite(d.lng)||(!d.lat&&!d.lng))continue;const key=`${Math.floor(d.lat/cell)}:${Math.floor(d.lng/cell)}`;const b=bins.get(key)??{lat:0,lng:0,total:0,urgent:0,arvGap:0,abcGap:0,zones:new Map<string,number>()};b.lat+=d.lat;b.lng+=d.lng;b.total++;if(d.needs_help)b.urgent++;if(!d.vaccinated)b.arvGap++;if(!d.sterilised)b.abcGap++;if(d.zone)b.zones.set(d.zone,(b.zones.get(d.zone)??0)+1);bins.set(key,b)}
    const rows=[...bins.entries()].map(([key,b])=>{const label=[...b.zones.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"Mapped area";return{key,lat:b.lat/b.total,lng:b.lng/b.total,total:b.total,urgent:b.urgent,arvGap:b.arvGap,abcGap:b.abcGap,label}});
    const score=(h:Hotspot)=>lens==="urgent"?h.urgent:lens==="arv_gap"?h.arvGap:lens==="abc_gap"?h.abcGap:h.total;
    return rows.filter(h=>score(h)>0).sort((a,b)=>score(b)-score(a)||b.total-a.total).slice(0,5);
  },[allDogs,lens]);

  const lensMeta = lens==="urgent"?{title:"Urgent-help clusters",metric:(h:Hotspot)=>`${h.urgent} need help / ${h.total} recorded`} : lens==="arv_gap"?{title:"Rabies vaccination gaps",metric:(h:Hotspot)=>`${h.arvGap} without ARV record / ${h.total} recorded`} : lens==="abc_gap"?{title:"ABC coverage gaps",metric:(h:Hotspot)=>`${h.abcGap} without sterilisation record / ${h.total} recorded`} : {title:"Animal density clusters",metric:(h:Hotspot)=>`${h.total} animals recorded`};

  const dist = selected && coords ? distanceMeters(coords, selected) : null;
  const fmtDist = (d: number) => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;

  return (
    <div className={`sp-map ${drawerOpen ? "has-selection" : ""}`} style={{ fontFamily: "var(--font-sans, DM Sans, ui-sans-serif, system-ui, sans-serif)" }}>
      <h1 style={{position:"absolute",width:1,height:1,margin:-1,padding:0,overflow:"hidden",clip:"rect(0 0 0 0)",whiteSpace:"nowrap",border:0}}>Street animals, care gaps and outcomes across India</h1>
      <div className="sp-map-canvas">
        <MapCanvas dogs={dogs} onSelect={handleSelect} selectedId={selected?.id ?? null} center={center} bounds={urlBounds ?? recordBounds} feedingZones={feedingZones} fieldActivity={fieldActivity} onReady={setMapApi}/>

        <section className="sp-map-toolbar" aria-label="Map controls">
          <div className="sp-map-title"><span className="spa-mono">Street records</span><h2>Map the work.</h2></div>
          <div className="sp-map-filters" role="group" aria-label="Filter animals">
            {counts.map((k) => <button key={k.label} type="button" onClick={() => { setOnly(k.key); setLens(null); setDrawerOpen(false); setSelected(null); }} aria-pressed={only === k.key && !lens} className={only === k.key && !lens ? "is-active" : ""} style={{ "--sp-filter": k.color } as CSSProperties}><b>{k.value}</b><span>{k.key === null ? "All" : k.label.toLowerCase()}</span></button>)}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10,borderTop:"1px solid rgba(255,255,255,.08)"}} role="group" aria-label="Map insight lenses">
            <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:700,letterSpacing:".08em",color:"rgba(255,255,255,.58)",marginRight:4}}><Layers3 size={13}/> INSIGHT</span>
            {([{key:"density",label:"Density"},{key:"urgent",label:"Urgency"},{key:"arv_gap",label:"ARV gaps"},{key:"abc_gap",label:"ABC gaps"}] as const).map(item=><button key={item.key} type="button" onClick={()=>{setLens(v=>v===item.key?null:item.key);setOnly(null);setDrawerOpen(false);setSelected(null)}} aria-pressed={lens===item.key} style={{border:"1px solid rgba(255,255,255,.14)",background:lens===item.key?"#2457ce":"rgba(16,24,43,.68)",color:"white",borderRadius:999,padding:"5px 9px",fontSize:10.5,fontWeight:700}}>{item.label}</button>)}
          </div>
        </section>

        {lens&&<aside style={{position:"absolute",left:18,bottom:18,zIndex:3,width:"min(330px,calc(100% - 36px))",background:"rgba(11,30,61,.94)",color:"white",border:"1px solid rgba(255,255,255,.12)",borderRadius:12,padding:14,boxShadow:"0 12px 34px rgba(0,0,0,.22)",backdropFilter:"blur(10px)"}} aria-label={lensMeta.title}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:".1em",color:"rgba(255,255,255,.56)"}}>MAP INTELLIGENCE</div><b style={{display:"block",fontSize:15,marginTop:3}}>{lensMeta.title}</b><p style={{fontSize:11,lineHeight:1.45,color:"rgba(255,255,255,.64)",margin:"4px 0 10px"}}>Clusters use the mapped records already in StrayPaw. They reveal concentration and coverage patterns; they are not population estimates.</p>
          <div>{hotspots.map((h,i)=><button key={h.key} type="button" onClick={()=>mapApi?.focusAnimal(h)} style={{display:"grid",gridTemplateColumns:"22px 1fr",gap:7,width:"100%",textAlign:"left",border:0,borderTop:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"white",padding:"8px 0"}}><span style={{fontSize:11,color:"rgba(255,255,255,.45)"}}>#{i+1}</span><span><b style={{display:"block",fontSize:12}}>{h.label}</b><small style={{fontSize:10.5,color:"rgba(255,255,255,.62)"}}>{lensMeta.metric(h)}</small></span></button>)}</div>
        </aside>}

        <div className="sp-map-controls">
          {([{ key: "fit", glyph: <Maximize2 size={19}/>, title: "Fit all of India", run: () => mapApi?.fitIndia() },{ key: "3d", glyph: "3D", title: "Toggle 3D tilt", run: () => setTilted(Boolean(mapApi?.toggle3D())) },{ key: "in", glyph: <Plus size={20}/>, title: "Zoom in", run: () => mapApi?.zoomIn() },{ key: "out", glyph: <Minus size={20}/>, title: "Zoom out", run: () => mapApi?.zoomOut() }] as const).map((b) => { const on = b.key === "3d" && tilted; return <button key={b.key} type="button" onClick={b.run} title={b.title} aria-label={b.title} aria-pressed={b.key === "3d" ? tilted : undefined} disabled={!mapApi} data-control={b.key} className={on ? "is-active" : ""}>{b.glyph}</button>; })}
        </div>

        <button className="sp-map-report" onClick={() => { const point = mapApi?.getCenter(); router.push(point ? `/report?lat=${point.lat}&lng=${point.lng}` : "/report"); }}><Plus size={18}/> Report here</button>
        {fieldActivity.length > 0 && <div className="absolute bottom-5 right-16 z-[2] rounded border border-white/20 bg-[#10182b]/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-white/80 shadow-sm backdrop-blur">{fieldActivity.length.toLocaleString()} NGO field records</div>}
        {dogs.length === 0 && fieldActivity.length === 0 && <div className="sp-map-empty-state" role="status"><b>{only || lens ? "No mapped animal records match this view." : "No animal records here yet."}</b>{only || lens ? <button onClick={() => {setOnly(null);setLens(null)}}>Show all records</button> : <Link href="/report">Report a sighting</Link>}</div>}
        {drawerOpen && selected && <aside className="sp-map-detail" aria-label="Animal details"><MapAnimalDetails key={selected.id} dog={selected} distance={dist === null ? null : fmtDist(dist)} onClose={closeDrawer}/></aside>}
      </div>
    </div>
  );
}
