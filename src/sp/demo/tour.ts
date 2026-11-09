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
  { role: "field", path: "/ngo/field", title: "Field mode",
    body: "Record an animal with photos and location. Online saves straight away; Offline keeps records on the phone until there is signal.",
    sel: ".fd-mode" },
  { role: "vet", path: "/ngo/verification?stage=vet", title: "Veterinary sign-off",
    body: "Every procedure is authorised by a named vet before it can be claimed.",
    sel: ".abc-list a", point: ["Authorise procedure"], hint: "Open the waiting record." },
  { role: "coordinator", path: "/ngo/packages", title: "Monthly claim",
    body: "Records with all five evidence items and a vet sign-off become the month's claim, priced from the contract.",
    point: ["Prepare a package for another period", "Prepare package", "Submit package"] },
  { role: "lead", path: "/assistant", title: "Kaju at work",
    body: "Kaju checks the records every morning, builds the monthly claim and chases missing evidence. Every number is live.",
    sel: ".kh-list .kh-go", hint: "Run the morning check." },
  { role: "municipal", path: "/city/insights", title: "Municipal command view",
    body: "Claims waiting for a decision, evidence completeness and spend this year.",
    point: ["Waiting for your decision"] },
  { role: "municipal", path: "/city/review", title: "Claim review",
    body: "Every record with its evidence and sign-off. Kaju drafts the review notes; the office decides.",
    sel: "main a[href^='/city/review/']", point: ["Fill review notes with Kaju"], hint: "Open the waiting package." },
];

/* For the closing card: what the tour showed. */
export const SHOWN = ["Field mode, online and offline", "Vet sign-off", "Monthly claim", "Kaju automations", "Municipal command view", "Claim review"];

export const TOUR_DONE = TOUR.length;
