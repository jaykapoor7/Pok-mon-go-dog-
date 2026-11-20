/* Kaju on the field home (src/nx/pages/ngo/Field.tsx). A field worker says what they are doing ("I'm about to start
   vaccinations", "released the dog", "what's left?") and Kaju answers from the records already on the page: their own
   cases and follow-ups, their organisation's drives, each case's ABC evidence checklist and what waits on this phone.
   The answer names the existing screen that does the work (a drive, a case's vaccination form, the record screen) and
   opens it with the right context; it never saves anything, never says something was done, and never invents a drive,
   an animal or a count. A sentence it does not recognise as field work is not answered here: the page sends it to
   Kaju itself (/api/ai), so a question is never met with a made-up reply. Pure functions, no reads: checked by
   scripts/test-field-kaju.ts. */

import type { EvidenceKind } from "@/lib/abc";
import type { IntakeData, OperationKind } from "@/lib/operations";

export type FieldIntent = "vaccinate" | "sterilise" | "release" | "followup" | "record" | "status" | "report" | "help";

/** A stop on the worker's round: a case they hold, or a follow-up due on one. */
export type Stop = {
  key: string;
  kind: "case" | "followup";
  caseId: string | null;
  /** What the work is: "Sterilisation (ABC)", "Recheck". */
  title: string;
  /** The animal as the register names it: "Bindu (116)". */
  animal: string | null;
  dogId: string | null;
  place: string | null;
  started?: boolean;
  /** Follow-ups: the day it is due (ISO) and whether that has passed. */
  due?: string | null;
  late?: boolean;
  /** The animal's recorded status: true, false, null when the register has none, undefined when it was not read. */
  vaccinated?: boolean | null;
  sterilised?: boolean | null;
  /** ABC cases: the database's own evidence checklist, when it was read. */
  abc?: { missing: EvidenceKind[]; required: EvidenceKind[]; vetOk: boolean; reviewed: boolean } | null;
};

export type Drive = {
  id: string; name: string; kind: string; zone: string | null; starts_on: string | null; ends_on: string | null;
  total: number; vaccinated: number; not_vaccinated: number; vacc_unknown: number; sterilised: number; not_sterilised: number; ster_unknown: number;
};

export type World = {
  /** The worker's own stops, most pressing first (late follow-ups, then due, then cases). */
  stops: Stop[];
  /** The organisation's active drives; null when they could not be read. */
  drives: Drive[] | null;
  /** Records on this phone: waiting to be sent, and refused by the server. */
  waiting: number;
  failed: number;
  /** Labels of records sent from this phone today. */
  sentToday: string[];
  /** Today, YYYY-MM-DD, in the reader's time zone. */
  today: string;
  online: boolean;
};

/** Where an answer's button goes. Every target is an existing screen or control. */
export type Go =
  | { to: "stop"; key: string; tool?: "note" | "evidence" | "vacc" | "care"; evidence?: EvidenceKind; op?: OperationKind }
  | { to: "record"; category?: IntakeData["category"]; say?: string }
  | { to: "href"; href: string }
  | { to: "phone" };
export type Act = { label: string; go: Go; primary?: boolean };
export type Answer = { intent: FieldIntent; text: string; acts: Act[] };

/* ── Reading what was said ───────────────────────────────────────── */

const has = (t: string, re: RegExp) => re.test(t);
/** A word stated, not negated or already done: "not vaccinated" and "already vaccinated" do not ask to vaccinate. */
function states(t: string, re: RegExp) {
  const g = new RegExp(re.source, "gi");
  for (let m = g.exec(t); m; m = g.exec(t)) {
    const before = t.slice(Math.max(0, m.index - 14), m.index);
    if (!/\b(not|no|never|already|un|isn't|wasn't|isnt|wasnt)\s*$/i.test(before)) return true;
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  return false;
}

const STATUS = /\bkya baaki\b|\bbaaki (kya|hai)\b|\b(what'?s|what is|what are|anything)\s+(left|next|remaining|pending|late|due|on (my|the) (list|round|plate)|for me)\b|\bwhat (do|should) i do\b|\b(where am i|my day|my round|my work|my tasks|my list|done for (the|to)day|finished for (the|to)day|wrap(ping)? up|end of (the )?day|summary|how am i doing|what have i done|what did i do)\b|\bwhat'?s (done|been done)\b|\b(am i|i'?m) (done|finished)\b/i;
const ASKS = /^\s*(how many|how much|show me|list|count|compare|which (animals|dogs|wards|areas|cases|places)|where are)\b/i;
const HELP = /^\s*(help|hi|hello|hey|namaste|what can you do|how does this work|how do i use (this|you))\b|\bwhat can you (do|help)/i;
const REPORT = /\b(evidence|report(ing|s)?|paperwork|proof|upload(ed|ing)?|submi(t|ssion)|ear[- ]?notch|surgery record)\b|\b(photos?|pictures?)\b.{0,16}\b(missing|needed|left|pending)\b|\bmissing (photos?|evidence|proof)\b/i;
const RELEASE = /\b(releas(e|ed|ing)|let (it|him|her|them|the dogs?) go|dropp(ed|ing) (it|him|her|them|the dogs?) back|put (it|him|her|them) back|returned (it|him|her|them|the dogs?) to)\b|\bchhod\b/i;
const FOLLOWUP = /\b(follow[- ]?ups?|re-?check|check(ing)? on|observ(e|ation|ing)|revisit|re-?visit|day \d+ (check|observation))\b/i;
const VACCINATE = /\b(vaccin\w*|arv|anti[- ]?rabies|rabies (shot|jab|dose)|jabs?|teeka|tika)\b/i;
const STERILISE = /\b(sterili[sz]\w*|abc\b|neuter\w*|spay\w*|castrat\w*|nasbandi|catch(ing)?|caught|captur\w*|net(ting|ted)?\b|pick(ing|ed)? up dogs)\b/i;
const RECORD = /\b(found|saw|seen|spotted|there'?s a|there is a|new (dog|animal|puppy)|record (a|an|this|the) (dog|animal|puppy)|injur\w*|hurt|bleed\w*|limp\w*|wound\w*|sick|stuck|rescue\w*|hit by)\b/i;

/** What field work a sentence is about, or null when it is not field work Kaju answers here. */
export function readIntent(raw: string): FieldIntent | null {
  const t = typeof raw === "string" ? raw.slice(0, 500).trim() : "";
  if (!t) return null;
  if (has(t, STATUS)) return "status";
  /* Questions that count, list or compare the register ("how many are sterilised?") are Kaju's own, with its sources. */
  if (has(t, ASKS)) return null;
  if (has(t, REPORT) && !has(t, RECORD)) return "report";
  if (states(t, RELEASE)) return "release";
  if (states(t, FOLLOWUP)) return "followup";
  if (states(t, VACCINATE)) return "vaccinate";
  if (states(t, STERILISE)) return "sterilise";
  if (has(t, RECORD)) return "record";
  if (has(t, HELP)) return "help";
  return null;
}

/* ── Answering from the records ───────────────────────────────────── */

const n = (k: number, one: string, many: string) => `${k.toLocaleString("en-IN")} ${k === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
/** "Bindu (116)" → "Bindu"; an unnamed "Dog 128" stays as it is. */
const short = (animal: string) => animal.replace(/\s*\([^)]*\)\s*$/, "") || animal;
const who = (s: Stop) => s.animal ?? s.title;
const whose = (s: Stop) => (s.animal ? `${short(s.animal)}'s` : "this case's");
const at = (s: Stop) => (s.place ? ` in ${s.place}` : "");
const EVIDENCE: Record<EvidenceKind, string> = { capture_photo: "the capture photo", surgery_record: "the surgery record", ear_notch_photo: "the ear-notch photo", release_photo: "the release photo", release_location: "the release place" };
const ADD: Record<EvidenceKind, string> = { capture_photo: "Add the capture photo", surgery_record: "Add the surgery record", ear_notch_photo: "Add the ear-notch photo", release_photo: "Add the release photo", release_location: "Add the release place" };
const dayWords = (iso: string, today: string) => {
  if (iso.slice(0, 10) === today) return "today";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
};
const runningOn = (d: Drive, today: string) => (!d.starts_on || d.starts_on.slice(0, 10) <= today) && (!d.ends_on || d.ends_on.slice(0, 10) >= today);
const startsSoon = (d: Drive, today: string) => !!d.starts_on && d.starts_on.slice(0, 10) > today && Date.parse(`${d.starts_on.slice(0, 10)}T12:00:00`) - Date.parse(`${today}T12:00:00`) <= 7 * 864e5;
const isKind = (d: Drive, k: string) => d.kind === k;
const driveHref = (d: Drive) => `/ngo/programmes/${d.id}`;

/** A stop that mentions the animal named in the sentence comes first, so "Bindu's release" is about Bindu. */
function focus(stops: Stop[], text: string) {
  const t = text.toLowerCase();
  const named = stops.filter((s) => s.animal && new RegExp(`\\b${short(s.animal).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  return named.length ? [...named, ...stops.filter((s) => !named.includes(s))] : stops;
}

function vaccinate(w: World, stops: Stop[]): Answer {
  const acts: Act[] = [];
  const drives = w.drives ?? [];
  const live = drives.filter((d) => isKind(d, "vaccination") && runningOn(d, w.today));
  const soon = drives.filter((d) => isKind(d, "vaccination") && startsSoon(d, w.today)).sort((a, b) => (a.starts_on ?? "").localeCompare(b.starts_on ?? ""));
  if (live.length) {
    const d = live[0], left = d.not_vaccinated + d.vacc_unknown;
    const text = d.total
      ? `You have a vaccination drive on today${d.zone ? ` in ${d.zone}` : ""}: ${d.name}. ${n(d.total, "animal is", "animals are")} filed in it, and ${n(left, "has", "have")} no vaccination recorded yet. Ready to begin?`
      : `You have a vaccination drive on today${d.zone ? ` in ${d.zone}` : ""}: ${d.name}. No animals are filed in it yet; each one you record is added to the register. Ready to begin?`;
    return { intent: "vaccinate", text: live.length > 1 ? `${text} ${n(live.length - 1, "other vaccination drive is", "other vaccination drives are")} running too.` : text, acts: [{ label: "Start the drive", go: { to: "href", href: driveHref(d) }, primary: true }, { label: "Record an animal to vaccinate", go: { to: "record", category: "vaccination" } }] };
  }
  /* Only a status the register holds counts: not vaccinated, or none recorded. A status that was not read is not a gap. */
  const need = stops.filter((s) => s.kind === "case" && s.dogId && (s.vaccinated === false || s.vaccinated === null));
  const done = stops.filter((s) => s.kind === "case" && s.dogId && s.vaccinated === true);
  const opener = w.drives === null ? "Your drives could not be read just now." : soon.length ? `Nothing is scheduled for today. Your next vaccination drive, ${soon[0].name}, starts ${dayWords(soon[0].starts_on!, w.today)}${soon[0].zone ? ` in ${soon[0].zone}` : ""}.` : "There's no vaccination drive on today.";
  if (soon.length) acts.push({ label: "Open the drive", go: { to: "href", href: driveHref(soon[0]) } });
  if (need.length) {
    const s = need[0];
    const more = need.length > 1 ? ` ${n(need.length - 1, "more stop needs", "more stops need")} one after that.` : "";
    return { intent: "vaccinate", text: `${opener} On your round, ${who(s)}${at(s)} ${s.vaccinated === false ? "is recorded as not vaccinated" : "has no vaccination recorded"}. Ready to record it?${more}`, acts: [{ label: `Record ${whose(s)} vaccination`, go: { to: "stop", key: s.key, tool: "vacc" }, primary: true }, ...acts, { label: "Record a new animal", go: { to: "record", category: "vaccination" } }] };
  }
  const already = done.length ? `: ${list(done.slice(0, 3).map(who))} ${done.length === 1 ? "is" : "are"} already recorded as vaccinated` : "";
  return { intent: "vaccinate", text: `${opener} Nothing on your round needs a vaccination${already}. When a dog is in front of you, record it and choose Vaccinate.`, acts: [{ label: "Record an animal to vaccinate", go: { to: "record", category: "vaccination" }, primary: true }, ...acts] };
}

function sterilise(w: World, stops: Stop[]): Answer {
  const live = (w.drives ?? []).filter((d) => isKind(d, "sterilisation") && runningOn(d, w.today));
  const capture = stops.find((s) => s.abc?.missing.includes("capture_photo"));
  if (live.length) {
    const d = live[0];
    return { intent: "sterilise", text: `Your sterilisation drive is on today${d.zone ? ` in ${d.zone}` : ""}: ${d.name}. ${n(d.total, "animal is", "animals are")} filed in it; ${n(d.not_sterilised + d.ster_unknown, "is", "are")} not recorded as sterilised. Record each dog as you catch it.`,
      acts: [{ label: "Record a capture", go: { to: "record", category: "sterilisation" }, primary: true }, { label: "Open the drive", go: { to: "href", href: driveHref(d) } }] };
  }
  if (capture) return { intent: "sterilise", text: `${whose(capture).replace(/^./, (c) => c.toUpperCase())} case${at(capture)} still needs the capture photo. Add it now, or record a new dog as you catch it.`, acts: [{ label: ADD.capture_photo, go: { to: "stop", key: capture.key, tool: "evidence", evidence: "capture_photo" }, primary: true }, { label: "Record a capture", go: { to: "record", category: "sterilisation" } }] };
  const opener = w.drives === null ? "Your drives could not be read just now. " : "There's no sterilisation drive on today. ";
  return { intent: "sterilise", text: `${opener}Record each dog as you catch it: a photo, where, and Sterilise. ${w.online ? "It saves straight to the register." : "It waits on this phone until there is signal."}`, acts: [{ label: "Record a capture", go: { to: "record", category: "sterilisation" }, primary: true }] };
}

function release(w: World, stops: Stop[]): Answer {
  const abc = stops.filter((s) => s.kind === "case" && s.abc);
  const open = abc.find((s) => s.abc!.missing.some((k) => k === "release_photo" || k === "release_location"));
  if (open) {
    const gaps = open.abc!.missing.filter((k) => k === "release_photo" || k === "release_location");
    const first = gaps[0];
    return { intent: "release", text: `${whose(open).replace(/^./, (c) => c.toUpperCase())} release isn't complete yet: it still needs ${list(gaps.map((k) => EVIDENCE[k]))}. Add ${gaps.length === 1 ? "it" : "them"} now?`,
      acts: [{ label: ADD[first], go: { to: "stop", key: open.key, tool: "evidence", evidence: first }, primary: true }, { label: "Record the release", go: { to: "stop", key: open.key, tool: "care", op: "release" } }] };
  }
  const rescue = stops.find((s) => s.kind === "case" && s.dogId && !s.abc);
  if (rescue) return { intent: "release", text: `Releasing ${who(rescue)}${at(rescue)}? Record the release on the case, with where it happened.`, acts: [{ label: `Record ${whose(rescue)} release`, go: { to: "stop", key: rescue.key, tool: "care", op: "release" }, primary: true }, { label: "Find another animal", go: { to: "href", href: "/ngo/animals" } }] };
  const done = abc.filter((s) => !s.abc!.missing.length);
  if (done.length) {
    const s = done[0];
    return { intent: "release", text: `${whose(s).replace(/^./, (c) => c.toUpperCase())} release is already on record, with its photo and place. If you released another dog, find it on the register and record the release on its case.`,
      acts: [{ label: "Find the animal", go: { to: "href", href: "/ngo/animals" }, primary: true }, ...(s.caseId ? [{ label: `Open ${whose(s)} case`, go: { to: "href" as const, href: `/ngo/cases/${s.caseId}` } }] : [])] };
  }
  return { intent: "release", text: "Releases are recorded on the animal's case. Find the dog on your register, then add the release photo and place.", acts: [{ label: "Find the animal", go: { to: "href", href: "/ngo/animals" }, primary: true }] };
}

function followup(w: World, stops: Stop[]): Answer {
  const due = stops.filter((s) => s.kind === "followup");
  if (!due.length) {
    const cases = stops.filter((s) => s.kind === "case").length;
    return { intent: "followup", text: `No follow-ups are due on your cases this week.${cases ? ` Your ${n(cases, "open case needs", "open cases need")} no check before then.` : ""}`, acts: [{ label: "See the team's follow-ups", go: { to: "href", href: "/ngo/cases?view=due" }, primary: true }] };
  }
  const late = due.filter((s) => s.late).length, s = due[0];
  return { intent: "followup", text: `You have ${n(due.length, "follow-up", "follow-ups")} due${late ? `, ${late} late` : ""}. First: ${s.title.toLowerCase()} for ${who(s)}${at(s)}, due ${s.due ? dayWords(s.due, w.today) : "soon"}.`,
    acts: [{ label: late ? "Go to the late one" : "Go to it", go: { to: "stop", key: s.key }, primary: true }] };
}

function record(text: string, w: World): Answer {
  const urgent = /\b(injur\w*|hurt|bleed\w*|wound\w*|stuck|hit by|rescue\w*|can'?t walk|unconscious)\b/i.test(text);
  return { intent: "record", text: `Record it now: a photo, why and where. What you said fills in the choices, so check each one before you save.${urgent ? " If it needs a vet now, open a case as well so the team sees it straight away." : ""}${w.online ? "" : " Without signal it waits on this phone."}`,
    acts: [{ label: "Record this animal", go: { to: "record", say: text }, primary: true }, ...(urgent ? [{ label: "Open a case", go: { to: "href" as const, href: "/ngo/cases/new" } }] : [])] };
}

/** Where an ABC case stands, in a sentence, from the database's own checklist. */
function abcLine(s: Stop) {
  const a = s.abc!;
  const name = `${who(s)}${at(s)}`;
  if (a.missing.length) return `${name} still needs ${list(a.missing.map((k) => EVIDENCE[k]))}.`;
  if (!a.vetOk) return `${name} has every evidence item and waits for the vet's sign-off.`;
  if (!a.reviewed) return `${name} has all ${a.required.length || 5} evidence items and the vet's sign-off; it waits for a coordinator's review.`;
  return `${name}: the evidence has been reviewed.`;
}

function status(w: World, stops: Stop[]): Answer {
  const cases = stops.filter((s) => s.kind === "case"), fus = stops.filter((s) => s.kind === "followup");
  const late = fus.filter((s) => s.late);
  const parts: string[] = [];
  if (w.sentToday.length) parts.push(`Sent from this phone today: ${n(w.sentToday.length, "record", "records")}.`);
  if (!stops.length) parts.push("Nothing is assigned to you right now.");
  else {
    const on = [cases.length ? n(cases.length, "case", "cases") : "", fus.length ? n(fus.length, "follow-up", "follow-ups") : ""].filter(Boolean);
    parts.push(`You have ${list(on)} on your round.`);
    for (const s of cases.filter((x) => x.abc).slice(0, 2)) parts.push(abcLine(s));
    const plain = cases.filter((x) => !x.abc);
    if (plain.length === 1 && cases.length === 1) parts.push(`${who(plain[0])}${at(plain[0])} is ${plain[0].started ? "started" : "open"}.`);
  }
  const attention: string[] = [];
  if (late.length) attention.push(`${n(late.length, "follow-up is", "follow-ups are")} late`);
  if (w.failed) attention.push(`${n(w.failed, "record", "records")} on this phone did not send`);
  else if (w.waiting) attention.push(`${n(w.waiting, "record waits", "records wait")} on this phone to be sent`);
  parts.push(attention.length ? `Needs you: ${list(attention)}.` : "Nothing is late, and nothing is waiting on this phone.");
  const acts: Act[] = [];
  if (w.failed || w.waiting) acts.push({ label: w.failed ? "Fix what didn't send" : "Send what's waiting", go: { to: "phone" }, primary: true });
  if (late.length) acts.push({ label: "Go to the late follow-up", go: { to: "stop", key: late[0].key }, primary: !acts.length });
  if (!stops.length) acts.push({ label: "See unassigned cases", go: { to: "href", href: "/ngo/cases?view=unassigned" }, primary: !acts.length }, { label: "Record an animal", go: { to: "record" } });
  else if (cases[0]?.caseId) acts.push({ label: cases.length === 1 ? `Open ${whose(cases[0])} case` : "Open my cases", go: { to: "href", href: cases.length === 1 ? `/ngo/cases/${cases[0].caseId}` : "/ngo/cases?view=mine" }, primary: !acts.length });
  return { intent: "status", text: parts.join(" "), acts };
}

function report(stops: Stop[]): Answer {
  const abc = stops.filter((s) => s.kind === "case" && s.abc);
  const gap = abc.find((s) => s.abc!.missing.length);
  if (gap) {
    const first = gap.abc!.missing[0];
    return { intent: "report", text: `${whose(gap).replace(/^./, (c) => c.toUpperCase())} case is missing ${list(gap.abc!.missing.map((k) => EVIDENCE[k]))}. Once it's in, the case can go to the vet and your coordinator.`,
      acts: [{ label: ADD[first], go: { to: "stop", key: gap.key, tool: "evidence", evidence: first }, primary: true }, { label: "See all evidence", go: { to: "href", href: "/ngo/submissions?tab=evidence" } }] };
  }
  if (abc.length) return { intent: "report", text: `${abc.slice(0, 2).map(abcLine).join(" ")} Your coordinator builds the report from these records.`, acts: [{ label: "See all evidence", go: { to: "href", href: "/ngo/submissions?tab=evidence" }, primary: true }, ...(abc[0].caseId ? [{ label: `Open ${whose(abc[0])} case`, go: { to: "href" as const, href: `/ngo/cases/${abc[0].caseId}` } }] : [])] };
  return { intent: "report", text: "None of your cases is waiting on ABC evidence. To add a note or a photo to a case, open it in your work below.", acts: [{ label: "See all evidence", go: { to: "href", href: "/ngo/submissions?tab=evidence" }, primary: true }] };
}

function help(w: World): Answer {
  return { intent: "help", text: `Tell me what you're doing, in your own words: starting vaccinations, catching for ABC, a release, a follow-up, or a dog you've found. Or ask what's left today. I read your round and open the right screen; nothing is saved until you press Save.${w.online ? "" : " Without signal I can still read what's on this phone."}`,
    acts: [{ label: "Record an animal", go: { to: "record" }, primary: true }] };
}

/** Kaju's answer to one sentence, from the records given. Null when the sentence is not field work (ask Kaju itself). */
export function answerField(text: string, w: World): Answer | null {
  const intent = readIntent(text);
  if (!intent) return null;
  const stops = focus(w.stops, text);
  switch (intent) {
    case "vaccinate": return vaccinate(w, stops);
    case "sterilise": return sterilise(w, stops);
    case "release": return release(w, stops);
    case "followup": return followup(w, stops);
    case "record": return record(text, w);
    case "status": return status(w, stops);
    case "report": return report(stops);
    case "help": return help(w);
  }
}

/** One line under the greeting: what the day holds, from the same stops. */
export function daySummary(w: World): string {
  const cases = w.stops.filter((s) => s.kind === "case").length, fus = w.stops.filter((s) => s.kind === "followup");
  const late = fus.filter((s) => s.late).length;
  const live = (w.drives ?? []).filter((d) => runningOn(d, w.today) && (d.kind === "vaccination" || d.kind === "sterilisation"));
  const bits: string[] = [];
  if (live.length) bits.push(`${live[0].kind === "vaccination" ? "A vaccination" : "A sterilisation"} drive is on today${live[0].zone ? ` in ${live[0].zone}` : ""}.`);
  if (!cases && !fus.length) bits.push("Nothing is assigned to you right now.");
  else bits.push(`${[cases ? n(cases, "case", "cases") : "", fus.length ? n(fus.length, "follow-up", "follow-ups") : ""].filter(Boolean).join(" and ")} on your round.`.replace(/^./, (c) => c.toUpperCase()));
  bits.push(late ? `${n(late, "follow-up is", "follow-ups are")} late.` : w.failed ? `${n(w.failed, "record", "records")} did not send.` : "Nothing is late.");
  return bits.join(" ");
}

/** Up to two shortcuts beside Record an animal, chosen from the day. Each is a sentence Kaju answers. */
export function quickAsks(w: World): { label: string; say: string; icon: "vacc" | "release" | "followup" | "ster" | "status" }[] {
  const live = (w.drives ?? []).filter((d) => runningOn(d, w.today));
  const vacc = live.find((d) => d.kind === "vaccination"), ster = live.find((d) => d.kind === "sterilisation");
  const out: ReturnType<typeof quickAsks> = [];
  out.push(vacc ? { label: "Start the vaccination drive", say: "I'm about to start vaccinations", icon: "vacc" } : ster ? { label: "Start catching", say: "I'm starting the sterilisation drive", icon: "ster" } : { label: "Start vaccinations", say: "I'm about to start vaccinations", icon: "vacc" });
  const fus = w.stops.filter((s) => s.kind === "followup");
  const releaseGap = w.stops.some((s) => s.abc?.missing.some((k) => k === "release_photo" || k === "release_location"));
  out.push(fus.length && !releaseGap ? { label: fus.some((s) => s.late) ? "Late follow-ups" : "Follow-ups due", say: "Which follow-ups are due?", icon: "followup" } : { label: "Record a release", say: "I'm recording a release", icon: "release" });
  return out;
}
