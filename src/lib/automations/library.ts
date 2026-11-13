/* The automation library: ready-made rules an organisation can turn on.
   Each one watches one of Kaju's explainable checks and tells people
   inside StrayPaw. None sends anything outside StrayPaw, changes a record
   or touches patient data. `state` is honest about what runs today. */

export type Rule = "overdue_followup" | "missing_evidence" | "awaiting_vet" | "open_clarification" | "reporting_deadline" | "programme_activity" | "digest";
export type Template = { id: string; rule: Rule | null; name: string; does: string; for: string; every: "day" | "week"; notify: "leads" | "everyone"; min: number; state: "ready" | "not_yet"; why?: string };

export const LIBRARY: Template[] = [
  { id: "followups", rule: "overdue_followup", name: "Overdue follow-ups", does: "Tells leads each morning when follow-ups on open cases have passed their date.", for: "NGO and field teams", every: "day", notify: "leads", min: 1, state: "ready" },
  { id: "evidence", rule: "missing_evidence", name: "Incomplete evidence", does: "Tells leads when ABC records are missing a required photo, surgery record or release place.", for: "NGO and field teams", every: "day", notify: "leads", min: 1, state: "ready" },
  { id: "vet", rule: "awaiting_vet", name: "Procedures waiting for sign-off", does: "Tells leads when procedures have a surgery record but no veterinarian's sign-off.", for: "Veterinary", every: "day", notify: "leads", min: 1, state: "ready" },
  { id: "clarify", rule: "open_clarification", name: "Questions from the reviewing office", does: "Tells leads when the municipal office has asked something that is still unanswered.", for: "Municipal reporting", every: "day", notify: "leads", min: 1, state: "ready" },
  { id: "deadline", rule: "reporting_deadline", name: "Report deadline coming", does: "Tells leads when the reporting deadline you set is close.", for: "Municipal reporting", every: "day", notify: "leads", min: 1, state: "ready" },
  { id: "activity", rule: "programme_activity", name: "A drive goes quiet or spikes", does: "Tells leads when recorded activity on a drive changes sharply against its own earlier weeks.", for: "Programme leads", every: "week", notify: "leads", min: 1, state: "ready" },
  { id: "digest", rule: "digest", name: "Weekly summary", does: "Every Monday, one note for everyone with what is waiting across all checks.", for: "Everyone", every: "week", notify: "everyone", min: 1, state: "ready" },
  { id: "doses", rule: null, name: "Vaccine doses due at a hospital", does: "Would remind a clinic's staff of doses due today.", for: "Hospitals and clinics", every: "day", notify: "leads", min: 1, state: "not_yet", why: "Patient records are kept apart from automations. A hospital's day list already shows doses due." },
  { id: "lab", rule: null, name: "Laboratory result routing", does: "Would tell the sending team the moment a result is entered.", for: "Laboratories", every: "day", notify: "leads", min: 1, state: "not_yet", why: "Results already reach the sender and the coordination cell as alerts when they are entered; a configurable rule is not built." },
  { id: "review", rule: null, name: "Packages waiting for review", does: "Would tell a reviewing office when a package has waited more than a set number of days.", for: "Municipal offices", every: "day", notify: "leads", min: 1, state: "not_yet", why: "Automations run for organisations today; reviewing offices are next." },
  { id: "message", rule: null, name: "Messages outside StrayPaw", does: "Would send an email, SMS or WhatsApp message when a rule fires.", for: "Everyone", every: "day", notify: "leads", min: 1, state: "not_yet", why: "Anything sent outside StrayPaw needs a person to confirm it. Kaju prepares the message; you send it." },
];
export const byRule = (rule: string) => LIBRARY.find((t) => t.rule === rule) ?? null;
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
