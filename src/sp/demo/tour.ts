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
export type Fill =
  | { op: "type"; sel: string; value: string | ((today: string) => string) }
  | { op: "check"; sel: string }
  | { op: "pick"; sel: string }
  | { op: "select"; sel: string; value: string }
  | { op: "press"; sel: string }
  | { op: "wait"; ms: number };

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
  tags: Tag[];
  /** An honest note shown under the instruction. */
  note?: string;
  optional?: boolean;
};

export type Stage = { id: string; label: string; role: DemoRole; who: string; title: string; lede: string; acts: Act[]; handoff?: string };

const PROGRAMME = "/gov/programmes/bengaluru-demo";
const plus = (today: string, n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const REQUEST = '[data-tour="request"][data-area="Indiranagar"]';

export const STAGES: Stage[] = [
  {
    id: "citizen", label: "Citizen", role: "oh-clinician", who: "A resident, no account", title: "Report a suspected dog bite",
    lede: "A resident chats with Kaju, or calls and talks. Kaju structures the report, asks only for what is missing and tells the clinic once the person confirms.",
    handoff: "The notice is now on the hospital's Today, before the patient arrives.",
    acts: [
      { id: "tell", title: "Chat with Kaju, or call", path: "/bite-help", sel: '[data-tour="bite-compose"], [data-tour="bite-call"]',
        say: "Kaju works by chat and by phone call. In the chat, type or press Example, then send: “A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance.” Or choose Call, press “Call Kaju” and say it.",
        example: { label: "Use the example words", fills: [{ op: "press", sel: '[data-tour="mode-chat"]' }, { op: "wait", ms: 150 }, { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance." }] },
        auto: [{ op: "press", sel: '[data-tour="mode-chat"]' }, { op: "wait", ms: 200 }, { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance." }, { op: "wait", ms: 150 }, { op: "press", sel: '[data-tour="bite-compose"] .kc-send' }],
        done: { sel: '[data-reached~="understood"]' },
        tags: [["staging", "Kaju chat: reads the report by fixed rules and asks only for what is missing"], ["staging", "Kaju voice call in the browser: it speaks, listens and fills the report"], ["pilot", "A public Kaju helpline number, and calls in Kannada"]],
        note: "The report on the right fills in as the person types or talks. Speech is the browser's own; no AI model reads the words." },
      { id: "safety", title: "Answer the safety question", path: "/bite-help", sel: '[data-tour="bite-quick"]',
        say: "Kaju says what it understood, then asks the fixed danger-sign question. Say or press “No, none of these”.",
        auto: [{ op: "press", sel: "text:No, none of these" }],
        done: { sel: '[data-reached~="danger"]' }, tags: [["staging", "Fixed first-aid and danger-sign steps, awaiting clinical review"]],
        note: "Any yes sends the person to 108 straight away. Kaju never judges the wound." },
      { id: "notify", title: "Let Kaju tell the clinic", path: "/bite-help", sel: '[data-tour="bite-quick"]',
        say: "Kaju advises seeing a doctor today and offers to tell the nearest anti-rabies centre the person is coming. Say or press “Yes, tell the clinic”.",
        auto: [{ op: "press", sel: "text:Yes, tell the clinic" }],
        done: { sel: '[data-reached~="ask"]' }, tags: [["staging", "The person decides whether a notice is sent"]] },
      { id: "dog", title: "Add what Kaju asks for", path: "/bite-help", sel: '[data-tour="bite-compose"], [data-tour="bite-quick"]',
        say: "Kaju asks only what the first words did not say: what the dog looked like. Say or type it, then answer “No” to the call-back question.",
        example: { label: "Use the example description", fills: [{ op: "type", sel: '[data-tour="bite-compose"] textarea', value: "Brown dog, no collar, usually near the bus stop on 100 Feet Road" }] },
        auto: [{ op: "press", sel: '[data-tour="mode-chat"]' }, { op: "wait", ms: 200 }, { op: "type", sel: '[data-tour="bite-compose"] textarea', value: "Brown dog, no collar, usually near the bus stop on 100 Feet Road" }, { op: "wait", ms: 150 }, { op: "press", sel: '[data-tour="bite-compose"] .kc-send' }, { op: "wait", ms: 1500 }, { op: "press", sel: "text:No, don't call me" }],
        done: { sel: '[data-reached~="review"]' }, tags: [["staging", "Only the missing questions are asked"]] },
      { id: "send", title: "Confirm and send", path: "/bite-help", sel: '[data-tour="bite-quick"]',
        say: "Check the report, then say “Send” or press “Send the report”. Kaju shows where to go today, with the centre that now expects the person first.",
        auto: [{ op: "press", sel: '[data-tour="bite-quick"] .is-go' }],
        done: { sel: '[data-reached~="sent"]' }, tags: [["staging", "The notice reaches the nearest anti-rabies centre"], ["external", "WhatsApp reports: live connection awaits Meta verification"]],
        note: "Residents can also report on WhatsApp: messages, photos, voice notes and location arrive in an NGO's Inbox. That connection awaits Meta verification; you will see the pasted-message path in stage 3." },
    ],
  },
  {
    id: "hospital", label: "Hospital", role: "oh-clinician", who: "Duty clinician, Teaching Hospital Anti-Rabies Clinic", title: "Review urgency and manage the PEP pathway",
    lede: "The clinic sees the notice, records the presentation from it, assesses the category and prescribes the course. Patient details stay here; the dog's details go to the animal team.",
    handoff: "Recording the bite sent a follow-up request to the NGO that covers Indiranagar, with no patient details.",
    acts: [
      { id: "notice", title: "The notice is waiting", path: "/health/today", sel: '[data-tour="notice"][data-area="Indiranagar"] [data-tour="notice-came"]',
        say: "Under Notices from the public, the Indiranagar notice is waiting. The patient has arrived: press “Patient came in”.",
        done: { path: /^\/health\/bites\/new/ }, tags: [["staging", "Public notices on the clinic's Today"]] },
      { id: "present", title: "Record the presentation", path: "/health/bites/new", at: /^\/health\/bites\/new/, sel: 'form button[type="submit"]',
        say: "The form is filled from the notice. Add the register number, age and wound washing, choose Category III as the clinician, then press “Save presentation” and “Save”.",
        example: { label: "Fill the example entry", fills: [
          { op: "type", sel: 'input[placeholder="For example the OPD number"]', value: "OPD-DEMO-1116" },
          { op: "select", sel: "field:Age|select", value: "30-49" },
          { op: "pick", sel: 'input[name="sex"][value="female"]' },
          { op: "pick", sel: 'input[name="washed"][value="before_arrival"]' },
          { op: "pick", sel: 'input[name="own"][value="community"]' },
          { op: "pick", sel: 'input[name="category"][value="III"]' },
        ] },
        done: { path: /^\/health\/bites\/[0-9a-f-]{36}$/ }, keep: "bite",
        tags: [["staging", "Bite register, with the category recorded in the clinician's name"]],
        note: "StrayPaw records the clinician's assessment; it never assesses. The example entry is fictional." },
      { id: "prescribe", title: "Prescribe the course", path: "@bite", at: /^\/health\/bites\/[0-9a-f-]{36}$/, sel: ".gh-form",
        say: "Write the regimen as in the clinic's protocol, tick immunoglobulin, and enter each dose date. Press “Save prescription” and confirm it is your prescription.",
        example: { label: "Fill the example prescription", fills: [
          { op: "type", sel: 'input[placeholder="As written in your protocol"]', value: "Intradermal, 2 sites (updated Thai Red Cross): days 0, 3, 7 and 28" },
          { op: "check", sel: ".gh-form .gh-tick input" },
          { op: "type", sel: 'input[aria-label="Dose 1 date"]', value: (t) => t },
          { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
          { op: "type", sel: 'input[aria-label="Dose 2 date"]', value: (t) => plus(t, 3) },
          { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
          { op: "type", sel: 'input[aria-label="Dose 3 date"]', value: (t) => plus(t, 7) },
          { op: "press", sel: "text:Add a dose date" }, { op: "wait", ms: 120 },
          { op: "type", sel: 'input[aria-label="Dose 4 date"]', value: (t) => plus(t, 28) },
        ] },
        done: { sel: 'ul[aria-label="Doses"]' },
        tags: [["staging", "Clinician-entered course; each dose appears on Today when due"], ["external", "SMS or WhatsApp reminders (logged phone calls today)"]],
        note: "StrayPaw does not calculate or suggest a schedule. Every dose date is the clinician's." },
      { id: "handoff", title: "The animal team is asked", path: "@bite", at: /^\/health\/bites\/[0-9a-f-]{36}$/, sel: '[data-tour="exposure-handoff"]',
        say: "Under Animal follow-up: the NGO for Indiranagar has been asked to find and observe the dog. It received the place and description, never the patient.",
        tags: [["staging", "Automatic follow-up request to the area's animal team"]] },
      { id: "services", title: "Vaccine, immunoglobulin and wound washing", path: "/health/facilities", sel: "main .nx-table, main table, main ul",
        say: "Each facility confirms what it has, with a date: vaccine, immunoglobulin, wound washing. Referral pathways send people where a service is missing.",
        tags: [["staging", "Service confirmations and referral pathways"], ["external", "Real facility data from BBMP Health and KIMS"]], optional: true },
    ],
  },
  {
    id: "animal", label: "Animal health", role: "oh-ngo", who: "NGO coordinator, Animal Care Trust", title: "Investigate the animal",
    lede: "The NGO that covers Indiranagar receives the request, finds the dog on its register, reads its vaccination and ABC history, and links it to the request.",
    handoff: "The dog, its history and the request are now connected for every partner.",
    acts: [
      { id: "accept", title: "The hospital's request arrives", path: `${PROGRAMME}?tab=Work`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: `${REQUEST}[data-status="open"] [data-tour="request-accept"]`,
        say: "In the programme's Work list, the request from the Teaching Hospital is new. Press “Accept”.",
        done: { sel: `${REQUEST}[data-status="accepted"]` }, tags: [["staging", "Requests between partners, with due dates"]] },
      { id: "register", title: "Find the dog on the register", path: "/ngo/animals?place=Indiranagar", at: /^\/ngo\/animals\/?$/, sel: "text:Open full record, text:Simba",
        say: "The register opens at Indiranagar. The description said brown, no collar: open Simba, then “Open full record”.",
        done: { path: /^\/ngo\/animals\/[0-9a-f-]{36}/ }, keep: "dog", tags: [["live", "Animal register with identities and photos"]] },
      { id: "history", title: "Its vaccination and ABC history", path: "@dog", at: /^\/ngo\/animals\/[0-9a-f-]{36}/, sel: "heading:Care on record, main",
        say: "Care on record: sterilised on 4 Nov, vaccinated against rabies on 21 Oct 2025. Below it, the ABC timeline from capture to release, with who recorded each step.",
        tags: [["live", "Vaccination, sterilisation and ABC records with evidence"], ["live", "Veterinary sign-off and review states"]] },
      { id: "link", title: "Link the dog to the request", path: `${PROGRAMME}?tab=Work`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: `${REQUEST}[data-status="accepted"] [data-tour="request-link"], [data-tour="request-dogs"]`,
        say: "Back in Work, press “Link the animal”, choose Simba, and press “Link the animal” again.",
        example: { label: "Add the example note", fills: [{ op: "type", sel: ".nx-modal textarea, [role=dialog] textarea", value: "Seen near the bus stop on 100 Feet Road, calm and eating. Observing for ten days." }] },
        done: { sel: REQUEST, text: "animal linked" }, tags: [["staging", "The bite and the animal's record, connected"]] },
      { id: "whatsapp", title: "Reports on WhatsApp", path: "/ngo/inbox?view=paste", at: /^\/ngo\/inbox/, sel: "main textarea, main",
        say: "Reports also come from WhatsApp. Today a team member pastes a message here and Kaju prepares the case; the live WhatsApp Business link awaits Meta's verification.",
        tags: [["live", "Pasted WhatsApp messages into prepared cases"], ["external", "WhatsApp Business connection, pending Meta verification"]], optional: true },
    ],
  },
  {
    id: "kaju", label: "Kaju", role: "oh-ngo", who: "The same coordinator, with Kaju", title: "Kaju coordinates the response",
    lede: "Ask Kaju about the incident in plain words. It reads the records the coordinator may see, says what is missing and who does what, and prepares the next steps for approval.",
    handoff: "The response is organised, and every step is on the record in a person's name.",
    acts: [
      { id: "ask", title: "Ask Kaju about the incident", path: "/kaju", at: /^\/kaju\/?$/, sel: 'textarea[aria-label="Ask Kaju"]',
        say: "Ask: “What's happening with the Indiranagar bite incident? What's missing, and what do the teams need to do next?” and press Enter.",
        example: { label: "Use the example question", fills: [{ op: "type", sel: 'textarea[aria-label="Ask Kaju"]', value: "What's happening with the Indiranagar bite incident? What's missing, and what do the teams need to do next?" }] },
        done: { sel: '[data-tour="kaju-answer"]', text: "Who does what" },
        tags: [["live", "Kaju answers from records the person may see, by fixed rules"], ["staging", "The incident briefing across partners"], ["pilot", "Free-form answers with a connected model"]],
        note: "No paid model runs on the demo. Kaju's answer comes from fixed rules over real records, and it says so under the answer." },
      { id: "brief", title: "What is missing, and who does what", path: "/kaju", at: /^\/kaju\/?$/, sel: '[data-tour="kaju-answer"]',
        say: "Kaju names the dog and its history, what is missing (the observation is not planned, the rabies vaccination is overdue) and each partner's part. Every fact links to its record.",
        tags: [["live", "Record links on every answer"], ["live", "Kaju never reads patient or dose records"]] },
      { id: "approve", title: "Approve what Kaju prepared", path: "/kaju", at: /^\/kaju\/?$/, sel: ".nx-kprop .nx-btn",
        say: "Kaju prepared the next steps: an observation case for this request and, when it is due, a revaccination follow-up. Press “Confirm” on each. Nothing was saved until now; each is saved in your name.",
        done: { sel: ".nx-kprop .nx-kok", allOf: ".nx-kprop" }, tags: [["live", "Prepared work that waits for a person's confirmation"]] },
      { id: "limits", title: "What Kaju can use", path: "/kaju", at: /^\/kaju\/?$/, sel: "main aside, main",
        say: "Beside the conversation: what Kaju noticed today, its missions, and what it can use. Email, SMS and WhatsApp say plainly that they are not connected yet.",
        tags: [["live", "Daily checks, missions and approvals"], ["external", "Email, SMS and WhatsApp sending"]], optional: true },
    ],
  },
  {
    id: "municipality", label: "Municipality", role: "oh-municipal", who: "Municipal health officer", title: "Oversee the response",
    lede: "The municipality sees the programme as a whole: what needs a decision, the incident's follow-up, vaccination coverage against the target, and the reports it shares.",
    handoff: "The municipality knows what happened, what is still open and what evidence supports it.",
    acts: [
      { id: "overview", title: "What needs a decision", path: "/gov/overview", sel: "main .nx-figs, main",
        say: "Urgent alerts, areas below the 70% target, areas without an estimate, partners with overdue requests. Each alert comes from a written programme rule.",
        tags: [["staging", "Programme overview and rule-based alerts"]] },
      { id: "followup", title: "The incident, followed up", path: `${PROGRAMME}?tab=Work`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: REQUEST,
        say: "The Indiranagar request: accepted by Animal Care Trust, with Simba linked. The officer sees who holds it and when it is due, never the patient.",
        tags: [["staging", "Accountability for work between partners"]] },
      { id: "coverage", title: "Vaccination coverage and gaps", path: `${PROGRAMME}?tab=Coverage`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main table, main ul, main",
        say: "Verified vaccinations against each area's dated estimate. Indiranagar has no estimate yet, so no coverage is claimed there: that is a gap to fill.",
        tags: [["staging", "Coverage against dated estimates"], ["external", "Official ward boundaries and census estimates"]] },
      { id: "reports", title: "Reports and exports", path: "/gov/reports", sel: "main",
        say: "A programme report to print or save as PDF, coverage by area, and a data export with small counts hidden. Every figure says where it comes from.",
        tags: [["staging", "Programme reports and exports"]], optional: true },
    ],
  },
  {
    id: "consortium", label: "One Health", role: "oh-programme", who: "Programme coordination cell", title: "Learn from the record",
    lede: "At the consortium level, the same records become surveillance, coverage and gap analysis, and privacy-protected data for evaluating the pilot.",
    acts: [
      { id: "where", title: "Where to act", path: PROGRAMME, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "Bites, laboratory-confirmed cases and dog vaccination, by area, with what needs a decision. Nothing here declares an outbreak; it shows where to look.",
        tags: [["staging", "Programme-wide surveillance by area"], ["external", "Integration with IHIP and state surveillance"]] },
      { id: "network", title: "The care network", path: `${PROGRAMME}?tab=Network`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "Every facility's services as last confirmed, and the referral pathways between them, on one map.",
        tags: [["staging", "Care network and referral pathways"]], optional: true },
      { id: "data", title: "Privacy-protected research data", path: `${PROGRAMME}?tab=Data`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "Weekly exposures by area, animal and category. Counts below 5 are hidden and never added into a total; no row identifies a person.",
        tags: [["staging", "Suppressed extracts and steward-approved access"], ["external", "Ethics approval for research on real data"]] },
      { id: "report", title: "Evaluate the pilot", path: `${PROGRAMME}?tab=Report`, at: /^\/gov\/programmes\/bengaluru-demo/, sel: "main",
        say: "The programme report: exposures, course completion, laboratory results, coverage and follow-up indicators for a chosen period. This is how the six-month pilot is measured.",
        tags: [["staging", "Programme report"], ["pilot", "Pilot evaluation with partners' real data"]] },
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
