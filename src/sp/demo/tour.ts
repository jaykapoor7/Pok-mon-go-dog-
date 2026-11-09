/* The guided demo: one sample Bengaluru ABC programme seen by the five people
   who run it, in the order the work moves. Each step signs in as its role,
   opens one screen and points at the one thing to look at or press. Visitors
   can leave the guide at any time and roam; the guide waits where they left. */

export type DemoRole = "field" | "vet" | "coordinator" | "lead" | "municipal";

export const DEMO_ROLES: Record<DemoRole, { label: string; who: string; home: string }> = {
  field: { label: "Field worker", who: "Catches, records and releases animals", home: "/ngo" },
  vet: { label: "Veterinarian", who: "Signs off each procedure", home: "/ngo/verification?stage=vet" },
  coordinator: { label: "Coordinator", who: "Checks evidence and prepares the claim", home: "/ngo" },
  lead: { label: "Programme lead", who: "Runs the programme and the team", home: "/ngo" },
  municipal: { label: "Municipal reviewer", who: "Reviews claims for the city", home: "/city/insights" },
};

export type TourStep = {
  role: DemoRole;
  path: string;
  title: string;
  body: string;
  /** Visible text of the link or button to highlight on this screen, first match wins. */
  point?: string[];
  /** Or a CSS selector for it (the first visible match), tried before the text. */
  sel?: string;
  /** What to do with the highlighted control, shown under the description. */
  hint?: string;
};

export const TOUR: TourStep[] = [
  { role: "field", path: "/ngo", title: "Daily work list",
    body: "What is due, late and new since yesterday, for each person." },
  { role: "field", path: "/ngo/field", title: "Field capture on a phone",
    body: "Photos, location and the animal record in one place; works offline, encrypted.",
    point: ["Work online instead"], hint: "Choose Work online instead for the demo." },
  { role: "vet", path: "/ngo/verification?stage=vet", title: "Veterinary sign-off",
    body: "Every procedure is authorised by a named vet before it can be claimed.",
    sel: ".abc-list a", point: ["Authorise procedure"], hint: "Open the waiting record." },
  { role: "coordinator", path: "/ngo/verification?stage=review", title: "Evidence check",
    body: "Five items per animal: capture, surgery, ear notch, release photo and place.",
    sel: ".abc-list a", point: ["Review this field record", "Approve for reporting"], hint: "Open a record." },
  { role: "coordinator", path: "/ngo/packages", title: "Monthly claim package",
    body: "Approved records become a claim, priced from the contract in force.",
    point: ["Prepare a package for another period", "Prepare package", "Submit package"] },
  { role: "lead", path: "/ngo", title: "Programme overview",
    body: "Work waiting at each step, the team, and what needs a decision today." },
  { role: "lead", path: "/ngo/map", title: "Ward map",
    body: "Every record on a map, so gaps in coverage are visible." },
  { role: "lead", path: "/ngo/training", title: "Training",
    body: "Courses and quizzes for catchers, vets and coordinators, with progress." },
  { role: "municipal", path: "/city/insights", title: "Municipal command view",
    body: "Decisions waiting, claims this year and evidence completeness.",
    point: ["Waiting for your decision"] },
  { role: "municipal", path: "/city/review", title: "Kaju, the assistant",
    body: "Answers questions and drafts review notes from the records; people decide.",
    point: ["Ask Kaju", "Kaju"], hint: "Open Kaju from the top bar." },
  { role: "municipal", path: "/city/review", title: "Claim review",
    body: "Every record, its evidence and sign-off; accept clean claims, query the rest.",
    sel: "main a[href^='/city/review/']", point: ["Fill review notes with Kaju"], hint: "Open the waiting package." },
  { role: "municipal", path: "/city/contracts", title: "Contracts and rates",
    body: "Claims are checked against the rate agreed per procedure." },
  { role: "municipal", path: "/research/workbench", title: "Research and reporting",
    body: "Monthly figures from the same record, with method and limits stated." },
];

/* For the closing card: what the tour showed, and what is not switched on yet (never presented as live). */
export const SHOWN = ["Field capture", "Vet sign-off", "Evidence check", "Claim packages", "Municipal review", "Contracts", "Ward map", "Training", "Kaju assistant", "Research"];
export const NOT_YET = ["WhatsApp reporting", "RFID / microchip scanners", "Bite-help line", "External integrations"];

export const TOUR_DONE = TOUR.length;
