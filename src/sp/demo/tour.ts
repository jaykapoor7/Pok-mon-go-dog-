/* The guided demo on demo.straypaw.org: one fictional dog bite in Indiranagar, followed through the real StrayPaw
   workspaces of a city One Health programme, in six stages. Each stage is a few actions on real screens: the guide
   points at the control, says what to click, type or say, notices when it is done, and moves on. The presenter
   drives the product. Where typing would slow a recording, an action offers a one-click example that fills the
   field and leaves pressing the button to the person; on the citizen's questions, "Next action" answers for them
   if they have not, because each answer opens the next question.

   Every action is marked with what it shows: live and tested, built and in staging, planned for the pilot, or
   awaiting an outside integration. Every record is illustrative (docs/one-health/DEMO.md). */

export type DemoRole = "oh-programme" | "oh-clinician" | "oh-nurse" | "oh-ngo" | "oh-lab" | "oh-municipal" | "oh-analyst" | "field" | "vet" | "coordinator" | "lead" | "municipal";

export const DEMO_ROLES: Record<DemoRole, { label: string; who: string; home: string; group: "programme" | "health" | "animal" | "government" }> = {
  "oh-clinician": { label: "Hospital clinician", who: "Assesses bites and prescribes the course", home: "/health/today", group: "health" },
  "oh-nurse": { label: "Hospital nurse", who: "Doses due, reminder and completion calls", home: "/health/pep", group: "health" },
  "oh-lab": { label: "Laboratory scientist", who: "Receives samples and reports results", home: "/health/today", group: "health" },
  "oh-ngo": { label: "NGO coordinator", who: "Answers requests from programme partners", home: "/ngo/today", group: "animal" },
  field: { label: "Field worker", who: "Catches, vaccinates, records and releases", home: "/ngo/field", group: "animal" },
  vet: { label: "Veterinarian", who: "Signs off each procedure", home: "/health/today", group: "animal" },
  coordinator: { label: "NGO operations", who: "Checks evidence and prepares reports", home: "/ngo/today", group: "animal" },
  "oh-municipal": { label: "Municipal health officer", who: "Follows the programme across the city", home: "/gov/overview", group: "government" },
  municipal: { label: "Municipal reviewer", who: "Verifies animal-level ABC evidence", home: "/gov/overview", group: "government" },
  "oh-programme": { label: "Programme lead", who: "Coordinates every partner in the city programme", home: "/gov/overview", group: "programme" },
  "oh-analyst": { label: "Researcher", who: "Works on approved, suppressed data", home: "/research/datasets", group: "programme" },
  lead: { label: "NGO lead", who: "Runs the unit, with Kaju's checks", home: "/kaju/insights", group: "animal" },
};

/** The roles a visitor is offered: one per part of the response. The others stay for the staff demos and tests. */
export const DEMO_SHOWN: DemoRole[] = ["oh-clinician", "oh-ngo", "oh-municipal", "oh-programme"];
export const SHOWN_LABEL: Partial<Record<DemoRole, { label: string; who: string }>> = {
  "oh-clinician": { label: "Hospital", who: "Bite register, PEP courses, doses due" },
  "oh-ngo": { label: "NGO", who: "Requests, the animal register, WhatsApp reports, Kaju" },
  "oh-municipal": { label: "Municipality", who: "Alerts, coverage and follow-up across the city" },
  "oh-programme": { label: "One Health programme", who: "Surveillance, the care network, research data" },
};

/** What an action shows, in the grant's own terms. */
export type Avail = "live" | "staging" | "pilot" | "external";
export const AVAIL: Record<Avail, { label: string; note: string }> = {
  live: { label: "Live and tested", note: "In use in StrayPaw and covered by its tests" },
  staging: { label: "In staging", note: "Built and tested on the demonstration database; not yet in programme use" },
  pilot: { label: "Planned for the pilot", note: "Part of the proposed six-month pilot; not built yet" },
  external: { label: "Awaiting integration", note: "Needs a partner's data, an approval or a third-party connection" },
};
export type Tag = [Avail, string];

/** One thing the guide fills when the presenter asks for the example. */
export type Fill = (
  | { op: "type"; sel: string; value: string | ((today: string) => string) }
  | { op: "check"; sel: string }
  | { op: "pick"; sel: string }
  | { op: "select"; sel: string; value: string }
  | { op: "press"; sel: string }
  | { op: "wait"; ms: number }
) & { /** Only when this matches on the page (the step it answers is the one showing). */ when?: string };

/** How the guide knows an action is done. */
export type Done =
  | { path: RegExp }
  | { sel: string; text?: string; count?: number; allOf?: string };

export type Act = {
  id: string;
  title: string;
  /** What to click, type or say, in one or two sentences. */
  say: string;
  /** Where the action happens. "@name" is a screen the presenter reached earlier in this run. */
  path: string;
  /** Other addresses that count as this action's screen. */
  at?: RegExp;
  /** The control to point at: the first visible match. */
  sel?: string;
  /** Fills the example in, for a recording without typing. */
  example?: { label: string; fills: Fill[] };
  /** What "Next action" does when the action is not done yet: the same steps a person takes, so the story never
      stalls on an unanswered question (the screen after it depends on this one). */
  auto?: Fill[];
  /** Checked twice a second; the action is done when it matches. Without it, the presenter moves on. */
  done?: Done;
  /** The screen to remember once done, for later actions ("@bite"). */
  keep?: string;
  /** This action needs another person signed in. */
  role?: DemoRole;
  tags?: Tag[];
  /** An honest note shown under the instruction. */
  note?: string;
  optional?: boolean;
};

export type Stage = { id: string; label: string; role: DemoRole; who: string; title: string; lede: string; acts: Act[]; handoff?: string };

const PROGRAMME = "/gov/programmes/bengaluru-demo";
const plus = (today: string, n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const REQUEST = '[data-tour="request"][data-area="Indiranagar"]';

/* The example prescription: the clinic's protocol as written, with each dose date the clinician's. */
const RX: Fill[] = [
  { op: "type", sel: 'input[placeholder="As written in your protocol"]', value: "Intradermal, 2 sites (updated Thai Red Cross): days 0, 3, 7 and 28" },
  { op: "check", sel: ".gh-form .gh-tick input" },
  { op: "type", sel: 'input[aria-label="Dose 1 date"]', value: (t) => t },
  { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
  { op: "type", sel: 'input[aria-label="Dose 2 date"]', value: (t) => plus(t, 3) },
  { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
  { op: "type", sel: 'input[aria-label="Dose 3 date"]', value: (t) => plus(t, 7) },
  { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
  { op: "type", sel: 'input[aria-label="Dose 4 date"]', value: (t) => plus(t, 28) },
];
const SIMBA = "/ngo/animals/c1c5368c-4c58-4df9-a49a-7c9aac25b315";
const AT = (s: string) => `.kb[data-at="${s}"]`;

export const STAGES: Stage[] = [
  {
    id: "citizen", label: "Citizen", role: "oh-clinician", who: "A resident, no account", title: "Report a dog bite",
    lede: "A resident chats with Kaju or calls. Kaju fills the report, asks only what is missing and tells the clinic.",
    handoff: "The clinic has the report before the patient arrives.",
    acts: [
      { id: "tell", title: "Tell Kaju what happened", path: "/bite-help", sel: '[data-tour="bite-compose"], [data-tour="bite-call"]',
        say: "Chat or call. Kaju fills the report on the right and asks only what's missing.",
        example: { label: "Use the example", fills: [{ op: "press", sel: '[data-tour="mode-chat"]', when: '.kb[data-mode="call"]' }, { op: "wait", ms: 150 }, { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance." }] },
        auto: [
          { op: "press", sel: '[data-tour="mode-chat"]', when: '.kb[data-mode="call"]' }, { op: "wait", ms: 200 },
          { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance.", when: AT("tell") }, { op: "wait", ms: 120, when: AT("tell") }, { op: "press", sel: '[data-tour="bite-compose"] .kc-send', when: AT("tell") },
          { op: "press", sel: "text:No, none of these", when: AT("danger") },
          { op: "press", sel: "text:Yes, tell the clinic", when: AT("notify") },
          { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "Brown dog, no collar, usually near the bus stop on 100 Feet Road", when: AT("looks") }, { op: "wait", ms: 120, when: AT("looks") }, { op: "press", sel: '[data-tour="bite-compose"] .kc-send', when: AT("looks") },
          { op: "press", sel: "text:No, don't call me", when: AT("call") },
        ],
        done: { sel: '[data-reached~="review"]' } },
      { id: "send", title: "Send it to the clinic", path: "/bite-help", sel: '[data-tour="bite-quick"]',
        say: "Kaju sends the report and shows where to go today.",
        auto: [{ op: "press", sel: '[data-tour="bite-quick"] .is-go', when: AT("review") }],
        done: { sel: '[data-reached~="sent"]' } },
    ],
  },
  {
    id: "hospital", label: "Hospital", role: "oh-clinician", who: "Duty clinician, Teaching Hospital Anti-Rabies Clinic", title: "Treat the patient",
    lede: "The clinic records the bite from the report and prescribes the course. The animal team is asked to find the dog.",
    handoff: "The NGO for Indiranagar now has a request to find the dog, without any patient details.",
    acts: [
      { id: "notice", title: "The clinic is ready", path: "/health/today", sel: '[data-tour="notice"][data-area="Indiranagar"] [data-tour="notice-came"]',
        say: "The report is waiting. Tap “Patient came in”.",
        auto: [{ op: "press", sel: '[data-tour="notice"][data-area="Indiranagar"] [data-tour="notice-came"]' }],
        done: { path: /^\/health\/bites\/new/ } },
      { id: "present", title: "Record the bite", path: "/health/bites/new", at: /^\/health\/bites\/new/, sel: 'form button[type="submit"]',
        say: "Filled from the report. The clinician sets the category and saves.",
        example: { label: "Fill the example", fills: [
          { op: "type", sel: 'input[placeholder="For example the OPD number"]', value: "OPD-DEMO-1116" },
          { op: "select", sel: "field:Age|select", value: "30-49" },
          { op: "pick", sel: 'input[name="sex"][value="female"]' },
          { op: "pick", sel: 'input[name="washed"][value="before_arrival"]' },
          { op: "pick", sel: 'input[name="own"][value="community"]' },
          { op: "pick", sel: 'input[name="category"][value="III"]' },
        ] },
        auto: [
          { op: "type", sel: 'input[placeholder="For example the OPD number"]', value: "OPD-DEMO-1116" },
          { op: "select", sel: "field:Age|select", value: "30-49" },
          { op: "pick", sel: 'input[name="sex"][value="female"]' },
          { op: "pick", sel: 'input[name="washed"][value="before_arrival"]' },
          { op: "pick", sel: 'input[name="own"][value="community"]' },
          { op: "pick", sel: 'input[name="category"][value="III"]' },
          { op: "wait", ms: 200 }, { op: "press", sel: 'form button[type="submit"]' }, { op: "wait", ms: 400 },
          { op: "press", sel: "dialog:Save" },
        ],
        done: { path: /^\/health\/bites\/[0-9a-f-]{36}$/ }, keep: "bite" },
      { id: "prescribe", title: "Prescribe the course", path: "@bite", at: /^\/health\/bites\/[0-9a-f-]{36}$/, sel: ".gh-form",
        say: "Each dose lands on the clinic's Today. The NGO is asked to find the dog.",
        example: { label: "Fill the example", fills: RX },
        auto: [...RX, { op: "wait", ms: 200 }, { op: "press", sel: "text:Save prescription" }, { op: "wait", ms: 400 },
          { op: "check", sel: '[role="dialog"] input[type="checkbox"]' }, { op: "wait", ms: 120 }, { op: "press", sel: "dialog:Save prescription" }],
        done: { sel: 'ul[aria-label="Doses"]' } },
    ],
  },
  {
    id: "animal", label: "Animal health", role: "oh-ngo", who: "NGO coordinator, Animal Care Trust", title: "Find the dog",
    lede: "The NGO for Indiranagar gets the request, finds the dog on its register and links it to the bite. Residents' WhatsApp reports land here too.",
    handoff: "The bite and the dog's record are connected for every partner.",
    acts: [
      { id: "accept", title: "A request arrives", path: `${PROGRAMME}?tab=Work`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: `newest:${REQUEST}[data-status="open"] [data-tour="request-accept"]`,
        say: "The hospital asked for the dog to be found. Tap “Accept”.",
        auto: [{ op: "press", sel: `newest:${REQUEST}[data-status="open"] [data-tour="request-accept"]` }],
        done: { sel: `${REQUEST}[data-status="accepted"]` } },
      { id: "history", title: "Simba's record", path: SIMBA, at: /^\/ngo\/animals\/[0-9a-f-]{36}/, sel: "heading:Care on record, main",
        say: "The described dog: vaccination, sterilisation and every ABC step, each signed." },
      { id: "link", title: "Link Simba to the bite", path: `${PROGRAMME}?tab=Work`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: `newest:${REQUEST}[data-status="accepted"] [data-tour="request-link"], [data-tour="request-dogs"]`,
        say: "Tap “Link the animal” and choose Simba.",
        auto: [{ op: "press", sel: `newest:${REQUEST}[data-status="accepted"] [data-tour="request-link"]` }, { op: "wait", ms: 500 },
          { op: "pick", sel: "label:Simba" }, { op: "wait", ms: 120 }, { op: "press", sel: '[data-tour="request-save"]' }],
        done: { sel: REQUEST, text: "animal linked" } },
      { id: "whatsapp", title: "Reports on WhatsApp", path: "/ngo/inbox?view=whatsapp", at: /^\/ngo\/inbox/, sel: ".nr-wa, main",
        say: "Residents send photos, voice notes and location. One tap opens a case." },
    ],
  },
  {
    id: "kaju", label: "Kaju", role: "oh-ngo", who: "The same coordinator, with Kaju", title: "Kaju coordinates",
    lede: "Ask Kaju in plain words. It answers from the records, says what is missing and prepares the next steps.",
    handoff: "Every step is on the record, in a person's name.",
    acts: [
      { id: "ask", title: "Ask Kaju", path: "/kaju", at: /^\/kaju\/?$/, sel: 'textarea[aria-label="Ask Kaju"]',
        say: "“What's happening with the Indiranagar bite? What's missing?”",
        example: { label: "Use the example", fills: [{ op: "type", sel: 'textarea[aria-label="Ask Kaju"]', value: "What's happening with the Indiranagar bite incident? What's missing, and what do the teams need to do next?" }] },
        auto: [{ op: "type", sel: 'textarea[aria-label="Ask Kaju"]', value: "What's happening with the Indiranagar bite incident? What's missing, and what do the teams need to do next?" }, { op: "wait", ms: 150 }, { op: "press", sel: ".nx-composer button[type=submit]" }],
        done: { sel: '[data-tour="kaju-answer"]', text: "Who does what" } },
      { id: "approve", title: "Approve the next steps", path: "/kaju", at: /^\/kaju\/?$/, sel: ".nx-kprop .nx-btn, [data-tour=\"kaju-answer\"]",
        say: "Kaju prepared them. Tap “Confirm”; each is saved in your name.",
        auto: [{ op: "press", sel: ".nx-kprop:not(:has(.nx-kok)) .nx-btn" }, { op: "wait", ms: 900 }, { op: "press", sel: ".nx-kprop:not(:has(.nx-kok)) .nx-btn" }],
        done: { sel: ".nx-kprop .nx-kok", allOf: ".nx-kprop" } },
    ],
  },
  {
    id: "municipality", label: "Municipality", role: "oh-municipal", who: "Municipal health officer", title: "Oversee the city",
    lede: "The municipality sees what needs a decision and where vaccination falls short.",
    handoff: "The city knows what happened, what is open and where to act.",
    acts: [
      { id: "overview", title: "What needs a decision", path: "/gov/overview", sel: "main .nx-figs, main",
        say: "Alerts, coverage and overdue work across the city." },
      { id: "coverage", title: "Coverage and gaps", path: `${PROGRAMME}?tab=Coverage`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main table, main ul, main",
        say: "Vaccination against each area's target, and where it falls short." },
    ],
  },
  {
    id: "consortium", label: "One Health", role: "oh-programme", who: "Programme coordination cell", title: "Learn from every case",
    lede: "The same records become surveillance and privacy-protected data for research.",
    acts: [
      { id: "where", title: "Where to act", path: PROGRAMME, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "Bites, lab results and vaccination, by area." },
      { id: "data", title: "Research-ready data", path: `${PROGRAMME}?tab=Data`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "Weekly, by area and category. Small counts are hidden." },
    ],
  },
];

export const TOUR_DONE = STAGES.length;
export const SHOWN = STAGES.map((s) => s.label);
/** The line the guided demo ends on. */
export const CLOSING = "One incident becomes a coordinated response, a verifiable operational record and actionable One Health intelligence.";

/** Where an action happens, with screens remembered earlier in the run. */
export function actPath(a: Act, memo: Record<string, string>): string {
  return a.path.startsWith("@") ? memo[a.path.slice(1)] ?? "" : a.path;
}
const base = (p: string) => p.split("?")[0];
/** The presenter is on this action's screen. A tab named in its address ("?tab=Coverage") must be the one open. */
export function onActScreen(a: Act, pathname: string, memo: Record<string, string>, search = ""): boolean {
  const p = actPath(a, memo);
  const want = p.includes("?") ? new URLSearchParams(p.split("?")[1]).get("tab") : null;
  const tab = new URLSearchParams(search).get("tab");
  if (p.startsWith("/gov/programmes/") && (want ?? "Overview") !== (tab ?? "Overview") && pathname.startsWith("/gov/programmes/")) return false;
  if (a.at?.test(pathname)) return true;
  return !!p && base(p) === pathname;
}
