/* ════════════════════════════════════════════════════════════════════
   Kaju's understanding, without a model.

   Everything here is a pure function over text: no database, no network,
   no randomness. It does four jobs the router could not do with one
   regular expression per question:

   1 normalise   spelling slips, Hinglish and field shorthand become the
                 words the router already knows ("kitne case baki hai" →
                 "how many cases open")
   2 parse       a question about cases becomes a structured query
                 (count / list / breakdown / top, with filters and a time
                 window), and a short follow-up ("only unassigned", "and
                 last month?", "by zone") changes the previous query
   3 explain     a glossary of the programme's own terms
   4 recover     when nothing matches, the closest things Kaju can do

   The model path does not use this file; it is the tools-only engine's
   reading of the question. Nothing here reads or invents a record.
   ════════════════════════════════════════════════════════════════════ */

/* ── 1 · normalise ────────────────────────────────────────────────── */
const FIXES: [RegExp, string][] = [
  // spelling slips seen in field messages
  [/\bster[il]{1,2}[sz]ations?\b|\bsterlisations?\b|\bsterlizations?\b/g, "sterilisation"],
  [/\bster[il]{1,2}[sz]ed\b|\bsterlised\b|\bsterlized\b|\bneutered\b|\bspayed\b/g, "sterilised"],
  [/\bvacc?inations?\b|\bvaccines?\b|\bvaxx?\b/g, "vaccination"],
  [/\bvacc?inated\b/g, "vaccinated"],
  [/\bfol+ow[\s-]?ups?\b/g, "follow-up"],
  [/\bun[- ]?as+igned\b|\bnot assigned\b|\bnobody assigned\b|\bno ?one assigned\b|\bwithout (?:an? )?(?:owner|assignee)\b/g, "unassigned"],
  [/\bver[ie]?f[ie]?cations?\b/g, "verification"],
  [/\bevid[ae]nces?\b/g, "evidence"],
  [/\bpack(?:a)?ges?\b|\bpackges?\b/g, "package"],
  [/\brec[ie]{2}ved?\b/g, "received"],
  [/\bprogram(?:s)?\b/g, "programme"],
  [/\bauthori[sz]ations?\b/g, "authorisation"],
  // Hinglish and field shorthand
  [/\bkitn[aei]\b|\bkitney\b/g, "how many"],
  [/\bba+ki\b|\bbacha\b|\bbache\b|\bpending\b|\boutstanding\b|\bremaining\b|\bleft over\b/g, "open"],
  [/\bho gaya\b|\bho gaye\b|\bkhatam\b|\bcompleted\b|\bfinished\b|\bresolved\b/g, "closed"],
  [/\baaj\b/g, "today"],
  [/\bis haft[ea]\b|\bthis wk\b/g, "this week"],
  [/\bpichhl[ea] haft[ea]\b|\blast wk\b/g, "last week"],
  [/\bis mahin[ea]\b/g, "this month"],
  [/\bpichhl[ea] mahin[ea]\b/g, "last month"],
  [/\bkutt[aeo]\b|\bkutton\b|\bdoggos?\b|\bstrays?\b|\bpups?\b|\bpuppies\b/g, "dogs"],
  [/\bnasbandi\b/g, "sterilisation"],
  [/\bt[ie]{1,2}ka\b|\bteeka\b/g, "vaccination"],
  [/\bghayal\b|\bwounded\b|\bhurt\b/g, "injured"],
  [/\bdikha(?:o| do| de)\b|\bbata(?:o| do| de)\b/g, "show"],
  [/\bkholo\b|\bkhol do\b/g, "open the"],
  [/\bkaun\b|\bkis ?ne\b|\bkiske paas\b/g, "who"],
  [/\bkahan?\b|\bkidhar\b/g, "where"],
  [/\bsab(?:se)? zyada\b|\bmaximum\b|\bhighest\b/g, "most"],
  [/\bsab(?:se)? kam\b|\bminimum\b|\blowest\b/g, "least"],
  [/\bmer[aei]\b|\bmujhe\b/g, "my"],
  [/\b(?:hai|hain|ka|ki|ke|ko|se|mein|me)\b(?=\s|$)/g, " "],
  // ways of asking for a number
  [/\bnumber of\b|\bcount of\b|\btotal (?:number of )?\b|\bhow much\b/g, "how many "],
  [/\bcase ?load\b/g, "open cases"],
  [/\bemergenc(?:y|ies)\b|\bserious\b/g, "critical"],
];

/** Lower-cased question with slips, Hinglish and shorthand rewritten. Long pasted text is left alone. */
export function normalise(q: string): string {
  const s = q.trim();
  if (s.length > 220) return s.toLowerCase();
  let t = ` ${s.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ")} `;
  for (const [re, to] of FIXES) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}

/* ── 2 · case questions ───────────────────────────────────────────── */
export type GroupBy = "zone" | "assignee" | "condition" | "status" | "month";
export type CaseQuery = {
  measure: "count" | "list" | "breakdown" | "top";
  by?: GroupBy;
  /** "top": most or fewest first. */
  order?: "most" | "least";
  state: "open" | "closed" | "all";
  unassigned?: boolean;
  mine?: boolean;
  critical?: boolean;
  overdue?: boolean;
  /** Open with nothing recorded for at least this many days. */
  quietDays?: number;
  /** Opened at least this many days ago. */
  olderDays?: number;
  since?: string; until?: string; window?: string;
  historical?: boolean;
  /** Words left over that may name a zone, a person or a condition; resolved against the records themselves. */
  terms: string[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfWeek = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** A time window named in the text, as inclusive since / exclusive until dates. */
export function timeWindow(t: string, now = new Date()): { since?: string; until?: string; window?: string; rest: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const cut = (re: RegExp) => t.replace(re, " ");
  let m: RegExp;
  if ((m = /\btoday\b/).test(t)) return { since: iso(today), until: iso(add(today, 1)), window: "today", rest: cut(m) };
  if ((m = /\byesterday\b/).test(t)) return { since: iso(add(today, -1)), until: iso(today), window: "yesterday", rest: cut(m) };
  if ((m = /\bthis week\b/).test(t)) return { since: iso(startOfWeek(today)), until: iso(add(today, 1)), window: "this week", rest: cut(m) };
  if ((m = /\blast week\b|\bprevious week\b/).test(t)) { const s = add(startOfWeek(today), -7); return { since: iso(s), until: iso(add(s, 7)), window: "last week", rest: cut(m) }; }
  if ((m = /\bthis month\b/).test(t)) return { since: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), until: iso(add(today, 1)), window: "this month", rest: cut(m) };
  if ((m = /\blast month\b|\bprevious month\b/).test(t)) { const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); return { since: iso(s), until: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), window: "last month", rest: cut(m) }; }
  if ((m = /\bthis year\b/).test(t)) return { since: `${today.getUTCFullYear()}-01-01`, until: iso(add(today, 1)), window: "this year", rest: cut(m) };
  const lastN = t.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+(day|week|month)s?\b/);
  if (lastN) { const n = Number(lastN[1]) * (lastN[2] === "day" ? 1 : lastN[2] === "week" ? 7 : 30); return { since: iso(add(today, -n)), until: iso(add(today, 1)), window: `the last ${lastN[1]} ${lastN[2]}${lastN[1] === "1" ? "" : "s"}`, rest: t.replace(lastN[0], " ") }; }
  const named = t.match(new RegExp(`\\b(?:in |during |for )?(${MONTHS.join("|")}|${MONTHS.map((x) => x.slice(0, 3)).join("|")})\\b(?:\\s+(\\d{4}))?`));
  if (named) {
    const i = MONTHS.findIndex((x) => x.startsWith(named[1].slice(0, 3)));
    let y = named[2] ? Number(named[2]) : today.getUTCFullYear();
    if (!named[2] && i > today.getUTCMonth()) y -= 1; // "in December" asked in March means the one that has happened
    return { since: iso(new Date(Date.UTC(y, i, 1))), until: iso(new Date(Date.UTC(y, i + 1, 1))), window: `${MONTHS[i][0].toUpperCase()}${MONTHS[i].slice(1)} ${y}`, rest: t.replace(named[0], " ") };
  }
  return { rest: t };
}

const CASE_NOUN = /\b(cases?|requests?|rescues?|reports?|work|calls?|complaints?|tickets?)\b/;
const ASK = /\b(how many|list|show|which|who|where|what|most|least|top|break ?down|split|by (?:zone|area|ward|locality|person|assignee|staff|member|condition|type|category|status|month)|per (?:zone|area|ward|person|month)|older than|more than \d+ days|since|compare)\b/;
const NOISE = /\b(how many|list|show|me|us|the|a|an|all|any|of|for|in|on|at|by|to|with|from|and|or|are|is|was|were|there|have|has|had|been|do|does|did|we|our|i|my|you|can|please|tell|give|get|see|find|what|which|who|where|whose|when|that|this|these|those|it|them|ones?|only|just|also|about|still|now|currently|right|so|far|cases?|requests?|rescues?|reports?|work|calls?|open|closed|unassigned|critical|urgent|overdue|most|least|top|breakdown|break|down|split|per|each|every|count|number|total|older|than|more|days?|weeks?|months?|quiet|stale|stalled|many|much|new|opened|came|logged|received|holds?|holding|handling|handled|assigned|got|zone|zones|area|areas|ward|wards|locality|localities|person|people|staff|member|members|team|assignee|condition|conditions|type|types|category|status|statuses|month|historical|imported|not|no|kaju|vs|versus|compared?|kinds?|sorts?)\b/g;

function features(t: string, now: Date) {
  const w = timeWindow(t, now);
  const r = w.rest;
  const by: GroupBy | undefined =
    /\b(?:by|per|each|which|what) (?:zone|area|ward|locality|localities|place)s?\b|\bwhere\b.*\bmost\b|\b(?:zone|area|ward)[- ]wise\b/.test(r) ? "zone"
    : /\bby (?:person|assignee|staff|member|team|who)\b|\bper (?:person|member)\b|\bwho (?:has|holds|is holding|is handling|handles|got)\b|\bwhose\b|\bperson[- ]wise\b/.test(r) ? "assignee"
    : /\bby (?:condition|type|category|kind|reason)\b|\bwhat (?:kind|type|sort)s?\b|\bcondition[- ]wise\b/.test(r) ? "condition"
    : /\bby status\b|\bstatus[- ]wise\b/.test(r) ? "status"
    : /\bby month\b|\bper month\b|\bmonth[- ]wise\b|\bmonthly\b|\btrend\b|\bover time\b/.test(r) ? "month" : undefined;
  const older = r.match(/\b(?:older than|more than|over|for more than|open for)\s+(\d{1,3})\s+(day|week|month)s?\b/);
  const quiet = r.match(/\b(?:quiet|no update|nothing recorded|not updated|stale|stalled|untouched)\b(?:.*?\b(\d{1,3})\s+(day|week)s?\b)?/);
  const days = (n: string, u: string) => Number(n) * (u === "day" ? 1 : u === "week" ? 7 : 30);
  return {
    w, by,
    order: /\bleast\b|\bfewest\b/.test(r) ? "least" as const : /\bmost\b|\btop\b|\bbusiest\b/.test(r) ? "most" as const : undefined,
    state: /\bclosed\b/.test(r) ? "closed" as const : /\b(?:all|every|total|opened|came in|logged|received|new)\b/.test(r) && !/\bopen cases?\b/.test(r) ? "all" as const : /\bopen\b|\bactive\b|\blive\b|\bcurrent\b/.test(r) ? "open" as const : undefined,
    unassigned: /\bunassigned\b/.test(r) || undefined,
    mine: /\b(?:my|mine|assigned to me|i hold|i have|with me)\b/.test(r) || undefined,
    critical: /\bcritical\b|\burgent\b/.test(r) || undefined,
    overdue: /\boverdue\b|\blate\b|\bpast due\b/.test(r) || undefined,
    olderDays: older ? days(older[1], older[2]) : undefined,
    quietDays: quiet ? (quiet[1] ? days(quiet[1], quiet[2]) : 14) : undefined,
    historical: /\bhistorical\b|\bimported\b/.test(r) || undefined,
    list: /\b(?:list|show|which|what are)\b/.test(r),
    count: /\bhow many\b/.test(r),
    terms: r.replace(older?.[0] ?? "\u0000", " ").replace(/[?.!,:;"'()]/g, " ").replace(NOISE, " ").replace(/\b\d+\b/g, " ").split(/\s+/).filter((x) => x.length > 2).slice(0, 4),
  };
}

/** A question about cases as a structured query, or null when it is not one.
    With `carry` (the previous case query in this conversation), a short follow-up changes it. */
export function parseCaseQuery(text: string, opts: { carry?: CaseQuery | null; now?: Date } = {}): CaseQuery | null {
  const t = normalise(text);
  if (t.length > 160) return null;
  const now = opts.now ?? new Date();
  const f = features(t, now);
  const words = t.split(/\s+/).length;
  const hasSignal = !!(f.by || f.order || f.unassigned || f.mine || f.critical || f.overdue || f.olderDays || f.quietDays || f.w.window || f.state || f.terms.length);
  const standalone = CASE_NOUN.test(t) && ASK.test(t);
  /* A follow-up is short, adds something, and does not start a different job. */
  const followUp = !!opts.carry && !standalone && words <= 9 && hasSignal
    && /^(?:and|what about|how about|only|just|now|ok|okay|same|also|then|but|show|list|which|who|where|by|per|in|for|last|this|closed|open|unassigned|critical|overdue|my|compare)\b/.test(t)
    && !/\b(package|claim|bill|evidence|duplicate|programme|verification|vet|photo|animal register|academy|email|file|calendar|draft|write|note|follow-up)\b/.test(t);
  if (!standalone && !followUp) return null;
  /* Leave questions other tools answer better where they are. */
  if (standalone && /\b(missing|without|no photo|duplicate|package|claim|bill|verification|vet sign|evidence|programme|sterilis|vaccinat)\b/.test(t) && !f.by && !f.w.window && !f.unassigned && !f.critical) return null;

  const base: CaseQuery = followUp ? { ...opts.carry!, terms: [...opts.carry!.terms] } : { measure: "count", state: "open", terms: [] };
  const q: CaseQuery = { ...base };
  if (f.state) q.state = f.state;
  else if (!followUp && f.w.window) q.state = "all"; // "cases this week" means opened this week, open or not
  if (f.w.window) { q.since = f.w.since; q.until = f.w.until; q.window = f.w.window; }
  for (const k of ["unassigned", "mine", "critical", "overdue", "olderDays", "quietDays", "historical"] as const) if (f[k] !== undefined) (q as Record<string, unknown>)[k] = f[k];
  if (f.terms.length) q.terms = followUp ? [...new Set([...f.terms])] : f.terms;
  if (f.by) { q.by = f.by; q.measure = f.order ? "top" : "breakdown"; q.order = f.order ?? q.order; }
  else if (f.order) { q.measure = "top"; q.order = f.order; q.by = q.by ?? "zone"; }
  else if (!followUp || f.list || f.count) { q.measure = f.list && !f.count ? "list" : "count"; if (!followUp) { delete q.by; delete q.order; } }
  if (q.overdue || q.quietDays || q.unassigned) q.state = f.state ?? "open";
  return q;
}

/** The query in words, for the answer's first line. */
export function describeQuery(q: CaseQuery, resolved: { zone?: string | null; assignee?: string | null; condition?: string | null } = {}): string {
  const parts: string[] = [];
  if (q.critical) parts.push("critical");
  if (q.unassigned) parts.push("unassigned");
  if (q.overdue) parts.push("overdue");
  parts.push(q.state === "all" ? "cases" : `${q.state} cases`);
  if (resolved.condition) parts.push(`for ${resolved.condition.toLowerCase()}`);
  if (resolved.zone) parts.push(`in ${resolved.zone}`);
  if (q.mine) parts.push("held by you");
  else if (resolved.assignee) parts.push(`held by ${resolved.assignee}`);
  if (q.olderDays) parts.push(`opened more than ${q.olderDays} days ago`);
  if (q.quietDays) parts.push(`with nothing recorded for ${q.quietDays} days`);
  if (q.window) parts.push(q.state === "closed" ? `opened ${q.window}` : q.window === "today" || q.window === "yesterday" ? `opened ${q.window}` : `opened in ${q.window}`.replace("in this", "this").replace("in last", "last").replace("in the last", "in the last"));
  if (q.historical) parts.push("(imported history included)");
  return parts.join(" ");
}

/** One-tap follow-ups that the parser above understands. */
export function nextQuestions(q: CaseQuery): string[] {
  const out: string[] = [];
  if (q.by !== "zone") out.push("By zone");
  if (q.by !== "assignee") out.push("Who holds the most?");
  if (!q.unassigned && q.state !== "closed") out.push("Only unassigned");
  if (!q.critical) out.push("Only critical");
  if (!q.window) out.push("And this month?"); else if (q.window !== "last month") out.push("And last month?");
  if (q.measure !== "list") out.push("List them");
  return out.slice(0, 4);
}

/* ── fuzzy matching, for names typed roughly ──────────────────────── */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
/** The value a rough word most plausibly names: exact, then a whole word inside it, then a prefix, then a near spelling. */
export function closest(term: string, values: string[]): string | null {
  const t = term.toLowerCase(); if (t.length < 3) return null;
  const lower = values.map((v) => [v, v.toLowerCase()] as const);
  return lower.find(([, l]) => l === t)?.[0]
    ?? lower.find(([, l]) => l.split(/[\s,()-]+/).includes(t))?.[0]
    ?? lower.find(([, l]) => l.startsWith(t) || l.split(/[\s,()-]+/).some((w) => w.length > 3 && t.length > 3 && w.startsWith(t)))?.[0]
    ?? lower.map(([v, l]) => [v, Math.min(editDistance(t, l), ...l.split(/[\s,()-]+/).map((w) => editDistance(t, w)))] as const).filter(([, d]) => d <= (t.length > 6 ? 2 : 1)).sort((x, y) => x[1] - y[1])[0]?.[0]
    ?? null;
}

/* ── 3 · the programme's own words ────────────────────────────────── */
export const GLOSSARY: { term: string; also: RegExp; text: string }[] = [
  { term: "ABC", also: /\babc\b|animal birth control/, text: "**Animal Birth Control (ABC)** is the programme of catching street dogs, sterilising and vaccinating them, and releasing each one where it was caught. In StrayPaw one ABC record is one animal's procedure with its evidence: capture photo, surgery record, ear-notch photo, release photo and release location." },
  { term: "ARV", also: /\barv\b|anti[- ]rabies/, text: "**ARV** is anti-rabies vaccination. It is recorded on the animal with its date and who gave it. A recorded vaccination is a claim by the organisation that keeps the record; it is not a certificate." },
  { term: "ear notch", also: /ear[- ]?notch|ear[- ]?tip|notched/, text: "An **ear notch** is the small mark made on a dog's ear during sterilisation so the animal can be recognised as sterilised from a distance. The ear-notch photo is one of the five evidence items on an ABC record." },
  { term: "evidence", also: /\b(?:five )?evidence(?: items?)?\b|what evidence/, text: "An ABC record carries **five evidence items**: capture photo, surgery record, ear-notch photo, release photo and release location. A record with any of them missing cannot be approved or claimed." },
  { term: "vet sign-off", also: /vet(?:erinary)? (?:sign[- ]?off|authoris\w+)|sign[- ]?off/, text: "**Vet sign-off** is the veterinarian authorising a procedure in their own name. Only a veterinarian can do it. Kaju can prepare the note for the vet to check; it cannot sign." },
  { term: "report package", also: /\b(?:report |monthly )?package\b/, text: "A **report package** is the month's approved records sent to the municipal office that funds the work. The office checks each line and accepts, queries, returns or rejects it. Acceptance is recorded by name, and acceptance is not payment." },
  { term: "claimable", also: /claimable|can be claimed|ready to bill/, text: "A procedure is **claimable** when its required evidence is present, a veterinarian has authorised it and a coordinator has reviewed it. Each procedure is claimed once, at the rate in the contract in force on its date." },
  { term: "imported record", also: /imported|historical record|source record/, text: "An **imported record** came from a register your organisation kept before StrayPaw (Excel or CSV). It stays labelled as historical until someone checks it through the workflow, and it is never counted as today's work." },
  { term: "unknown", also: /\bnot recorded\b|\bunknown status\b/, text: "**Not recorded** means the record does not say. It is never treated as no: an animal with no sterilisation recorded is shown as not recorded, not as unsterilised." },
  { term: "follow-up", also: /\bfollow-up\b/, text: "A **follow-up** is a dated promise on a case: a recheck, a second dose, a dressing change. It shows as overdue when its date passes with nothing recorded." },
  { term: "work queue", also: /work queue|\bqueue\b/, text: "The **work queue** is your organisation's open cases in priority order: critical first, then overdue follow-ups, then the rest. Imported history sits in its own list and never mixes with live work." },
  { term: "field mode", also: /field mode|offline/, text: "**Field mode** is the phone screen for people out with the animals. It works without signal: what you record is kept on the phone and sent when you are back online." },
  { term: "reviewing office", also: /reviewing office|municipal (?:office|reviewer)/, text: "A **reviewing office** is the municipal office that receives your packages. Its reviewers see evidence only for packages sent to their own office." },
  { term: "Kaju", also: /\bkaju\b/, text: "**Kaju** is StrayPaw's assistant. It reads your records with your own access, names the records it used, and prepares cases, notes, follow-ups, messages and reports for a person to confirm. It never approves, signs or submits." },
];
/** "what is X", "X means?", "define X", "X kya hai": the glossary entry, or null. */
export function glossaryAnswer(text: string): string | null {
  const t = normalise(text);
  const m = t.match(/^(?:what(?:'s| is| are| does)?|define|explain|meaning of|tell me about)\s+(?:an? |the )?(.{2,40}?)(?:\s+mean|\s+means|\s+stand for)?[?.!\s]*$/) ?? t.match(/^(.{2,30}?)\s+(?:kya|matlab|means?|meaning)[?.!\s]*$/);
  if (!m) return null;
  const want = m[1].trim();
  const hit = GLOSSARY.find((g) => g.term.toLowerCase() === want) ?? GLOSSARY.find((g) => g.also.test(want));
  return hit ? hit.text : null;
}

/* ── small talk Kaju should not send to search ────────────────────── */
export function smallTalk(text: string, name: string | null): string | null {
  const t = text.trim().toLowerCase().replace(/[!.?,]+$/g, "");
  if (/^(?:thanks|thank you|thankyou|thx|ty|shukriya|dhanyavaad|nandri|great|nice|perfect|good job|well done|cool|awesome)(?:\s+kaju)?$/.test(t)) return "Glad to help. Ask again whenever you need the records checked.";
  if (/^(?:ok|okay|k|got it|fine|alright|theek hai|thik hai|accha|acha)$/.test(t)) return "Okay. I am here when you need the next thing.";
  if (/^(?:bye|goodbye|see you|good night|gn)$/.test(t)) return "Take care. Your records will be here when you are back.";
  if (/^(?:who am i|what is my name|my name)$/.test(t)) return name ? `You are signed in as **${name}**.` : "You are not signed in.";
  if (/^(?:are you (?:an? )?(?:ai|bot|robot|human|real)|are you chatgpt|which model are you|what model)$/.test(t)) return "I am Kaju, StrayPaw's assistant. Right now I answer from your records with built-in rules and tools, not a language model, so I am precise about records and plain about what I cannot do.";
  return null;
}

/* ── 4 · when nothing matches: the closest things Kaju does ────────── */
const SKILLS: { ask: string; keys: string[]; org?: boolean; office?: boolean }[] = [
  { ask: "What should I do first?", keys: ["first", "priority", "start", "begin", "focus", "plan", "day", "morning", "todo"], org: true },
  { ask: "How many open cases?", keys: ["cases", "open", "count", "number", "load", "requests"], org: true },
  { ask: "Open cases by zone", keys: ["zone", "area", "ward", "where", "locality", "place"], org: true },
  { ask: "Who holds the most cases?", keys: ["who", "team", "staff", "assigned", "person", "member", "workload"], org: true },
  { ask: "What follow-ups are overdue?", keys: ["follow", "due", "overdue", "late", "missed", "recheck", "dose"], org: true },
  { ask: "Which records are missing evidence?", keys: ["missing", "photo", "evidence", "incomplete", "gap", "release"], org: true },
  { ask: "Show my ABC verification queue", keys: ["abc", "verification", "vet", "surgery", "sign", "procedure"], org: true },
  { ask: "Draft this month's claim", keys: ["claim", "bill", "billing", "money", "amount", "invoice", "payment"], org: true },
  { ask: "Find possible duplicate animals", keys: ["duplicate", "same", "twice", "merge", "repeat"], org: true },
  { ask: "What changed this week?", keys: ["week", "changed", "happened", "update", "news", "digest", "summary"], org: true },
  { ask: "Write a morning brief for the team", keys: ["brief", "message", "team", "write", "draft", "whatsapp", "standup"], org: true },
  { ask: "Draft a reminder for missing release photos", keys: ["remind", "reminder", "chase", "nudge", "photos", "field"], org: true },
  { ask: "What is waiting for me today?", keys: ["waiting", "decision", "review", "package", "submission", "pending"], office: true },
  { ask: "Show ward coverage and sudden changes", keys: ["ward", "coverage", "spike", "drop", "area", "map"], office: true },
  { ask: "Draft the monthly report", keys: ["report", "monthly", "commissioner", "note", "memo"], office: true },
  { ask: "Show published programmes", keys: ["programme", "published", "public", "drive", "city"] },
  { ask: "What is ABC?", keys: ["abc", "meaning", "explain", "what", "sterilisation"] },
  { ask: "Write a dog-bite first aid notice", keys: ["bite", "rabies", "notice", "poster", "first", "aid", "safety"] },
];
/** Up to four things Kaju can do that are closest to what was typed. */
export function nearestSkills(text: string, who: { org: boolean; office: boolean }): string[] {
  const words = new Set(normalise(text).split(/[^a-z-]+/).filter((w) => w.length > 2));
  const pool = SKILLS.filter((s) => (s.org ? who.org : s.office ? who.office : true));
  const scored = pool.map((s) => ({ s, n: s.keys.reduce((k, key) => k + ([...words].some((w) => w === key || (w.length > 4 && (w.startsWith(key) || key.startsWith(w)))) ? 1 : 0), 0) })).sort((a, b) => b.n - a.n);
  const hits = scored.filter((x) => x.n > 0).map((x) => x.s.ask);
  return (hits.length ? hits : pool.map((s) => s.ask)).slice(0, 4);
}
