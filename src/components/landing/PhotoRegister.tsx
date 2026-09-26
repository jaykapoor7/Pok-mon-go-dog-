"use client";

/* ════════════════════════════════════════════════════════════════════
   Photographed onto the record: a wall of the map's own cells.

   Every cell is a real animal a resident photographed, cut to the shape
   the map draws a place in, and opens that animal's record. The rows
   drift against each other as the wall scrolls past (held still under
   reduced motion). Pointing at, or focusing, a cell writes who it is and
   where on the line beneath, so the wall stays pictures, not captions.
   It does not exist below six photographs.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cleanPlace, placeLine } from "@/lib/utils";

export type PhotoRow = { id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null; last_seen: string | null };

const label = (r: PhotoRow) => (r.name && r.name.trim()) || `A dog near ${cleanPlace(r.zone) || r.city || "the reported spot"}`;
const PER_ROW = 8;

export function PhotoRegister({ rows, total }: { rows: PhotoRow[]; total: number }) {
  const [on, setOn] = useState<PhotoRow | null>(null);
  if (rows.length < 6) return null;
  const lines: PhotoRow[][] = [];
  for (let i = 0; i < rows.length; i += PER_ROW) lines.push(rows.slice(i, i + PER_ROW));
  const shown = on ?? rows[0];

  return (
    <div className="ld-hive">
      <div className="ld-hive-head">
        <h2 className="ld-hive-title">Photographed <em>onto the record.</em></h2>
        <p className="sys-mono">{total.toLocaleString("en-IN")} animals with a photograph · the latest {rows.length}</p>
      </div>
      <div className="ld-hive-wall" onMouseLeave={() => setOn(null)}>
        {lines.map((line, li) => (
          <ul key={li} className={`ld-hive-row ${li % 2 ? "is-odd" : ""}`} style={{ ["--r" as string]: li }}>
            {line.map((r) => (
              <li key={r.id}>
                <Link href={`/dog/${r.id}`} onMouseEnter={() => setOn(r)} onFocus={() => setOn(r)} aria-label={`${label(r)}${r.zone || r.city ? `, ${placeLine(r.zone, r.city)}` : ""}`}>
                  <Image src={r.cover_photo} alt="" fill sizes="(max-width: 700px) 96px, 150px" />
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="ld-hive-cap" aria-live="polite">
        <b>{label(shown)}</b>
        {(shown.zone || shown.city) && <span>{placeLine(shown.zone, shown.city)}</span>}
        {shown.straypaw_id && <span className="sys-mono">{shown.straypaw_id}</span>}
        <Link href="/map?mode=animals" className="ld-hive-map">Every one of them on the map <ArrowUpRight size={14} /></Link>
      </p>
    </div>
  );
}
