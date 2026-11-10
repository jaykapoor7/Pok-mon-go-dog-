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

type How = { keys: string[][]; title: string; steps: string[]; go?: { href: string; label: string }; note?: string };
/* The real steps on the real screens. Each `keys` group needs one of its words. */
const HOW: How[] = [
  { keys: [["add", "invite", "new", "create", "give", "onboard"], ["team member", "vet", "veterinarian", "coordinator", "field", "access", "user", "volunteer", "code"]], title: "Add someone to your team", steps: ["Open **Organisation → Team**.", "Enter their name and email, and choose their role (field team, veterinarian, coordinator or admin).", "They get a six-character code by email. That email and code are their sign-in from then on."], go: { href: "/ngo/team", label: "Open Team" }, note: "Only an admin or lead can give dashboard access. Removing someone turns their code off." },
  { keys: [["import", "upload", "bring", "migrate", "move", "load"], ["register", "excel", "csv", "spreadsheet", "sheet", "data", "records", "old"]], title: "Bring in your existing register", steps: ["Open **Import register**.", "Upload the Excel or CSV as it is; Kaju matches your columns to StrayPaw's.", "Check the preview, then import. Imported rows stay labelled as historical until someone confirms them."], go: { href: "/ngo/import", label: "Open Import" } },
  { keys: [["register", "add", "record", "new", "create", "intake", "capture"], ["animal", "animals", "dog", "dogs", "intake", "capture"]], title: "Register an animal", steps: ["Open **Field mode** on your phone.", "Tap **Register intake**, take the photo and confirm the place.", "Save. With no signal it is kept encrypted on the phone and sent when you are back online."], go: { href: "/ngo/field", label: "Open Field mode" } },
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
