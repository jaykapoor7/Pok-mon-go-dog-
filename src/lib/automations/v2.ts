/* The automation library for every workspace. Each entry is a fixed database rule (nx_automation_run) that counts
   something and tells the right people inside StrayPaw. `row` points at the workflow it serves in the handoff's
   automation matrix; `boundary` says plainly what it never does. Entries marked `needs` deliver outside StrayPaw only
   once that provider is connected, and say so. */

export type Rule = "overdue_tasks" | "followups_due" | "possible_duplicates" | "training_due" | "weekly_summary" | "pep_doses_due" | "pep_missed" | "pep_reminders"
  | "referrals_waiting" | "services_stale" | "samples_overdue" | "results_released" | "packages_waiting" | "alerts_open" | "data_requests_waiting";
export type Audience = "leads" | "everyone" | "clinical" | "lab";
export type Entry = { rule: Rule; name: string; does: string; boundary: string; ws: ("ngo" | "government" | "healthcare" | "research")[]; kinds?: string[]; every: "hour" | "day" | "week"; audience: Audience; param?: { key: "days" | "hours"; label: string; value: number }; row: number[]; needs?: string };

export const ENTRIES: Entry[] = [
  { rule: "overdue_tasks", name: "Overdue tasks", does: "Reminds each person of their own overdue tasks every morning, and tells leads about tasks overdue for longer.", boundary: "Reminds; never reassigns or closes a task.", ws: ["ngo", "government", "healthcare", "research"], every: "day", audience: "leads", param: { key: "days", label: "Tell leads after (days overdue)", value: 3 }, row: [4] },
  { rule: "followups_due", name: "Follow-ups due", does: "Tells the team each morning how many animal follow-ups are due by tomorrow or already late.", boundary: "Counts visits from the plan already recorded; does not change any plan.", ws: ["ngo"], every: "day", audience: "leads", row: [7] },
  { rule: "possible_duplicates", name: "Possible duplicate animals", does: "Tells leads when animal records are marked as possibly the same animal.", boundary: "Never merges. A person compares and decides.", ws: ["ngo"], every: "day", audience: "leads", row: [6] },
  { rule: "training_due", name: "Training due", does: "Tells leads when assigned training is due soon.", boundary: "Competency is signed off by a person, never by this rule.", ws: ["ngo"], every: "week", audience: "leads", param: { key: "days", label: "Due within (days)", value: 7 }, row: [21] },
  { rule: "weekly_summary", name: "Weekly summary", does: "Every Monday morning, one note with open cases, open tasks, late follow-ups and Kaju missions waiting.", boundary: "Counts only. Nothing is sent outside StrayPaw.", ws: ["ngo"], every: "week", audience: "everyone", row: [30, 3] },
  { rule: "pep_doses_due", name: "PEP doses due", does: "Tells the clinical team each morning how many prescribed doses are due today or tomorrow.", boundary: "Uses the clinician's own schedule. Never suggests a dose or a date.", ws: ["healthcare"], kinds: ["hospital", "clinic"], every: "day", audience: "clinical", row: [13] },
  { rule: "pep_missed", name: "Missed PEP doses", does: "Flags prescribed doses that are past their date to the clinical team.", boundary: "A clinician decides what happens next. Nothing is rescheduled automatically.", ws: ["healthcare"], kinds: ["hospital", "clinic"], every: "day", audience: "clinical", row: [14] },
  { rule: "pep_reminders", name: "Reminders to patients who agreed", does: "Queues a text reminder for each prescribed dose due today or tomorrow, only for patients who agreed to reminders.", boundary: "Content is a fixed approved template. Sent only through the clinic's connected SMS account; until then each is recorded as not connected.", ws: ["healthcare"], kinds: ["hospital", "clinic"], every: "day", audience: "clinical", row: [13, 14], needs: "An approved SMS reminder template (MSG91, DLT registered)" },
  { rule: "referrals_waiting", name: "Referrals waiting for an answer", does: "Tells your team when a referral or handoff sent to you has waited longer than you allow.", boundary: "Never accepts, declines or reroutes. Clinical staff decide.", ws: ["healthcare"], every: "hour", audience: "leads", param: { key: "hours", label: "Remind after (hours)", value: 24 }, row: [15] },
  { rule: "services_stale", name: "Service details out of date", does: "Asks you to confirm services (vaccine, RIG, wound washing) that were last confirmed long ago.", boundary: "Never marks a service available. Out-of-date details show as not confirmed.", ws: ["healthcare"], every: "day", audience: "leads", param: { key: "days", label: "Older than (days)", value: 7 }, row: [16] },
  { rule: "samples_overdue", name: "Samples waiting too long", does: "Tells the laboratory team when received samples have no result after the days you set.", boundary: "Never enters or validates a result.", ws: ["healthcare"], kinds: ["laboratory"], every: "day", audience: "lab", param: { key: "days", label: "Older than (days)", value: 3 }, row: [18] },
  { rule: "results_released", name: "Results released for your samples", does: "Tells your team when the laboratory has released results for samples you sent.", boundary: "Says a result exists; the result itself is read in StrayPaw by people allowed to see it.", ws: ["healthcare"], every: "hour", audience: "clinical", row: [19] },
  { rule: "packages_waiting", name: "Packages waiting for review", does: "Tells the reviewing office when a submitted package has waited longer than you allow.", boundary: "Never approves, queries or returns a package. A named reviewer decides.", ws: ["government"], kinds: ["municipal"], every: "day", audience: "leads", param: { key: "days", label: "Older than (days)", value: 5 }, row: [9] },
  { rule: "alerts_open", name: "Signals waiting for review", does: "Tells coordinators when programme signals have not been reviewed.", boundary: "A signal is not an outbreak. Only a person declares anything.", ws: ["government"], every: "day", audience: "leads", row: [20] },
  { rule: "data_requests_waiting", name: "Data requests waiting", does: "Reminds coordinators of research data requests that have waited for a decision.", boundary: "Never grants access. The data steward decides.", ws: ["government"], every: "day", audience: "leads", param: { key: "days", label: "Older than (days)", value: 3 }, row: [23] },
];

/** Workflows in the matrix that run elsewhere in StrayPaw, not as a library rule, and where. */
export const ELSEWHERE: { row: number; what: string; where: string }[] = [
  { row: 1, what: "New WhatsApp report: read, suggest a case, check for duplicates", where: "Inbox (WhatsApp items) and Kaju's intake, confirmed by a person. Needs WhatsApp Business connected." },
  { row: 2, what: "Email about evidence: match, checklist, draft reply", where: "Kaju with a connected Gmail or Outlook account; replies wait for approval." },
  { row: 5, what: "Voice or photo field update", where: "Field mode captures; Kaju proposes the record; the worker confirms." },
  { row: 8, what: "Submission deadline: missing evidence and correction tasks", where: "Kaju checks (missing evidence, awaiting sign-off, deadline) and a Kaju mission that prepares tasks for approval." },
  { row: 10, what: "Campaign weekly update", where: "Kaju mission: post an internal summary in a channel." },
  { row: 11, what: "Ward coverage gap", where: "Government Programmes coverage with dated estimates; Kaju insights." },
  { row: 12, what: "Citizen bite report", where: "Public bite help and the clinic's bite register; clinical triage by staff." },
  { row: 17, what: "Wound-wash location enquiry", where: "Public bite help, from the verified directory with freshness." },
  { row: 22, what: "Community campaign messages", where: "Draft with Kaju; public release is approved by a person." },
  { row: 24, what: "Research analysis", where: "Research Studies: snapshots record the exact query; Kaju drafts, the researcher validates." },
  { row: 25, what: "Partner WhatsApp or email updates", where: "Kaju with connected accounts proposes tasks; ambiguous items wait for confirmation." },
  { row: 26, what: "Follow up until someone replies", where: "Kaju mission with an outside message (approval) and reminders; needs a connected account." },
  { row: 27, what: "A mission step fails", where: "Kaju missions retry with backoff, never repeat an effect, and stop with a retry button." },
  { row: 28, what: "New organisation signs up", where: "Start: register, join with a code or invitation, set up the programme." },
  { row: 29, what: "@Kaju create tasks in a channel", where: "Channels: Kaju proposes, a person creates them." },
];
