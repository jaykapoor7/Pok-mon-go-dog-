/* The guided demo: one illustrative Bengaluru programme seen by the people who
   run it, in the order the work moves. It opens with the connected programme
   (coordination cell, hospital, NGO, laboratory) and continues with the ABC
   chain the same NGO runs for the municipal office. Each step signs in as its role,
   opens one screen and points at the one thing to look at or press. Visitors
   can leave the guide at any time and roam; the guide waits where they left. */

export type DemoRole = "oh-programme" | "oh-clinician" | "oh-ngo" | "oh-lab" | "field" | "vet" | "coordinator" | "lead" | "municipal";

export const DEMO_ROLES: Record<DemoRole, { label: string; who: string; home: string }> = {
  "oh-programme": { label: "Programme lead", who: "Coordinates every partner in the city programme", home: "/programme/bengaluru-demo" },
  "oh-clinician": { label: "Hospital clinician", who: "Assesses bites and prescribes the course", home: "/today?all" },
  "oh-ngo": { label: "NGO coordinator", who: "Answers requests from programme partners", home: "/ngo" },
  "oh-lab": { label: "Laboratory scientist", who: "Receives samples and reports results", home: "/today?all" },
  field: { label: "Field worker", who: "Catches, records and releases animals", home: "/ngo" },
  vet: { label: "Veterinarian", who: "Signs off each procedure", home: "/ngo/verification?stage=vet" },
  coordinator: { label: "Coordinator", who: "Checks evidence and prepares the claim", home: "/ngo" },
  lead: { label: "Operations lead", who: "Runs the ABC unit and its team", home: "/ngo" },
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
  /** Other screens that still belong to this step (path prefixes), e.g. the place opened from Today. */
  within?: string[];
  /** What to do with the highlighted control, shown under the description. */
  hint?: string;
};

export const TOUR: TourStep[] = [
  { role: "oh-programme", path: "/programme/bengaluru-demo", title: "One programme, every partner",
    body: "The coordination cell opens on what needs a decision: a centre short of vaccine with people mid-course, a confirmed case, overdue doses. Every record here is illustrative.",
    sel: ".oh-alert", hint: "The first alert is the most urgent." },
  { role: "oh-programme", path: "/programme/bengaluru-demo/network", title: "Care network",
    body: "Hospitals, health centres and wound-washing units, what each confirmed it can offer this week, and where each one refers people." },
  { role: "oh-clinician", path: "/today?all", title: "A clinician's places",
    body: "One person, two facilities. The clinician records a bite once, assesses it and sets the course. StrayPaw only tracks what they decide.",
    sel: ".oh-placecard", within: ["/workspace/"], hint: "Open the hospital." },
  { role: "oh-ngo", path: "/ngo", title: "The request reaches the field team",
    body: "When a hospital asks for an animal to be followed up, the NGO for that area sees it on its own Today, with the place and the animal and never the patient.",
    sel: ".os-strip", point: ["from programme partners"], within: ["/workspace/"], hint: "Open the requests from partners." },
  { role: "oh-ngo", path: "/ngo", title: "Ask Kaju who is waiting",
    body: "Kaju reads the requests, never a patient record, and says what each partner is waiting for and what is overdue.",
    point: ["What are programme partners waiting for?"], hint: "Ask Kaju." },
  { role: "oh-lab", path: "/today?all", title: "Laboratory",
    body: "Samples arrive with their chain of custody. The scientist receives, tests and reports with the method; a positive result alerts the coordination cell.",
    sel: ".oh-placecard", within: ["/workspace/"], hint: "Open the laboratory." },
  { role: "field", path: "/ngo/field", title: "Field mode",
    body: "Record an animal with photos and location. With signal, records save straight to the register; without it they wait on the phone, and one switch lets a team work offline on purpose.",
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
export const SHOWN = ["Programme overview", "Care network", "Bite care", "Partner requests", "Kaju on partner requests", "Laboratory", "Field mode, online and offline", "Vet sign-off", "Monthly claim", "Kaju automations", "Municipal command view", "Claim review"];

export const TOUR_DONE = TOUR.length;
