/* Kaju's ear: loosely worded requests must land on the right intent, and precise commands must be left alone.
   Run: npx tsx scripts/test-kaju-understand.ts */
import { canonical, howTo, smallTalk, followUps } from "../src/sp3/ai/understand";

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
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
