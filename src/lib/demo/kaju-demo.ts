/* Recording-only Kaju answers for the walkthrough (NEXT_PUBLIC_DEMO_RECORDING).
   The real panel renders them: tools run, sources, prepared changes and
   Confirm. Confirmed changes update the walkthrough's records only. */

import type { AiReply, Proposal } from "@/sp3/ai/types";
import { openDemoFile } from "@/sp/demo/FileViewer";
import { DEMO_OFFICE, DEMO_PEOPLE, DEMO_RATE, demoAddIntakeCase, demoCaseByCode, demoResolve } from "./abc-demo";

export const WHATSAPP_PROMPT = "Prepare a record from Ravi's WhatsApp message (photo and Hindi voice note).";
export const BLOCK_PROMPT = "What's blocking the October package?";
export const FILES_PROMPT = "Use Dr. Menon's register to double-check, then make the October board deck in PowerPoint and the ledger in Excel, and email both to the trustees.";
export const REVIEW_PROMPT = "Check this package before I accept it.";

const cite = (code: string) => ({ id: code, label: code, href: `/ngo/verification/${demoCaseByCode(code) ?? ""}`, kind: "case" as const });

export function demoKajuReply(q: string, path: string): { reply: AiReply; ms: number } {
  const t = q.toLowerCase();
  if (t.includes("whatsapp")) return { ms: 2600, reply: {
    engine: "model", citations: [],
    tools: [
      { name: "whatsapp_intake", summary: "1 photo and 1 voice note (0:14) from Ravi Kumar, field team", ok: true },
      { name: "transcribe_voice_note", summary: "Hindi, transcribed and translated to English", ok: true },
      { name: "read_photo", summary: "GPS 13.0012, 80.2565 · taken 07:42 today · adult female, no ear notch", ok: true },
      { name: "find_duplicates", summary: "Checked 1,248 animals in the register: no match", ok: true },
    ],
    text: "Voice note, transcribed (Hindi): **“गांधी नगर सेकंड स्ट्रीट पर एक मादा कुत्ता है, कान पर निशान नहीं है, पीछे का पैर थोड़ा लंगड़ा रहा है। आज सुबह पकड़ा, वैन में है।”**\n\nIn English: a female dog on Gandhi Nagar 2nd Street, no ear notch, a slight limp in a hind leg. Picked up this morning and in the van now.\n\nShe is not in your register, so this is a new ABC intake. I prepared the record. Still needed before it can be billed:\n- Surgery record and vet sign-off (Dr. R. Menon)\n- Ear-notch photo after surgery\n- Release photo and release location",
    proposals: [{ id: "p-intake", kind: "open_case", why: "From the WhatsApp message", title: "Female, Gandhi Nagar 2nd Street", city: "Chennai", zone: "Adyar", category: "sterilisation", severity: "normal", description: "ABC intake from Ravi Kumar's WhatsApp message (photo and Hindi voice note). Adult female, no ear notch, slight limp in a hind leg: vet to check at surgery. GPS 13.0012, 80.2565.", dogId: null }],
  } };
  if (t.includes("block")) return { ms: 3000, reply: {
    engine: "model",
    tools: [
      { name: "abc_verification_status", summary: "Read 146 October procedures", ok: true },
      { name: "find_missing_evidence", summary: "2 records missing a release photo", ok: true },
      { name: "abc_package_status", summary: "1 procedure waiting for vet sign-off", ok: true },
      { name: "find_duplicates", summary: "1 likely duplicate (same animal, photo match 96%)", ok: true },
    ],
    text: "**142 of 146 October procedures are ready to bill.** Four are holding the package up:\n- **ADY-ABC-1038** and **ADY-ABC-1089**: no release photo. Ravi released both, on 8 and 19 Oct.\n- **ADY-ABC-1122**: surgery done, Dr. Menon has not signed it off yet.\n- **ADY-ABC-1141**: the same dog as ADY-ABC-1093 (same photo, same street, 3 days apart). Billing it twice would be returned by the office.\n\nI prepared the fixes below. Nothing is sent until you confirm.",
    citations: ["ADY-ABC-1038", "ADY-ABC-1089", "ADY-ABC-1122", "ADY-ABC-1141"].map(cite),
    proposals: [
      { id: "p-sms", kind: "sms", why: "Release photos", to: ["Ravi Kumar (field team)"], values: ["ADY-ABC-1038", "ADY-ABC-1089"], note: "Ask Ravi for the two missing release photos" },
      { id: "p-vet", kind: "schedule_followup", why: "Vet sign-off", caseId: demoCaseByCode("ADY-ABC-1122") ?? "", caseLabel: "ADY-ABC-1122 · Male, Shastri Nagar", dogId: null, dueAt: new Date(Date.now() + 86_400_000).toISOString(), note: "Dr. Menon to sign off the surgery record" },
      { id: "p-dup", kind: "add_note", why: "Duplicate", caseId: demoCaseByCode("ADY-ABC-1141") ?? "", caseLabel: "ADY-ABC-1141 · Female, Besant Avenue", note: "Duplicate of ADY-ABC-1093. Merge and keep it out of every package." },
    ],
  } };
  if (t.includes("board deck")) return { ms: 3600, reply: {
    engine: "model", citations: [],
    tools: [
      { name: "read_file", summary: "Dr-Menon-surgery-register-October.xlsx: 146 surgeries, all 146 match StrayPaw records", ok: true },
      { name: "programme_report", summary: "October: 142 billed, ₹2,34,300, by week and by area", ok: true },
      { name: "make_file", summary: "October-2026-ABC-board-deck.pptx · 5 slides with chart and table", ok: true },
      { name: "make_file", summary: "October-2026-ABC-ledger.xlsx · 142 rows with totals", ok: true },
      { name: "google_workspace", summary: "Found the Trustees group (4 people) in your Google contacts", ok: true },
    ],
    text: "**Dr. Menon's register agrees with your records:** 146 surgeries, every one matched to a StrayPaw record. The only open item is the one we already chased: ADY-ABC-1122, sign-off pending.\n\nI made the board deck (5 slides: the month at a glance, pace by week, a table by area, and what is held for November) and the ledger (142 rows, rate and amount, with totals). Both save to your Google Drive, and the email to the trustees attaches them. Confirm each one.",
    proposals: [
      { id: "p-deck", kind: "report_file", why: "Board deck", format: "pptx", title: "ABC programme, October 2026 · board update", source: "verification", saveTo: "google", saveToName: "Google Drive" },
      { id: "p-ledger", kind: "report_file", why: "Ledger", format: "xlsx", title: "ABC programme, October 2026 · ledger", source: "verification", saveTo: "google", saveToName: "Google Drive" },
      { id: "p-mail", kind: "email", why: "Trustees", provider: "google", providerName: "Google Workspace", to: ["trustees@coastalpaws-demo.invalid"], cc: [], subject: "October ABC update: 142 procedures billed, ₹2,34,300", body: "Dear trustees,\n\nThe October package went to the Zone 13 office today: 142 verified sterilisations, ₹2,34,300. The board deck and ledger are attached.\n\nAnjali", send: true },
    ],
  } };
  if (t.includes("check this package") || (path.startsWith("/city") && t.includes("package"))) return { ms: 3200, reply: {
    engine: "model", citations: [], proposals: [],
    tools: [
      { name: "abc_package_status", summary: "142 records from Coastal Paws Trust, 1 to 31 Oct", ok: true },
      { name: "find_missing_evidence", summary: "710 of 710 evidence items present", ok: true },
      { name: "find_duplicates", summary: "No animal billed twice, here or in past packages", ok: true },
      { name: "check_locations", summary: "All 142 release points inside Zone 13 wards", ok: true },
    ],
    text: `**This package is complete.** Every one of the 142 procedures has a capture photo, surgery record, ear-notch photo, release photo and release location, and a vet sign-off by ${DEMO_PEOPLE.vet}.\n\n- No animal appears twice, including in September's package.\n- All release points are inside Zone 13.\n- Four October records were held back by the operator and are not billed.\n\nAt the contract rate of ₹${DEMO_RATE.toLocaleString("en-IN")} per procedure, the claim is **₹${(142 * DEMO_RATE).toLocaleString("en-IN")}**. Nothing here needs a query.`,
  } };
  return { ms: 1800, reply: { engine: "model", citations: [], proposals: [], tools: [{ name: "work_summary", summary: "Read today's work", ok: true }], text: `Coastal Paws Trust has 146 ABC procedures this month, 142 ready for ${DEMO_OFFICE.name}.` } };
}

/** Confirm, for the walkthrough's prepared changes. */
export async function demoExecute(p: Proposal): Promise<{ ok: true; at: string; what: string; href?: string }> {
  await new Promise((r) => setTimeout(r, 650));
  const at = new Date().toISOString();
  if (p.kind === "open_case") { const id = demoAddIntakeCase(p.title, p.zone ?? "Adyar"); return { ok: true, at, what: "Record created", href: `/ngo/verification/${id}` }; }
  if (p.kind === "report_file") { if (p.format === "pptx" || p.format === "xlsx") openDemoFile(p.format, p.title); return { ok: true, at, what: "Saved to Google Drive" }; }
  if (p.kind === "email") return { ok: true, at, what: "Sent from Google Workspace to the 4 trustees" };
  if (p.kind === "sms") return { ok: true, at, what: "SMS sent to Ravi Kumar" };
  if (p.kind === "schedule_followup") { demoResolve("ADY-ABC-1122", "vet"); return { ok: true, at, what: "Saved to the record" }; }
  if (p.kind === "add_note") { demoResolve("ADY-ABC-1141", "duplicate"); return { ok: true, at, what: "Saved to the record" }; }
  return { ok: true, at, what: "Done" };
}
