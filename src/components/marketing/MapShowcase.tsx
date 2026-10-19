"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Map, X } from "lucide-react";

type Place = { city: string; animals: number; cells: number };

/** The map engine, data requests and WebGL context only exist after a deliberate click. */
export function MapShowcase({ map, places }: { map: ReactNode; places: Place[] }) {
  const [active, setActive] = useState(false);
  const [city, setCity] = useState(places.find(p => p.cells > 1)?.city ?? "");
  const start = useRef<HTMLButtonElement>(null);
  const href = city ? `/explore?city=${encodeURIComponent(city)}` : "/explore";
  return <div id="living-map-showcase" className="depth-map-showcase" aria-labelledby="map-showcase-title">
    <header><div><p>Living Map</p><h3 id="map-showcase-title">The place behind the record.</h3></div><Link href={href}>Open full map <ArrowUpRight size={16} aria-hidden /></Link></header>
    <div className="depth-map-frame">
      {active ? <><div className="depth-map-live-bar"><span>Actual public data · read-only</span><button type="button" onClick={() => { setActive(false); requestAnimationFrame(() => start.current?.focus({ preventScroll: true })); }}><X size={17} aria-hidden />Close interactive map</button></div><iframe title="Interactive Living Map: actual public records" src={`/embed/map/preview${city ? `?city=${encodeURIComponent(city)}` : ""}`} allow="geolocation 'none'; camera 'none'; microphone 'none'" /></> : <div className="depth-map-cover"><div className="depth-map-drawing">{map}</div><div className="depth-map-invitation"><Map size={34} strokeWidth={1.3} aria-hidden /><h4>From a city to an animal.</h4><p>Explore recorded areas, switch layers and inspect the underlying histories.</p><button type="button" ref={start} className="sw-btn is-flame" onClick={() => setActive(true)}>Explore the interactive map <ArrowUpRight size={17} aria-hidden /></button></div></div>}
    </div>
    {!active && places.length > 0 && <div className="depth-map-places" role="group" aria-label="Starting city for the interactive map">{places.slice(0, 4).map(p => <button type="button" key={p.city} aria-pressed={city === p.city} onClick={() => setCity(p.city)}><b>{p.city}</b><span>{p.animals.toLocaleString("en-IN")} records · {p.cells > 0 ? `${p.cells.toLocaleString("en-IN")} areas` : "city-level only"}</span></button>)}</div>}
    <p className="depth-map-limits">Public records, shown by area. <Link href="/evidence">Sources and limits</Link></p>
    <noscript><p><a href="/explore">Explore the full Living Map</a>. Interactive exploration requires JavaScript.</p></noscript>
  </div>;
}
