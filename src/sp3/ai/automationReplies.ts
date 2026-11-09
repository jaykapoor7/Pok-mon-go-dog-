import "server-only";
import type { ToolCtx, ToolOut } from "./tools";
import type { Shift, WardCoverage } from "./automations";

/* ════════════════════════════════════════════════════════════════════
   Kaju automations, in words. Each question that names an automation is
   answered from the tool's own result: short lines, real counts, the
   record links underneath. Returns null when the question is not one of
   these, so the rest of the router can answer it.
   ════════════════════════════════════════════════════════════════════ */

type Call = (name: string) => Promise<ToolOut>;

const rupees = (v: string | null | undefined) => {
  const m = String(v ?? "").match(/^(\d+)(?:\.\d+)?$/);
  return m ? `₹${Number(m[1]).toLocaleString("en-IN")}` : null;
};
const pl = (v: number, one: string, many = `${one}s`) => `${v.toLocaleString("en-IN")} ${v === 1 ? one : many}`;

export const ROUTES = {
  digest: /\b(weekly|this week|last week|past week|last 7 days|digest|what changed|what(?:'s| has)? happened|catch me up|round[- ]?up|week in review)\b/,
  overdue: /\bfollow[- ]?ups?\b.*\b(overdue|late|missed|nudge|behind|past due)\b|\b(overdue|late|missed|past due)\b.*\bfollow[- ]?ups?\b|\bnudge\b/,
  claim: /\b(claim|bill)\b.*\b(draft|prepare|build|ready|blocked|how much|this month)\b|\b(draft|prepare|build)\b.*\b(claim|bill|monthly package)\b|what can (?:i|we) claim/,
  brief: /\b(brief|briefing|pre-?check|exceptions?|what (?:is|'s) waiting|waiting for (?:me|us|a decision)|review queue|what needs (?:me|my attention|attention)|start my day|today)\b/,
  wards: /\b(ward coverage|coverage by (?:ward|area)|by ward|per ward|which wards?|wards? (?:coverage|activity|breakdown|summary|report)|spikes?|sudden (?:drop|rise|change)|drops? in|activity (?:change|shift)s?)\b/,
  memo: /\b(monthly report|month(?:ly)? note|draft (?:a |the )?report|report for the commissioner|commissioner)\b/,
};

function wardLines(d: { city: string; coverage: WardCoverage[]; shifts: Shift[]; animals_on_record: number; capped: boolean }) {
  const cov = d.coverage.slice(0, 6).map((w) => `- **${w.zone}**: ${pl(w.recorded, "animal")} · ${w.sterilised} sterilised · ${w.vaccinated} vaccinated${w.sterilisationUnknown ? ` · ${w.sterilisationUnknown} not recorded` : ""}`);
  const sh = d.shifts.map((s) => `- **${s.key}**: ${s.kind === "drop" ? "fewer" : "more"} new records, ${s.recent}/week against ${s.baseline}/week before`);
  return { cov, sh };
}

export async function automationReply(t: string, ctx: ToolCtx, call: Call): Promise<string | null> {
  const office = !ctx.orgId && ctx.actorRole === "municipal_reviewer";

  if (office && ROUTES.memo.test(t)) {
    const [b, w] = [await call("office_brief"), await call("ward_activity")];
    if (b.ok === false && w.ok === false) return b.summary;
    const bd = b.data as { waiting?: number; decided_this_month?: number; with_operator?: number; checked?: { title: string; exceptions: number | null }[] };
    const wd = w.data as { city?: string; coverage?: WardCoverage[]; shifts?: Shift[]; animals_on_record?: number; capped?: boolean };
    const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const ex = (bd.checked ?? []).reduce((s, p) => s + (p.exceptions ?? 0), 0);
    const lines = [`**Draft · ABC programme note, ${month}**`, "",
      "**Claims**",
      b.ok === false ? "- Packages could not be read." : `- ${pl(bd.decided_this_month ?? 0, "package")} decided this month; ${pl(bd.waiting ?? 0, "package")} waiting${ex ? ` with ${pl(ex, "exception")} found on pre-check` : ""}; ${pl(bd.with_operator ?? 0, "package")} with the operator.`];
    if (w.ok !== false && wd.city) {
      const { cov, sh } = wardLines(wd as Parameters<typeof wardLines>[0]);
      lines.push("", `**Recorded animals in ${wd.city}**`, ...(cov.length ? cov : ["- No ward has records yet."]), "", "**Changes**", ...(sh.length ? sh : ["- No sudden change in new records over eight weeks."]));
    }
    lines.push("", "Shares are of recorded animals, not the street population. Edit before sending; this draft decides nothing.");
    return lines.join("\n");
  }

  if (office && ROUTES.brief.test(t)) {
    const out = await call("office_brief");
    if (out.ok === false) return out.summary;
    const d = out.data as { waiting: number; decided_this_month: number; with_operator: number; checked: { title: string; operator: string | null; waitingDays: number | null; claims: number | null; exceptions: number | null; top: string | null }[] };
    if (!d.waiting) return `**Nothing waits for a decision.**\n\n${pl(d.decided_this_month, "package")} decided this month · ${pl(d.with_operator, "package")} with the operator.`;
    const rows = d.checked.map((p) => `- **${p.title}**${p.operator ? ` · ${p.operator}` : ""} · waiting ${p.waitingDays === null ? "since an unknown date" : pl(p.waitingDays, "day")} · ${p.claims === null ? "could not be pre-checked" : `${pl(p.claims, "claim")}, ${p.exceptions ? `**${pl(p.exceptions, "exception")}**${p.top ? ` (mostly ${p.top.toLowerCase()})` : ""}` : "no exceptions"}`}`);
    return `**${pl(d.waiting, "package")} ${d.waiting === 1 ? "waits" : "wait"} for a decision**, oldest first:\n${rows.join("\n")}${d.waiting > d.checked.length ? `\n- …and ${d.waiting - d.checked.length} more in Review submissions.` : ""}\n\nDraft notes are ready inside each package. Every decision is yours.`;
  }

  if (ROUTES.wards.test(t) && !/\b(unknown|denominator|population)\b/.test(t)) {
    const out = await call("ward_activity");
    if (out.ok === false) return out.summary;
    const d = out.data as { city: string; coverage: WardCoverage[]; shifts: Shift[]; animals_on_record: number; capped: boolean };
    const { cov, sh } = wardLines(d);
    return [`**${d.city} · recorded animals by ward**`, ...(cov.length ? cov : ["- No ward has records yet."]), "", "**Changes in new records** (last two weeks against the six before)", ...(sh.length ? sh : ["- No sudden change."]), "", `Shares are of ${pl(d.animals_on_record, "recorded animal")}${d.capped ? " (first 5,000 read)" : ""}, not the street population.`].join("\n");
  }

  if (!ctx.orgId) return null;

  if (ROUTES.digest.test(t) && !/\b(schedule|remind|note|add|open a case|follow[- ]?up on)\b/.test(t)) {
    const out = await call("weekly_digest");
    if (out.ok === false) return out.summary;
    const d = out.data as { changed: string[]; needs: string[]; partial: boolean };
    return [`**Last 7 days**`, ...d.changed.map((x) => `- ${x}`), "", "**Who needs to act**", ...(d.needs.length ? d.needs.map((x) => `- ${x}`) : ["- Nobody is waiting on anything."]), ...(d.partial ? ["", "Some sources could not be read; those lines say unknown."] : [])].join("\n");
  }

  if (ROUTES.overdue.test(t)) {
    const out = await call("overdue_followups");
    if (out.ok === false) return out.summary;
    const d = out.data as { total: number; groups: { holder: string; count: number; oldest: number }[]; reschedule_to: string };
    if (!d.total) return "**No follow-up is overdue.** Every due review has been recorded.";
    const n = out.proposals?.length ?? 0;
    return `**${pl(d.total, "overdue follow-up")}**\n${d.groups.slice(0, 6).map((g) => `- **${g.holder}**: ${g.count} (oldest ${pl(g.oldest, "day")} late)`).join("\n")}\n\n${n ? `I prepared ${pl(n, "reschedule")} for ${new Date(d.reschedule_to).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Confirm the ones you want.` : "Open each case to reschedule."}`;
  }

  if (ROUTES.claim.test(t)) {
    const out = await call("claim_draft");
    if (out.ok === false) return out.summary;
    const d = out.data as { month: string; ready: { count: number; total: string | null; unpriced: number } | null; contract: string; blocked_by: { reason: string; count: number }[]; blocked_records: { code: string; why: string }[]; partial: boolean };
    const ready = d.ready && d.ready.count === 0
      ? "**Ready to claim:** nothing yet this month"
      : d.ready
      ? `**Ready to claim:** ${pl(d.ready.count, "procedure")}${rupees(d.ready.total) ? ` · ${rupees(d.ready.total)}` : ""}${d.ready.unpriced ? ` (${d.ready.unpriced} without a contract rate)` : ""}`
      : `**Ready to claim:** unknown${d.contract === "none" ? " (no contract in force)" : d.contract === "several offices" ? " (contracts with several offices; open Monthly claim to choose one)" : ""}`;
    const blocked = d.blocked_by.length ? ["", "**Still blocked**", ...d.blocked_by.map((b) => `- ${b.reason}: ${b.count}`)] : ["", "Nothing in the month is blocked."];
    const first = d.blocked_records.length ? ["", "**Unblock first**", ...d.blocked_records.slice(0, 5).map((r) => `- ${r.code}: ${r.why}`)] : [];
    return [`**${d.month} claim · draft**`, ready, ...blocked, ...first, "", `Open Monthly claim to build the package. Nothing is submitted until you do.${d.partial ? " The queue read was capped, so blocked counts may be low." : ""}`].join("\n");
  }

  return null;
}
