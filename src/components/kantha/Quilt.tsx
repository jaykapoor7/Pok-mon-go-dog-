"use client";

/* ════════════════════════════════════════════════════════════════════
   Act III · the quilt. Real register animals, each a patch with stitched
   edges, pieced into one cloth. Scrolling falls into the middle patch,
   one real animal, and it opens into that animal's real history: a
   thread running down through every recorded event, a knot at each.
   Where the animal has no photograph, its patch is a museum painting,
   captioned as an illustration and never as a likeness.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useSceneStep } from "@/components/home/Scene";
import type { Living } from "@/lib/animal/living";
import { dogArtFor, WORKS } from "@/lib/art/sources";

export type Patch = { id: string; name: string; place: string; photo: string };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export function Quilt({ patches, life }: { patches: Patch[]; life: Living | null }) {
  const open = useSceneStep() === 2;
  const art = life ? dogArtFor(life.id, life.size) : null;
  const photo = life?.photo && !life.photoSensitive ? life.photo : null;
  const events = life ? life.events.slice(-7) : [];
  /* Eight patches around the middle one; the middle is the animal we fall into. */
  const ring = patches.slice(0, 8);
  const cells: (Patch | "life")[] = [...ring.slice(0, 4), "life", ...ring.slice(4)];
  return (
    <div className={`kq${open ? " is-open" : ""}`}>
      <div className="kq-quilt" aria-label="Animals on the record">
        {cells.map((c, i) => c === "life" ? (
          <div key="life" className="kq-patch is-life" style={{ ["--c" as string]: i }} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {life && <img src={photo ?? art!.src} alt="" className={photo ? "" : "is-art"} style={photo ? undefined : { background: art!.ground }} />}
          </div>
        ) : (
          <Link key={c.id} href={`/animal/${c.id}`} className="kq-patch" style={{ ["--c" as string]: i }} tabIndex={open ? -1 : 0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.photo} alt={`${c.name}, as photographed`} loading="lazy" referrerPolicy="no-referrer" />
            <span><b>{c.name}</b><small>{c.place}</small></span>
          </Link>
        ))}
      </div>
      {life && (
        <article className="kq-life" aria-label={`${life.label}: the record`}>
          <header>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo ?? art!.src} alt={photo ? `${life.label}, as photographed` : ""} className={photo ? "" : "is-art"} style={photo ? undefined : { background: art!.ground }} />
            <div>
              <p className="kq-k">One real record</p>
              <h3>{life.label}</h3>
              <small>{[life.locality, life.city].filter(Boolean).join(", ")}{life.straypawId && life.straypawId !== life.label ? ` · ${life.straypawId}` : ""}</small>
              {!photo && art && <small className="kq-art">No photograph on the record. Illustration, not this animal: {WORKS[art.work].title}.</small>}
            </div>
          </header>
          <ol className="kq-line" style={{ ["--n" as string]: events.length }}>
            {events.map((e, i) => (
              <li key={e.id} className={`is-${e.lane === "case" ? "case" : e.lane === "care" ? "care" : "seen"}`} style={{ ["--i" as string]: i }}>
                <time>{day(e.date)}</time><span>{e.title}</span>
              </li>
            ))}
          </ol>
          <Link className="h-btn" href={`/animal/${life.id}`} tabIndex={open ? 0 : -1}>Read the full record <ArrowUpRight size={15} aria-hidden /></Link>
        </article>
      )}
    </div>
  );
}
