import type { AiReply, Citation, Proposal, ToolRun } from "@/sp3/ai/types";
import type { Block } from "@/sp3/ai/blocks";
import { ANIMALS, FIGURES, PACKAGE, SAMPLE, TODAY_BRIEF, WARDS, findAnimal } from "./programme";
import { runDemoTool, type DemoOut } from "./tools";

/* Kaju on the sample programme by fixed rules: what answers when no model is switched on for the homepage, and
   whenever a model turn is refused by a limit. The same tools, the same reply shape; the wording is written here.
   It says plainly when a question is outside what the rules read. */

export type DemoReply = Omit<AiReply, "notice" | "usage" | "turnId" | "scope">;
type Acc = { citations: Citation[]; tools: ToolRun[]; proposals: Proposal[]; blocks: Block[] };

export const STARTERS = ["Which releases are missing a photo?", "How is the October package looking?", "Show me SP-1067's record", "What needs Anita today?"];
const MORE = ["Compare October across the wards", "Remind Ravi to send the photo for SP-1044", "What can Kaju not decide?", "Who changed what this week?"];
const next = (asked: string, pool = [...STARTERS, ...MORE]) => pool.filter((s) => s.toLowerCase() !== asked.toLowerCase().trim()).slice(0, 3);

export function absorb(acc: Acc, name: string, out: DemoOut, blocks = true) {
  acc.tools.push({ name, summary: out.summary, ok: out.ok !== false });
  for (const c of out.citations) if (!acc.citations.some((x) => x.id === c.id)) acc.citations.push(c);
  if (out.proposals) acc.proposals.push(...out.proposals);
  if (blocks && out.blocks && out.ok !== false) acc.blocks = [...acc.blocks, ...out.blocks].slice(0, 4);
}

export function answerByRules(question: string, progress?: (e: { tool: string; summary: string; ok: boolean }) => void): DemoReply {
  const q = question.replace(/^\s*@?kaju[,:]?\s*/i, "").trim();
  const t = q.toLowerCase();
  const acc: Acc = { citations: [], tools: [], proposals: [], blocks: [] };
  const call = (name: string, input: Record<string, unknown> = {}, blocks = true) => { const out = runDemoTool(name, input); absorb(acc, name, out, blocks); try { progress?.({ tool: name, summary: out.summary, ok: out.ok !== false }); } catch { /* best effort */ } return out; };
  const done = (text: string, suggestions = next(q)): DemoReply => ({ text, citations: acc.citations, tools: acc.tools, proposals: acc.proposals, ...(acc.blocks.length ? { blocks: acc.blocks } : {}), ...(acc.proposals.length ? {} : { suggestions }), engine: "tools" });
  const code = q.match(/\bSP[- ]?(\d{4})\b/i);

  if (!q) return done("Ask me something about the sample programme.", STARTERS.slice(0, 3));
  if (/^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/.test(t) && t.length < 40)
    return done(`Hello. I am Kaju, working here on a sample programme: **${SAMPLE.org}**, ${FIGURES.records} animal records as of ${SAMPLE.asOfWords}. Ask about its animals, its evidence or the October package.`, STARTERS.slice(0, 3));
  if (/\b(who are you|what (can|do) you do|what is kaju|what are you|help)\b/.test(t))
    return done(`I am Kaju, StrayPaw's AI agent. On this page I work on a sample programme (**${SAMPLE.org}**), so nothing here is a real organisation's record.\n- I read the register and say which records I used\n- I check evidence and find what is missing before a claim goes out\n- I prepare tasks, notes and the monthly package for a person to confirm\n\nIn your own workspace I do the same on your records, with your permissions.`, STARTERS.slice(0, 3));
  /* What stays with people. */
  if (/\b(approve|authori[sz]e|certif|sign[- ]?off|accept|reject|pay|payment|decide|merge)\b/.test(t) && /\b(can|could|will|would|do|does|should|who|what)\b/.test(t) && !/\bremind|task\b/.test(t))
    return done("No. I prepare; people decide. **Dr. Rao** authorises procedures, **Anita** confirms evidence and submits the package, and the municipal office accepts or queries each line, each in their own name. Acceptance is not payment, and I never mark a claim as paid.");
  /* A task or a reminder: prepared as a card, saved only on Confirm (and in this sample, not at all). */
  if (/\b(remind|task|ask (ravi|anita|dr\.? ?rao)|tell (ravi|anita|dr\.? ?rao)|follow[- ]?up with|chase)\b/.test(t)) {
    const who = /ravi/.test(t) ? "Ravi" : /rao/.test(t) ? "Dr. Rao" : /anita/.test(t) ? "Anita" : null;
    const a = code ? findAnimal(`SP-${code[1]}`) : /photo/.test(t) ? findAnimal("SP-1044") : null;
    const title = a && /photo/.test(t) ? `Send the release photo for ${a.code}` : q.replace(/^(please\s+)?(remind|ask|tell)\s+(ravi|anita|dr\.? ?rao)\s+(to\s+)?/i, "").replace(/^(add|create)\s+a\s+task\s+(to\s+)?/i, "").replace(/[.?!]+$/, "").slice(0, 160) || "Follow up";
    call("propose_task", { title: title.charAt(0).toUpperCase() + title.slice(1), assignee: who ?? (a ? "Ravi" : ""), due_on: PACKAGE.dueOn, animal: a?.code ?? "" });
    return done(`Here is what I made: a task${who || a ? ` for **${who ?? "Ravi"}**` : ""}, due ${PACKAGE.dueWords}. Review it and press **Confirm**. In this sample nothing is stored; in your workspace it is saved under your name.`);
  }
  if (/\b(duplicate|same (animal|dog)|twice|merge)\b/.test(t)) {
    call("animal_record", { code: "SP-1067" });
    return done("**SP-1067** may be **Moti (SP-1042)** seen again: both are brown females with a white chest at the Market gate, and SP-1067 already had an ear notch when Ravi reported her three days later. I flagged it; I do not merge records. **Anita** decides, and SP-1067 stays out of the claim until she does.");
  }
  /* One record by its code. */
  if (code) {
    const out = call("animal_record", { code: `SP-${code[1]}` });
    if (out.ok === false) return done(`I could not find **SP-${code[1]}** in the sample. The records I hold in detail are ${ANIMALS.map((a) => a.code).join(", ")}.`);
    const a = findAnimal(`SP-${code[1]}`)!;
    return done(`**${a.name ? `${a.name} (${a.code})` : a.code}** is at **${a.stage}**: ${a.sex.toLowerCase()}, ${a.looks}, ${a.place}.${a.missing.length ? ` Missing: ${a.missing.length === 5 ? "all five kinds of evidence" : a.missing.map((k) => k.replace(/_/g, " ")).join(", ")}.` : " All five kinds of evidence are on the record."}${a.flags.length ? ` ${a.flags.join(". ")}.` : ""}\n\nNext: ${a.next}`, [`What is missing across the whole ward?`, "How is the October package looking?", a.flags.some((f) => /duplicate/i.test(f)) ? "Why might SP-1042 and SP-1067 be the same animal?" : "Who changed what this week?"]);
  }
  if (/\b(packages?|claim|bill|submit\w*|submission|friday|reviewing office|municipal|exceptions?)\b/.test(t)) {
    call("report_package");
    return done(`The **October package** is a draft, due **${PACKAGE.dueWords}**: ${FIGURES.sterilised} sterilised, ${FIGURES.vaccinated} vaccinated, ${FIGURES.released} released, with ${FIGURES.exceptions} exceptions, each explained. Two still need a person: the release photo for SP-1044, and Anita's decision on SP-1067. I prepared it; Anita confirms and submits. Acceptance by the office is not payment.`);
  }
  if (/\b(missing|photos?|evidence|incomplete|gaps?|check)\b/.test(t)) {
    call("evidence_check");
    return done(`Of the **${FIGURES.releasedThisWeek} releases** in ${SAMPLE.week.split(" (")[0]}, three were missing a release photo. **SP-1031** is resolved (Ravi added it). **SP-1044** and **SP-1067** are still open, and SP-1067 may be a duplicate of SP-1042. Evidence across the ward is ${FIGURES.evidenceCompletePct}% complete.`, ["Remind Ravi to send the photo for SP-1044", "Show me SP-1067's record", "How is the October package looking?"]);
  }
  if (/\b(wards?|compare|comparison|chart|graph|slides?|deck|across)\b/.test(t)) {
    call("ward_comparison");
    const top = [...WARDS].sort((a, b) => b.sterilised - a.sterilised)[0];
    return done(`**${top.ward}** led October with **${top.sterilised} sterilisations**, of ${WARDS.reduce((n, w) => n + w.sterilised, 0)} across the five wards. These are recorded procedures, each authorised by a vet, not population estimates.`);
  }
  if (/\b(today|first|brief|needs? (me|anita|us)|attention|what should|priorit|waiting|urgent)\b/.test(t)) {
    call("programme_overview", {}, false); call("find_animals", { query: "SP-1084" }, false);
    acc.blocks = [{ kind: "records", title: "Needs a person today", items: TODAY_BRIEF.filter((b) => b.code).map((b) => ({ label: b.what, meta: b.code!, href: `/#record/${b.code}`, tag: b.tag })) }];
    return done(`Three things need a person today, in this order:\n- **SP-1084**: Ravi's pickup request from the market gate is a draft for Anita to review; the dog is limping\n- **SP-1044**: the release photo is still missing, and the package is due ${PACKAGE.dueWords}\n- **SP-1067**: decide whether she is SP-1042 seen again\n\nDr. Rao has also authorised 12 sterilisations from the 3 November list; nothing is needed from you there.`);
  }
  if (/\b(who|team|ravi|anita|rao|vet|activity|history|audit|changed|trail)\b/.test(t)) {
    call("team_activity");
    return done(`The sample team is **Anita** (coordinator), **Ravi** (field team) and **Dr. Rao** (veterinarian), with the municipal office as reviewer. Every change on a record keeps who made it and when; here is the latest.`);
  }
  if (/\b(how many|count|total|number of|figures?|stats?|statistics|overview|summary|sterili[sz]\w*|vaccinat\w*|released?|register|animals?|dogs?|records?)\b/.test(t)) {
    call("programme_overview");
    return done(`The **${SAMPLE.org}** register holds **${FIGURES.records} animal records**. In October: ${FIGURES.sterilised} sterilised, ${FIGURES.vaccinated} vaccinated and ${FIGURES.released} released, with ${FIGURES.inCare} still in care. These are recorded counts, not street-population estimates.`);
  }
  if (/\b(price|pricing|cost|demo|get started|sign ?up|trial|my (own )?(data|records|programme|organisation))\b/.test(t))
    return { ...done("This page runs on a sample programme. To put me on your own records, book a demo: we import your current registers, set up your team and agree the scope in writing first. Pricing is agreed per programme before work begins."), citations: [{ id: "page:/demo", label: "Book a demo", href: "/demo", kind: "page" }] };
  if (/\b(bite|bitten|rabies)\b/.test(t))
    return { ...done("I do not give medical advice. If someone has been bitten, wash the wound with soap and running water for 15 minutes and see a doctor today. Bite help says what to do and where to go."), citations: [{ id: "page:/bite-help", label: "Bite help", href: "/bite-help", kind: "page" }] };
  return done(`On this page I answer by fixed rules from the sample programme, so I can only read what it holds: its ${FIGURES.records} animal records, their evidence, the team's history and the October package. Try one of these.`, STARTERS.slice(0, 3));
}
