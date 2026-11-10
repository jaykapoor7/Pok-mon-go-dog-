import type { ToolCtx, ToolOut } from "./tools";

/* ════════════════════════════════════════════════════════════════════
   Things Kaju writes, without a model.

   Two kinds, kept apart on purpose:

   · From your records. A morning brief, a reminder for missing evidence,
     the vet's sign-off list. Every line comes from a tool result read in
     this request; a section that could not be read says so instead of
     showing zero.
   · Standard notices. A dog-bite first-aid notice, an ABC drive notice
     for residents, what to do on finding an injured dog. These are fixed,
     reviewed texts with blanks to fill; they quote no record.

   If the person names an email address or a Slack channel and that
   account is connected, the text is prepared as an email or a post for
   them to confirm. Nothing is ever sent from here.
   ════════════════════════════════════════════════════════════════════ */

type Call = (name: string, input?: Record<string, unknown>) => Promise<ToolOut>;
export type Composed = { text: string; suggestions?: string[] };

const WRITE = /\b(write|draft|compose|prepare|make|create|generate|give me|need|send|post)\b/;
const KIND = /\b(message|reminder|brief|briefing|notice|note|post|announcement|update|list|poster|email|mail|text|sms|standup|stand-up|summary|circular|template)\b/;

const pl = (v: number, one: string, many = `${one}s`) => `${v.toLocaleString("en-IN")} ${v === 1 ? one : many}`;
const today = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
const KIND_LABEL: Record<string, string> = { capture_photo: "capture photo", surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release location" };
type Q = { case_id: string; case_code: string | null; title: string | null; city: string | null; missing: string[]; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted?: boolean };
const name = (r: Q) => r.title || r.case_code || "ABC record";

const NOTICES: { match: RegExp; title: string; body: string }[] = [
  { match: /\bbite\b|\brabies\b.*\b(notice|poster|first aid|what to do)\b|first aid/, title: "Dog bite: what to do", body: [
    "**If a dog bites or scratches you**",
    "1. Wash the wound at once with soap and running water for 15 minutes.",
    "2. Apply an antiseptic if you have one. Do not bandage tightly, and do not put chilli, oil, lime or soil on it.",
    "3. Go to a doctor or government hospital the same day and ask about anti-rabies vaccination. Finish every dose you are given.",
    "4. Tell the doctor if the dog can be observed and where it lives.",
    "",
    "Rabies is preventable when treatment starts quickly. Do not wait for symptoms.",
    "",
    "Report the animal: [your helpline or StrayPaw report link]",
    "",
    "_General public guidance. A doctor decides the treatment._" ].join("\n") },
  { match: /\b(abc|sterilis\w+|vaccination)\b.*\b(drive|camp|notice|announcement|residents?|rwa|society)\b|\b(drive|camp)\b.*\b(notice|announcement)\b/, title: "ABC drive notice for residents", body: [
    "**Street dog sterilisation and vaccination in [area]**",
    "",
    "[Organisation] will run an Animal Birth Control drive in [area] on [dates], with [municipal body].",
    "",
    "What will happen:",
    "- Trained staff will catch street dogs humanely, in the morning.",
    "- Each dog is sterilised and vaccinated against rabies by a veterinarian.",
    "- After recovery, each dog is released at the same spot it was caught. This is required by the ABC Rules.",
    "- A sterilised dog has a small notch on one ear.",
    "",
    "How you can help:",
    "- Tell us where dogs usually rest and who feeds them: [contact].",
    "- Keep pet dogs indoors or on a lead during catching hours.",
    "- Do not chase or corner the dogs; let the team work.",
    "",
    "Questions: [name, phone]" ].join("\n") },
  { match: /\binjured\b|\bfound (?:a |an )?(?:dog|animal)\b|\bwhat to do\b.*\b(dog|animal)\b|\brescue (?:notice|guide|steps)\b/, title: "If you find an injured street animal", body: [
    "**If you find an injured street animal**",
    "1. Keep yourself safe first. An animal in pain may bite; do not touch its mouth or wound.",
    "2. Note the exact place: a landmark, a gate number, or share your location.",
    "3. Take one clear photo from a safe distance.",
    "4. Report it: [helpline or StrayPaw report link]. Say what you saw and whether the animal can move.",
    "5. If you can stay, keep traffic and other animals away until help arrives. Offer water, not food or medicine.",
    "",
    "Do not move an animal with a suspected broken bone or spine unless it is in immediate danger." ].join("\n") },
];

/** A written piece for this request, or null when the request is not one. */
export async function compose(t: string, raw: string, ctx: ToolCtx, call: Call): Promise<Composed | null> {
  if (raw.length > 240 || !WRITE.test(t) || !KIND.test(t)) return null;
  const notice = NOTICES.find((x) => x.match.test(t));
  let title = "", body = "", suggestions: string[] = [];

  if (notice) {
    title = notice.title; body = `${notice.body}\n\nA standard notice: fill the blanks in [brackets] before sharing.`;
    suggestions = NOTICES.filter((x) => x !== notice).map((x) => `Write: ${x.title.toLowerCase()}`).slice(0, 2);
  } else if (/\b(vet|veterinar\w*|doctor)\b/.test(t) && /\b(list|sign|authoris|today|queue)\b/.test(t)) {
    if (!ctx.orgId) return { text: "The vet's list is built from your organisation's ABC records. Sign in to your workspace first." };
    const out = await call("abc_verification_status"); if (out.ok === false) return { text: out.summary };
    const rows = ((out.data as { records?: Q[] }).records ?? []).filter((r) => !r.vet_authorised && !r.missing.includes("surgery_record"));
    title = "Vet sign-off list";
    body = rows.length ? [`**For the vet · ${today()}**`, "", `${pl(rows.length, "procedure")} waiting for your authorisation:`, ...rows.slice(0, 15).map((r, i) => `${i + 1}. ${name(r)}${r.city ? ` · ${r.city}` : ""}`), rows.length > 15 ? `…and ${rows.length - 15} more in Treatment & sign-off.` : "", "", "Each one is signed in your own name in StrayPaw. Nothing is signed for you."].filter((x) => x !== "").join("\n").replace(/\n(\d+\. )/g, "\n$1")
      : "No procedure with a surgery record is waiting for a vet's authorisation in the records I can read (up to 100).";
    suggestions = ["Draft a reminder for missing release photos", "Write a morning brief for the team"];
  } else if (/\b(missing|release|photo|photos|evidence|chase|incomplete)\b/.test(t)) {
    if (!ctx.orgId) return { text: "A reminder is built from your organisation's ABC records. Sign in to your workspace first." };
    const out = await call("abc_verification_status"); if (out.ok === false) return { text: out.summary };
    const rows = ((out.data as { records?: Q[] }).records ?? []).filter((r) => r.missing.length && !r.government_accepted);
    const want = /\brelease\b/.test(t) ? rows.filter((r) => r.missing.some((k) => k.startsWith("release"))) : rows;
    title = "Reminder: missing evidence";
    body = want.length ? ["**Team, these records cannot be approved yet.** Please add what is missing today:", "", ...want.slice(0, 12).map((r) => `- ${name(r)}${r.city ? ` (${r.city})` : ""}: ${r.missing.map((k) => KIND_LABEL[k] ?? k.replace(/_/g, " ")).join(", ")}`), want.length > 12 ? `- …and ${want.length - 12} more in Release evidence.` : "", "", "Open the record in StrayPaw, add the photo or place, and it moves on by itself. Thank you."].filter((x) => x !== "").join("\n")
      : `No record is missing ${/\brelease\b/.test(t) ? "a release photo or place" : "evidence"} in the ABC records I can read (up to 100). Nothing to chase.`;
    suggestions = ["Write the vet's sign-off list", "Which records block this month's bill?"];
  } else if (/\b(brief|briefing|standup|stand-up|morning|daily|team|update|summary)\b/.test(t)) {
    if (!ctx.orgId) return { text: "A team brief is built from your organisation's records. Sign in to your workspace first." };
    /* overdue_followups also prepares reschedules; a brief only reads, so the count comes from the work summary. */
    const [w, v] = [await call("work_summary"), await call("abc_verification_status")];
    const o: ToolOut = { ok: false, data: {}, summary: "", citations: [] };
    const wd = w.data as { open_current?: number; unassigned?: number; critical?: number; overdue_followups?: number; next_cases?: { case_code: string | null; title: string | null; zone: string | null; assignee_name: string | null }[] };
    const recs = (v.data as { records?: Q[] }).records ?? [];
    const od = o.data as { total?: number; by_holder?: { holder: string | null; count: number }[] };
    const lines = [`**Morning brief · ${today()}**`, ""];
    lines.push(w.ok === false ? "- Open work could not be read." : `- ${pl(wd.open_current ?? 0, "open case")}: ${wd.critical ?? 0} critical, ${wd.unassigned ?? 0} unassigned.`);
    lines.push(o.ok === false ? `- Follow-ups: ${w.ok === false ? "could not be read" : pl(wd.overdue_followups ?? 0, "overdue follow-up")}.` : `- ${pl(od.total ?? wd.overdue_followups ?? 0, "overdue follow-up")}${od.by_holder?.length ? ` (${od.by_holder.slice(0, 3).map((h) => `${h.holder ?? "unassigned"} ${h.count}`).join(", ")})` : ""}.`);
    lines.push(v.ok === false ? "- ABC records could not be read." : `- ABC: ${recs.filter((r) => !r.vet_authorised && !r.missing.includes("surgery_record")).length} waiting for the vet, ${recs.filter((r) => r.missing.length).length} missing evidence, ${recs.filter((r) => r.vet_authorised && !r.missing.length && !r.evidence_reviewed).length} ready for review.`);
    const first = (wd.next_cases ?? []).slice(0, 3);
    if (first.length) lines.push("", "First today:", ...first.map((c) => `- ${c.case_code ?? c.title ?? "Case"}${c.zone ? ` · ${c.zone}` : ""} · ${c.assignee_name ?? "needs an owner"}`));
    lines.push("", "Figures are from StrayPaw this morning. Imported history is not included.");
    title = `Morning brief, ${today()}`; body = lines.join("\n");
    suggestions = ["Draft a reminder for missing release photos", "Write the vet's sign-off list", "Open cases by zone"];
  } else return null;

  /* Deliver through a connected account when one is named; otherwise it is text to copy. */
  const caps = (cap: string) => !!ctx.conn && Object.values(ctx.conn.caps).some((c) => c?.includes(cap as never));
  const email = raw.match(/[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}/i)?.[0];
  const channel = raw.match(/#([a-z0-9][a-z0-9_-]{1,40})/i)?.[1];
  const plain = body.replace(/\*\*/g, "").replace(/^_|_$/gm, "");
  if (email && caps("mail.draft")) { const out = await call("draft_email", { to: [email], subject: title, body: plain }); return { text: out.ok === false ? `${body}\n\n${out.summary}` : `${body}\n\nI prepared this as an email to ${email}. Check it and press Confirm; nothing is sent until you do.`, suggestions }; }
  if (channel && caps("chat.post")) { const out = await call("post_message", { channel, text: plain }); return { text: out.ok === false ? `${body}\n\n${out.summary}` : `${body}\n\nI prepared this as a post to #${channel}. Press Confirm to post it.`, suggestions }; }
  const how = email || channel ? `\n\n${email ? "Sending by email needs a connected Google or Microsoft account" : "Posting needs Slack connected"} (Settings → Connections). Until then, copy the text.` : "\n\nCopy it into WhatsApp or email, and edit freely. Nothing was sent.";
  return { text: `${body}${notice ? "" : how}`, suggestions };
}
