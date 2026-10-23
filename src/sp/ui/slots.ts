/* ════════════════════════════════════════════════════════════════════
   The commissioned-art slot register (Folk Art Direction v1.0, §5).

   Indian folk art is StrayPaw's dominant identity, and it must come from
   named, paid, credited artists. Each slot is designed into the layout
   now and shows an honest placeholder until a commission is signed. Then
   fill `commission` and point `src` at the delivered files;
   and docs/straypaw-2/ART_SLOTS.md list every slot.

   Never generated, traced or imitated. Never inside a chart, queue row,
   form field, clinical record or map mark. Never a stand-in for an
   animal's photograph.
   ════════════════════════════════════════════════════════════════════ */

export type ArtSlotDef = {
  id: string; surface: string; title: string; brief: string; appearsOn: string[];
  ratio: number; safeArea: string; alt: string | null; motion: "none" | "gentle reveal" | "sequenced panels";
  guidance: string; plate: "sun" | "field" | "hills" | "page";
  commission: null | { artist: string; work: string; licenceScope: string; credit: string; agreementRef: string; src: string };
};

/* Until a commission exists, a slot may show an existing, openly licensed
   artwork from lib/art/sources (CC0 museum paintings, CC-licensed Gond
   works), shown without a caption (all CC0). It is labelled as an
   interim licensed work, never as a commission, and the slot stays open. */
export type Interim = { kind: "cutout" | "panel"; keys: string[]; grounds: string[] };
export const INTERIM: Record<string, Interim> = {
  "report-receipt": { kind: "cutout", keys: ["bird"], grounds: ["#f3d9a4"] },
  "activity-empty": { kind: "cutout", keys: ["cowCalf"], grounds: ["#dfe8cf"] },
  "ngo-empty": { kind: "cutout", keys: ["dogSitting", "hoopoe", "bird"], grounds: ["#e8dcc6", "#dfe6ee", "#efe0cc"] },
  "academy-cover": { kind: "cutout", keys: ["peacocks", "elephantTree", "cowCalf", "hen", "bird", "elephant"], grounds: ["#f0c86a", "#e98c6f", "#9fc7b4", "#c9d3ee", "#f3d9a4", "#e6b8c4"] },
  "workshop-scenes": { kind: "cutout", keys: ["hen", "peacocks", "elephantTree"], grounds: ["#f0c86a", "#9fc7b4", "#e98c6f"] },
  "city-report-cover": { kind: "panel", keys: ["0", "1", "2"], grounds: ["#f3ede4"] },
  "atlas-city": { kind: "cutout", keys: ["elephantTree"], grounds: ["#1f2a5c"] },
};

export const ART_SLOTS: ArtSlotDef[] = [
  { id: "atlas-city", surface: "Atlas", title: "City introduction plate", plate: "sun",
    brief: "A wide plate that opens a city on the map: its streets, animals and people in the artist's idiom, with no claim about where any recorded animal is.",
    appearsOn: ["/community (city panel)", "/city/report cover"], ratio: 3, safeArea: "Left 40% quiet for the city name", alt: null, motion: "gentle reveal",
    guidance: "Commission artists connected to the region where possible; no idiom presented as belonging to every resident.", commission: null },
  { id: "atlas-legend", surface: "Atlas", title: "Legend chapter heads", plate: "field",
    brief: "Small heads beside each legend group, always next to a plain standard symbol.", appearsOn: ["/community legend", "/city legend"], ratio: 1, safeArea: "Symbol and label outside the art",
    alt: null, motion: "none", guidance: "Colour meaning stays in the symbol, never in the art.", commission: null },
  { id: "animal-chapter", surface: "Animal record", title: "Chapter marker", plate: "page",
    brief: "A recurring mark that opens each chapter of an animal's history.", appearsOn: ["/animal/[id]"], ratio: 1, safeArea: "Decorative; chapter title is text",
    alt: null, motion: "none", guidance: "Must never read as a portrait of the animal.", commission: null },
  { id: "animal-no-photo", surface: "Animal record", title: "No-photograph vignette", plate: "hills",
    brief: "A generic illustrated street animal (not this one) framing the words \"No photograph recorded\".", appearsOn: ["/animal/[id] without photo"], ratio: 4 / 5, safeArea: "Bottom third for the label",
    alt: "Illustration, not a likeness of this animal", motion: "none", guidance: "Always labelled as an illustration; a real photograph always replaces it.", commission: null },
  { id: "report-receipt", surface: "Report", title: "Receipt scene", plate: "sun",
    brief: "A calm scene for the moment a report reaches StrayPaw, without implying a rescue is on its way.", appearsOn: ["/community/report receipt"], ratio: 4 / 3, safeArea: "Receipt reference outside the art",
    alt: null, motion: "gentle reveal", guidance: "No ambulance, no hands lifting an injured animal: received is not rescued.", commission: null },
  { id: "activity-empty", surface: "My Activity", title: "\"No history yet\" scene", plate: "field",
    brief: "A quiet first-run scene before any report or saved animal.", appearsOn: ["/community/activity empty"], ratio: 4 / 3, safeArea: "Centre-bottom for the first action",
    alt: null, motion: "none", guidance: "Warm, small, no text inside the art.", commission: null },
  { id: "academy-cover", surface: "Academy", title: "Course covers", plate: "hills",
    brief: "One cover per course: observing, staying safe, reading records, care in a neighbourhood, acting together.", appearsOn: ["/learn", "/learn/courses/[course]"], ratio: 4 / 3, safeArea: "Top-left for the course number",
    alt: null, motion: "gentle reveal", guidance: "Children never shown approaching, touching or feeding an unfamiliar or distressed animal.", commission: null },
  { id: "academy-panels", surface: "Academy", title: "Lesson sequential panels", plate: "page",
    brief: "Narrative panels that unfold a care process step by step, read beside an interactive diagram.", appearsOn: ["/learn/courses/[course]/[lesson]"], ratio: 16 / 9, safeArea: "Captions are text beneath",
    alt: "Described in the caption beneath", motion: "sequenced panels", guidance: "Scroll-like narrative structure; no sacred or ritual imagery, no copied compositions.", commission: null },
  { id: "city-report-cover", surface: "Municipality", title: "City report cover and dividers", plate: "page",
    brief: "A limited-ink broadsheet cover and fine-line dividers for the printable city report.", appearsOn: ["/city/report"], ratio: 0.77, safeArea: "Upper third for title, date and scope",
    alt: null, motion: "none", guidance: "Ornament on cover and dividers only; nothing inside charts or near figures.", commission: null },
  { id: "ngo-empty", surface: "NGO", title: "Workspace empty states", plate: "field",
    brief: "Sparse illustrations for a queue with nothing waiting, a register with no animals yet, a map with no open work.", appearsOn: ["/ngo empty", "/ngo/animals empty"], ratio: 4 / 3, safeArea: "Text beside, never on top",
    alt: null, motion: "none", guidance: "Never on queue rows, statuses, inputs or the inspector.", commission: null },
  { id: "workshop-scenes", surface: "Workshops", title: "Workshop scenes", plate: "sun",
    brief: "Small human-and-animal scenes for facilitator plans and printed handouts.", appearsOn: ["/learn/workshops"], ratio: 3 / 2, safeArea: "Bottom quarter",
    alt: null, motion: "none", guidance: "Safe distances between people and animals in every scene.", commission: null },
];
