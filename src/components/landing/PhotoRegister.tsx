"use client";

/* ════════════════════════════════════════════════════════════════════
   Also on the record: the photographed animals, as a register strip.

   Every tile is a real record with a photograph a resident took, read
   from the database and opening that animal's own page. It moves when
   somebody moves it — native scroll-snap, with arrows for pointers — and
   it does not exist at all below two photographs.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cleanPlace, placeLine } from "@/lib/utils";

export type PhotoRow = { id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null; last_seen: string | null };

const label = (r: PhotoRow) => (r.name && r.name.trim()) || `Dog near ${cleanPlace(r.zone) || r.city || "the reported spot"}`;

export function PhotoRegister({ rows, total }: { rows: PhotoRow[]; total: number }) {
  const rail = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const sync = useCallback(() => {
    const el = rail.current; if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);
  useEffect(() => {
    const el = rail.current; if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => { el.removeEventListener("scroll", sync); window.removeEventListener("resize", sync); };
  }, [sync]);
  const page = (dir: 1 | -1) => {
    const el = rail.current; if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.82, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  if (rows.length < 2) return null;
  return (
    <div className="ld-photos">
      <div className="ld-photos-head">
        <p className="sys-eyebrow">Photographed onto the record · {total.toLocaleString("en-IN")}</p>
        <div className="ld-photos-ctl">
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Previous records"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="More records"><ChevronRight size={18} /></button>
        </div>
      </div>
      <ul className="ld-photos-track" ref={rail}>
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/dog/${r.id}`}>
              <span className="ld-photos-shot">
                <Image src={r.cover_photo} alt={`${label(r)}, photographed on the street`} width={320} height={400} sizes="(max-width: 700px) 46vw, 220px" />
              </span>
              <b>{label(r)}</b>
              <span className="sys-mono">{r.straypaw_id ?? "ID pending"}</span>
              {(r.zone || r.city) && <small>{placeLine(r.zone, r.city)}</small>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
