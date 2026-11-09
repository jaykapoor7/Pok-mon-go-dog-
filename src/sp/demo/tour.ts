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
  { role: "field", path: "/ngo", title: "A field worker's day",
    body: "Today shows what is due, what is late and what changed since yesterday for the sample Bengaluru programme. Every record here is illustrative." },
  { role: "field", path: "/ngo/field", title: "Record an animal in the street",
    body: "The field view is built for a phone: capture, photos and the release location go into one record. Offline records are encrypted on the device with a passphrase.",
    point: ["Work online instead"], hint: "For the demo, choose Work online instead to see the capture screen." },
  { role: "vet", path: "/ngo/verification?stage=vet", title: "The vet signs off",
    body: "Procedures wait here for veterinary sign-off. Open one, check the surgery record and authorise it. Nothing is claimed without this.",
    sel: ".abc-list a", point: ["Authorise procedure"], hint: "Open the waiting record to see what the vet checks." },
  { role: "coordinator", path: "/ngo/verification?stage=review", title: "The coordinator checks the evidence",
    body: "Each record needs a capture photo, surgery record, ear notch, release photo and release location before it can be reported.",
    sel: ".abc-list a", point: ["Review this field record", "Approve for reporting"], hint: "Open a record to confirm its evidence." },
  { role: "coordinator", path: "/ngo/packages", title: "Build the monthly claim",
    body: "Approved records become a package for the municipal office, priced from the contract in force. The office reviews it; accepted is not paid.",
    point: ["Prepare a package for another period", "Prepare package", "Submit package"], hint: "Packages are prepared and submitted from here." },
  { role: "lead", path: "/ngo", title: "The programme lead's view",
    body: "The lead sees the whole programme: work waiting at each step, the team and what needs a decision today." },
  { role: "lead", path: "/ngo/map", title: "See the work on the ward map",
    body: "Every record sits on a ward map, so gaps in coverage are visible. Empty places mean nothing was recorded, not that there are no animals." },
  { role: "lead", path: "/ngo/training", title: "Train the team",
    body: "Courses, lessons and quizzes for catchers, vets and coordinators, with progress the lead can follow." },
  { role: "municipal", path: "/city/insights", title: "The municipal office's command view",
    body: "Decisions waiting, packages with the operator, claims this year and evidence completeness, from what this office is authorised to see.",
    point: ["Waiting for your decision"], hint: "Every tile opens the filtered queue." },
  { role: "municipal", path: "/city/review", title: "Ask Kaju about the queue",
    body: "Kaju answers from the records this office can see and drafts review notes. People decide. Try asking which package has waited longest.",
    point: ["Ask Kaju", "Kaju"], hint: "Open Kaju from the top bar." },
  { role: "municipal", path: "/city/review", title: "Decide on the claim",
    body: "Open the waiting package to see every record, its evidence and the vet's sign-off, then accept clean claims and query the rest.",
    sel: "main a[href^='/city/review/']", point: ["Fill review notes with Kaju"], hint: "Open the waiting package; inside, Kaju can draft the review notes." },
  { role: "municipal", path: "/city/contracts", title: "Contracts and rates",
    body: "The contract in force sets the rate per procedure, so a claim is checked against what was agreed. This sample contract is marked illustrative." },
  { role: "municipal", path: "/research/workbench", title: "Research from the same record",
    body: "Researchers get monthly aggregates from the public record, with the method and limits stated. Record-level data needs an agreed protocol." },
];

export const TOUR_DONE = TOUR.length;
