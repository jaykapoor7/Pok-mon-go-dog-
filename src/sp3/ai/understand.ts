/* ════════════════════════════════════════════════════════════════════
   Kaju's ear: everyday wording → something Kaju can act on.

   People do not phrase things the way a router expects. "anything pending
   for me?", "hows the week going", "kitne dogs sterilised", "mk a deck for
   the corporation" all have an obvious meaning. This file finds it without
   a model:

     · canonical(q)  rewrites a loosely worded request to the wording the
                     record tools already understand, by scoring it against
                     each intent's vocabulary (typos and a little Hinglish
                     allowed). A request it is not sure about is left alone.
     · smallTalk(q)  thanks, greetings, "who are you": answered warmly, in
                     a line, and pointed back at the work.
     · howTo(q)      "how do I add a vet?": the real steps in this product,
                     with the screen to open.

   Nothing here reads a record or invents a fact; it only chooses words.
   ════════════════════════════════════════════════════════════════════ */

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const SWAP: [RegExp, string][] = [
  [/\bkitne|kitna|kitni\b/g, "how many"], [/\bkutte|kutta|doggos?|pups?|puppies|strays?\b/g, "dogs"], [/\bnasbandi|neuter(?:ed|ing)?|spay(?:ed|ing)?|sterlised|sterilized|sterlized\b/g, "sterilised"],
  [/\bteeka|tika|vaccine|vaccinated|vaccination|vacc|arv|rabies shots?\b/g, "vaccinated"], [/\bpending|baki|baaki|todo|to do|outstanding|backlog\b/g, "pending"],
  [/\bppt|pptx|power point|powerpoint|deck|slides?|presentation\b/g, "powerpoint"], [/\bcorporation|bbmp|municipality|municipal|council|govt|government|commissioner|office\b/g, "municipal office"],
  [/\bfunders?|donors?|csr|trustees?|board\b/g, "funder"], [/\bpls|plz|kindly\b/g, "please"], [/\bu\b/g, "you"], [/\br\b/g, "are"], [/\bwk\b/g, "week"], [/\bmth|mnth\b/g, "month"],
  [/\bmk|mke\b/g, "make"], [/\bteammates?|staff|colleagues?|people|person|someone|somebody|employees?|workers?\b/g, "team member"], [/\bdupes?|dublicates?|duplicats?\b/g, "duplicates"],
];
const tidy = (q: string) => SWAP.reduce((s, [re, to]) => s.replace(re, to), norm(q));

/** Edit distance ≤ 1 for words of five letters or more: enough for a slipped key. */
function near(a: string, b: string) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
const hasWord = (words: string[], w: string) => words.some((x) => near(x, w));
const hasPhrase = (text: string, words: string[], phrase: string) => (phrase.includes(" ") ? text.includes(phrase) : hasWord(words, phrase));

/** needAny: the request must also carry one of `any` (e.g. a verb) before a file is prepared; a bare "programme report" is a question, not an order. */
type Intent = { say: string; all?: string[][]; any?: string[]; not?: string[]; org?: boolean; needAny?: boolean };
/* `all`: every group needs one of its words. `any`: each hit adds weight. `say`: the wording the router acts on. */
const INTENTS: Intent[] = [
  { say: "what should i do first", all: [["pending", "first", "priority", "priorities", "urgent", "attention", "waiting", "next", "focus", "start"]], any: ["me", "today", "now", "anything", "what", "should", "need", "needs"], not: ["how many", "powerpoint", "report", "package", "claim", "week", "vet"] },
  { say: "what changed this week", all: [["week", "weekly", "lately", "recently", "days"]], any: ["changed", "happened", "going", "update", "updates", "progress", "summary", "summarise", "digest", "new", "recap", "hows", "how"], not: ["powerpoint", "claim", "how many"] },
  { say: "summarise what changed since yesterday", all: [["yesterday", "overnight", "today"]], any: ["changed", "happened", "new", "update", "summary", "summarise", "recap", "missed", "miss"], not: ["pending", "first"] },
  { say: "prepare overdue follow-ups", all: [["follow", "followup", "followups", "recheck", "revisit", "checkup", "checkups"]], any: ["overdue", "late", "missed", "pending", "slipped", "due", "reschedule", "behind"] },
  { say: "draft this month's claim", all: [["claim", "claims", "bill", "billing", "invoice", "reimbursement"]], any: ["month", "monthly", "draft", "prepare", "make", "ready", "submit", "start", "this"], not: ["how", "explain", "status", "waiting"] },
  { say: "which abc records are blocked and need review this month", all: [["block", "blocked", "blocking", "stuck", "holding", "stopping"]], any: ["claim", "package", "month", "report", "bill", "what", "which", "why"] },
  { say: "show my abc verification queue", all: [["vet", "veterinarian", "doctor", "sign", "signoff", "authorise", "authorisation", "approval", "verification"]], any: ["queue", "waiting", "pending", "need", "needs", "list", "show", "which", "what"], not: ["how do", "add", "invite"] },
  { say: "which records are missing evidence", all: [["photo", "photos", "evidence", "proof", "picture", "pictures", "notch"]], any: ["missing", "without", "incomplete", "no", "lacking", "pending", "which", "need", "needs"], not: ["how do", "upload"] },
  { say: "find possible duplicate animals", all: [["duplicates", "duplicate", "twice", "double", "repeated", "same"]], any: ["dogs", "animal", "animals", "entered", "register", "registered", "find", "any", "check"] },
  { say: "programme figures", all: [["how many", "count", "total", "number", "numbers", "figures", "stats", "statistics", "coverage", "percentage", "percent"]], any: ["dogs", "animals", "sterilised", "vaccinated", "register", "registered", "recorded", "ward", "wards", "we", "our", "have"], not: ["case", "cases", "package", "packages", "claim", "follow"], org: true },
  { say: "create a powerpoint programme summary", all: [["powerpoint"]], any: ["municipal office", "funder", "summary", "programme", "program", "overview", "make", "create", "prepare", "need", "meeting", "update"], not: ["open cases", "register export", "verification"] },
  { say: "create a pdf programme summary", all: [["report", "summary", "overview", "update", "brief"], ["funder", "municipal office", "programme", "program", "monthly", "quarterly", "annual"]], any: ["make", "create", "prepare", "write", "need", "send", "pdf", "for"], not: ["powerpoint", "excel", "csv", "word", "claim", "package", "note", "week"], org: true, needAny: true },
  { say: "show package status", all: [["package", "packages", "submission", "submissions"]], any: ["status", "waiting", "where", "accepted", "decided", "returned", "queried", "sent", "what", "happened"] },
  { say: "run operational checks", all: [["check", "checks", "audit", "health", "scan"]], any: ["run", "records", "everything", "operational", "morning", "data", "quality", "now"], not: ["package", "duplicates", "how do"] },
];

/** The router's wording for a loosely phrased request, or null when unsure (the original then stands). */
export function canonical(q: string, org: boolean, office = false): string | null {
  /* A reviewing office has its own queue and wording; its questions are left to the office routes. */
  if (office && !org) return null;
  if (q.length > 140 || /\n/.test(q)) return null; // pasted material is not a command
  const text = tidy(q), words = text.split(" ");
  let best: { say: string; score: number } | null = null;
  for (const it of INTENTS) {
    if (it.org && !org) continue;
    if (it.not?.some((p) => hasPhrase(text, words, p))) continue;
    if (it.all && !it.all.every((group) => group.some((p) => hasPhrase(text, words, p)))) continue;
    if (it.needAny && !it.any?.some((p) => hasPhrase(text, words, p))) continue;
    const score = (it.all?.length ?? 0) * 2 + (it.any?.filter((p) => hasPhrase(text, words, p)).length ?? 0);
    if (score >= 3 && (!best || score > best.score)) best = { say: it.say, score };
  }
  return best?.say ?? null;
}

/** A one-line human reply to conversation that is not a request. */
export function smallTalk(q: string, name: string | null): string | null {
  const t = norm(q), you = name ? `, ${name}` : "";
  if (t.length > 60) return null;
  if (/^(thanks|thank you|thankyou|thx|ty|cheers|great|nice|perfect|awesome|super|cool|ok|okay|got it|good job|well done|shukriya|dhanyavad)( kaju| so much| a lot| very much)?$/.test(t)) return `Any time${you}. Want me to check what else needs you?`;
  if (/^(how are you|how are you doing|hows it going|whats up|sup|kaise ho)( kaju)?$/.test(t)) return `Tail wagging${you}. I've got your records open: ask me what needs attention, or tell me what to prepare.`;
  if (/^(bye|goodbye|see you|good night|gn|cya|see ya)( kaju)?$/.test(t)) return `See you${you}. Everything you confirmed is saved on the record.`;
  if (/^(whats your name|your name|who made you|who built you|are you a bot|are you ai|are you an ai|are you real|are you human|are you chatgpt|are you claude)$/.test(t)) return "I'm Kaju, StrayPaw's assistant. I work only from your organisation's records: I read, check and prepare, and a person confirms every change.";
  if (/^(good (boy|dog|girl)|who is a good (boy|dog)|you are (cute|the best|great|awesome))$/.test(t)) return "That made my day. Back to work: what shall I look at?";
  if (/^(sorry|oops|never ?mind|nvm|cancel|stop|forget it)$/.test(t)) return "No problem. Nothing was changed.";
  return null;
}

export type How = { keys: string[][]; title: string; steps: string[]; go?: { href: string; label: string }; note?: string };
/* The real steps on the real screens. Each `keys` group needs one of its words. */
export const HOW: How[] = [
  { keys: [["add", "invite", "new", "create", "give", "onboard"], ["team member", "vet", "veterinarian", "coordinator", "field", "access", "user", "volunteer", "code"]], title: "Add someone to your team", steps: ["Open **Team & access**.", "Enter their name and email, and choose their role (field team, veterinarian, coordinator or admin).", "They get a six-character code by email. That email and code are their sign-in from then on."], go: { href: "/ngo/team", label: "Open Team" }, note: "Only an admin or lead can give dashboard access. Removing someone turns their code off." },
  { keys: [["import", "upload", "bring", "migrate", "move", "load"], ["register", "excel", "csv", "spreadsheet", "sheet", "data", "records", "old"]], title: "Bring in your existing register", steps: ["Open **Import register**.", "Upload the Excel or CSV as it is; Kaju matches your columns to StrayPaw's.", "Check the preview, then import. Imported rows stay labelled as historical until someone confirms them."], go: { href: "/ngo/import", label: "Open Import" } },
  { keys: [["register", "add", "record", "new", "create", "intake", "capture"], ["animal", "animals", "dog", "dogs", "intake", "capture"]], title: "Register an animal", steps: ["Open **Field mode** on your phone.", "Tap **Record an animal**, take the photo and confirm the place.", "Save. With no signal it is kept encrypted on the phone and sent when you are back online."], go: { href: "/ngo/field", label: "Open Field mode" } },
  { keys: [["sign", "authorise", "authorize", "approve", "signoff"], ["procedure", "sterilisation", "sterilised", "surgery", "abc", "vet", "off", "record"]], title: "Sign off a procedure (veterinarians)", steps: ["Open **Treatment & sign-off**. Records waiting for you are listed oldest first.", "Open a record, check the surgical details and evidence.", "Press **Authorise**. Only a veterinarian's own account can do this; Kaju cannot."], go: { href: "/ngo/verification?stage=vet", label: "Open the sign-off queue" } },
  { keys: [["release", "ear", "notch", "evidence"], ["photo", "photos", "upload", "add", "attach", "place", "record"]], title: "Add release evidence", steps: ["Open **Release evidence**. Each record shows exactly what is missing.", "Add the capture photo, the ear-notch photo and the release place.", "A coordinator then reviews it; complete records become claimable."], go: { href: "/ngo/verification?stage=evidence", label: "Open Release evidence" } },
  { keys: [["submit", "send", "prepare", "make", "create", "build"], ["package", "claim", "bill", "monthly", "municipal office"]], title: "Prepare and submit the monthly package", steps: ["Open **Reports → Report packages**.", "Kaju drafts the month's claim from records that are authorised, reviewed and complete, and names every blocked one.", "Check the lines and press **Submit**. The reviewing office then accepts, queries or returns it. Acceptance is not payment."], go: { href: "/ngo/packages", label: "Open Report packages" } },
  { keys: [["connect", "link", "integrate", "integration", "setup", "set"], ["google", "gmail", "drive", "microsoft", "outlook", "slack", "calendar", "zoho", "tools", "whatsapp", "sms"]], title: "Connect your tools", steps: ["Open **Organisation → Connections**.", "Choose the account (Google, Microsoft, Slack or Zoho) and allow only what you want Kaju to use.", "After that I can find files and emails, and prepare emails, events and saved reports for you to confirm."], go: { href: "/ngo/settings", label: "Open Connections" }, note: "Direct WhatsApp is not connected yet; paste WhatsApp messages to me and I will turn them into draft cases." },
  { keys: [["install", "download", "home", "app", "offline"], ["app", "phone", "screen", "mobile", "signal", "offline", "install"]], title: "Use StrayPaw on a phone, even offline", steps: ["Open StrayPaw in your phone's browser.", "Android: tap **Install app** when offered. iPhone: tap **Share**, then **Add to Home Screen**.", "Field mode keeps working without signal and syncs when you are back online."], go: { href: "/ngo/field", label: "Open Field mode" } },
  { keys: [["export", "download", "save", "get"], ["excel", "csv", "pdf", "word", "data", "register", "records", "report"]], title: "Export your records", steps: ["Ask me, for example: **Export the animal register as Excel**.", "I prepare the file from your own records; press **Confirm and download**.", "Reports and proof packs are also under **Reports**."], go: { href: "/ngo/proof", label: "Open Reports" } },
  { keys: [["open", "create", "new", "log", "start", "raise"], ["case", "rescue", "complaint", "report"]], title: "Open a case", steps: ["Press **New case** at the top, or paste the WhatsApp message or field note to me.", "I read out what it says (place, condition, animal) and prepare the case.", "Check it and press **Confirm**. Nothing is saved until you do."], go: { href: "/ngo/cases/new", label: "Open New case" } },
  { keys: [["verified", "verify", "verification", "unverified", "badge"], ["organisation", "org", "ngo", "we", "our", "get", "become", "why"]], title: "Getting your organisation verified", steps: ["Your workspace works fully from the moment you register.", "StrayPaw checks your organisation's details and may write to you for a document.", "Once verified you can claim public cases, raise funds and appear as a verified organisation."], go: { href: "/contact", label: "Contact StrayPaw" } },
  { keys: [["register", "signup", "join", "start", "create", "open", "get"], ["organisation", "org", "ngo", "account", "workspace", "started"]], title: "Register your organisation", steps: ["Open **Sign in** and enter your email.", "Choose **My organisation**, then add its name, your name and your city.", "We email you a six-character code. Enter it and your workspace opens; you are its admin."], go: { href: "/sign-in?as=org", label: "Get started" }, note: "Free to start. We verify your details before public cases and fundraising switch on." },
  { keys: [["price", "pricing", "cost", "pay", "paid", "plan", "plans", "free", "subscription", "charge"]], title: "What StrayPaw costs", steps: ["Registering and running your own workspace is free to start.", "Funded programmes (municipal ABC and ARV contracts) are priced per programme, agreed in writing first.", "Tell us about your programme and we will send a plan."], go: { href: "/pricing", label: "See plans" } },
  { keys: [["change", "edit", "update", "delete", "remove", "undo", "fix", "correct"], ["record", "animal", "case", "entry", "mistake", "wrong", "note"]], title: "Correct or remove a record", steps: ["Open the record and use **Edit**, or the **Delete** button on anything a person or I added.", "Every change records who made it and when; deletions are archived and an admin can restore them.", "Signed-off procedures cannot be edited silently: they are returned and re-authorised."] },
];

export type HowAnswer = { text: string; go?: { href: string; label: string } };
export function howTo(q: string): HowAnswer | null {
  const text = tidy(q), words = text.split(" ");
  const asking = /^(how|where|can i|can we|could i|what is the way|whats the way|help me|i want to|i need to|show me how|steps|guide|tell me how|is there a way|is it free|what does|do i|do we)\b/.test(text) || /\bhow (do|can|to|should)\b/.test(text) || /\b(price|pricing|cost|free)\b/.test(text);
  if (!asking || text.length > 160) return null;
  let best: { h: How; score: number } | null = null;
  for (const h of HOW) {
    if (!h.keys.every((g) => g.some((p) => hasPhrase(text, words, p)))) continue;
    const score = h.keys.reduce((n, g) => n + g.filter((p) => hasPhrase(text, words, p)).length, 0);
    if (!best || score > best.score) best = { h, score };
  }
  if (!best) return null;
  const h = best.h;
  return { text: `**${h.title}**\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}${h.note ? `\n\n${h.note}` : ""}`, go: h.go };
}

/** What to offer next, so a conversation never dead-ends. */
export function followUps(said: string, org: boolean, office: boolean): string[] {
  if (office) return ["What is waiting for me today?", "Show ward coverage and sudden changes", "Draft the monthly report"].filter((s) => norm(s) !== norm(said)).slice(0, 3);
  if (!org) return ["Show published programmes", "How do I register my organisation?", "What is unknown status?"];
  const pool: [RegExp, string[]][] = [
    [/first|pending|attention/, ["Which records are missing evidence?", "What changed this week?", "Draft this month's claim"]],
    [/week|yesterday|changed/, ["What should I do first?", "Make a PowerPoint for the municipal office", "Prepare overdue follow-ups"]],
    [/claim|package|block/, ["Which records block this month's package?", "Show my ABC verification queue", "Make a PowerPoint for the municipal office"]],
    [/figures|how many|powerpoint|summary/, ["Make a PowerPoint for the municipal office", "Export the animal register as Excel", "Find possible duplicate animals"]],
    [/evidence|vet|verification/, ["What should I do first?", "Draft this month's claim", "What changed this week?"]],
  ];
  const hit = pool.find(([re]) => re.test(norm(said)))?.[1] ?? ["What should I do first?", "What changed this week?", "How many animals are sterilised?"];
  return hit.filter((s) => norm(s) !== norm(said)).slice(0, 3);
}

/* ════════════════════════════════════════════════════════════════════
   Questions about cases, the programme's own words, and what to offer
   when nothing matches. Alongside canonical() above, not instead of it:

     · normalise(q)       spelling slips, Hinglish and field shorthand in a
                          case question become plain words
     · parseCaseQuery(q)  a question about cases becomes a structured query
                          (count / list / breakdown / most or least, with
                          filters and a date window); given the previous
                          query, a short follow-up ("only unassigned", "and
                          last month?", "by zone") changes it
     · glossaryAnswer(q)  "what is ABC?": the programme's own terms
     · nearestSkills(q)   the closest things Kaju can actually run

   Pure functions over text, like the rest of this file: nothing here reads
   or invents a record.
   ════════════════════════════════════════════════════════════════════ */

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
  /** Calendar days in India (YYYY-MM-DD): since is inclusive, until exclusive. */
  since?: string; until?: string; window?: string;
  historical?: boolean;
  /** Words left over that may name a zone, a person or a condition; resolved against the records themselves. */
  terms: string[];
};

const IST_MS = 5.5 * 3_600_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const startOfWeek = (d: Date) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/* A full month name is a month; "may" and three-letter forms only after "in", "during", "for" or "of", or before a year. */
const MONTH_RES = [
  /\b(?:in |during |for |of )?(january|february|march|april|june|july|august|september|october|november|december)\b(?:\s+(\d{4}))?/,
  /\b(?:in|during|for|of)\s+(may|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b(?:\s+(\d{4}))?/,
  /\b(may|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\s+(\d{4})\b/,
];

/** A time window named in the text, as calendar days in India: inclusive since, exclusive until. */
export function timeWindow(t: string, now = new Date()): { since?: string; until?: string; window?: string; rest: string } {
  const local = new Date(now.getTime() + IST_MS);
  const today = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const cut = (re: RegExp) => t.replace(re, " ");
  let m: RegExp;
  if ((m = /\btoday\b/).test(t)) return { since: isoDay(today), until: isoDay(add(today, 1)), window: "today", rest: cut(m) };
  if ((m = /\byesterday\b/).test(t)) return { since: isoDay(add(today, -1)), until: isoDay(today), window: "yesterday", rest: cut(m) };
  if ((m = /\bthis week\b/).test(t)) return { since: isoDay(startOfWeek(today)), until: isoDay(add(today, 1)), window: "this week", rest: cut(m) };
  if ((m = /\blast week\b|\bprevious week\b/).test(t)) { const s = add(startOfWeek(today), -7); return { since: isoDay(s), until: isoDay(add(s, 7)), window: "last week", rest: cut(m) }; }
  if ((m = /\bthis month\b/).test(t)) return { since: isoDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), until: isoDay(add(today, 1)), window: "this month", rest: cut(m) };
  if ((m = /\blast month\b|\bprevious month\b/).test(t)) { const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); return { since: isoDay(s), until: isoDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), window: "last month", rest: cut(m) }; }
  if ((m = /\bthis year\b/).test(t)) return { since: `${today.getUTCFullYear()}-01-01`, until: isoDay(add(today, 1)), window: "this year", rest: cut(m) };
  const lastN = t.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+(day|week|month)s?\b/);
  if (lastN) { const n = Number(lastN[1]) * (lastN[2] === "day" ? 1 : lastN[2] === "week" ? 7 : 30); return { since: isoDay(add(today, -n)), until: isoDay(add(today, 1)), window: `the last ${lastN[1]} ${lastN[2]}${lastN[1] === "1" ? "" : "s"}`, rest: t.replace(lastN[0], " ") }; }
  for (const re of MONTH_RES) {
    const named = t.match(re);
    if (!named) continue;
    const i = MONTHS.findIndex((x) => x.startsWith(named[1].slice(0, 3)));
    let y = named[2] ? Number(named[2]) : today.getUTCFullYear();
    if (!named[2] && i > today.getUTCMonth()) y -= 1; // "in December" asked in March means the one that has happened
    return { since: isoDay(new Date(Date.UTC(y, i, 1))), until: isoDay(new Date(Date.UTC(y, i + 1, 1))), window: `${MONTHS[i][0].toUpperCase()}${MONTHS[i].slice(1)} ${y}`, rest: t.replace(named[0], " ") };
  }
  return { rest: t };
}

const CASE_NOUN = /\b(cases?|requests?|rescues?|reports?|work|calls?|complaints?|tickets?)\b/;
const ASK = /\b(how many|list|show|which|who|where|what|most|least|top|break ?down|split|by (?:zone|area|ward|locality|person|assignee|staff|member|condition|type|category|status|month)|per (?:zone|area|ward|person|month)|older than|more than \d+ days|since|compare)\b/;
const NOISE = /\b(how many|list|show|me|us|the|a|an|all|any|of|for|in|on|at|by|to|with|from|and|or|are|is|was|were|there|have|has|had|been|do|does|did|we|our|i|my|you|can|please|tell|give|get|see|find|what|which|who|where|whose|when|that|this|these|those|it|them|ones?|only|just|also|about|still|now|currently|right|so|far|cases?|requests?|rescues?|reports?|work|calls?|open|closed|unassigned|critical|urgent|overdue|most|least|top|breakdown|break|down|split|per|each|every|count|number|total|older|than|more|days?|weeks?|months?|quiet|stale|stalled|many|much|new|opened|came|logged|received|holds?|holding|handling|handled|assigned|got|zone|zones|area|areas|ward|wards|locality|localities|person|people|staff|member|members|team|assignee|condition|conditions|type|types|category|status|statuses|month|historical|imported|not|no|kaju|vs|versus|compared?|kinds?|sorts?)\b/g;
/* A specific record (case code or id) goes to the record's own tools; so does pasted or command text. */
const NAMES_RECORD = /\b[A-Za-z]{2,5}(?:-[A-Za-z]{2,5})?-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{3,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
/* "this case", "the case": one record, answered by the record tools, not counted. */
const ONE_RECORD = /\b(?:this|that|the|current|selected) (?:case|record|request)\b(?!s)/;
/* A field report ("dog injured near the temple, which case?") is material for a new case, not a question about cases. */
const FIELD_WORDS = /\b(injured|limping|bleeding|rescued|spotted|found|hit|stuck|lying|crying|attacked|bitten|sick)\b/;
const OPENS_QUESTION = /^(?:how many|how|list|show|which|who|where|what|any|count|tell|give|compare|break|and|only|just|by|per)\b/;

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
  if (/[:\n]/.test(text) || NAMES_RECORD.test(text)) return null;
  const t = normalise(text);
  if (ONE_RECORD.test(t)) return null;
  if (t.length > 160) return null;
  if (FIELD_WORDS.test(t) && !OPENS_QUESTION.test(t)) return null;
  const now = opts.now ?? new Date();
  const f = features(t, now);
  const words = t.split(/\s+/).length;
  const structural = !!(f.by || f.order || f.unassigned || f.mine || f.critical || f.overdue || f.olderDays || f.quietDays || f.w.window || f.state || f.list || f.count);
  const standalone = CASE_NOUN.test(t) && ASK.test(t);
  /* A follow-up is short, changes something, and does not start a different job. Leftover words alone ("what about adyar?") count only after "and", "what about" and the like. */
  const followUp = !!opts.carry && !standalone && words <= 9
    && (structural ? /^(?:and|what about|how about|only|just|now|ok|okay|same|also|then|but|show|list|which|who|where|by|per|in|for|last|this|closed|open|unassigned|critical|overdue|my|compare)\b/.test(t)
      : f.terms.length > 0 && /^(?:and|what about|how about|only|just|same|also|but|in|for)\b/.test(t))
    && !/\b(package|claim|bill|evidence|duplicate|programme|verification|vet|photo|animal register|academy|email|file|calendar|draft|write|note|follow-up|map|report|export|excel|pdf|powerpoint|deck|summar\w*|help)\b/.test(t)
    && !/^(?:open|go to|take me)\s+(?:the|my)\b/.test(t);
  if (!standalone && !followUp) return null;
  /* Leave questions other tools answer better where they are. */
  if (standalone && /\b(missing|without|no photo|duplicate|package|claim|bill|verification|vet|veterinar\w*|sign[- ]?off|authoris\w*|abc|follow-up|evidence|programme|sterilis\w*|vaccinat\w*)\b/.test(t) && !f.by && !f.w.window && !f.unassigned && !f.critical) return null;

  const base: CaseQuery = followUp ? { ...opts.carry!, terms: [...opts.carry!.terms] } : { measure: "count", state: "open", terms: [] };
  const q: CaseQuery = { ...base };
  if (f.state) q.state = f.state;
  else if (!followUp && f.w.window) q.state = "all"; // "cases this week" means opened this week, open or not
  if (f.w.window) { q.since = f.w.since; q.until = f.w.until; q.window = f.w.window; }
  for (const k of ["unassigned", "mine", "critical", "overdue", "olderDays", "quietDays", "historical"] as const) if (f[k] !== undefined) (q as Record<string, unknown>)[k] = f[k];
  if (f.terms.length) q.terms = f.terms;
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
  if (q.window) parts.push(/^(?:today|yesterday)$/.test(q.window) ? `opened ${q.window}` : /^(?:this|last|the) /.test(q.window) ? `opened ${q.window.replace(/^the /, "in the ")}` : `opened in ${q.window}`);
  if (q.historical) parts.push("(imported history included)");
  return parts.join(" ");
}

/** One-tap follow-ups, each one parseCaseQuery() understands after this query. */
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

/* ── names typed roughly ─────────────────────────────────────────────── */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
/** The value a rough word most plausibly names: exact, then a whole word inside it, then a prefix, then a near spelling. Only values present in the records are ever returned. */
export function closest(term: string, values: string[]): string | null {
  const t = term.toLowerCase(); if (t.length < 3) return null;
  const lower = values.map((v) => [v, v.toLowerCase()] as const);
  return lower.find(([, l]) => l === t)?.[0]
    ?? lower.find(([, l]) => l.split(/[\s,()-]+/).includes(t))?.[0]
    ?? lower.find(([, l]) => l.startsWith(t) || l.split(/[\s,()-]+/).some((w) => w.length > 3 && t.length > 3 && w.startsWith(t)))?.[0]
    ?? lower.map(([v, l]) => [v, Math.min(editDistance(t, l), ...l.split(/[\s,()-]+/).map((w) => editDistance(t, w)))] as const).filter(([, d]) => d <= (t.length > 6 ? 2 : 1)).sort((x, y) => x[1] - y[1])[0]?.[0]
    ?? null;
}

/* ── the programme's own words ───────────────────────────────────────── */
export const GLOSSARY: { term: string; also: RegExp; text: string }[] = [
  { term: "ABC", also: /\babc\b|animal birth control/, text: "**Animal Birth Control (ABC)** is the programme of catching street dogs, sterilising and vaccinating them, and releasing each one where it was caught. In StrayPaw an ABC record is one animal's procedure with its evidence, a veterinarian's sign-off and a coordinator's review." },
  { term: "ARV", also: /\barv\b|anti[- ]rabies(?: vaccination)?/, text: "**ARV** here means anti-rabies vaccination of street animals. It is recorded on the animal with its date. A recorded vaccination is a claim by the organisation that keeps the record; it is not a certificate." },
  { term: "ear notch", also: /ear[- ]?notch|ear[- ]?tip|notched/, text: "An **ear notch** is the small mark made on a dog's ear during sterilisation so the animal can be recognised as sterilised from a distance. The ear-notch photo is one of the evidence items on a sterilisation record." },
  { term: "evidence", also: /(?:five )?evidence(?: items?)?/, text: "A sterilisation record needs **five evidence items**: capture photo, surgery record, ear-notch photo, release photo and release location. A vaccination record needs the capture photo and the release location. A record missing a required item cannot be approved or claimed." },
  { term: "vet sign-off", also: /vet(?:erinary)? (?:sign[- ]?off|authoris\w+)|sign[- ]?off/, text: "**Vet sign-off** is a veterinarian authorising a procedure in their own name. Only a veterinarian's own account can do it; Kaju cannot sign or authorise for anyone." },
  { term: "report package", also: /(?:report |monthly )?package/, text: "A **report package** is the month's approved records sent to the municipal office that funds the work. The office checks each line and accepts, queries, returns or rejects it. Acceptance is recorded by name, and acceptance is not payment." },
  { term: "claimable", also: /claimable|ready to bill/, text: "A procedure is **claimable** when its required evidence is present, a veterinarian has authorised it and a coordinator has reviewed it. Each procedure is claimed once, at the rate in the contract in force on its date." },
  { term: "imported record", also: /imported(?: records?)?|historical records?|source records?/, text: "An **imported record** came from a register your organisation kept before StrayPaw (Excel or CSV). It stays labelled as historical until someone checks it, and it is never counted as today's work." },
  { term: "not recorded", also: /not recorded/, text: "**Not recorded** means the record does not say. It is never treated as no: an animal with no sterilisation recorded is shown as not recorded, not as unsterilised." },
  { term: "follow-up", also: /follow-up/, text: "A **follow-up** is a dated promise on a case: a recheck, a second dose, a dressing change. It shows as overdue when its date passes with nothing recorded." },
  { term: "work queue", also: /work queue/, text: "The **work queue** is your organisation's open cases, the live work. Imported history that nobody has reviewed is kept apart from it." },
  { term: "field mode", also: /field mode/, text: "**Field mode** is the phone screen for people out with the animals. It works without signal: what you record is kept on the phone and sent when you are back online." },
  { term: "reviewing office", also: /reviewing office|municipal (?:office|reviewer)/, text: "A **reviewing office** is the municipal office that receives your packages. Its reviewers see evidence only for packages sent to their own office." },
];

/** "what is X", "X means?", "define X", "X kya hai": the glossary entry when X is one of the terms, or null. "What is in the work queue" is a question about the queue, not about the word, so X must be the term itself. */
export function glossaryAnswer(text: string): string | null {
  const t = normalise(text);
  const m = t.match(/^(?:what(?:'s| is| are| does)?|define|explain|meaning of|tell me about)\s+(?:an? |the )?(.{2,40}?)(?:\s+mean|\s+means|\s+stand for)?[?.!\s]*$/) ?? t.match(/^(?:an? |the )?(.{2,30}?)\s+(?:kya|matlab|means?|meaning)[?.!\s]*$/);
  if (!m) return null;
  const want = m[1].trim().replace(/\s+/g, " ");
  const hit = GLOSSARY.find((g) => g.term.toLowerCase() === want || g.term.toLowerCase() === want.replace(/s$/, "") || new RegExp(`^(?:${g.also.source})$`).test(want) || new RegExp(`^(?:${g.also.source})$`).test(want.replace(/s$/, "")));
  return hit ? hit.text : null;
}

/* ── when nothing matches: the closest things Kaju does ─────────────── */
/* Each `ask` is a request this router answers today (scripts/test-kaju-reliability.ts asks every one). */
export const SKILLS: { ask: string; keys: string[]; org?: boolean; office?: boolean }[] = [
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
  { ask: "What is waiting for me today?", keys: ["waiting", "decision", "review", "package", "submission", "pending"], office: true },
  { ask: "Show ward coverage and sudden changes", keys: ["ward", "coverage", "spike", "drop", "area", "map"], office: true },
  { ask: "Draft the monthly report", keys: ["report", "monthly", "commissioner", "note", "memo"], office: true },
  { ask: "Show published programmes", keys: ["programme", "published", "public", "drive", "city"] },
  { ask: "What is ABC?", keys: ["abc", "meaning", "explain", "what", "sterilisation"] },
];
/** Up to four things Kaju can do that are closest to what was typed (or the first four for this person when nothing is close). */
export function nearestSkills(text: string, who: { org: boolean; office: boolean }): string[] {
  const words = new Set(normalise(text).split(/[^a-z-]+/).filter((w) => w.length > 2));
  const pool = SKILLS.filter((s) => (s.org ? who.org : s.office ? who.office : true));
  const scored = pool.map((s) => ({ s, n: s.keys.reduce((k, key) => k + ([...words].some((w) => w === key || (w.length > 4 && (w.startsWith(key) || key.startsWith(w)))) ? 1 : 0), 0) })).sort((a, b) => b.n - a.n);
  const hits = scored.filter((x) => x.n > 0).map((x) => x.s.ask);
  return (hits.length ? hits : pool.map((s) => s.ask)).slice(0, 4);
}
