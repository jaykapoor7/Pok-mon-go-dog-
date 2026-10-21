"use client";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import type { NationalCity } from "@/lib/livingmap/types";
const FieldMap = dynamic(() => import("@/sp/map/FieldMap").then(m => m.FieldMap), { ssr: false, loading: () => <p className="atlas-loading" role="status">Opening the map…</p> });
/** Load the full renderer near the viewport, with a stable rectangular frame. */
export function LandingAtlas({ cities }: { cities: NationalCity[] }) {
 const ref = useRef<HTMLDivElement>(null);
 const [show, setShow] = useState(false);
 useEffect(() => { if (!ref.current) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: "300px" }); io.observe(ref.current); return () => io.disconnect(); }, []);
 return <div className="landing-atlas" ref={ref}>{show ? <Suspense fallback={<p role="status">Opening the map…</p>}><FieldMap embedded initialCities={cities} lenses={["animals", "care"]} /></Suspense> : <p className="atlas-loading">India → City → Locality → Animal</p>}</div>;
}
