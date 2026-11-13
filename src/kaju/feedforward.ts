/* ════════════════════════════════════════════════════════════════════
   Feedforward: what Kaju understands of a request while it is typed.

   A fast, local reading (no model call, so it can run on every pause in
   typing): it finds the parts of a sentence that are decisions (which
   period, what kind of output, about what, in what state, where) and
   offers the other choices for each. Choosing one rewrites that phrase
   in the sentence, so what is sent is exactly what is shown.

   The same shapes are used when a model refines the reading: a slot is
   a span of the text, a question, and choices. Nothing here invents a
   record; places come from the list the caller already holds.
   ════════════════════════════════════════════════════════════════════ */

export type Choice = { value: string; label: string };
export type Slot = { id: string; start: number; end: number; text: string; ask: string; choices: Choice[]; role: "period" | "output" | "subject" | "state" | "place" };
export type Reading = { slots: Slot[]; line: { before: string; key: string; slot: string | null; after: string } | null };

const c = (xs: string[]): Choice[] => xs.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));
const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
const KINDS: { role: Slot["role"]; ask: string; re: RegExp; choices: Choice[] }[] = [
  { role: "period", ask: "Which period?", re: new RegExp(`\\b(today|yesterday|this week|last week|this month|last month|this quarter|this year|last year|last \\d+ days|past \\d+ days|in (?:${MONTHS})|(?:${MONTHS}) \\d{4})\\b`, "i"), choices: c(["today", "this week", "last week", "this month", "last month", "last 30 days", "this year"]) },
  { role: "output", ask: "What should I prepare?", re: /\b(report|summary|brief|list|table|chart|map|spreadsheet|presentation|comparison|checklist|plan)\b/i, choices: c(["report", "summary", "table", "chart", "map", "spreadsheet", "presentation", "checklist"]) },
  { role: "subject", ask: "About what?", re: /\b(vaccinations?|sterilisations?|sterilizations?|cases|animals|follow-ups?|followups?|evidence|packages?|claims?|requests?|bites?|samples?|coverage|training)\b/i, choices: c(["cases", "animals", "vaccinations", "sterilisations", "follow-ups", "evidence", "packages", "requests", "coverage"]) },
  { role: "state", ask: "In what state?", re: /\b(open|overdue|missing|unassigned|in progress|closed|waiting|returned|unresolved|incomplete|due)\b/i, choices: c(["open", "overdue", "missing", "unassigned", "in progress", "waiting", "closed"]) },
];
const OUT: Record<string, string> = { report: "a report", summary: "a summary", brief: "a brief", list: "a list", table: "a table", chart: "a chart", map: "a map", spreadsheet: "a spreadsheet", presentation: "a presentation", comparison: "a comparison", checklist: "a checklist", plan: "a plan" };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Read the text. `places` are names the person may mean (cities and areas already loaded). */
export function interpret(text: string, places: string[] = []): Reading {
  const slots: Slot[] = [];
  for (const k of KINDS) {
    const m = k.re.exec(text);
    if (m) slots.push({ id: k.role, role: k.role, start: m.index, end: m.index + m[0].length, text: m[0], ask: k.ask, choices: k.choices.some((x) => x.value === m[0].toLowerCase()) ? k.choices : [{ value: m[0], label: m[0] }, ...k.choices] });
  }
  const known = places.filter((p) => p.length > 2).sort((a, b) => b.length - a.length);
  for (const p of known) {
    const m = new RegExp(`\\b${esc(p)}\\b`, "i").exec(text);
    if (m) { slots.push({ id: "place", role: "place", start: m.index, end: m.index + m[0].length, text: m[0], ask: "Which place?", choices: [{ value: p, label: p }, ...known.filter((x) => x !== p).slice(0, 7).map((x) => ({ value: x, label: x }))] }); break; }
  }
  slots.sort((a, b) => a.start - b.start);
  /* Overlaps: the earlier, longer span wins. */
  const clean: Slot[] = [];
  for (const s of slots) if (!clean.length || s.start >= clean[clean.length - 1].end) clean.push(s);
  const out = clean.find((s) => s.role === "output"), subj = clean.find((s) => s.role === "subject"), per = clean.find((s) => s.role === "period"), place = clean.find((s) => s.role === "place"), state = clean.find((s) => s.role === "state");
  let line: Reading["line"] = null;
  if (out || (subj && (per || place || state))) {
    const key = out ? OUT[out.text.toLowerCase()] ?? out.text : `${state ? `${state.text.toLowerCase()} ` : ""}${subj!.text.toLowerCase()}`;
    const tail = [out && subj ? ` of ${state ? `${state.text.toLowerCase()} ` : ""}${subj.text.toLowerCase()}` : "", place ? ` in ${place.text}` : "", per ? `, ${per.text.toLowerCase()}` : ""].join("");
    line = { before: "You want ", key, slot: out?.id ?? subj?.id ?? null, after: `${tail}.` };
  }
  return { slots: clean, line };
}

/** The sentence with one decision changed. */
export function choose(text: string, slot: Slot, value: string): string {
  const keepCase = /^[A-Z]/.test(slot.text) && slot.role !== "place" ? value[0].toUpperCase() + value.slice(1) : value;
  return text.slice(0, slot.start) + keepCase + text.slice(slot.end);
}
