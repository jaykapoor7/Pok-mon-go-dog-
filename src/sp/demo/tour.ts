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

export const TOUR: TourStep[] = [
  { role: "oh-clinician", path: "/bite-help", chapter: "Finding care", who: "Anyone bitten",
    title: "A dog bites someone in HSR Layout",
    body: "They open StrayPaw and see the nearest centres, what each one confirmed this week (vaccine, immunoglobulin, wound washing) and where each one refers.",
    sel: "label.bf-need", hint: "Choose “Wound washing now” to see who can help right away." },
  { role: "oh-clinician", path: `${HOSPITAL}/register`, chapter: "The hospital", who: "Hospital clinician",
    title: "The hospital records the bite",
    body: "The clinician records it once: category, wound washing, the course and its dates. The area's NGO is asked to find the dog automatically, without any patient details.",
    sel: "main a[href*='/record/']", within: [`${HOSPITAL}/record/`], hint: "Open a bite record to see the course and the follow-up." },
  { role: "oh-ngo", path: NGO, chapter: "The NGO", who: "NGO coordinator",
    title: "The right team is asked to find the dog",
    body: "The request reaches the NGO responsible for HSR Layout: the animal and the place, never the patient. The team records what they found and can send a sample.",
    sel: "main .oh-rows .oh-row", ask: "What are programme partners waiting for?", hint: "Or ask Kaju what partners are waiting for." },
  { role: "oh-lab", path: LAB, chapter: "The laboratory", who: "Laboratory scientist",
    title: "The laboratory confirms rabies",
    body: "Each sample arrives with its chain of custody. A result needs its method; a positive goes back to the team that sent it and alerts the coordination cell at once.",
    sel: "main .k-row", hint: "The most recent result is first." },
  { role: "oh-programme", path: PROGRAMME, chapter: "The programme", who: "Programme lead",
    title: "The programme sees it and acts",
    body: "What needs a decision comes first: the confirmed case, a health centre without vaccine and its referral, overdue doses. Below, one map shows bites, confirmed cases and dog vaccination by area, with the areas to act on.",
    sel: ".oh-alert", hint: "Scroll down to “Where to act”." },
  { role: "field", path: "/ngo/field", chapter: "Vaccination", who: "NGO field worker",
    title: "The dogs around it are vaccinated",
    body: "In the field, each dog is recorded with a photo and its place in about a minute, with or without signal. A veterinarian signs each procedure before it counts.",
    sel: ".rn-capture" },
  { role: "municipal", path: "/city/review", chapter: "Verification", who: "Municipal reviewer",
    title: "The municipal office verifies the work",
    body: "Every claimed animal arrives with its evidence and the vet's sign-off. Kaju checks each one and drafts the review notes; the office decides.",
    sel: "main a[href^='/city/review/']", within: ["/city/review/"], hint: "Open the waiting package." },
];

/* For the closing card. */
export const SHOWN = TOUR.map((t) => t.chapter);
export const TOUR_DONE = TOUR.length;
