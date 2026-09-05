"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { animalDocuments, type SourceDocument } from "@/lib/documents";

/* Scans an organisation holds for this animal.

   Row-level security scopes these to the organisation that filed them, so
   this returns nothing for a member of the public and the section simply
   does not appear. That is deliberate rather than a fallback: a register
   page carries other people's handwriting and contact details. */

export function AnimalDocuments({ dogId }: { dogId: string }) {
  const [docs, setDocs] = useState<SourceDocument[]>([]);

  useEffect(() => {
    let live = true;
    animalDocuments(dogId)
      .then((d) => live && setDocs(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [dogId]);

  if (docs.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg tracking-tight">
        Source records
        <span className="ml-2 align-middle text-[11.5px] font-normal text-bark-400">
          Visible to your organisation only
        </span>
      </h2>
      <p className="mb-3 mt-1 text-[13px] text-bark-500">
        The paper and message records this animal&rsquo;s entries were
        transcribed from.
      </p>
      <div className="doc-strip">
        {docs.map((d) => (
          <a
            key={d.id}
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="doc-item"
            title={d.notes ?? undefined}
          >
            <Image
              src={d.url}
              alt={d.title ?? "Filed record"}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
            <span className="doc-cap">{d.title?.trim() || "Filed record"}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
