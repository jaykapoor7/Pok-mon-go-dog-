"use client";

/* Telling Kaju what happened, in plain words. kajuCapture sends the words exactly as the person wrote them (only after
   they press Send) to /api/ai with the page they are on and the record they are looking at, under their own session,
   so Kaju reads only what that person may read. Kaju prepares; a record is saved only when the person presses Confirm
   (kajuConfirm, the same audited server functions as the manual screens).

   The readers below never talk to a server. When Kaju prepares nothing, they carry the person's own words into the
   manual form, sorted into its fields, so "Fill in by hand" starts filled instead of empty. Each one fills only what
   the words state: a word that is negated ("no wound", "not vaccinated") or describes something already done when the
   field asks what is needed ("sterilised" is not a reason to sterilise) is left alone, and anything not found is left
   for the person, never guessed. Field mode uses readField offline. scripts/test-capture-readers.ts checks them. */

import { extractFieldMessage } from "@/sp3/ai/extract";
import type { AiReply, Proposal } from "@/sp3/ai/types";
import type { CaseCategory, CaseSeverity } from "@/lib/types";
import { askKaju, isoDay, RECORD_PROPOSALS, type Res } from "./ngo";

export type CaptureContext = { path: string; workspace: "ngo" | "healthcare"; caseId?: string | null; dogId?: string | null; title?: string };

/** Plain words to Kaju with the page's context: exactly what the person wrote, nothing added. Kaju fills what the
    server knows (the organisation's city on a new case) and shows it in what it prepares. */
export function kajuCapture(text: string, ctx: CaptureContext): Promise<Res<AiReply>> {
  const context: Record<string, unknown> = { path: ctx.path.slice(0, 200), workspace: ctx.workspace };
  if (ctx.title) context.title = ctx.title.slice(0, 300);
  if (ctx.caseId) context.caseId = ctx.caseId;
  if (ctx.dogId) context.dogId = ctx.dogId;
  const words = text.trim().slice(0, 6000);
  return askKaju(words, context, "Kaju could not read it. Nothing was saved. Try again, or fill it in by hand.");
}

/** Prepared records a person can confirm here. register_exposure is the bite-register entry the server is adding;
    until the server accepts it, confirming one returns the server's refusal and saves nothing. */
export const CONFIRMABLE = new Set<string>(RECORD_PROPOSALS);
/** The tools that mean Kaju read the words as something to record here (so its reply is about them, not another question).
    In healthcare only the bite-register tools count: the animal field reader answers in NGO terms. */
export const readAsRecord = (r: AiReply, workspace: CaptureContext["workspace"] = "ngo") => r.proposals.length > 0 || r.tools.some((t) => (workspace === "healthcare" ? /^(register_exposure|propose_exposure|prepare_exposure)/ : /^(extract_field_message|propose_|register_exposure|prepare_)/).test(t.name));

/* ── Words that are said, not negated ─────────────────────────────── */

/** "no", "not", "never", "without", "n't" just before (in the same clause, within three words) cancels a word. */
const NEGATED = /(?:^|[^\w'])(?:no|not|never|without|nor|isn't|wasn't|aren't|hasn't|hadn't|haven't|doesn't|didn't|don't|can't|cannot|won't)\s+(?:[\w'-]+\s+){0,2}$/i;
const CLAUSE = /[.,;:!?\n]|\b(?:but|and then|then)\b/gi;
function clauseBefore(text: string, at: number): string {
  const head = text.slice(Math.max(0, at - 60), at);
  let cut = 0;
  for (const m of head.matchAll(CLAUSE)) cut = (m.index ?? 0) + m[0].length;
  return head.slice(cut);
}
/** The places where `re` (global) is said and not negated, in order. */
export function said(text: string, re: RegExp): RegExpMatchArray[] {
  const g = re.global ? re : new RegExp(re.source, `${re.flags}g`);
  return [...text.matchAll(g)].filter((m) => !NEGATED.test(clauseBefore(text, m.index ?? 0)));
}
const says = (text: string, re: RegExp) => said(text, re).length > 0;

/* ── Days, as people say them ─────────────────────────────────────── */

const WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS: [RegExp, number][] = [[/^jan(?:uary)?$/, 0], [/^feb(?:ruary)?$/, 1], [/^mar(?:ch)?$/, 2], [/^apr(?:il)?$/, 3], [/^may$/, 4], [/^june?$/, 5], [/^july?$/, 6], [/^aug(?:ust)?$/, 7], [/^sept?(?:ember)?$/, 8], [/^oct(?:ober)?$/, 9], [/^nov(?:ember)?$/, 10], [/^dec(?:ember)?$/, 11]];
const MONTH_WORD = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const monthOf = (w: string) => MONTHS.find(([re]) => re.test(w.toLowerCase()))?.[1] ?? -1;
const at = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14 };
/* A number that names a batch, a register or a phone is never a date ("batch 12-3", "OPD 12/11"). */
const NOT_A_DATE = /(?:batch|lot|no\.?|number|#|opd|uhid|mrn|reg(?:istration)?\.?|code|tag|ward|room|bed|ph(?:one)?\.?)\s*[:#-]?\s*$/i;

/** The day the words name, or null. "past" reads "Monday" as the last Monday; "future" as the next one. */
export function readDay(text: string, dir: "past" | "future", now = new Date()): string | null {
  const t = text.toLowerCase();
  const today = at(now, 0);
  if (/\bday after tomorrow\b/.test(t)) return isoDay(at(today, 2));
  if (/\bday before yesterday\b/.test(t)) return isoDay(at(today, -2));
  if (/\btomorrow\b/.test(t)) return isoDay(at(today, 1));
  if (/\byesterday\b/.test(t)) return isoDay(at(today, -1));
  const inN = t.match(/\bin (\d{1,3}|a|an|one|two|three|four|five|six|seven|ten|fourteen) (day|days|week|weeks)\b/);
  if (inN) { const n = NUM[inN[1]] ?? Number(inN[1]); return isoDay(at(today, /week/.test(inN[2]) ? n * 7 : n)); }
  const ago = t.match(/\b(\d{1,3}|a|an|one|two|three) (day|days|week|weeks) ago\b/);
  if (ago) { const n = NUM[ago[1]] ?? Number(ago[1]); return isoDay(at(today, -(/week/.test(ago[2]) ? n * 7 : n))); }
  if (/\bnext week\b/.test(t)) return isoDay(at(today, 7));
  if (/\blast week\b/.test(t)) return isoDay(at(today, -7));
  const wd = t.match(/\b(next |this |last |on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wd) {
    const want = WEEK.indexOf(wd[2]), now0 = today.getDay();
    if (dir === "future" || wd[1] === "next ") { let d = (want - now0 + 7) % 7; if (d === 0) d = 7; return isoDay(at(today, d)); }
    let d = (now0 - want + 7) % 7; if (wd[1] === "last " && d === 0) d = 7; return isoDay(at(today, -d));
  }
  /* 12/11, 12-11-2026 or 12.11.2026; a dot needs the year, so "1.5 ml" is never a date. */
  for (const dm of [...text.matchAll(/\b(\d{1,2})([/-])(\d{1,2})(?:\2(\d{2,4}))?\b/g), ...text.matchAll(/\b(\d{1,2})(\.)(\d{1,2})\.(\d{2,4})\b/g)]) {
    if (NOT_A_DATE.test(text.slice(0, dm.index ?? 0))) continue;
    const y = dm[4] ? (dm[4].length === 2 ? 2000 + Number(dm[4]) : Number(dm[4])) : today.getFullYear();
    const d = new Date(y, Number(dm[3]) - 1, Number(dm[1]));
    if (!isNaN(d.getTime()) && d.getDate() === Number(dm[1]) && d.getMonth() === Number(dm[3]) - 1) return isoDay(d);
  }
  const md = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_WORD})\\b|\\b(${MONTH_WORD})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"));
  if (md) {
    const day = Number(md[1] ?? md[4]), m = monthOf((md[2] ?? md[3])!);
    const d = new Date(today.getFullYear(), m, day);
    if (m >= 0 && !isNaN(d.getTime()) && d.getDate() === day) return isoDay(d);
  }
  if (/\b(today|this morning|this afternoon|this evening|tonight|just now)\b/.test(t)) return isoDay(today);
  return null;
}
export const dayWords = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/* ── What an animal looks like ────────────────────────────────────── */

const COLOUR = /\b(black(?: and (?:white|tan|brown))?|white|brown(?: and white)?|tan|golden|grey|gray|fawn|cream|beige|ginger|brindle|spotted|tricolou?r)\b/gi;
const MARK = /\b(ear[- ]?notch(?:ed)?|(?:red|blue|black|white|brown) collar|collar(?:ed)?|one eye|blind in one eye|(?:torn|cut|floppy|half) ear|three[- ]legged|three legs|short tail|no tail|stump tail|curly tail|scar(?:red)?|bald patch|white (?:paws|socks|chest|patch)|black (?:face|mouth|patch)|spots)\b/gi;
/** Colours and marks that tell an animal apart, in the order they were said. "No collar" is not a mark ("no tail" is). */
export function readMarks(text: string): string | null {
  const seen: string[] = [];
  const hits = [...said(text, COLOUR), ...said(text, MARK)].sort((a, b) => (a.index ?? 0) - (b.index ?? 0) || b[0].length - a[0].length);
  for (const m of hits) { const v = m[0].toLowerCase(); if (!seen.some((s) => s.includes(v) || v.includes(s))) seen.push(v); }
  return seen.length ? seen.join(", ") : null;
}
/** A landmark in lower case ("by the temple"), which the case reader's capitalised places miss. Prepositions are tried
    in order, so "near the bus stand" wins over "at home"; "bitten by a dog" and "at home" or "at the clinic" are never
    places, and neither is a time ("at 9am"). */
const NOT_PLACE = /^(?:the\s+)?(?:home|house|clinic|hospital|opd|centre|center|facility|shelter|night|morning|afternoon|evening|noon|once|least|all|his|her|their|my|our|its|a|an|vet|doctor|time|first|last|that|this|it|him|them|me|us|you)\b/i;
export function readLandmark(text: string, preps = ["near", "outside", "behind", "opposite", "next to", "in front of", "by", "at"]): string | null {
  for (const p of preps) {
    const re = new RegExp(`(^|[^\\w'-])(${p})\\s+(?!\\d)((?:the\\s+)?[\\w'-]+(?:\\s+[\\w'-]+){0,3}?)(?=\\s*(?:[,.;!?\\n]|$|\\s+(?:needs?|and|with|is|was|looks?|seems?|limping|bleeding|today|yesterday|this|since|for|at|around|about|on|in|from)\\b))`, "gi");
    for (const m of text.matchAll(re)) {
      const before = text.slice(0, m.index ?? 0).trim().split(/\s+/).pop() ?? "";
      if (p === "by" && /^(bitten|bit|scratched|licked|attacked|chased|hit|seen|reported|found|caught|brought|run|knocked|done|given|vaccinated|treated|checked|examined|operated|sterili[sz]ed|dewormed|dressed)$/i.test(before)) continue;
      if (NOT_PLACE.test(m[3]) || /\d/.test(m[3])) continue;
      const v = `${m[2]} ${m[3]}`.trim();
      if (v.length > 2) return v.charAt(0).toUpperCase() + v.slice(1);
    }
  }
  return null;
}
const firstLine = (text: string, max = 120) => {
  const s = text.trim().split(/(?<=[.!?])\s+|\n/)[0]?.trim() ?? "";
  if (s.length <= max) return s.replace(/[.!?]+$/, "");
  const cut = s.slice(0, max); return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[,;:\s]+$/, "");
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── Why an animal needs the team ─────────────────────────────────── */

export type Reason = "rescue" | "injury" | "sterilisation" | "vaccination";
/* What is needed, not what was done: "sterilise", "for ABC" and "spay" are reasons; "sterilised" and "spayed" are not. */
export const REASON_WORDS: Record<Reason, RegExp> = {
  rescue: /\b(rescue|trapped|stuck|stranded|fell into|fallen into|can'?t get out|abandoned|in (?:a|the) (?:drain|well|pit|gutter|canal))\b/gi,
  injury: /\b(injur(?:y|ed|ies)|hurt|wound(?:ed|s)?|limp(?:ing|s)?|lame|bleed(?:ing|s)?|fractur(?:e|ed)|broken (?:leg|paw|tail|jaw)|maggots?|sick|unwell|not eating|vomit(?:ing|s)?|mange|hit by (?:a )?(?:car|bike|vehicle|auto|bus|truck|scooter)|accident|needs? (?:a |the )?vet)\b/gi,
  sterilisation: /\b(sterili[sz](?:e|ation|ing)|spay(?:ing)?|neuter(?:ing)?|castrat(?:e|ion|ing)|abc)\b/gi,
  vaccination: /\b(vaccinat(?:e|ion|ing)|vaccine|arv|anti-?rabies|rabies (?:shot|jab|vaccine))\b/gi,
};
/* A reason word naming a place or a team ("near the ABC centre", "the rescue van", "an abandoned building") is not a
   reason, and a sex word naming a person ("a male volunteer") is not the animal's sex. */
const NAMES_A_PLACE = /^\s+(?:centre|center|shelter|hospital|clinic|office|van|vehicle|team|home|unit|camp|drive|ngo|group|people|staff|building|house|factory|lot|site|plot|car|programme|program|card|certificate|register|record)\b/i;
const NAMES_A_PERSON = /^\s+(?:staff|volunteer|volunteers|person|people|guard|owner|doctor|vet|worker|feeder|nurse|patient|caller|informer|student|teacher|resident|neighbou?r|driver|officer)\b/i;
const describes = (text: string, m: RegExpMatchArray, not: RegExp) => !not.test(text.slice((m.index ?? 0) + m[0].length));
/** The reasons the words state, most pressing first (in danger, then hurt, then the programme). */
export function readReasons(text: string): Reason[] {
  const out: Reason[] = [];
  for (const r of ["rescue", "injury", "sterilisation", "vaccination"] as Reason[]) {
    if (said(text, REASON_WORDS[r]).some((m) => describes(text, m, NAMES_A_PLACE))) out.push(r);
  }
  return out;
}

/** The animal's sex, only when a sex word is said about the animal: pronouns ("his shop") and people ("a male
    volunteer") are never read as one. */
export function readAnimalSex(text: string): "Female" | "Male" | "Unknown" | null {
  if (/\b(sex (?:not known|unknown|not sure|unclear)|not sure (?:of|about|if) (?:the |its )?(?:sex|female|male)|unknown sex|(?:don'?t|do not) know (?:the |its )?sex)\b/i.test(text)) return "Unknown";
  const f = said(text, /\b(female|bitch|she-dog)\b/gi).some((m) => describes(text, m, NAMES_A_PERSON));
  const m = said(text, /\b(male|he-dog)\b/gi).some((x) => describes(text, x, NAMES_A_PERSON));
  return f && !m ? "Female" : m && !f ? "Male" : null;
}

/* ── A new case ───────────────────────────────────────────────────── */

export type CaseReading = { title: string; description: string; category: CaseCategory | null; severity: CaseSeverity | null; zone: string | null; city: string | null; facts: string[] };
const CATEGORY_WORD: Record<CaseCategory, string> = { injury: "Injury or illness", rescue: "Rescue", sterilisation: "Sterilisation", vaccination: "Vaccination", other: "Something else" };
/** How urgent, only from urgency words: "limping" is not a severity. */
export function readUrgency(text: string): CaseSeverity | null {
  if (says(text, /\b(critical|emergency|dying|life[- ]threatening|very serious)\b/gi)) return "critical";
  if (says(text, /\b(not urgent|no hurry|low priority|when you can|whenever possible)\b/gi)) return "low";
  if (says(text, /\b(urgent(?:ly)?|asap|immediately|right away|at once|high priority|act today|needs? (?:a |the )?vet today)\b/gi)) return "high";
  return null;
}
/** The case form's fields from a description. Category and urgency come only from what is said; the place is a
    landmark ("near the temple") or a capitalised place ("in HSR Layout"); the city is one the words name. */
export function readCase(text: string, now = new Date()): CaseReading {
  const x = extractFieldMessage(text, now);
  const title = firstLine(text);
  const category = readReasons(text)[0] ?? null;
  const severity = readUrgency(text);
  const place = x.place && !/^\d/.test(x.place) && text.includes(x.place) ? x.place : null;
  const zone = readLandmark(text) ?? place;
  const sex = readAnimalSex(text);
  const age = /\b(pupp(?:y|ies)|pups?)\b/i.test(text) ? "puppy" : /\badult\b/i.test(text) ? "adult" : null;
  const on = readDay(text, "past", now);
  const facts = [category ? CATEGORY_WORD[category] : null, severity === "critical" ? "Critical" : severity === "high" ? "Urgent" : severity === "low" ? "Not urgent" : null, [sex && sex !== "Unknown" ? sex.toLowerCase() : null, age].filter(Boolean).join(" ") || null, zone, x.city, on && on <= isoDay(now) ? `Dated ${dayWords(on)}` : null].filter(Boolean).map((s) => cap(String(s)));
  return { title, description: text.trim() !== title ? text.trim() : "", category, severity, zone, city: x.city, facts };
}

/* ── A line on a case or an animal ───────────────────────────────── */

export type RecordReading = {
  followup: { due: string; note: string } | null;
  care: { kind: string; date: string; notes: string } | null;
  note: string;
  facts: string[];
};
const FOLLOW = /\b(follow[- ]?up|recheck|re-check|check (?:again|back|on (?:him|her|it))|revisit|visit again|see (?:him|her|it) again|review|come back|next dose|second dose|booster due)\b/i;
/* Care that was done (past tense). "Not vaccinated" is not care given. */
const DONE_CARE: [RegExp, string][] = [
  [/\b(vaccinated|got (?:the |its |her |his )?(?:vaccine|shot|jab)|(?:arv|anti-?rabies|rabies) (?:shot |vaccine )?(?:given|done)|booster (?:given|done))\b/gi, "vaccination"],
  [/\b(de-?wormed|deworming (?:given|done)|gave (?:a |the )?de-?wormer)\b/gi, "deworming"],
  [/\b(sterili[sz]ed|spayed|neutered|castrated)\b/gi, "sterilisation"],
  [/\b(wound (?:cleaned|dressed)|dressing (?:changed|done)|dressed the wound|maggots? (?:removed|cleaned))\b/gi, "wound"],
  [/\b(treated|gave (?:\w+ )?(?:medicine|antibiotics?|injection|tablets?|painkillers?)|on antibiotics|started (?:on )?(?:medicine|antibiotics?))\b/gi, "treatment"],
  [/\b(checked by (?:the |a )?vet|vet (?:checked|saw|examined)|check-?up done|examined)\b/gi, "checkup"],
];
/* What a follow-up is for, without its day; "follow up" on its own says nothing more, so it is left blank. */
const what = (s: string) => (/^(?:follow[- ]?up|recheck|re-check|review|revisit)$/i.test(s.trim()) ? "" : cap(s));
export const CARE_WORD: Record<string, string> = { vaccination: "Vaccination", deworming: "Deworming", sterilisation: "Sterilisation", wound: "Wound care", treatment: "Treatment", rescue: "Rescue", rehabilitation: "Rehabilitation", checkup: "Check-up", other: "Other care" };
/** What one line on a case says: a follow-up with its day, care that was done with its day, and the rest as a note. */
export function readRecord(text: string, now = new Date()): RecordReading {
  const words = text.trim();
  const parts = words.split(/\s*(?:[,;]|\n|\.\s|\band then\b|\bthen\b)\s*/i).map((s) => s.trim()).filter(Boolean);
  const fuPart = parts.find((p) => FOLLOW.test(p) && !NEGATED.test(p.slice(0, p.search(FOLLOW))) && readDay(p, "future", now));
  const due = fuPart ? readDay(fuPart, "future", now) : null;
  const followup = fuPart && due && due >= isoDay(now) ? { due, note: what(fuPart.replace(new RegExp(`\\b(?:on |by |next |this )?(?:today|tomorrow|day after tomorrow|in (?:\\d+|a|an|one|two|three|four|five|six|seven|ten|fourteen) (?:days?|weeks?)|next week|(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|\\d{1,2}[/.-]\\d{1,2}(?:[/.-]\\d{2,4})?|\\d{1,2}(?:st|nd|rd|th)? (?:${MONTH_WORD})|(?:${MONTH_WORD}) \\d{1,2}(?:st|nd|rd|th)?)\\b`, "gi"), "").replace(/\s{2,}/g, " ").replace(/[\s,;:-]+$/, "").trim()) } : null;
  const rest = parts.filter((p) => p !== fuPart).join(", ");
  const hit = DONE_CARE.find(([re]) => says(words, re));
  const care = hit ? { kind: hit[1], date: (() => { const d = readDay(words, "past", now); return d && d <= isoDay(now) ? d : isoDay(now); })(), notes: cap(words) } : null;
  const note = cap(followup ? rest || words : words);
  const facts = [followup ? `Follow-up ${dayWords(followup.due)}` : null, care ? `${CARE_WORD[care.kind]} ${care.date === isoDay(now) ? "today" : dayWords(care.date)}` : null, followup && rest ? `Note: “${rest}”` : null].filter(Boolean) as string[];
  return { followup, care, note, facts };
}

/* ── Field mode: an animal in front of you (offline, nothing sent) ── */

export type FieldReading = { category: Reason | null; also: Reason[]; sex: "Female" | "Male" | "Unknown" | null; marks: string | null; zone: string | null; note: string };
/** One line said in field mode. It fills only the choices the words state; the most pressing reason wins and the
    others are named so the person can change it. Never throws: anything unreadable is simply not filled. */
export function readField(raw: string): FieldReading {
  const text = typeof raw === "string" ? raw.slice(0, 500) : "";
  try {
    const reasons = readReasons(text);
    return { category: reasons[0] ?? null, also: reasons.slice(1), sex: readAnimalSex(text), marks: readMarks(text), zone: readLandmark(text), note: text.trim() };
  } catch {
    return { category: null, also: [], sex: null, marks: null, zone: null, note: text.trim() };
  }
}

/* ── A bite, scratch or lick (healthcare) ────────────────────────── */

export type BiteReading = {
  exposure_on: string | null; kind: string | null; species: string | null; ownership: string | null; age: string | null; sex: string | null;
  ref: string | null; washed: string | null; category: string | null; animal: string | null; place: string | null; consent: boolean; phone: string | null; site: string | null; facts: string[];
};
const ageBand = (n: number) => (n < 5 ? "0-4" : n < 15 ? "5-14" : n < 30 ? "15-29" : n < 50 ? "30-49" : "50+");
/* The exposure category, only when it is written as one: "category 3" (any case), or the short "Cat III", "CAT 3",
   "cat-2" as clinicians write it. "A cat 3 days ago" is a cat, and "a cat I think" is not category I. */
const CATEGORY_LONG = /\bcategory\s*[-:]?\s*(iii|ii|i|[123])\b/i;
const CATEGORY_SHORT = /\b[Cc](?:at|AT)\.?\s*[-:]?\s*(III|II)(?![\w'])|\bC(?:at|AT)\.?\s*[-:]?\s*(I)(?=\s*(?:[,.;)\n]|$))|\b[Cc](?:at|AT)\s*[-.]\s*([123])\b|\bCAT\s*([123])\b/;
/** Only what the words state. Category is read only when it is written as one; a clinician still records it. */
export function readBite(text: string, now = new Date()): BiteReading {
  const t = text.toLowerCase();
  const kind = says(text, /\b(bitten|bites?)\b|\bbit (?:him|her|them|me|my|his|the|a|on|in)\b/gi) ? "bite" : says(text, /\bscratch(?:ed|es)?\b/gi) ? "scratch" : says(text, /\blick(?:ed|s)?\b/gi) ? (/broken skin|wound|cut|graze/.test(t) ? "lick_broken_skin" : "other") : null;
  const on = readDay(text, "past", now);
  const catM = text.match(CATEGORY_LONG) ?? text.match(CATEGORY_SHORT);
  const catRaw = catM ? (catM[1] ?? catM[2] ?? catM[3] ?? catM[4] ?? "").toLowerCase() : "";
  const category = catRaw ? ({ i: "I", "1": "I", ii: "II", "2": "II", iii: "III", "3": "III" } as Record<string, string>)[catRaw] ?? null : null;
  const withoutCat = catM ? text.slice(0, catM.index ?? 0) + " ".repeat(catM[0].length) + text.slice((catM.index ?? 0) + catM[0].length) : text;
  const s = withoutCat.toLowerCase();
  const species = /\b(dog|dogs|puppy|pup)\b/.test(s) ? "dog" : /\b(kitten|cat)\b/.test(s) ? "cat" : /\bmonkey\b/.test(s) ? "monkey" : /\b(cow|cattle|bull|buffalo)\b/.test(s) ? "cattle" : /\b(bat|mongoose|jackal|fox|wild animal)\b/.test(s) ? "wildlife" : null;
  const ownership = says(text, /\b(stray|street|community)\b/gi) ? "community" : says(text, /\b(pet|owned|neighbou?r'?s|owner'?s?)\b/gi) ? "owned" : null;
  const ms = text.match(/\b(\d{1,3})\s*([mf])\b/i) ?? text.match(/\b([mf])\s*[,/]?\s*(\d{1,3})\b/i);
  const ageM = text.match(/\b(\d{1,3})\s*(?:-|\s)?(?:years?|yrs?|yo|y\/o|year-old)\b/i);
  const n = ageM ? Number(ageM[1]) : ms ? Number(/\d/.test(ms[1]) ? ms[1] : ms[2]) : null;
  const age = n !== null && n >= 0 && n < 120 ? ageBand(n) : null;
  const sexWord = /\b(woman|girl|lady|female patient)\b/.test(t) ? "female" : /\b(man|boy|gentleman|male patient)\b/.test(t) ? "male" : null;
  const sex = sexWord ?? (ms ? (/[f]/i.test(/\d/.test(ms[1]) ? ms[2] : ms[1]) ? "female" : "male") : null);
  /* A register number has a digit and follows its name: "OPD 4421", "reg no: B/112". "Regular" is not one. */
  const ref = text.match(/\b(?:opd|uhid|mrn|reg(?:istration|ister)?\.?(?:\s*(?:no\.?|number))?|case no\.?)(?:\s*[:#-]\s*|\s+)((?=[A-Z0-9/-]*\d)[A-Z0-9][A-Z0-9/-]{1,38})/i)?.[1] ?? null;
  const washed = /\b(not washed|unwashed|did ?n[o']t wash|did not wash|no washing|wasn't washed|was not washed)\b/.test(t) ? "not_washed" : /\bwashed (?:here|at (?:the )?(?:clinic|hospital|facility|opd|centre|center))|we washed\b/.test(t) ? "at_facility" : /\bwashed (?:at home|before|already|with soap)\b/.test(t) ? "before_arrival" : null;
  const consent = says(text, /\b(agree[sd]?|consent(?:s|ed)?|ok(?:ay)?|happy)\s+(?:to\s+)?(?:be\s+)?(?:called|calls|a call|reminders?|sms)\b/gi);
  const phone = consent ? text.match(/(\+?\d[\d ]{6,14}\d)/)?.[1]?.replace(/\s+/g, " ") ?? null : null;
  const site = t.match(/\b(?:on|in) (?:the |his |her |their )?((?:left |right )?(?:hand|finger|thumb|arm|forearm|leg|calf|thigh|foot|ankle|face|cheek|lip|head|neck|back|shoulder|knee|buttock|toe))\b/)?.[1] ?? null;
  const animal = readMarks(text);
  const place = readLandmark(text, ["near", "outside", "behind", "opposite", "next to", "in front of", "at"]);
  const KIND: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };
  const facts = [kind ? KIND[kind] : null, species ? cap(species === "wildlife" ? "wild animal" : species) : null, on && on <= isoDay(now) ? dayWords(on) : null, site ? `On the ${site}` : null, age ? `Age ${age.replace("-", " to ").replace("+", " and over")}` : null, sex ? cap(sex) : null, ref ? `Register ${ref}` : null, washed ? { not_washed: "Not washed", at_facility: "Washed here", before_arrival: "Washed before arrival" }[washed] : null, category ? `Category ${category} (as written)` : null].filter(Boolean) as string[];
  return { exposure_on: on, kind, species, ownership, age, sex, ref, washed, category, animal, place, consent, phone, site, facts };
}

/* ── A bite-register entry prepared by Kaju ──────────────────────── */

/** The server's register_exposure proposal, read field by field. Every value is optional here, and a value that does
    not match the form's choices is left for the person. */
export type ExposureDraft = Omit<BiteReading, "facts" | "consent"> & { consent: boolean | null; time: string | null; area: string | null; areaId: string | null; facility: string | null };
const pick = (o: Record<string, unknown>, ...keys: string[]) => { for (const k of keys) { const v = o[k]; if (typeof v === "string" && v.trim()) return v.trim(); if (typeof v === "number") return String(v); } return null; };
export function exposureOf(p: Proposal | Record<string, unknown>): ExposureDraft {
  const o = p as Record<string, unknown>;
  const when = pick(o, "exposureOn", "exposure_on", "exposureDate", "exposure_date", "exposureAt", "exposure_at", "occurredAt", "occurred_at", "date");
  const day = when && /^\d{4}-\d{2}-\d{2}/.test(when) ? when.slice(0, 10) : null;
  const time = pick(o, "exposureTime", "exposure_time", "time") ?? (when && /T\d{2}:\d{2}/.test(when) ? when.slice(11, 16) : null);
  const kindRaw = (pick(o, "exposureKind", "exposure_kind", "contactKind", "contact", "type") ?? "").toLowerCase();
  const kind = /lick/.test(kindRaw) ? "lick_broken_skin" : /scratch/.test(kindRaw) ? "scratch" : /bite/.test(kindRaw) ? "bite" : kindRaw === "other" ? "other" : null;
  const catRaw = (pick(o, "category", "exposureCategory", "exposure_category") ?? "").toUpperCase().replace(/^CATEGORY\s*/, "");
  const category = ({ I: "I", "1": "I", II: "II", "2": "II", III: "III", "3": "III" } as Record<string, string>)[catRaw] ?? null;
  const ageRaw = pick(o, "ageBand", "age_band", "age");
  const age = ageRaw && ["0-4", "5-14", "15-29", "30-49", "50+"].includes(ageRaw) ? ageRaw : ageRaw && /^\d{1,3}$/.test(ageRaw) ? ageBand(Number(ageRaw)) : null;
  const sexRaw = (pick(o, "sex", "patientSex", "patient_sex") ?? "").toLowerCase();
  const washRaw = (pick(o, "woundWashed", "wound_washed", "washed", "woundWashing", "wound_washing") ?? "").toLowerCase();
  const washed = ["before_arrival", "at_facility", "not_washed"].includes(washRaw) ? washRaw : /not|no\b/.test(washRaw) ? "not_washed" : /here|facility|clinic|hospital/.test(washRaw) ? "at_facility" : /before|home/.test(washRaw) ? "before_arrival" : null;
  const consentRaw = o.reminderConsent ?? o.reminder_consent ?? o.consent;
  const spRaw = (pick(o, "species", "animalSpecies", "animal_species") ?? "").toLowerCase();
  const own = (pick(o, "ownership") ?? "").toLowerCase();
  return {
    exposure_on: day, time, kind, category,
    species: ["dog", "cat", "cattle", "monkey", "wildlife", "other", "unknown"].includes(spRaw) ? spRaw : null,
    ownership: ["community", "owned", "unknown"].includes(own) ? own : null,
    age, sex: ["female", "male", "other"].includes(sexRaw) ? sexRaw : null,
    ref: pick(o, "patientRef", "patient_ref", "registerNumber", "register_number", "ref"),
    washed, consent: typeof consentRaw === "boolean" ? consentRaw : null,
    phone: pick(o, "contactPhone", "contact_phone", "phone"),
    site: pick(o, "site", "bodySite", "body_site", "woundSite", "wound_site"),
    animal: pick(o, "animalDescription", "animal_description"),
    place: pick(o, "animalPlace", "animal_place", "place"),
    area: pick(o, "areaName", "area_name", "area"),
    areaId: pick(o, "areaId", "area_id"),
    facility: pick(o, "facilityName", "facility_name"),
  };
}
