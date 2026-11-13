/* The guided demo: five real workspaces, in the order work passes between
   them. Every record is illustrative and labelled so. Visitors can leave
   the tour at any point and explore; the guide waits where they left. */

export type DemoRole = "oh-programme" | "oh-clinician" | "oh-nurse" | "oh-ngo" | "oh-lab" | "field" | "vet" | "coordinator" | "lead" | "municipal";

export const DEMO_ROLES: Record<DemoRole, { label: string; who: string; home: string; group: "programme" | "health" | "animal" | "government" }> = {
  "oh-programme": { label: "Programme lead", who: "Coordinates every partner in the city programme", home: "/programme/bengaluru-demo", group: "programme" },
  "oh-clinician": { label: "Hospital clinician", who: "Assesses bites and prescribes the course", home: "/today?all", group: "health" },
  "oh-nurse": { label: "Hospital nurse", who: "Doses due, reminder and completion calls", home: "/today", group: "health" },
  "oh-lab": { label: "Laboratory scientist", who: "Receives samples and reports results", home: "/today", group: "health" },
  "oh-ngo": { label: "NGO coordinator", who: "Answers requests from programme partners", home: "/ngo", group: "animal" },
  field: { label: "Field worker", who: "Catches, vaccinates, records and releases", home: "/ngo/field", group: "animal" },
  vet: { label: "Veterinarian", who: "Signs off each procedure", home: "/ngo/verification?stage=vet", group: "animal" },
  coordinator: { label: "NGO operations", who: "Checks evidence and prepares the claim", home: "/ngo", group: "animal" },
  lead: { label: "NGO lead", who: "Runs the unit, with Kaju's checks", home: "/ngo", group: "animal" },
  municipal: { label: "Municipal reviewer", who: "Verifies the work the city pays for", home: "/city/insights", group: "government" },
};

export type TourStep = {
  role: DemoRole;
  path: string;
  /** The chapter's short name, for the progress line and the closing card. */
  chapter: string;
  /** Who is speaking in this chapter, in plain words. */
  who: string;
  title: string;
  body: string;
  /** One short line for the small guide card. */
  short?: string;
  /** Visible text of the link or button to highlight on this screen, first match wins. */
  point?: string[];
  /** Or a CSS selector for it (the first visible match), tried before the text. */
  sel?: string;
  /** Other screens that still belong to this step (path prefixes), e.g. the record opened from a list. */
  within?: string[];
  /** What to do with the highlighted control, shown under the description. */
  hint?: string;
  /** A question the guide can ask Kaju for the visitor, from this screen. */
  ask?: string;
};

const HOSPITAL = "/workspace/f1000000-0000-4000-8000-000000000004";
const NGO = "/workspace/f1000000-0000-4000-8000-000000000010";
const LAB = "/workspace/f1000000-0000-4000-8000-000000000009";
const PROGRAMME = "/programme/bengaluru-demo";

/* One pass through the five workspaces, in the order work travels between them. Each stop is the real dashboard; the card says what just arrived and where it goes next. */
export const TOUR: TourStep[] = [
  { role: "oh-clinician", path: HOSPITAL, chapter: "Hospital", who: "Hospital clinician", title: "A bite comes in", body: "Recorded here. The dog's details go to the NGO.", short: "Recorded here. The dog's details go to the NGO.", sel: ".k-lanes" },
  { role: "oh-ngo", path: "/ngo", chapter: "NGO", who: "NGO coordinator", title: "The hospital's request arrives", body: "Find the dog, beside rescues and sterilisation.", short: "Find the dog, beside rescues and sterilisation.", sel: "main a[href^=\"/workspace/\"], .hm3-work" },
  { role: "oh-lab", path: LAB, chapter: "Laboratory", who: "Laboratory scientist", title: "The NGO's sample arrives", body: "Tested here. The result goes to every partner.", short: "Tested here. The result goes to every partner.", sel: ".k-lanes" },
  { role: "oh-programme", path: PROGRAMME, chapter: "Programme", who: "Programme lead", title: "The result lands", body: "Every partner's work, and what needs a decision.", short: "Every partner's work, and what needs a decision.", sel: ".oh-alert" },
  { role: "municipal", path: "/city/review", chapter: "Municipal office", who: "Municipal reviewer", title: "The NGO's work, verified", body: "Sterilisations checked before the city pays.", short: "Sterilisations checked before the city pays.", sel: ".k-lanes" },
];

/* For the closing card. */
export const SHOWN = TOUR.map((t) => t.chapter);
export const TOUR_DONE = TOUR.length;
