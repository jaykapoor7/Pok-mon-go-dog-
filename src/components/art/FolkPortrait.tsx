/* ════════════════════════════════════════════════════════════════════
   A portrait for an animal with no photograph.

   Fewer than one record in two hundred carries a photo. Each of the others
   is shown with a crop of a real Indian dog painting from the Cleveland
   Museum of Art's Open Access collection (CC0): the Rajasthani "Dog with
   pups" of about 1780 and three dog studies from 1890s British India. The
   choice is fixed by the record id, mirrored on half of them, and puppies
   get one of the painted pups. See lib/art/sources for every work.

   It is an illustration from a historical painting, not a likeness, and
   its label says so. A real photograph always replaces it.
   ════════════════════════════════════════════════════════════════════ */

import { dogArtFor, WORKS } from "@/lib/art/sources";

export function FolkPortrait({ seed, className = "", label, size }: { seed: string; className?: string; label?: string; size?: string | null }) {
  const art = dogArtFor(seed, size);
  const w = WORKS[art.work];
  return (
    <span className={`fp-art ${className}`} style={{ background: art.ground }} data-flip={art.flip ? "" : undefined}>
      <img
        src={art.src}
        alt={label ?? `Illustration from “${w.title}” (${w.date}), not a photograph of this animal`}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

/** The artwork a record's portrait comes from, for a caption. */
export function portraitCredit(seed: string, size?: string | null) {
  const w = WORKS[dogArtFor(seed, size).work];
  return { title: w.title, date: w.date, source: w.source.replace(", Open Access", ""), licence: w.licence, url: w.sourceUrl };
}
