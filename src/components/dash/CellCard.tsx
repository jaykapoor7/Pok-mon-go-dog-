"use client";

/* The card a selected map area opens: what the area holds, and the animals
   recorded there, each one a link to its record. Reads the public patch
   endpoint, which returns only published animals of that one cell. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import { animalTitle } from "@/lib/animal-name";

type Animal = { id: string; name: string | null; cover_photo: string | null; status: string | null; needs_help: boolean | null; photo_sensitive?: boolean | null; straypaw_id: string | null; size?: string | null; sex?: string | null };

export function CellCard({ h3, title, facts, href, linkLabel, onClose, showAnimals = true, focus = null }: {
  focus?: string | null;
  h3: string; title: string; facts: string; href?: string; linkLabel?: string; onClose: () => void; showAnimals?: boolean;
}) {
  const [animals, setAnimals] = useState<Animal[] | null>(null);
  useEffect(() => {
    if (!showAnimals) return;
    let live = true; setAnimals(null);
    fetch(`/api/spatial/patch?cells=${h3}`).then((r) => (r.ok ? r.json() : { animals: [] })).then((j) => { if (live) setAnimals(j.animals ?? []); }).catch(() => { if (live) setAnimals([]); });
    return () => { live = false; };
  }, [h3, showAnimals]);
  const ordered = focus && animals ? [...animals].sort((a, b) => Number(b.id === focus) - Number(a.id === focus)) : animals ?? [];
  const shown = ordered.slice(0, 8);
  const lead = focus ? shown.find((a) => a.id === focus) : undefined;
  const more = (animals?.length ?? 0) - shown.length;
  return (
    <div className="db-selcard" role="dialog" aria-label={title}>
      <button type="button" className="db-selcard-x" onClick={onClose} aria-label="Close"><X size={16} /></button>
      <b>{title}</b>
      <p>{facts}</p>
      {showAnimals && (
        animals === null ? <div className="db-selcard-dogs is-loading" aria-busy="true">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>
          : shown.length ? (
            <ul className="db-selcard-dogs">
              {shown.map((a) => (
                <li key={a.id} className={a.id === focus ? "is-focus" : undefined}>
                  <Link href={`/dog/${a.id}`} title={animalTitle(a)}>
                    <DogPhoto src={a.cover_photo} alt="" seed={a.id} size={a.size} className="db-selcard-ph" width={200} sensitive={isSensitivePhoto(a) || a.status === "injured"} />
                    {(a.needs_help || a.status === "injured") && <i aria-label="Needs help" />}
                  </Link>
                </li>
              ))}
              {more > 0 && <li className="db-selcard-more">+{more}</li>}
            </ul>
          ) : <p className="db-selcard-none">No published animal profile in this area.</p>
      )}
      {lead && <Link href={`/dog/${lead.id}`} className="db-selcard-lead">Open {animalTitle(lead)} →</Link>}
      {href && <Link href={href} className="db-selcard-go">{linkLabel ?? "Open"} →</Link>}
    </div>
  );
}
