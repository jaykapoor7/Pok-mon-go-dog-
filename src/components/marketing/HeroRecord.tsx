"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, MapPin, PawPrint } from "lucide-react";
import { WORK_IMAGES } from "@/lib/art/sources";

type Place = { name: string; href: string };
/** Explicit switches, native links and server-rendered public data. No scroll choreography. */
export function HeroRecord({ record, map, place, places }: { record: ReactNode; map: ReactNode; place: string | null; places: Place[] }) {
  const [view, setView] = useState<"record" | "map">("record");
  return <div className="hm-record lw-world" data-ui>
    <div className="lw-canopy" aria-hidden>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={WORK_IMAGES.palamporeTree.src} width={1300} height={2104} alt="" /></div>
    <div className="lw-desk">
      <header><b>StrayPaw</b><span>Explore the public record</span></header>
      <div className="lw-switch" role="group" aria-label="Explore StrayPaw"><button type="button" aria-pressed={view === "record"} aria-controls="living-record" onClick={() => setView("record")}><PawPrint size={17} aria-hidden />Animal record</button><button type="button" aria-pressed={view === "map"} aria-controls="living-geography" onClick={() => setView("map")}><MapPin size={17} aria-hidden />Living Map</button></div>
      <div id="living-record" hidden={view !== "record"}>{record}</div>
      <div id="living-geography" className="lw-geography" hidden={view !== "map"}><div className="lw-map-title"><h3>{place ?? "Places on the record"}</h3><span>Coarse public areas</span></div>{map}<p>Choose a recorded place to explore its actual map.</p><div className="lw-places">{places.map(p => <Link key={p.name} href={p.href}>{p.name}<ArrowUpRight size={14} aria-hidden /></Link>)}</div><p className="lw-map-note">A bounded geographic sample, not a population census. Empty coverage means unknown.</p></div>
      <footer><Link href="/explore">Open the Living Map <ArrowUpRight size={15} aria-hidden /></Link><Link href="/evidence">Sources and limits</Link></footer>
    </div>
    <noscript><p>JavaScript is needed to switch views. <a href="/explore">Open the map</a> or explore the animal record above.</p></noscript>
  </div>;
}
