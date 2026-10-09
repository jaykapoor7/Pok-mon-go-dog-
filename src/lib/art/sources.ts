/* ════════════════════════════════════════════════════════════════════
   The artworks StrayPaw shows, where each came from, and its licence.

   Every image under /public/art is a real artwork published under an
   open licence: Indian paintings in the Cleveland Museum of Art's Open
   Access collection (CC0, public domain), and contemporary Gond paintings
   shared on Wikimedia Commons under Creative Commons licences. Nothing is
   generated. Dog portraits are crops of the dog paintings; the folk
   animals are cut out of their paper ground, which is an adaptation, so a
   CC BY-SA original stays CC BY-SA here. /art-credits lists them all.

   A portrait shown on a record is an illustration from a historical
   painting, never a likeness of that animal; surfaces say so.
   ════════════════════════════════════════════════════════════════════ */

export type ArtLicence = "CC0" | "CC BY 4.0" | "CC BY-SA 4.0";

export type ArtWork = {
  key: string;
  title: string;
  /** Artist, school or place of origin, as the source records it. */
  maker: string;
  date: string;
  source: string;
  sourceUrl: string;
  licence: ArtLicence;
  licenceUrl: string | null;
  /** True when StrayPaw cropped or cut the image out of its ground. */
  adapted: boolean;
};

const CLEVELAND = "Cleveland Museum of Art, Open Access";
const COMMONS = "Wikimedia Commons";
const CC0 = { licence: "CC0" as const, licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/" };
const BYSA = { licence: "CC BY-SA 4.0" as const, licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
const BY = { licence: "CC BY 4.0" as const, licenceUrl: "https://creativecommons.org/licenses/by/4.0/" };

export const WORKS: Record<string, ArtWork> = {
  dogWithPups: { key: "dogWithPups", title: "Dog with pups", maker: "Rajasthan, Ajmer, probably Sawar school", date: "c. 1780", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/1969.77", ...CC0, adapted: true },
  bijantu: { key: "bijantu", title: "Bijantu", maker: "British India", date: "1890s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.73", ...CC0, adapted: true },
  hira: { key: "hira", title: "Hira", maker: "British India", date: "1800s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.75", ...CC0, adapted: true },
  sikari: { key: "sikari", title: "Sikari", maker: "British India", date: "1890s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.74", ...CC0, adapted: true },
  hoopoe: { key: "hoopoe", title: "Hoopoe on a Citrus Tree Branch", maker: "Company school, Calcutta", date: "c. 1800", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/1990.67", ...CC0, adapted: true },
  mithila81: { key: "mithila81", title: "Rider and four-legged bovine creature with border of colored squares", maker: "Mithila (Madhubani) school, Bihar", date: "1900s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.81", ...CC0, adapted: false },
  mithila82: { key: "mithila82", title: "Rider and four-legged creature with floral motif", maker: "Mithila (Madhubani) school, Bihar", date: "1900s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.82", ...CC0, adapted: false },
  mithila83: { key: "mithila83", title: "Rider and four-legged bovine creature in mauve, chartreuse and black palette", maker: "Mithila (Madhubani) school, Bihar", date: "1900s", source: CLEVELAND, sourceUrl: "https://clevelandart.org/art/2005.83", ...CC0, adapted: false },
  gondCowCalf: { key: "gondCowCalf", title: "Gond art of a cow feeding her calf", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978166", ...BYSA, adapted: true },
  gondBird: { key: "gondBird", title: "Gond art of a bird", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978168", ...BYSA, adapted: true },
  gondHen: { key: "gondHen", title: "Gond art of a hen", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978174", ...BYSA, adapted: true },
  gondTiger: { key: "gondTiger", title: "Gond art of a tiger", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978176", ...BYSA, adapted: true },
  gondElephantTree: { key: "gondElephantTree", title: "Gond art of an elephant with tree", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978177", ...BYSA, adapted: true },
  gondElephant: { key: "gondElephant", title: "Gond art of an elephant", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978178", ...BYSA, adapted: true },
  gondPeacocks: { key: "gondPeacocks", title: "Gond art of a peacock family", maker: "Bhaiyaji Smile 123", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=162978179", ...BYSA, adapted: true },
  durgaBai: { key: "durgaBai", title: "Durga Bai Gond (painting)", maker: "Durga Bai Vyam", date: "", source: COMMONS, sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=77352076", ...BY, adapted: false },
};

/** A portrait for a record with no photograph: a crop of a dog painting. */
export type DogArt = { src: string; work: keyof typeof WORKS; puppy?: boolean; ground: string };

export const DOG_ART: DogArt[] = [
  { src: "/art/dogs/rajasthan-mother.webp", work: "dogWithPups", ground: "#5d6560" },
  { src: "/art/dogs/bijantu.webp", work: "bijantu", ground: "#e6d6bf" },
  { src: "/art/dogs/hira.webp", work: "hira", ground: "#e8d9c4" },
  { src: "/art/dogs/sikari.webp", work: "sikari", ground: "#e6d6bf" },
  { src: "/art/dogs/rajasthan-litter.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
  { src: "/art/dogs/rajasthan-pup-1.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
  { src: "/art/dogs/rajasthan-pup-2.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
  { src: "/art/dogs/rajasthan-pup-3.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
  { src: "/art/dogs/rajasthan-pup-4.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
  { src: "/art/dogs/rajasthan-pup-5.webp", work: "dogWithPups", puppy: true, ground: "#5d6560" },
];

/** Folk animals cut out of their ground, for the living backdrop. */
export const FOLK_CUTOUTS = {
  cowCalf: { src: "/art/folk/gond-cow-calf.webp", work: "gondCowCalf", ratio: 422 / 560 },
  bird: { src: "/art/folk/gond-bird.webp", work: "gondBird", ratio: 364 / 560 },
  hen: { src: "/art/folk/gond-hen.webp", work: "gondHen", ratio: 457 / 560 },
  tiger: { src: "/art/folk/gond-tiger.webp", work: "gondTiger", ratio: 420 / 560 },
  elephantTree: { src: "/art/folk/gond-elephant-tree.webp", work: "gondElephantTree", ratio: 381 / 560 },
  elephant: { src: "/art/folk/gond-elephant.webp", work: "gondElephant", ratio: 386 / 560 },
  peacocks: { src: "/art/folk/gond-peacocks.webp", work: "gondPeacocks", ratio: 415 / 560 },
  hoopoe: { src: "/art/folk/company-hoopoe.webp", work: "hoopoe", ratio: 362 / 560 },
  dogStanding: { src: "/art/folk/dog-sikari.webp", work: "sikari", ratio: 420 / 351 },
  dogSitting: { src: "/art/folk/dog-rajasthan-sitting.webp", work: "dogWithPups", ratio: 357 / 420 },
} as const;

export type CutoutKey = keyof typeof FOLK_CUTOUTS;

/** Framed paintings for empty states and quiet panels. */
export const FOLK_PANELS = [
  { src: "/art/folk/mithila-164461.webp", work: "mithila81" },
  { src: "/art/folk/mithila-164462.webp", work: "mithila82" },
  { src: "/art/folk/mithila-164463.webp", work: "mithila83" },
  { src: "/art/folk/durga-bai-tree.webp", work: "durgaBai" },
] as const;

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The same animal always gets the same portrait; puppies get a puppy. */
export function dogArtFor(seed: string, size?: string | null): DogArt & { flip: boolean } {
  const h = hash(seed || "straypaw");
  const pool = size === "puppy" ? DOG_ART.filter((d) => d.puppy) : DOG_ART.filter((d) => !d.puppy);
  return { ...pool[h % pool.length], flip: ((h >>> 8) & 1) === 1 };
}

/** One line of credit: "Dog with pups, c. 1780 · Cleveland Museum of Art (CC0)". */
export function creditLine(key: keyof typeof WORKS): string {
  const w = WORKS[key];
  return `${w.title}${w.date ? `, ${w.date}` : ""} · ${w.source.replace(", Open Access", "")} (${w.licence})`;
}
