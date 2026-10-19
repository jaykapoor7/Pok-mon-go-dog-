"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { animalTitle } from "@/lib/animal-name";
import { cleanPlace } from "@/lib/utils";
import { sized } from "@/lib/photo/src";
import { FramedPhoto } from "@/components/landing/FramedPhoto";
import type { LandingPortrait } from "@/lib/landing/story";

/** A small public, photo-reviewed sample; repeated copies never enter the tab order. */
export function ProfileGallery({ portraits }: { portraits: LandingPortrait[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motion.matches);
    sync(); motion.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    return () => { motion.removeEventListener("change", sync); observer.disconnect(); };
  }, []);
  const moving = visible && !paused && !reduced;
  // A very small public sample stays a single usable strip rather than repeating it as evidence.
  const rows = portraits.length >= 6 ? [portraits.filter((_, i) => i % 2 === 0), portraits.filter((_, i) => i % 2 === 1)] : [portraits];
  return <div ref={ref} className={`depth-gallery${moving ? " is-moving" : ""}${paused || reduced ? " is-static" : ""}`} aria-labelledby="gallery-title">
    <header><div><h2 id="gallery-title">A face behind every record.</h2><p>Actual public profiles. Open one to see its history and source.</p></div>{portraits.length > 0 && <button type="button" aria-pressed={paused} disabled={reduced} onClick={() => setPaused(p => !p)}>{paused || reduced ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}{reduced ? "Motion off" : paused ? "Play gallery" : "Pause gallery"}</button>}</header>
    {portraits.length ? <div className="depth-gallery-rows">{rows.map((row, i) => <div className="depth-gallery-row" key={i} role="group" aria-label={`Public animal profiles, row ${i + 1}`}><div className="depth-gallery-track">
      {[false, true].map(copy => <div key={String(copy)} className={`depth-gallery-set${copy ? " is-copy" : ""}`} aria-hidden={copy || undefined}>{Array.from({ length: Math.ceil(8 / row.length) }, (_, repeat) => row.map(a => <Link prefetch={false} aria-hidden={copy || repeat > 0 || undefined} tabIndex={copy || repeat > 0 ? -1 : undefined} key={`${a.id}-${repeat}`} href={`/animal/${a.id}`} className={`depth-portrait${repeat > 0 ? " is-repeat" : ""}`}><div className="depth-portrait-photo"><FramedPhoto src={sized(a.cover_photo, 170)} sid={a.straypaw_id} alt="" lazy /></div><span><b>{animalTitle(a)}</b><small>{[cleanPlace(a.zone), a.city].filter(Boolean).join(", ") || "Place not recorded"}</small><ArrowUpRight size={15} aria-hidden /></span></Link>))}</div>)}
    </div></div>)}</div> : <p className="depth-gallery-empty">Reviewed public photographs are unavailable right now. <Link href="/explore">Explore the animal records</Link>.</p>}
    <noscript><p>Profile rows are scrollable with motion off.</p></noscript>
  </div>;
}
