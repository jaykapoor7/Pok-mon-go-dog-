/* Kaju's ear: loosely worded requests must land on the right intent, and precise commands must be left alone.
   Run: npx tsx scripts/test-kaju-understand.ts */
import { canonical, howTo, smallTalk, followUps, normalise, timeWindow, parseCaseQuery, nextQuestions, closest, glossaryAnswer, nearestSkills, type CaseQuery } from "../src/sp3/ai/understand";

let failed = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = got === want; if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); };

const C: [string, string | null][] = [
  ["anything pending for me?", "what should i do first"],
  ["what needs my attention today", "what should i do first"],
  ["hows the week going", "what changed this week"],
  ["give me a weekly update", "what changed this week"],
  ["what did i miss since yesterday", "summarise what changed since yesterday"],
  ["any follow ups that slipped?", "prepare overdue follow-ups"],
  ["get this months claim ready", "draft this month's claim"],
  ["whats stuck in the package", "which abc records are blocked and need review this month"],
  ["which ones need the vet", "show my abc verification queue"],
  ["which dogs have no photo", "which records are missing evidence"],
  ["any dogs entered twice?", "find possible duplicate animals"],
  ["kitne kutte sterilised hai", "programme figures"],
  ["how many animals do we have", "programme figures"],
  ["total vaccinated dogs?", "programme figures"],
  ["mk a deck for the corporation", "create a powerpoint programme summary"],
  ["I need a presentation for the funder meeting", "create a powerpoint programme summary"],
  ["prepare a monthly report for the municipal office", "create a pdf programme summary"],
  ["where is our submission", "show package status"],
  ["run a quick check on our records", "run operational checks"],
  // must NOT be rewritten
  ["Ginger", null], ["SPC-31CE05", null], ["yelahanka", null], ["what is unknown status", null], ["export the animal register as excel", null],
];
for (const [q, want] of C) eq(`canonical: ${q}`, canonical(q, true), want);
eq("guests get no register figures", canonical("how many animals do we have", false), null);
eq("a reviewing office keeps its own wording", canonical("What is waiting for me today?", false, true), null);
eq("pasted text is not a command", canonical("Brown female dog limping near the temple gate since morning, two pups with her.\nPlease send someone", true), null);

const H: [string, string | null][] = [
  ["how do i add a new team member", "Add someone to your team"], ["how can I invite our vet", "Add someone to your team"], ["how to import my excel register", "Bring in your existing register"],
  ["how do I register a dog", "Register an animal"], ["how do i sign off a sterilisation", "Sign off a procedure (veterinarians)"], ["where do I add the release photo", "Add release evidence"],
  ["how do we submit the monthly claim", "Prepare and submit the monthly package"], ["how do i connect google drive", "Connect your tools"], ["can i use it offline on my phone", "Use StrayPaw on a phone, even offline"],
  ["how much does it cost", "What StrayPaw costs"], ["how do i register my organisation", "Register your organisation"], ["how do we get verified", "Getting your organisation verified"],
  ["what changed this week", null], ["Ginger", null],
];
for (const [q, want] of H) eq(`howTo: ${q}`, howTo(q)?.text.match(/^\*\*(.+?)\*\*/)?.[1] ?? null, want);

eq("thanks is small talk", !!smallTalk("thanks kaju", "Ravi"), true);
eq("a question is not small talk", smallTalk("what changed this week", "Ravi"), null);
eq("follow-ups never repeat the question", followUps("What should I do first?", true, false).includes("What should I do first?"), false);
eq("follow-ups offer three", followUps("hello", true, false).length, 3);

/* Questions about cases: a structured query, and a short follow-up that changes the previous one. */
const now = new Date("2026-11-10T06:00:00Z");
const p = (t: string, carry: CaseQuery | null = null) => parseCaseQuery(t, { carry, now });
eq("normalise: Hinglish", normalise("kitne case baki hai"), "how many case open");
eq("normalise: spelling slips", normalise("unasigned folowups"), "unassigned follow-up");
eq("window: last month", [timeWindow("cases last month", now).since, timeWindow("cases last month", now).until].join(" to "), "2026-10-01 to 2026-11-01");
eq("window: a month not yet come this year means last year's", timeWindow("in december", now).since, "2025-12-01");
eq("window: this week starts on Monday", timeWindow("this week", now).since, "2026-11-09");
eq("window: today is today in India (01:30 IST)", timeWindow("today", new Date("2026-11-09T20:00:00Z")).since, "2026-11-10");
eq("window: 'may' the verb is not a month", timeWindow("which cases may need a vet", now).window, undefined);
eq("window: 'in may' is a month", timeWindow("cases in may", now).window, "May 2026");

let cq = p("How many open cases are unassigned?");
eq("count with a filter", [cq?.measure, cq?.state, cq?.unassigned].join(" "), "count open true");
cq = p("Which critical cases have nobody assigned?");
eq("list with two filters", [cq?.measure, cq?.critical, cq?.unassigned].join(" "), "list true true");
eq("breakdown by zone", [p("open cases by zone")?.measure, p("open cases by zone")?.by].join(" "), "breakdown zone");
eq("most by person", [p("who holds the most cases")?.measure, p("who holds the most cases")?.by].join(" "), "top assignee");
cq = p("how many cases came in last week in adyar");
eq("window, state and a rough place word", [cq?.state, cq?.window, cq?.terms.join(",")].join(" "), "all last week adyar");
eq("Hinglish question parses", p("kitne case baki hai")?.state, "open");
eq("older than N days", p("cases open for more than 30 days")?.olderDays, 30);
eq("how many open cases (main used to read this as a new case)", p("how many open cases")?.measure, "count");

const first = p("how many open cases")!;
eq("follow-up adds a filter", [p("only unassigned", first)?.unassigned, p("only unassigned", first)?.state].join(" "), "true open");
eq("follow-up changes the grouping", [p("by zone", first)?.by, p("by zone", first)?.measure].join(" "), "zone breakdown");
eq("follow-up changes the window", p("and last month?", first)?.window, "last month");
eq("follow-up names a place", p("what about adyar?", first)?.terms.join(","), "adyar");
for (const s of nextQuestions(first)) eq(`offered follow-up is understood: ${s}`, !!p(s, first), true);
eq("a fragment with nothing before it is not a case question", p("only unassigned"), null);
eq("a new job is never read as a follow-up", p("add a note to this case", first), null);
eq("opening a screen is not a follow-up", p("open the map", first), null);
for (const other of ["Which records are missing evidence?", "Draft this month's claim", "Show my ABC verification queue", "What follow-ups are overdue?", "hello", "Find possible duplicate animals", "Which cases need the vet?", "Which cases have overdue follow-ups?"]) eq(`left to its own tool: ${other}`, p(other), null);
eq("one named case is not counted", p("how many updates on case SPC-47A86E"), null);
eq("'this case' is one record, not a count", p("what is the status of this case"), null);
eq("a field report is not a question about cases", p("Dog injured near the temple gate, which case is this for?"), null);
eq("pasted text is not a case question", p("Rescue case: brown dog hit by a bike near the signal, where to take?"), null);

eq("rough place word matches the record", closest("adyr", ["Adyar", "Besant Nagar"]), "Adyar");
eq("rough name matches the record", closest("ravi", ["Ravi Kumar", "Meena S."]), "Ravi Kumar");
eq("nothing is matched that is not there", closest("xyz", ["Adyar"]), null);

eq("glossary: ABC", /Animal Birth Control/.test(glossaryAnswer("what is ABC?") ?? ""), true);
eq("glossary: Hinglish", /ear notch/i.test(glossaryAnswer("ear notch kya hai") ?? ""), true);
eq("glossary: a vaccination record needs two items", /vaccination record needs the capture photo and the release location/.test(glossaryAnswer("what is evidence") ?? ""), true);
eq("glossary: the term itself, not a question about the queue", glossaryAnswer("what is in the work queue"), null);
eq("glossary: unknown status stays with the Academy", glossaryAnswer("what is unknown status"), null);
eq("glossary: only its own terms", glossaryAnswer("what is the weather"), null);

eq("recovery: billing words lead to the claim", nearestSkills("something about billing money", { org: true, office: false })[0], "Draft this month's claim");
eq("recovery: four at most", nearestSkills("zzz", { org: false, office: false }).length <= 4, true);
eq("recovery: a guest is never offered organisation work", nearestSkills("how many open cases", { org: false, office: false }).includes("How many open cases?"), false);
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
