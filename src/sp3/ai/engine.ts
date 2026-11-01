import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { extractFieldMessage } from "./extract";
import { NAV, TOOL_DEFS, runTool, toolRun, type ToolCtx, type ToolOut } from "./tools";
import type { AiReply, ChatTurn, Citation, Proposal, ToolRun } from "./types";

/* ════════════════════════════════════════════════════════════════════
   Kaju engine.

   With ANTHROPIC_API_KEY set, Claude runs a tool-use loop over the tools
   in ./tools (reads under the caller's session; writes only as proposals).
   Without a key, a deterministic router picks the right tool from the
   question and writes a plain answer from the tool's real output, and the
   reply says that free-form answers are off. Both paths return citations
   built from the records the tools actually read; the model is never the
   source of a record ID.
   ════════════════════════════════════════════════════════════════════ */

const MODEL = process.env.STRAYPAW_AI_MODEL?.trim() || "claude-opus-5-5";
const MAX_STEPS = 6;

const SYSTEM = `You are Kaju, StrayPaw's AI agent, working inside StrayPaw, operations software for street-animal programmes in India (municipal ABC sterilisation and ARV anti-rabies vaccination, rescue, care and reporting).

How to work:
- Use the tools to read records. Never state a figure, name, case or animal that a tool did not return in this conversation.
- Refer to records by the label the tool returned (case code, animal name or StrayPaw tag). The interface turns tool results into links; do not invent URLs.
- To change anything (open a case, add a note, schedule a follow-up, record care), call the matching propose_ tool. It does NOT save. Tell the user to review and press Confirm. Never say something was saved.
- You cannot approve medical procedures, certify fieldwork, authorise payments, merge duplicates or create evidence. Say so if asked, and point to the manual screen.
- Imported historical records are not live work. Recorded counts are not population estimates. A gap in the record is a gap, not a zero.
- When a field message is pasted, call extract_field_message first, then ask only for what is missing before proposing a case.
- If a tool says organisation access is required, explain that the user needs to be a member of an organisation workspace.
- Be brief and concrete: short paragraphs or a few bullets. Indian English spelling.`;

type Acc = { citations: Citation[]; tools: ToolRun[]; proposals: Proposal[]; navigate?: { href: string; label: string } };
function absorb(acc: Acc, name: string, out: ToolOut) {
  acc.tools.push(toolRun(name, out));
  for (const c of out.citations) if (!acc.citations.some((x) => x.id === c.id)) acc.citations.push(c);
  if (out.proposals) acc.proposals.push(...out.proposals);
  if (out.navigate) acc.navigate = out.navigate;
}

export const modelConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

export async function answer(messages: ChatTurn[], ctx: ToolCtx, context: { path?: string; workspace?: string }): Promise<AiReply> {
  const turns = messages.filter((m) => m.text?.trim()).slice(-12).map((m) => ({ role: m.role, text: m.text.slice(0, 6000) }));
  if (!turns.length || turns[turns.length - 1].role !== "user") return { text: "Ask me something about your records.", citations: [], tools: [], proposals: [], engine: "tools" };
  if (modelConfigured()) {
    try { return await withModel(turns, ctx, context); }
    catch (e) {
      console.error("Kaju model call failed", e instanceof Error ? e.message : e);
      const r = await withTools(turns[turns.length - 1].text, ctx);
      return { ...r, notice: "Kaju could not reach its reasoning service, so this reply comes from the record tools alone." };
    }
  }
  const r = await withTools(turns[turns.length - 1].text, ctx);
  return { ...r, notice: "Kaju answered from StrayPaw's record tools. Free-form answers are off on this deployment." };
}

/* ── Claude tool-use loop ─────────────────────────────────────────── */
async function withModel(turns: ChatTurn[], ctx: ToolCtx, context: { path?: string; workspace?: string }): Promise<AiReply> {
  const client = new Anthropic();
  const acc: Acc = { citations: [], tools: [], proposals: [] };
  const msgs: Anthropic.Beta.BetaMessageParam[] = turns.map((t) => ({ role: t.role, content: t.text }));
  const where = `Today is ${new Date().toISOString().slice(0, 10)}. The user is ${ctx.orgId ? "a member of an organisation workspace" : "not a member of any organisation (public records only)"}. They are on ${context.path ?? "an unknown page"} in the ${context.workspace ?? "unknown"} workspace.`;
  let text = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }, { type: "text", text: where }],
      tools: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as unknown as Anthropic.Beta.BetaTool.InputSchema })),
      tool_choice: { type: "auto" },
      messages: msgs,
    });
    if (res.stop_reason === "refusal") return { text: "I can't help with that request.", ...acc, engine: "model" };
    text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) break;
    msgs.push({ role: "assistant", content: res.content });
    const results = await Promise.all(uses.map(async (u) => {
      const input = (u.input && typeof u.input === "object" ? u.input : {}) as Record<string, unknown>;
      let out: ToolOut;
      try { out = await runTool(u.name, input, ctx); } catch (e) { out = { data: { error: e instanceof Error ? e.message : "Tool failed" }, summary: "Tool failed", citations: [], ok: false }; }
      absorb(acc, u.name, out);
      return { type: "tool_result" as const, tool_use_id: u.id, content: JSON.stringify(out.data).slice(0, 12000), ...(out.ok === false ? { is_error: true } : {}) };
    }));
    msgs.push({ role: "user", content: results });
  }
  return { text: text || "Done. Review the prepared items below.", ...acc, engine: "model" };
}

/* ── Deterministic router (no model) ──────────────────────────────── */
const has = (t: string, re: RegExp) => re.test(t);
async function call(acc: Acc, ctx: ToolCtx, name: string, input: Record<string, unknown> = {}) {
  const out = await runTool(name, input, ctx);
  absorb(acc, name, out);
  return out;
}
const n = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-IN") : "0");
const pl = (v: unknown, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;
const clean = (s: string) => s.replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
const STOP = /\b(find|search|show|me|the|a|an|for|any|all|records?|about|look|up|please|can|you|what|is|are|where|which|of|on|in|with|my|our|dog|dogs|animal|animals|case|cases)\b/gi;

export async function withTools(q: string, ctx: ToolCtx): Promise<Omit<AiReply, "notice">> {
  const t = q.toLowerCase();
  const acc: Acc = { citations: [], tools: [], proposals: [] };
  const done = (text: string): Omit<AiReply, "notice"> => ({ text, ...acc, engine: "tools" });
  const needsOrg = "That needs an organisation workspace. Join your organisation with its code, or ask me about published programmes and the public map.";

  // A pasted field update: long text, or one that reads like a report.
  const looksLikeField = q.length > 90 || has(t, /\b(released|rescued|spotted|found|injured|sterili[sz]ed|vaccinated|ear ?notch|limping|bleeding|stuck)\b/);
  if (has(t, /\b(go to|open|take me|navigate|show me the)\b/) && !looksLikeField) {
    const key = Object.keys(NAV).sort((a, b) => b.length - a.length).find((k) => t.includes(k.replace(/_/g, " ")) || t.includes(NAV[k].label.toLowerCase()));
    if (key) { await call(acc, ctx, "navigate", { to: key }); return done(`Opening ${NAV[key].label}.`); }
  }
  /* "Add a note to CASE-123: text" · "Follow up on CASE-123 tomorrow / on 2026-11-04 / in 3 days" */
  const noteM = q.match(/\b(?:add|write|log|put)\b[^:]*?\bnote\b\s*(?:on|to|for)?\s*([^:]+?)\s*:\s*([\s\S]+)$/i);
  const fuM = noteM ? null : q.match(/\bfollow[- ]?up\b\s*(?:on|for)?\s*(.+?)\s+(?:on|for|by)?\s*(tomorrow|today|in \d+ days?|\d{4}-\d{2}-\d{2})\b(?:\s*[:,-]\s*([\s\S]+))?/i);
  if (noteM || fuM) {
    if (!ctx.orgId) return done(needsOrg);
    const ref = clean((noteM ?? fuM)![1]);
    const { data: hit } = await ctx.db.from("org_case_facts").select("id,case_code,title").or(`case_code.ilike.%${ref}%,title.ilike.%${ref}%,animal_name.ilike.%${ref}%`).limit(1).maybeSingle();
    acc.tools.push({ name: "search_records", summary: hit ? `Found ${hit.case_code ?? hit.title}` : `No case matches “${ref}”`, ok: !!hit });
    if (!hit) return done(`I could not find a case matching “${ref}” in your organisation's register. Use the case code shown on the case.`);
    if (noteM) { await call(acc, ctx, "propose_note", { case_id: hit.id, note: noteM[2].trim() }); return done(`I prepared a note on **${hit.case_code ?? hit.title}**. Check it and press Confirm to add it to the case history.`); }
    const w = fuM![2].toLowerCase(); const now = Date.now();
    const due = w === "today" ? new Date(now) : w === "tomorrow" ? new Date(now + 86_400_000) : /^in /.test(w) ? new Date(now + Number(w.match(/\d+/)![0]) * 86_400_000) : new Date(w);
    await call(acc, ctx, "propose_followup", { case_id: hit.id, due_date: due.toISOString().slice(0, 10), note: fuM![3]?.trim() ?? "" });
    return done(acc.proposals.length ? `I prepared a follow-up on **${hit.case_code ?? hit.title}** for ${due.toISOString().slice(0, 10)}. Press Confirm to schedule it.` : "That date is not valid for a follow-up.");
  }
  if (has(t, /missing|incomplete|without (a )?(photo|evidence|place)|can'?t be counted|cannot be counted|gaps?\b/)) {
    const out = await call(acc, ctx, "find_missing_evidence");
    if (out.ok === false) return done(needsOrg);
    const d = out.data as { animals_without_photo: number; open_cases_without_animal: number; open_cases_without_place: number };
    return done(`**${pl(d.animals_without_photo, "animal", "animals")}** on your register ${d.animals_without_photo === 1 ? "has" : "have"} no photo. Among open cases, **${n(d.open_cases_without_animal)}** have no linked animal and **${n(d.open_cases_without_place)}** have no place.${acc.citations.length ? " The most recent ones are linked below; open each to add what is missing." : ""} Fix them on the record or in Data quality.`);
  }
  if (has(t, /duplicat|same dog|twice|double/)) {
    const out = await call(acc, ctx, "find_duplicates");
    if (out.ok === false) return done(needsOrg);
    const d = out.data as { scanned: number; candidate_groups: unknown[] };
    return done(d.candidate_groups.length ? `I found **${d.candidate_groups.length}** groups of animals with the same name in the same locality (from ${n(d.scanned)} named animals). They are candidates only: compare them and decide; nothing is merged automatically.` : `No candidate duplicates by name and locality among ${n(d.scanned)} named animals. Unnamed animals cannot be compared this way.`);
  }
  if (has(t, /summar|queue|today|due|overdue|my work|workload|what should|next|unassigned|urgent|critical/)) {
    const out = await call(acc, ctx, "work_summary");
    if (out.ok === false) return done(needsOrg);
    const d = out.data as { open_current: number; unassigned: number; critical: number; overdue_followups: number; historical_imports_awaiting_review: number };
    return done(`Your organisation has **${pl(d.open_current, "open case", "open cases")}** in current work: ${n(d.unassigned)} unassigned, ${n(d.critical)} with a critical condition and ${n(d.overdue_followups)} with an overdue follow-up.${d.historical_imports_awaiting_review ? ` Separately, ${pl(d.historical_imports_awaiting_review, "imported historical case still waits", "imported historical cases still wait")} for review; they are not today's work.` : ""}${acc.citations.length ? ` The next ${acc.citations.length === 1 ? "case" : "cases"} by due date ${acc.citations.length === 1 ? "is" : "are"} linked below.` : ""}`);
  }
  if (looksLikeField || has(t, /\b(open|create|new|log|file)\b.*\bcase\b/)) {
    const x = extractFieldMessage(q);
    acc.tools.push({ name: "extract_field_message", summary: x.summary, ok: true });
    if (!ctx.orgId) return done(`I read this as: **${x.summary}**. To turn it into a case you need an organisation workspace. Residents can report it at /community/report.`);
    const city = x.city ?? "";
    if (city) await call(acc, ctx, "propose_case", { title: x.summary.slice(0, 110), city, zone: x.place ?? undefined, category: x.category, severity: x.severity, description: `${q.trim().slice(0, 1200)}${x.date ? `\n\nDate given: ${x.date}.` : ""}` });
    const missing = x.missing.filter((m) => m !== "city" || !city);
    return done(`I read this as **${x.summary}**${x.date ? `, dated ${x.date}` : ""}.${missing.length ? ` Still missing: ${missing.join(", ")}.` : ""}${city ? " I prepared a case below. Check it and press Confirm to save it; nothing is saved until you do." : " Tell me the city and I will prepare the case."}`);
  }
  if (has(t, /programme|program|drive|report|steril|vaccin|abc|arv|figures|how many/)) {
    const words = q.replace(STOP, " ").replace(/\b(programmes?|programs?|drives?|reports?|sterili[sz]ations?|vaccinations?|abc|arv|figures|how|many|published|public|list|there|have|has|been|done|running|active)\b/gi, " ").replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
    let out = await call(acc, ctx, "programme_report", { query: words });
    if (words && !(out.data as { published_programmes: unknown[] }).published_programmes.length) { acc.tools.pop(); out = await call(acc, ctx, "programme_report", {}); }
    const d = out.data as { your_programmes?: { name: string }[]; published_programmes: { name: string; ngo_name?: string; animals_recorded?: number; sterilised_recorded?: number; vaccinated_recorded?: number; public_summary?: string }[] };
    const lines = d.published_programmes.slice(0, 5).map((p) => `- **${p.name}**${p.ngo_name ? ` (${p.ngo_name})` : ""}: ${p.public_summary ?? `${n(p.animals_recorded)} animals recorded`}`);
    return done(`${d.your_programmes?.length ? `Your organisation has **${d.your_programmes.length}** active programme${d.your_programmes.length === 1 ? "" : "s"}. ` : ""}${lines.length ? `Published programmes${words ? ` matching “${words}”` : ""}:\n${lines.join("\n")}\n\nThese are recorded counts from each register, including imported history, not population estimates.` : "No published programme matches that."}`);
  }
  const query = q.replace(STOP, " ").replace(/\s+/g, " ").trim() || q.trim();
  const out = await call(acc, ctx, "search_records", { query });
  if (out.ok === false) return done("Give me a name, a StrayPaw tag, a case code, a locality or a programme to look for.");
  const d = out.data as Record<string, unknown[]>;
  const parts = [d.your_cases?.length && `${d.your_cases.length} of your cases`, d.your_animals?.length && `${d.your_animals.length} of your animals`, d.public_animals?.length && `${d.public_animals.length} public animal records`, d.programmes?.length && `${d.programmes.length} programmes`].filter(Boolean);
  return done(parts.length ? `For “${query}” I found ${parts.join(", ")}. They are linked below.` : `Nothing you can see matches “${query}”. Try a StrayPaw tag, a case code or a locality.`);
}
