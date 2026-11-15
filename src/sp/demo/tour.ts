/* The guided demo: the citizen's chat and the real workspaces of the new StrayPaw, in the order work passes between
   them. Every record is illustrative and labelled so. Visitors can leave
   the tour at any point and explore; the guide waits where they left. */

export type DemoRole = "oh-programme" | "oh-clinician" | "oh-nurse" | "oh-ngo" | "oh-lab" | "field" | "vet" | "coordinator" | "lead" | "municipal";

export const DEMO_ROLES: Record<DemoRole, { label: string; who: string; home: string; group: "programme" | "health" | "animal" | "government" }> = {
  "oh-programme": { label: "Programme lead", who: "Coordinates every partner in the city programme", home: "/gov/overview", group: "programme" },
  "oh-clinician": { label: "Hospital clinician", who: "Assesses bites and prescribes the course", home: "/health/today", group: "health" },
  "oh-nurse": { label: "Hospital nurse", who: "Doses due, reminder and completion calls", home: "/health/pep", group: "health" },
  "oh-lab": { label: "Laboratory scientist", who: "Receives samples and reports results", home: "/health/today", group: "health" },
  "oh-ngo": { label: "NGO coordinator", who: "Answers requests from programme partners", home: "/ngo/today", group: "animal" },
  field: { label: "Field worker", who: "Catches, vaccinates, records and releases", home: "/ngo/field", group: "animal" },
  vet: { label: "Veterinarian", who: "Signs off each procedure", home: "/health/today", group: "animal" },
  coordinator: { label: "NGO operations", who: "Checks evidence and prepares the claim", home: "/ngo/today", group: "animal" },
  lead: { label: "NGO lead", who: "Runs the unit, with Kaju's checks", home: "/kaju/insights", group: "animal" },
  municipal: { label: "Municipal reviewer", who: "Verifies the work the city pays for", home: "/gov/overview", group: "government" },
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

/* One pass from the citizen through the workspaces, in the order work travels between them, on the new StrayPaw.
   Each stop is the real page for that role; the card says what just arrived and where it goes next. */
export const TOUR: TourStep[] = [
  { role: "oh-clinician", path: "/bite-help", chapter: "Citizen", who: "Anyone, no account", title: "A person reports a bite", body: "A chat, not a form. The notice goes to the nearest clinic.", short: "A chat, not a form. The notice goes to the nearest clinic.", sel: ".bc" },
  { role: "oh-clinician", path: "/health/today", chapter: "Hospital", who: "Hospital clinician", title: "The notice arrives", body: "Today's doses and new bite notices. Patient details stay here; only the dog's details go to the NGO.", short: "Patient details stay here; the dog's details go to the NGO.", sel: ".nx-figs, .nx-page", within: ["/health"] },
  { role: "oh-ngo", path: "/ngo/inbox", chapter: "NGO", who: "NGO coordinator", title: "The hospital's request arrives", body: "Reports and partner requests wait in one queue. A suggested match to an animal stays a suggestion.", short: "One queue for reports and partner requests.", sel: ".nx-table", within: ["/ngo"] },
  { role: "oh-ngo", path: "/kaju", chapter: "Kaju", who: "NGO coordinator, with Kaju", title: "Kaju prepares the follow-ups", body: "Ask in plain words. Kaju drafts the tasks and stops for your approval before anything is created.", short: "Kaju drafts, then stops for your approval.", sel: ".nx-ask", within: ["/kaju"], ask: "Prepare follow-ups due this week" },
  { role: "oh-lab", path: "/health/testing", chapter: "Laboratory", who: "Laboratory scientist", title: "The NGO's sample arrives", body: "Oldest first, with its chain of custody. A result is released only by a named scientist.", short: "Released only by a named scientist.", sel: ".nx-table", within: ["/health"] },
  { role: "oh-programme", path: "/gov/surveillance", chapter: "Programme", who: "Programme lead", title: "The result lands", body: "Every partner's signals in one place. Small counts stay hidden, and no alert declares an outbreak.", short: "Every partner's signals; small counts stay hidden.", sel: ".nx-feed, .nx-figs", within: ["/gov"] },
  { role: "municipal", path: "/gov/verification", chapter: "Municipal office", who: "Municipal reviewer", title: "The NGO's work, verified", body: "Packages wait oldest first. A named reviewer decides before the city pays.", short: "A named reviewer decides before the city pays.", sel: ".nx-table, .nx-page", within: ["/gov"] },
];

/* For the closing card. */
export const SHOWN = TOUR.map((t) => t.chapter);
export const TOUR_DONE = TOUR.length;
