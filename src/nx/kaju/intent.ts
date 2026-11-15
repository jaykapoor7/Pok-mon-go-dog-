import type { Intent } from "@/lib/kaju/registry";

/* The composer's reading of a sentence, done in the browser as the person types. It sends nothing and reads no
   records: it only matches the words against names this person can already see (their organisation's places, people,
   teams and channels), so the person can correct each one before submitting once. */

export type Kind = "Place" | "Person" | "Team" | "Channel" | "When" | "Date" | "Email";
export type Option = { label: string; value: string };
export type Span = { kind: Kind; start: number; end: number; text: string; options: Option[]; ambiguous: boolean };
export type Vocab = { places: string[]; teams: string[]; channels: string[]; people: { id: string; name: string }[] };
export type Reading = { spans: Span[]; action: Intent["action"] | "ask" | null; preview: string; missing: string[] };

const WHEN: Option[] = ["today", "tomorrow", "this week", "next week"].map((w) => ({ label: w, value: w }));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function find(text: string, word: string): [number, number] | null {
  if (word.trim().length < 2) return null;
  const m = new RegExp(`(^|[^\\p{L}\\p{N}#])(${esc(word)})(?=$|[^\\p{L}\\p{N}])`, "iu").exec(text);
  return m ? [m.index + m[1].length, m.index + m[1].length + m[2].length] : null;
}

/** Read the sentence. Longest match wins where words overlap; each kind is read once. */
export function readSentence(text: string, v: Vocab, choices: Partial<Record<Kind, string>> = {}): Reading {
  const spans: Span[] = [];
  const add = (s: Span) => { if (!spans.some((x) => x.kind === s.kind || (s.start < x.end && x.start < s.end))) spans.push(s); };
  const pick = (kind: Kind, words: string[], toOption: (w: string) => Option = (w) => ({ label: w, value: w })) => {
    let best: { at: [number, number]; w: string } | null = null;
    for (const w of words) { const at = find(text, w); if (at && (!best || w.length > best.w.length)) best = { at, w }; }
    if (best) { const b = best; add({ kind, start: b.at[0], end: b.at[1], text: text.slice(b.at[0], b.at[1]), options: [toOption(b.w), ...words.filter((w) => w !== b.w).map(toOption)], ambiguous: false }); }
  };
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(text);
  if (email) add({ kind: "Email", start: email.index, end: email.index + email[0].length, text: email[0], options: [{ label: email[0], value: email[0] }], ambiguous: false });
  pick("Channel", v.channels.map((c) => `#${c}`));
  pick("When", WHEN.map((w) => w.label));
  const date = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(\d{4}-\d{2}-\d{2})\b/i.exec(text);
  if (date) {
    const iso = date[3] ?? (() => { const y = new Date().getFullYear(), mo = MONTHS.indexOf(date[2].toLowerCase().slice(0, 3)) + 1; return `${y}-${String(mo).padStart(2, "0")}-${String(Number(date[1])).padStart(2, "0")}`; })();
    add({ kind: "Date", start: date.index, end: date.index + date[0].length, text: date[0], options: [{ label: iso, value: iso }], ambiguous: false });
  }
  pick("Place", v.places);
  // People: a first name may match several colleagues. Then the person chooses once, inline, before anything runs.
  let person: Span | null = null;
  for (const p of v.people) {
    const full = find(text, p.name);
    if (full) { person = { kind: "Person", start: full[0], end: full[1], text: text.slice(full[0], full[1]), options: [{ label: p.name, value: p.id }], ambiguous: false }; break; }
  }
  if (!person) {
    const firsts = new Map<string, { id: string; name: string }[]>();
    for (const p of v.people) { const f = p.name.split(/\s+/)[0]; if (f.length >= 3) firsts.set(f.toLowerCase(), [...(firsts.get(f.toLowerCase()) ?? []), p]); }
    for (const [f, ps] of firsts) { const at = find(text, f); if (at) { person = { kind: "Person", start: at[0], end: at[1], text: text.slice(at[0], at[1]), options: ps.map((p) => ({ label: p.name, value: p.id })), ambiguous: ps.length > 1 }; break; } }
  }
  if (person) add(person);
  pick("Team", v.teams);
  for (const s of spans) { const c = choices[s.kind]; if (c && s.options.some((o) => o.value === c)) { s.ambiguous = false; s.options = [...s.options.filter((o) => o.value === c), ...s.options.filter((o) => o.value !== c)]; } }
  spans.sort((a, b) => a.start - b.start);

  const low = text.toLowerCase();
  const action: Reading["action"] = !text.trim() ? null
    : /\bfollow[- ]?ups?\b/.test(low) && /\b(prepare|plan|schedule|create|assign|set up|draft)\b/.test(low) ? "prepare_followups"
    : /\b(overdue|past (their )?due|late cases)\b/.test(low) ? "find_overdue"
    : email && /\b(email|write|send|mail)\b/.test(low) ? "email"
    : /\b(post|tell|announce|let .* know)\b/.test(low) && spans.some((s) => s.kind === "Channel") && /:/.test(text) ? "message_channel"
    : /\b(create|add|make)\s+(a\s+)?task\b|\bremind\b/.test(low) ? "create_task"
    : "ask";
  const get = (k: Kind) => spans.find((s) => s.kind === k);
  const missing: string[] = [];
  if (spans.some((s) => s.ambiguous)) missing.push(`Which ${get("Person")?.text ?? "person"}?`);
  let preview = "";
  if (action === "prepare_followups") preview = `Find open cases${get("Place") ? ` in ${get("Place")!.options[0].value}` : ""}${get("When") ? ` due ${get("When")!.options[0].value}` : ""}, draft a follow-up task for each${get("Team") ? ` for ${get("Team")!.text}` : ""}, wait for your approval${get("Channel") ? `, then tell ${get("Channel")!.text}` : ""}.`;
  else if (action === "find_overdue") preview = `List open cases past their due date${get("Channel") ? ` and tell ${get("Channel")!.text}` : ""}.`;
  else if (action === "create_task") { preview = `Create one task${get("Person") && !get("Person")!.ambiguous ? ` for ${get("Person")!.options[0].label}` : ""}${get("Date") ? ` due ${get("Date")!.options[0].value}` : ""}.`; if (!taskTitle(text)) missing.push("What is the task?"); }
  else if (action === "message_channel") { preview = `Post your words in ${get("Channel")!.text}.`; if (!afterColon(text)) missing.push("What should the message say? Put it after a colon."); }
  else if (action === "email") { preview = `Prepare an email to ${get("Email")!.text}. It waits for your approval and is sent only through a connected account.`; if (!afterColon(text)) missing.push("What should the email say? Put it after a colon."); }
  else if (action === "ask") preview = "A question: Kaju answers from records you can see, with links to them.";
  return { spans, action, preview, missing };
}

const afterColon = (t: string) => { const i = t.indexOf(":"); return i >= 0 ? t.slice(i + 1).trim() : ""; };
function taskTitle(t: string) {
  const m = /\b(?:task|remind\s+\S+\s+to)\b\s*(?:to\s+|:)?\s*(.+)$/i.exec(t);
  return (m?.[1] ?? "").replace(/\b(for|by|due)\s+.*$/i, "").trim().slice(0, 240);
}

/** The one structured request sent when the person presses Run. Null while something is ambiguous or missing. */
export function toIntent(text: string, r: Reading): Intent | null {
  if (!r.action || r.action === "ask" || r.missing.length) return null;
  const v = (k: Kind) => r.spans.find((s) => s.kind === k)?.options[0]?.value ?? null;
  const label = (k: Kind) => r.spans.find((s) => s.kind === k)?.options[0]?.label ?? null;
  const channel = v("Channel")?.replace(/^#/, "") ?? null;
  return {
    action: r.action, place: v("Place"), when: (v("When") as Intent["when"]) ?? null, team: r.spans.find((s) => s.kind === "Team")?.text ?? null, channel,
    assignee_id: v("Person"), assignee_name: label("Person"), due_on: v("Date"), to: v("Email"),
    title: r.action === "create_task" ? taskTitle(text) : r.action === "email" ? "From StrayPaw" : null,
    body: r.action === "message_channel" || r.action === "email" ? afterColon(text).slice(0, 4000) : null,
  };
}
