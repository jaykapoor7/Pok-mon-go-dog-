/* The guided demo: one story, told by the people who live it.

   A dog bites someone in HSR Layout. The person finds care; the hospital
   records the bite; the area's NGO is asked to find the dog; the
   laboratory confirms rabies; the programme sees it and acts; the dogs
   around it are vaccinated, and the municipal office verifies that work.
   Seven chapters, each one screen, signed in as the person whose work it
   is. Every record is illustrative and labelled so. Visitors can leave
   the story at any point and explore; the guide waits where they left. */

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

/* A straight pass through the real workspaces: each stop is a dashboard as it is, with one line on the card. No storyline. */
export const TOUR: TourStep[] = [
  { role: "oh-ngo", path: "/ngo", chapter: "NGO home", who: "NGO coordinator", title: "What needs you today", body: "The day's priorities and both lines of work.", short: "The day's priorities and both lines of work.", sel: ".hm3-work" },
  { role: "oh-ngo", path: "/ngo/rescues", chapter: "Rescues", who: "NGO coordinator", title: "Animals in care", body: "New reports, then the animals being helped.", short: "New reports, then the animals being helped.", sel: ".fl" },
  { role: "oh-ngo", path: "/ngo/sterilisation", chapter: "Sterilisation", who: "NGO coordinator", title: "Three checked steps", body: "Vet sign-off, evidence, then the report.", short: "Vet sign-off, evidence, then the report.", sel: ".fl" },
  { role: "oh-ngo", path: "/ngo/add", chapter: "Add an animal", who: "NGO coordinator", title: "From a WhatsApp message", body: "Paste the message. Kaju prepares the record.", short: "Paste the message. Kaju prepares the record.", sel: ".ad-box" },
  { role: "oh-clinician", path: HOSPITAL, chapter: "Hospital", who: "Hospital clinician", title: "Bites and doses", body: "Doses due, and notices from the public.", short: "Doses due, and notices from the public.", sel: ".k-lanes" },
  { role: "oh-lab", path: LAB, chapter: "Laboratory", who: "Laboratory scientist", title: "Samples and results", body: "Receive, test, report.", short: "Receive, test, report.", sel: ".k-lanes" },
  { role: "oh-programme", path: PROGRAMME, chapter: "Programme", who: "Programme lead", title: "What needs a decision", body: "Every partner's work in one view.", short: "Every partner's work in one view.", sel: ".oh-alert" },
  { role: "municipal", path: "/city/review", chapter: "Municipal review", who: "Municipal reviewer", title: "Check and decide", body: "Each submission with its evidence.", short: "Each submission with its evidence.", sel: ".k-lanes" },
];

/* For the closing card. */
export const SHOWN = TOUR.map((t) => t.chapter);
export const TOUR_DONE = TOUR.length;
