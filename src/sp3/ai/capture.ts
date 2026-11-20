/* ════════════════════════════════════════════════════════════════════
   Kaju's capture desk: one line of plain words → the record a person
   would otherwise type into a form.

     · stripMention(q)   "@Kaju …", "Kaju, …": how people address Kaju,
                         not part of the request
     · findDate(t)       today, tomorrow, Friday, next Monday, 20 Nov,
                         in 3 days … as a calendar day in India
     · parseTask(q)      "add a task: …", "todo …", "remind me to …",
                         "assign Ravi to …", "task for Priya: …"
     · parseNote(q)      "note on SPC-36A054: ate well today"
     · parseFollowup(q)  "follow up Max next Monday"
     · parseCare(q)      "vaccinated Tiger (132) today, batch B-1"
     · looksLikeReport   "brown female limping near Ward 12 market"
     · parseHealthAsk    "PEP doses due today", "look up BX-2611-AB12CD"
     · parseExposure     "8 year old boy bitten on the left calf …"

   Pure functions over text: nothing here reads or writes a record, and
   nothing is invented. A value the words do not state is left empty and
   named, so the person is asked for it. Records are resolved later with
   the person's own access (captureRoute.ts, health.ts).
   ════════════════════════════════════════════════════════════════════ */

import type { AgeBand, ExposureKind, Species, WoundWashed } from "./types";
import { readLooks } from "@/oh/biteIntake";

/* ── dates, in India ─────────────────────────────────────────────────── */
const IST_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;
/** The calendar day in India for an instant. */
export const indiaDay = (now = new Date()) => new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);
const at = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(at(day) + n * DAY_MS).toISOString().slice(0, 10);
/** Monday 0 … Sunday 6. */
const mondayIndex = (day: string) => (new Date(at(day)).getUTCDay() + 6) % 7;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const weekdayOf = (w: string) => WEEKDAYS.findIndex((d) => d.startsWith(w.toLowerCase().slice(0, 3)));
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const count = (w: string) => (/^\d+$/.test(w) ? Number(w) : NUMBER_WORDS[w.toLowerCase()] ?? NaN);
const valid = (y: number, m: number, d: number) => { const t = Date.UTC(y, m, d); const x = new Date(t); return x.getUTCFullYear() === y && x.getUTCMonth() === m && x.getUTCDate() === d ? x.toISOString().slice(0, 10) : null; };

export type Due = { day: string; phrase: string };
/** "future": a day without a year that has passed this year is next year's (a due date). "past": one still to come is last year's (something done). */
export type Lean = "future" | "past";

const LEAD = "(?:(?:on|by|before|due|for|from|until|till|this|coming|upcoming|next|last|the)\\s+)*";
const WD = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thur?s?|fri|sat|sun)";
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** The first date the text names, as a day in India, and the exact words that named it (so they can be taken out of a title). */
export function findDate(text: string, now = new Date(), lean: Lean = "future"): Due | null {
  const today = indiaDay(now);
  const y = Number(today.slice(0, 4));
  const yearFor = (m: number, d: number) => {
    const same = valid(y, m, d);
    if (!same) return null;
    if (lean === "future" && same < today) return valid(y + 1, m, d);
    if (lean === "past" && same > today) return valid(y - 1, m, d);
    return same;
  };
  const tries: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\b(?:(?:on|by|before|due)\s+)?(\d{4})-(\d{2})-(\d{2})\b/i, (m) => valid(+m[1], +m[2] - 1, +m[3])],
    [/\b(?:(?:on|by|before|due)\s+)?(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/i, (m) => valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1])],
    [/\b(?:(?:on|by|before|due)\s+)?(\d{1,2})-(\d{1,2})-(\d{4})\b/i, (m) => valid(+m[3], +m[2] - 1, +m[1])],
    [/\b(?:(?:on|by|before|due)\s+)?(\d{1,2})\/(\d{1,2})\b(?![/.]\d)/i, (m) => yearFor(+m[2] - 1, +m[1])],
    [new RegExp(`\\b(?:(?:on|by|before|due)\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\.?(?:,?\\s+(\\d{4}))?\\b`, "i"), (m) => { const mi = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)); return m[3] ? valid(+m[3], mi, +m[1]) : yearFor(mi, +m[1]); }],
    [new RegExp(`\\b(?:(?:on|by|before|due)\\s+)?${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, "i"), (m) => { const mi = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)); return m[3] ? valid(+m[3], mi, +m[2]) : yearFor(mi, +m[2]); }],
    [/\b(?:(?:by|for|on)\s+)?(?:the\s+)?day after tomorrow\b/i, () => addDays(today, 2)],
    [/\b(?:(?:by|for|on|first thing)\s+)?(?:tomorrow|tomorow|tommorow|tommorrow|tmrw|tmr)\b(?:\s+(?:morning|evening|afternoon|night))?/i, () => addDays(today, 1)],
    [/\b(?:(?:by|for|later)\s+)?(?:today|tonight|aaj|this (?:morning|afternoon|evening))\b/i, () => today],
    [/\b(?:yesterday|last night)\b/i, () => addDays(today, -1)],
    [/\b(?:in|after|within)\s+(\d{1,2}|an?|one|two|three|four|five|six|seven|ten)\s+(day|week)s?\b/i, (m) => { const n = count(m[1]); return Number.isFinite(n) ? addDays(today, n * (/week/i.test(m[2]) ? 7 : 1)) : null; }],
    [/\b(\d{1,2}|an?|one|two|three|four|five|six|seven|ten)\s+(day|week)s?\s+ago\b/i, (m) => { const n = count(m[1]); return Number.isFinite(n) ? addDays(today, -n * (/week/i.test(m[2]) ? 7 : 1)) : null; }],
    [/\b(?:by\s+|before\s+)?(?:the\s+)?end of (?:the |this )?month\b|\bmonth[- ]end\b/i, () => { const d = new Date(at(today)); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); }],
    [/\b(?:by\s+|on\s+)?(?:this\s+)?weekend\b/i, () => { const i = mondayIndex(today); return i >= 5 ? today : addDays(today, 5 - i); }],
    [/\b(?:by\s+|in\s+)?next week\b/i, () => addDays(today, 7 - mondayIndex(today))],
    [new RegExp(`\\b${LEAD}${WD}\\b(?:\\s+(?:morning|evening|afternoon))?`, "gi"), (m) => {
      const words = m[0].toLowerCase();
      const target = weekdayOf(m[1]);
      if (target < 0) return null;
      /* A short form ("sat", "sun", "wed", "mon") is a day only with a word before it that makes it one. */
      if (m[1].length <= 4 && !/^(?:tues|thurs?)$/i.test(m[1]) && !/\b(?:on|by|before|due|this|coming|next|last|until|till)\s/i.test(words)) return null;
      const i = mondayIndex(today);
      if (/\bnext\s/.test(words)) return addDays(today, 7 - i + target);
      if (/\blast\s/.test(words)) { const back = (i - target + 7) % 7 || 7; return addDays(today, -back); }
      if (/\b(?:this|coming|upcoming)\s/.test(words)) return addDays(today, target >= i ? target - i : 7 - i + target);
      if (lean === "past") return addDays(today, -((i - target + 7) % 7));
      return addDays(today, (target - i + 7) % 7 || 7);
    }],
  ];
  let best: { at: number; due: Due } | null = null;
  for (const [re, f] of tries) {
    /* Every match is tried: "sat near the gate on Friday" skips "sat" and finds Friday. */
    for (const m of re.global ? text.matchAll(re) : [text.match(re)].filter((x): x is RegExpMatchArray => !!x)) {
      if (m.index === undefined) continue;
      const day = f(m);
      if (!day) continue;
      /* The earliest mention wins; at the same place the more specific form (listed first) wins. */
      if (!best || m.index < best.at) best = { at: m.index, due: { day, phrase: m[0].trim() } };
      break;
    }
  }
  return best?.due ?? null;
}

/** A time of day in the words ("at 4pm", "around 16:30"), as HH:MM, or null. */
export function findTime(text: string): string | null {
  const m = text.match(/\b(?:at|around|about|by)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i) ?? text.match(/\b(?:at|around|about)\s+(\d{1,2})[:.](\d{2})\b/i);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  const ap = (m[3] ?? "").toLowerCase().replace(/\./g, "");
  if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0;
  return h < 24 && min < 60 ? `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
}

/** A day as people read it: "Fri 20 Nov". */
export const sayDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/* ── how a request is addressed ──────────────────────────────────────── */
/** "@Kaju …", "Kaju, …", "hey Kaju, …" at the start are taken off; other @mentions keep the name without the @. A bare "@Kaju" is a hello. */
export function stripMention(q: string): string {
  let t = q.replace(/ /g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const next = t
      .replace(/^@\s*kaju\b[\s,:;!.\-–—]*/i, "")
      .replace(/^(?:(?:hey|hi|hello|ok|okay|dear|yo)\s+)?kaju\s*[,:;!\-–—]\s*(?=\S{2})/i, "")
      .replace(/^(?:hey|ok|okay)\s+kaju\s+(?=\S{3})/i, "");
    if (next === t) break;
    t = next.trim();
  }
  t = t.replace(/(^|[\s(])@(?=[A-Za-z])/g, "$1").trim();
  return t || "hello";
}

const POLITE = /^(?:(?:please|pls|plz|kindly|ok|okay|so|and|also|hey|can you|could you|would you|will you|can u|could u|u can|i want you to|i'd like you to|i need you to|help me|quickly|just)\s+)+/i;
export const unpolite = (q: string) => q.replace(POLITE, "").replace(/\s+(?:please|pls|plz)[.!]?$/i, "").trim();

/* ── records named in the words ──────────────────────────────────────── */
/** A case or animal code as shown on records ("SPC-36A054", "DDS-00421", "SPA-DOG-ACC707"): letters, a dash, and a digit somewhere after it. */
const CODE = /\b([A-Za-z]{2,5}(?:-[A-Za-z]{2,5})?-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{3,})\b/;
export const codeIn = (t: string) => { const c = t.match(CODE)?.[1]; return c && !/^BX-/i.test(c) && !/^(?:B|batch)-/i.test(c) ? c.toUpperCase() : null; };

export type AnimalRef = { name: string | null; number: string | null; phrase: string };
const NOT_A_NAME = new Set(["i", "we", "the", "a", "an", "he", "she", "it", "they", "him", "her", "his", "its", "them", "this", "that", "there", "here", "kaju", "straypaw", "dr", "mr", "mrs", "ms", "ward", "market", "road", "street", "today", "tomorrow", "yesterday", "tonight", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "ok", "okay", "please", "case", "dog", "dogs", "puppy", "pup", "animal", "cat", "all", "every", "each", "some", "one", "two", "batch", "dose", "note", "task", "photo", "photos", "vet", "team", "office", "package", "report", "claim", "sp", "abc", "arv", "pep", "opd", "next", "last", "this", "on", "at", "in", "for", "with", "and", "after", "before", "from", "to", "of", "by", "brown", "black", "white", "female", "male", "stray", "street", "new", "old", "big", "small", "little", "injured", "sick", "my", "our", "your", "their", "not", "no", "yes", "done", "completed", "pending", "due", "was", "is", "are", "check", "recheck", "visit", "call", "treated", "given", "seen", "fed", "ok"]);
const nameWord = (w: string) => /^[A-Za-z][A-Za-z'’-]{1,24}$/.test(w) && !NOT_A_NAME.has(w.toLowerCase().replace(/['’]s$/, ""));

/** The animal a phrase starts with: "Tiger (132)", "Dog 125", "dog #125", "DDS-00421", "Tiger's", "tiger". */
export function animalAtStart(s: string): AnimalRef | null {
  const t = s.replace(/^\s*(?:the\s+)?(?:(?:dog|puppy|pup|bitch|cat|animal)\s+(?:called|named)\s+)?/i, "").trim();
  /* "Tiger (132)": the part in brackets is a tag number, so it has a digit ("done (recheck)" is not an animal). */
  let m = t.match(/^([A-Za-z][A-Za-z'’-]{1,24})\s*\(\s*#?\s*((?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{0,24})\s*\)/);
  if (m && nameWord(m[1])) return { name: m[1].replace(/['’]s$/, ""), number: m[2], phrase: m[0] };
  m = t.match(/^(?:dog|puppy|pup|cat|animal)\s*(?:no\.?|number|#)?\s*#?\s*(\d{1,6})\b/i);
  if (m) return { name: null, number: m[1], phrase: m[0] };
  m = t.match(/^#\s*(\d{1,6})\b/);
  if (m) return { name: null, number: m[1], phrase: m[0] };
  const code = t.match(/^([A-Za-z]{2,5}(?:-[A-Za-z]{2,5})?-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{3,})\b/);
  if (code) return { name: null, number: code[1].toUpperCase(), phrase: code[0] };
  m = t.match(/^([A-Za-z][A-Za-z'’-]{1,24})(?:\s*(?:#|no\.?)\s*(\d{1,6}))?\b/);
  if (m && nameWord(m[1])) return { name: m[1].replace(/['’]s$/, ""), number: m[2] ?? null, phrase: m[0] };
  return null;
}

/** Animals a sentence names somewhere in it (for linking a task): "Dog 125", "Tiger (132)", or a capitalised name that is not a known word. */
export function animalsIn(text: string, skip: string[] = []): AnimalRef[] {
  const out: AnimalRef[] = [];
  const add = (r: AnimalRef | null) => { if (r && !out.some((x) => x.name === r.name && x.number === r.number)) out.push(r); };
  for (const m of text.matchAll(/\b(?:dog|puppy|pup|cat|animal)\s*(?:no\.?|number|#)?\s*#?\s*(\d{1,6})\b/gi)) add({ name: null, number: m[1], phrase: m[0] });
  for (const m of text.matchAll(/\b([A-Z][A-Za-z'’-]{1,24})\s*\(\s*#?\s*((?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{0,24})\s*\)/g)) if (nameWord(m[1])) add({ name: m[1].replace(/['’]s$/, ""), number: m[2], phrase: m[0] });
  const words = text.split(/\s+/);
  words.forEach((w, i) => {
    const clean = w.replace(/^[("'“]+|[)"'”.,;:!?]+$/g, "");
    if (i === 0 || !/^[A-Z][a-z'’-]{1,24}$/.test(clean) || !nameWord(clean)) return;
    const name = clean.replace(/['’]s$/, "");
    if (skip.some((s) => s.toLowerCase().split(/\s+/).includes(name.toLowerCase()))) return;
    if (/^\(/.test(words[i + 1] ?? "")) return; // "Tiger (132)" is taken above
    add({ name, number: null, phrase: clean });
  });
  return out.slice(0, 3);
}

/* ── tasks ───────────────────────────────────────────────────────────── */
export type TaskAsk = {
  title: string; due: Due | null; dueInPast: boolean;
  /** A person the words assign it to. `explicit`: said as an assignment ("assign Ravi", "task for Priya"), so an unknown name is said, not silently dropped. */
  who: { name: string; explicit: boolean; phrase: string | null } | null;
  me: boolean; caseCode: string | null; animals: AnimalRef[];
};
const BARE_TASK = /^(?:(?:add|create|make|new|set up|open)\s+)?(?:a\s+|an\s+|new\s+)*(?:task|to-?do|todo|reminder)\s*[.!]?$/i;
const RECURRING = /\b(?:every|each|daily|weekly|monthly|everyday|fortnightly|whenever|automat\w*)\b|\bwhen (?:at least|more than|there (?:is|are))\b/i;
const NAME = "([A-Za-z][A-Za-z.'’-]{1,30}(?:\\s+[A-Za-z][A-Za-z.'’-]{1,30}){0,2})";
const isName = (s: string) => s.split(/\s+/).every((w) => /^[A-Za-z][A-Za-z.'’-]*$/.test(w) && !/^(?:to|the|a|an|task|tasks|todo|me|us|it|this|that|kaju|you|someone|somebody|everyone|team|all|and|for|on|by|with|please|today|tomorrow|tonight|morning|evening|afternoon|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|next|this|coming|later|now|tmrw|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i.test(w));

/** A request to add a task, or null when the words are not one. Recurring requests ("every Monday …") are automations, not tasks. */
export function parseTask(raw: string, now = new Date()): TaskAsk | null {
  const q = unpolite(stripMention(raw)).replace(/\s+/g, " ").trim();
  if (!q || q.length > 400 || RECURRING.test(q)) return null;
  if (BARE_TASK.test(q)) return { title: "", due: null, dueInPast: false, who: null, me: false, caseCode: null, animals: [] };
  let body: string | null = null, who: string | null = null, explicit = false, me = false, whoPhrase: string | null = null;
  const pick = (m: RegExpMatchArray | null, w: number | null, b: number, isExplicit = true) => {
    if (!m || body !== null) return;
    if (w !== null && m[w] && !isName(m[w])) return;
    body = m[b]; who = w !== null ? m[w] ?? null : null; explicit = !!who && isExplicit;
  };
  pick(q.match(new RegExp(`^(?:add|create|make|new|put|set up|set|log|open|raise)\\s+(?:a\\s+|an\\s+|new\\s+|one\\s+|another\\s+)*(?:task|to-?do|todo|reminder|action item)s?\\s+for\\s+${NAME}\\s+to\\s+(.+)$`, "i")), 1, 2);
  pick(q.match(new RegExp(`^(?:add|create|make|new|put|set up|set|log|open|raise)\\s+(?:a\\s+|an\\s+|new\\s+|one\\s+|another\\s+)*(?:task|to-?do|todo|reminder|action item|action)s?\\b(?:\\s+for\\s+${NAME}(?=\\s*[:\\-–—,]))?\\s*(?:[:\\-–—,]\\s*|\\s+(?:to|that|about)\\s+|\\s+)(.+)$`, "i")), 1, 2);
  pick(q.match(new RegExp(`^(?:new\\s+)?(?:task|to-?do|todo|reminder|action item)s?(?:\\s+for\\s+${NAME})?\\s*[:\\-–—]\\s*(.+)$`, "i")), 1, 2);
  pick(q.match(/^(?:task|to-?do|todo)\s+(?!for\b|list\b|lists\b)(.+)$/i), null, 1);
  const remind = q.match(new RegExp(`^remind\\s+(me|us|myself|${NAME})\\s+(?:to|about|that|of)\\s+(.+)$`, "i"));
  if (remind && body === null) { if (/^(?:me|myself)$/i.test(remind[1])) { me = true; body = remind[3]; } else if (/^us$/i.test(remind[1])) body = remind[3]; else if (isName(remind[1])) { who = remind[1]; explicit = true; body = remind[3]; } }
  pick(q.match(new RegExp(`^(?:assign|give)\\s+${NAME}\\s+(?:to|the task(?:\\s+(?:of|to))?|a task(?:\\s+to)?|the job of)\\s+(.+)$`, "i")), 1, 2);
  pick(q.match(new RegExp(`^(?:assign|give)(?:\\s+(?:it|this|a task|the task))?\\s+to\\s+${NAME}\\s*[:\\-–—,]\\s*(.+)$`, "i")), 1, 2);
  const ask = q.match(new RegExp(`^ask\\s+${NAME}\\s+to\\s+(.+)$`, "i"));
  if (ask && body === null && isName(ask[1]) && !/^(?:kaju|you)$/i.test(ask[1])) { who = ask[1]; explicit = true; body = ask[2]; }
  const self = q.match(/^(?:don'?t (?:let me )?forget to|note to self\s*[:\-–—]?|i (?:have|need) to remember to|remember to)\s+(.+)$/i);
  if (self && body === null) { me = true; body = self[1]; }
  pick(q.match(/^(?:add|put)\s+(.+?)\s+(?:to|on|in)\s+(?:my|our|the)\s+(?:task|to-?do|todo|tasks)?\s*list$/i), null, 1);
  if (body === null) return null;
  const rest: string = (body as string).trim();
  if (/^(?:how|what|which|where|when|why|who)\b/i.test(rest) && /\?$/.test(rest)) return null;
  const due = findDate(rest, now, "future");
  const tidyTitle = (s: string) => s.replace(/\s+(?:on|by|before|due|for|from|at)\s*([,.;!]|$)/gi, "$1").replace(/\s*[,;]\s*([,;.!]|$)/g, "$1").replace(/\s+/g, " ").replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, "").replace(/[.!]+$/, "").trim();
  let title = tidyTitle(due ? rest.replace(due.phrase, " ") : rest);
  /* "…, assign to Ravi" / "… (for Ravi)" at the end, once the date is out. "for <name>" alone is only taken when it turns out to be a member (explicit = false). */
  if (!who && !me) {
    const end = title.match(new RegExp(`(?:[,;]\\s*|\\s+)(?:\\(?\\s*)?(assign(?:ed)?\\s+to|for)\\s+${NAME}\\s*\\)?$`, "i"));
    if (end && isName(end[2])) { who = end[2]; explicit = /assign/i.test(end[1]); if (explicit) title = tidyTitle(title.slice(0, end.index)); else whoPhrase = end[0].trim(); }
  }
  /* "call the vet for Ravi": "for Ravi" stays in the title unless Ravi turns out to be a member (whoPhrase says what to take out). */
  title = title.charAt(0).toUpperCase() + title.slice(1);
  const whoName: string | null = who;
  return {
    title: title.slice(0, 240), due, dueInPast: !!due && due.day < indiaDay(now),
    who: whoName ? { name: (whoName as string).trim(), explicit, phrase: whoPhrase } : null, me,
    caseCode: codeIn(title), animals: animalsIn(title, whoName ? [whoName] : []).filter((a) => !(a.number && codeIn(title) === a.number)),
  };
}

/* ── notes and follow-ups on a case ──────────────────────────────────── */
export type NoteAsk = { ref: string | null; text: string };
/** "note on SPC-36A054: ate well today", "add a note to Tiger's case - eating well", "note: stitches look clean" (on the page's record). */
export function parseNote(raw: string): NoteAsk | null {
  const q = unpolite(stripMention(raw)).trim();
  let m = q.match(/^(?:(?:add|write|log|put|make)\s+)?(?:a\s+|this\s+as\s+a\s+)?note\s+(?:on|to|for|in|about)\s+(.{2,60}?)\s*(?:[:\-–—]\s+|:)([\s\S]{2,})$/i);
  if (m) return { ref: m[1].replace(/['’]s\s+case$|\s+case$/i, "").replace(/^(?:case|the case)\s+/i, "").trim(), text: m[2].trim() };
  m = q.match(/^(?:(?:add|write|log|put|make)\s+)?(?:a\s+)?note\s*[:\-–—]\s*([\s\S]{2,})$/i);
  if (m) return { ref: null, text: m[1].trim() };
  return null;
}

export type FollowupAsk = { ref: string | null; due: Due | null; note: string };
/** "follow up Max next Monday", "schedule a follow-up for SPC-36A054 on 20 Nov: check the stitches", "recheck Tiger Friday".
    The words after "follow up" must name a record (a code or an animal) or nothing at all; anything else ("follow-ups could
    not be read", "follow-up (dressing change) was due") is a sentence about follow-ups, not one to schedule. */
export function parseFollowup(raw: string, now = new Date()): FollowupAsk | null {
  const q = unpolite(stripMention(raw)).replace(/\s+/g, " ").trim();
  if (RECURRING.test(q) || /^(?:what|which|how|any|show|list|are|is)\b/i.test(q) || /\boverdue|missed|late\b/i.test(q)) return null;
  const m = q.match(/^((?:schedule|book|set|add|plan|put)\s+(?:in\s+)?(?:a\s+|the\s+)?)?(?:follow[- ]?up|re-?check|re-?visit|check[- ]?up visit)(s?)\b\s*(?:visit\s+)?(?:on|for|with|of|to)?\s*([\s\S]*)$/i);
  if (!m) return null;
  const asked = !!m[1];
  let rest = m[3].trim(), note = "";
  const split = rest.match(/^(.*?)(?:\s*[:–—]\s+|\s+-\s+|:\s*)(.+)$/);
  if (split) { rest = split[1]; note = split[2].trim(); }
  const due = findDate(rest, now, "future") ?? (note ? findDate(note, now, "future") : null);
  let ref = due ? rest.replace(due.phrase, " ") : rest;
  ref = ref.replace(/\b(?:on|by|for|at|in)\s*$/i, "").replace(/\s+/g, " ").replace(/^[\s,;]+|[\s,;.]+$/g, "").replace(/['’]s\s+case$|\s+case$/i, "").replace(/^(?:case|the case)\s+/i, "").trim();
  if (/^(?:this|current|selected)(?:\s+(?:case|animal|dog|one))?$/i.test(ref)) ref = "";
  /* "follow-ups due this week": a question about follow-ups. A plural with no scheduling verb is never one to schedule. */
  if (m[2] && !asked) return null;
  if (ref) {
    const animal = animalAtStart(ref);
    const short = ref.split(/\s+/).length <= 3;
    const named = short && (!!codeIn(ref) || /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(ref) || (!!animal && animal.phrase.trim().length >= ref.length - 1));
    if (!named) return null;
  } else if (!due && !asked) return null;
  return { ref: ref || null, due, note };
}

/* ── care done on an animal ──────────────────────────────────────────── */
export type CareKind = "sterilisation" | "vaccination" | "treatment" | "checkup" | "deworming";
export type CareAsk = { careKind: CareKind; animal: AnimalRef | null; date: Due | null; future: boolean; text: string };
const CARE_VERB = "(vaccinated|vaccinate[sd]?|gave (?:the |an? )?(?:arv|anti[- ]?rabies(?: vaccine)?|rabies (?:shot|vaccine|jab)|vaccine|vaccination|booster)(?: (?:shot|dose|vaccine|jab))?(?: to)?|arv (?:given|done)(?: (?:to|for))?|sterili[sz]ed|spayed|neutered|castrated|de-?wormed|treated|dressed (?:the )?wounds? (?:of|on|for)|checked up on|examined|did (?:a )?(?:check-?up|health check) (?:on|for))";
const kindOf = (verb: string): CareKind => /vacc|arv|rabies|booster/i.test(verb) ? "vaccination" : /steril|spay|neuter|castrat/i.test(verb) ? "sterilisation" : /worm/i.test(verb) ? "deworming" : /treat|dress/i.test(verb) ? "treatment" : "checkup";

/** "vaccinated Tiger (132) today, batch B-1", "Tiger (132) vaccinated today", "dewormed today" (with the animal from the page). */
export function parseCare(raw: string, now = new Date()): CareAsk | null {
  const q = unpolite(stripMention(raw)).replace(/\s+/g, " ").trim().replace(/^(?:i|we)\s+(?:have\s+|just\s+|had\s+)?/i, "").replace(/^just\s+/i, "");
  if (q.length > 400 || /\?$/.test(q) || /^(?:how|what|which|when|who|is|are|did|was|were|has|have)\b/i.test(q)) return null;
  let verb: string | null = null, after = "", subject: AnimalRef | null = null;
  const first = q.match(new RegExp(`^${CARE_VERB}\\b\\s*(.*)$`, "i"));
  if (first) { verb = first[1]; after = first[2]; }
  else {
    const subjectFirst = q.match(new RegExp(`^(.{2,40}?)\\s+(?:was\\s+|got\\s+|has been\\s+|is\\s+)?(vaccinated|sterili[sz]ed|spayed|neutered|castrated|de-?wormed|treated|checked up|examined)\\b\\s*(.*)$`, "i"));
    if (!subjectFirst) return null;
    subject = animalAtStart(subjectFirst[1]);
    if (!subject || subject.phrase.trim().length < subjectFirst[1].trim().length - 1) return null; // "brown female vaccinated near the market" is a field report, not a named animal
    verb = subjectFirst[2]; after = subjectFirst[3];
  }
  const date = findDate(after, now, "past") ?? findDate(after, now, "future");
  const rest = (date ? after.replace(date.phrase, " ") : after).replace(/^[\s,;:]+/, "").trim();
  if (!subject) {
    if (/^(?:a|an|the|this|that|some|two|three|\d+)\s+(?:brown|black|white|tan|female|male|street|stray|community|injured|new|dogs?|pupp|pups?|cats?|animals?)\b/i.test(rest)) return null; // an unnamed animal: a field report
    subject = rest && !/^(?:with|batch|at|in|near|by|on|from|using|dose|today|yesterday)\b/i.test(rest) ? animalAtStart(rest) : null;
  }
  const future = !!date && date.day > indiaDay(now);
  return { careKind: kindOf(verb), animal: subject, date, future, text: q };
}

/* ── a field report in one line ──────────────────────────────────────── */
/* What happened to an animal: words that make a sentence a report on their own ("limping", "hit by", "abandoned"). */
const HAPPENED = /\b(?:injured|limp\w*|bleed\w*|hurt|hit by|accident|lying|crying|vomit\w*|fractur\w*|stuck|trapped|abandon\w*|found|spotted|rescued?|unconscious|attacked|paraly\w*|needs? (?:a )?(?:vet|rescue|help|treatment|doctor)|not eating|can'?t walk|cannot walk|dumped|in labou?r|bitten by (?:a |another |other )?dogs?)\b/i;
/* A condition that is also a case title ("Dog with a wound", "Mange"): a report only with a place, a need or more words. */
const CONDITION = /\b(?:injur\w*|wound\w*|sick|weak|maggot\w*|mange|skin (?:disease|infection)|alone|lost|hungry|pregnant)\b/i;
const ANIMAL_WORDS = /\b(?:dogs?|pupp(?:y|ies)|pups?|bitch|cats?|kittens?|strays?|animal|female|male|brown|black|white|tan)\b/i;
const QUESTION = /^(?:how|what|whats|what's|which|where|when|why|who|whose|is|are|was|were|can|could|do|does|did|any|list|show|count|tell|give|find|search)\b|\?\s*$/i;
const REPORT_LEAD = /^(?:record|report|log|register|new case|open a case|open a new case|create a case|raise a case|there(?:'s| is| are)|we (?:have|found|got|saw)|i (?:found|saw|spotted)|saw|found|spotted)\b(?:\s+(?:a|an|the)?\s*(?:case|report)\s*(?:of|for|about|:)?)?\s*:?\s*/i;
const PLACE_WORD = /\b(?:near|at|by|outside|behind|opposite|in front of|next to|beside)\s+\S/i;
/** A one-line field report about an animal ("brown female limping near Ward 12 market, needs a vet"), not a question, a command or a person bitten. */
export function looksLikeReport(raw: string): boolean {
  const t = unpolite(stripMention(raw)).trim();
  if (t.length < 12 || t.length > 600 || QUESTION.test(t) || looksLikeExposure(t)) return false;
  const lead = REPORT_LEAD.test(t), animal = ANIMAL_WORDS.test(t);
  /* "Record a dog near the temple" is a report; "Register an animal" asks how, and says nothing about one. */
  if (lead) return HAPPENED.test(t) || CONDITION.test(t) || (animal && (PLACE_WORD.test(t) || t.split(/\s+/).length >= 5));
  if (!animal) return false;
  if (HAPPENED.test(t)) return true;
  return CONDITION.test(t) && (PLACE_WORD.test(t) || /\b(?:needs?|please|urgent|help|send)\b/i.test(t) || t.split(/\s+/).length >= 6);
}
/** The report itself, without "record" / "report" / "new case:" in front. */
export const reportText = (raw: string) => { const t = unpolite(stripMention(raw)).trim(); const r = t.replace(/^(?:record|report|log|register|new case|open a case|open a new case|create a case|raise a case)\b(?:\s+(?:a|an|the)?\s*(?:case|report)\s*(?:of|for|about)?)?\s*:?\s*/i, ""); return (r.length >= 8 ? r : t).replace(/^./, (c) => c.toUpperCase()); };

/* ── a person's next work, in imperative words ───────────────────────── */
const IMPERATIVE = /^(?:call|ring|phone|visit|check|send|take|pick up|collect|bring|buy|order|feed|meet|email|mail|book|prepare|submit|upload|update|follow up|vaccinate|deworm|sterili[sz]e|treat|photograph|clean|move|drop|get|fix|renew|pay|print|share|ask|tell|inform|remind|arrange|organise|organize|plan|review|sign|finish|complete|write)\b/i;
/** A sentence that reads like a to-do with a date ("call the vet tomorrow"), offered back as a task, never saved on a guess. */
export const looksLikeTodo = (raw: string, now = new Date()) => { const t = unpolite(stripMention(raw)).trim(); return IMPERATIVE.test(t) && !!findDate(t, now) && t.length <= 200 && !QUESTION.test(t); };

/* ── clinical questions for the facility (health.ts reads the answers) ── */
export const EXPOSURE_CODE = /\b(BX-\d{4}-[A-Z0-9]{6})\b/i;
export type HealthAsk =
  | { kind: "due"; when: "today" | "tomorrow" | "both" }
  | { kind: "missed" }
  | { kind: "referrals" }
  | { kind: "calls" }
  | { kind: "needs_category" }
  | { kind: "lookup"; code: string };
const DOSE = /\b(?:doses?|pep|injections?|shots?|arv|vaccine doses?|pep courses?|dose schedules?)\b/i;
/* A command to do something ("schedule a visit tomorrow", "add a task …"): not a question about doses. */
const COMMAND = /^(?:schedule|book|plan|add|create|make|assign|remind|record|register|note|log|put|set|send|email|post|prepare|draft|export|open|go|take|call|ring|phone|visit|follow)\b/i;
/** A question about the facility's own bite and PEP work, or null. A note about a person bitten is not a question. */
export function parseHealthAsk(raw: string): HealthAsk | null {
  const q = unpolite(stripMention(raw)).replace(/\s+/g, " ").trim();
  const t = q.toLowerCase();
  if (q.length > 240 || looksLikeExposure(q)) return null;
  const code = q.match(EXPOSURE_CODE)?.[1];
  if (code) return { kind: "lookup", code: code.toUpperCase() };
  if (/^how (?:do|can|should|to)\b/.test(t) || COMMAND.test(t)) return null;
  if (/\b(?:missed|overdue|late|skipped|did ?n[o']t (?:come|turn up|return)|no[- ]shows?|defaulters?)\b/.test(t) && (DOSE.test(t) || /\bpatients?\b/.test(t))) return { kind: "missed" };
  if (/\b(?:patients?|people|persons?|who)\b.*\b(?:to\s+)?(?:call|ring|phone|remind)\b|\bcalls? to make\b|\bwho (?:should|do|must) (?:i|we) call\b|\breminder calls?\b|\bwhom? to call\b/.test(t)) return { kind: "calls" };
  if (/\breferr(?:al|als|ed)\b/.test(t) && !/\brefer (?:a|this|the)\b/.test(t)) return { kind: "referrals" };
  if (/\b(?:need|needs|needing|waiting for|without|missing|no)\b.*\b(?:category|categor\w+|assessment|assessed|assess|clinician)\b/.test(t)) return { kind: "needs_category" };
  if ((DOSE.test(t) || /\bwho(?:'s| is)? due\b|\bpatients? due\b/.test(t)) && /\b(?:due|today|tomorrow|tmrw|schedule|coming|expected|aaj|kal)\b/.test(t)) {
    const today = /\btoday|aaj\b/.test(t), tomorrow = /\btomorrow|tmrw|kal\b/.test(t);
    return { kind: "due", when: today && !tomorrow ? "today" : tomorrow && !today ? "tomorrow" : "both" };
  }
  return null;
}

/** A request for a clinical decision Kaju never makes (diagnosis, prescribing, dose changes, lab validation, eligibility). */
export const CLINICAL_DECISION = /\b(?:should (?:i|we|he|she|they) (?:give|start|stop|prescribe|take|get|use|repeat|skip)|(?:what|which) (?:dose|dosage|regimen|vaccine schedule|treatment) (?:should|do|to)|prescrib\w*|change (?:the |his |her )?(?:dose|dosage|regimen)|diagnos\w*|validate (?:the |this )?(?:result|test)|is (?:the |this )?(?:result|test) (?:valid|correct|right)|(?:is|are) (?:he|she|they|the patient|this patient) eligible|eligib\w+ for|does (?:he|she|the patient|this patient|this person) need (?:rig|pep|immunoglobulin|vaccine|a booster)|(?:is|was) (?:it|this) category\b|what category (?:is|should)|needs? rig\b)/i;

/* ── a bite, scratch or lick, from a clinician's note ────────────────── */
export type ExposureNote = {
  date: Due | null; time: string | null; kind: ExposureKind; kindNote: string | null; site: string | null;
  category: "I" | "II" | "III" | null; patientRef: string | null; ageText: string | null; ageBand: AgeBand | null; sex: "female" | "male" | null;
  washed: WoundWashed | null; washedUnclear: boolean; species: Species; speciesStated: boolean; ownership: "community" | "owned" | "unknown";
  place: string | null; phone: string | null; consent: boolean;
  /** What the animal looked like, in the note's words ("brown stray"), for the animal team. */
  animal: string | null;
};
const PERSON = /\b(?:boy|girl|man|woman|lady|gentleman|child|kid|baby|infant|toddler|son|daughter|patient|person|student|farmer|worker|(?:\d{1,3}\s*(?:-|\s)?(?:years?|yrs?|yr|y)\s*(?:-|\s)?(?:old|o)?)|\d{1,3}\s*y\/o|\d{1,3}\s*(?:yo|m|f)\b)/i;
const EXPOSURE_VERB = /\b(?:bitten|bite|bit|scratched|scratch|licked|lick)\b/i;
/** A note about a person bitten, scratched or licked, as written at a facility. An animal bitten by dogs is a field report, not this. */
export const looksLikeExposure = (raw: string) => { const t = stripMention(raw); return t.length >= 12 && t.length <= 800 && EXPOSURE_VERB.test(t) && PERSON.test(t) && !QUESTION.test(t.trim()); };

const SITES = "calf|leg|thigh|knee|ankle|foot|feet|toes?|hands?|fingers?|thumb|palm|wrist|arm|forearm|elbow|shoulder|face|cheek|nose|lips?|ears?|head|scalp|neck|back|chest|abdomen|stomach|buttocks?|hip|shin|heel|sole|eyebrow|forehead|chin";
const PLACE_NOUN = "market|bazaar|road|street|lane|cross|stand|stop|station|gate|temple|church|mosque|masjid|gurudwara|school|college|hospital|park|garden|circle|junction|chowk|signal|bridge|flyover|colony|nagar|layout|society|apartments?|complex|mall|shop|hotel|dhaba|stall|ground|playground|lake|pond|canal|depot|office|theatre|pump|metro|railway|crossing|corner|square|building|block|sector|ward|village|basti|bus stand|bus stop|tank";

/** Place nouns that follow a named place ("Ward 12" + " market"): the words to add, or "". */
export const placeTail = (after: string) => after.match(new RegExp(`^((?:\\s+(?:${PLACE_NOUN}))+)\\b`, "i"))?.[1] ?? "";
/** A place written in lower case, which must end in a place noun so "by a bike" or "in a drain" are not places: "by the bus stand" → "bus stand". */
export function lowercasePlace(text: string): string | null {
  const low = text.match(new RegExp(`\\b(?:near|at|by|outside|behind|opposite|in front of|next to|beside)\\s+(?:the\\s+|a\\s+|an\\s+|our\\s+)?((?:[a-z0-9'-]+\\s+){0,3}?(?:${PLACE_NOUN})(?:\\s+(?:${PLACE_NOUN}))*)\\b`, "i"));
  return low ? low[1].trim() : null;
}
const NOT_PLACES = /^(?:OPD|IPD|PHC|CHC|ER|ICU|home|night|noon|\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)$/i;
/** "near Ward 12 market", "by the bus stand", "outside Gandhipuram bus stand": the place words, or null. */
export function placeIn(text: string): string | null {
  const caps = new RegExp(`\\b(?:near|at|outside|behind|opposite|opp\\.?|in front of|next to|beside)\\s+(?:the\\s+)?([A-Z0-9][\\w.'-]*(?:\\s+[A-Z0-9][\\w.'-]*){0,4})`, "g");
  for (const m of text.matchAll(caps)) {
    if (NOT_PLACES.test(m[1])) continue;
    return `${m[1]}${placeTail(text.slice((m.index ?? 0) + m[0].length))}`.replace(/[.,;]+$/, "").trim();
  }
  return lowercasePlace(text);
}

/** What a bite note states, and nothing it does not. The category is taken only when written as a category. */
export function parseExposure(raw: string, now = new Date()): ExposureNote | null {
  const text = stripMention(raw).replace(/\s+/g, " ").trim();
  if (!looksLikeExposure(text)) return null;
  const t = text.toLowerCase();
  /* The category, only as written: "category III", "cat III", "cat-3". "a cat I saw" and "bitten by a cat 2 days ago" are not categories. */
  const catM = text.match(/\bcategory\s*[-:]?\s*(III|II|I|3|2|1)\b/i) ?? text.match(/(?<!\b(?:[Aa]|[Tt]he|[Bb]y|stray|street|pet|of|one|her|his|their)\s)\b[Cc][Aa][Tt]\.?\s*-?\s*(III|II|I)\b/) ?? text.match(/(?<!\b(?:a|the|by|stray|street|pet|of)\s)\bcat-([123])\b/i);
  const category = catM ? ({ i: "I", ii: "II", iii: "III", "1": "I", "2": "II", "3": "III" } as const)[catM[1].toLowerCase() as "i"] ?? null : null;
  const plain = catM ? text.replace(catM[0], " ") : text;
  const lower = plain.toLowerCase();
  const kind: ExposureKind = /\b(?:bitten|bite|bit)\b/.test(lower) ? "bite" : /\bscratch/.test(lower) ? "scratch" : /\blick/.test(lower) && /\b(?:broken skin|wound|cut|abrasion|open|bleeding|raw)\b/.test(lower) ? "lick_broken_skin" : "other";
  const kindNote = kind === "other" && /\blick/.test(lower) ? "The note says licked but not on broken skin, so it is prepared as other contact." : null;
  const siteM = plain.match(new RegExp(`\\b(?:on|in|at)\\s+(?:the\\s+|his\\s+|her\\s+|their\\s+|my\\s+)?((?:(?:left|right|lt|rt|upper|lower|both)\\.?\\s+){0,2}(?:${SITES}))\\b`, "i"));
  const ageM = lower.match(/\b(\d{1,3})\s*(?:-|\s)?(?:years?|yrs?|yr)\s*(?:-|\s)?(?:old|o)?\b/) ?? lower.match(/\b(\d{1,3})\s*(?:y\/o|yo)\b/) ?? lower.match(/\baged?\s+(\d{1,3})\b/) ?? lower.match(/\b(\d{1,3})\s*[mf]\b(?!\w)/);
  const monthsM = lower.match(/\b(\d{1,2})\s*(?:-|\s)?months?\s*(?:-|\s)?old\b/);
  const years = ageM ? Number(ageM[1]) : monthsM ? 0 : null;
  const ageBand: AgeBand | null = years === null || years > 120 ? null : years < 5 ? "0-4" : years < 15 ? "5-14" : years < 30 ? "15-29" : years < 50 ? "30-49" : "50+";
  /* The patient's sex only from words about the patient. "female dog", "his mother" and pronouns say nothing certain about who was bitten. */
  const sexWord = lower.match(/\b(boy|girl|man|woman|lady|gentleman|(?:fe)?male (?:child|patient|person|adult|student|baby|infant)|\d{1,3}\s*(?:yrs?|years?|y)?\s*(?:old\s+)?(?:m|f))\b/);
  const sex = !sexWord ? null : /\b(?:girl|woman|lady|female)\b|\d\s*(?:yrs?|years?|y)?\s*(?:old\s+)?f$/.test(sexWord[1]) ? "female" : "male";
  const washed: WoundWashed | null = /\b(?:not washed|unwashed|no (?:wound )?wash(?:ing)?|did ?n[o']t wash|was ?n[o']t washed)\b/.test(lower) ? "not_washed"
    : /\bwashed (?:here|at (?:the )?(?:facility|hospital|clinic|centre|center|phc|chc|opd|casualty))|\bwe washed\b|\bwashed in (?:the )?(?:opd|casualty)\b|\bwound (?:wash|washing|cleaning) (?:done )?(?:here|at (?:the )?(?:facility|hospital|clinic))\b/.test(lower) ? "at_facility"
    : /\bwashed (?:at home|before (?:coming|arrival|arriving)|by (?:the )?(?:family|parents?|mother|father)|already)\b|\b(?:already|was) washed before\b/.test(lower) ? "before_arrival" : null;
  const washedUnclear = !washed && /\bwash(?:ed|ing)?\b/.test(lower);
  const speciesM = lower.match(/\b(dog|dogs|puppy|pup|bitch|cat|kitten|monkey|cow|bull|buffalo|cattle|goat|rat|bat|mongoose|jackal|fox)\b/);
  const species: Species = !speciesM ? "unknown" : /dog|pup|bitch/.test(speciesM[1]) ? "dog" : /cat|kitten/.test(speciesM[1]) ? "cat" : speciesM[1] === "monkey" ? "monkey" : /cow|bull|buffalo|cattle|goat/.test(speciesM[1]) ? "cattle" : "wildlife";
  const ownership = /\b(?:pet|owned|neighbou?r'?s|their own|own dog|house dog|family dog|domestic)\b/.test(lower) ? "owned" as const : /\b(?:stray|street|community|unowned|roaming)\b/.test(lower) ? "community" as const : "unknown" as const;
  const refM = plain.match(/\b(opd|ipd|uhid|mrn|cr|reg(?:istration|ister)?|patient)\s*(?:no\.?|number|num|#|id)?\s*[:\-]?\s*(?=[A-Z0-9/-]*\d)([A-Z0-9][A-Z0-9/-]{1,30})\b/i);
  const phoneM = text.match(/(?:\+?91[\s-]?)?(?<!\d)([6-9]\d{4}[\s-]?\d{5})(?!\d)/);
  const consent = /\b(?:agree[sd]?|consent(?:s|ed)?|okay|ok|happy|fine|willing)\b[^.]{0,40}\b(?:call|calls|called|calling|remind\w*|sms|messages?|phone)\b|\bcan be (?:called|reminded|phoned)\b|\breminders? (?:ok|okay|yes|agreed|consented)\b/.test(lower);
  const date = findDate(plain, now, "past");
  return {
    date, time: findTime(plain), kind, kindNote, site: siteM ? siteM[1].replace(/\blt\.?\b/i, "left").replace(/\brt\.?\b/i, "right") : null,
    /* The register number as written: "OPD 4521" keeps its register's name; "patient no. 4521" is the number. */
    category, patientRef: refM ? (/^(?:opd|ipd|uhid|mrn|cr)$/i.test(refM[1]) ? `${refM[1].toUpperCase()} ${refM[2].toUpperCase()}` : refM[2].toUpperCase()).slice(0, 40) : null,
    ageText: years === null ? null : monthsM && !ageM ? `${monthsM[1]} months` : `${years} years`, ageBand,
    sex, washed, washedUnclear, species, speciesStated: !!speciesM, ownership, place: placeIn(plain),
    phone: phoneM ? phoneM[1].replace(/[\s-]/g, "") : null, consent, animal: readLooks(plain),
  };
}
