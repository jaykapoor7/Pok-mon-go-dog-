import "server-only";
import type { ToolCtx, ToolOut } from "./tools";

/* The organisation's own way of working: procedures, templates, decisions and facts its members wrote down in Kaju's
   memory (nx_kaju_memory) and a lead or admin approved, and the person's own saved preferences. Read with the person's
   own session, so row-level security decides; on top of that, an organisation entry nobody approved yet, a revoked one
   or one past its date is never used, even for the leads who can see drafts. Lexical match, no model, no embeddings. */

type Entry = { id: string; scope: "org" | "personal"; kind: string; title: string; body: string; approved_at: string | null; valid_until: string | null; source_kind: string | null; source_ref: string | null; created_at: string };
const STOP = new Set(["what", "whats", "how", "the", "our", "for", "and", "are", "with", "does", "do", "we", "you", "can", "about", "this", "that", "is", "of", "to", "in", "on", "a", "an", "procedure", "procedures", "process", "sop", "sops", "policy", "rule", "rules", "protocol", "steps", "hamare", "hamara", "kya", "hai", "kaise"]);
const terms = (q: string) => [...new Set(q.toLowerCase().normalize("NFKD").match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter((t) => !STOP.has(t));
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export async function orgProcedures(query: string, ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId) return { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
  const { data, error } = await ctx.db.from("nx_kaju_memory")
    .select("id,scope,kind,title,body,approved_at,valid_until,source_kind,source_ref,created_at")
    .eq("org_id", ctx.orgId).is("revoked_at", null).order("created_at", { ascending: false }).limit(300);
  if (error) return { data: { error: "Your organisation's procedures could not be read" }, summary: "Procedures could not be read", citations: [], ok: false };
  const now = today();
  const usable = ((data ?? []) as Entry[]).filter((e) => (e.scope === "personal" || !!e.approved_at) && (!e.valid_until || e.valid_until >= now));
  const words = terms(query);
  const scored = usable.map((e) => {
    const title = e.title.toLowerCase(), body = e.body.toLowerCase();
    return { e, score: words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0) };
  });
  const hits = (words.length ? scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score) : scored.filter((x) => x.e.scope === "org")).slice(0, 4).map((x) => x.e);
  return {
    data: {
      entries: hits.map((e) => ({ title: e.title, kind: e.kind, scope: e.scope === "org" ? "organisation (approved)" : "your own preference", text: e.body.slice(0, 1500), source: e.source_kind ? `${e.source_kind}${e.source_ref ? `: ${e.source_ref}` : ""}` : null, valid_until: e.valid_until })),
      searched: usable.length,
      note: "Written by the organisation's members and approved by a lead. Quote it; do not extend it. Not clinical or legal advice.",
    },
    summary: hits.length ? `${hits.length} of your organisation's approved entries` : usable.length ? "No approved entry matched" : "Nothing approved in Kaju's memory yet",
    citations: hits.map((e) => ({ id: `memory:${e.id}`, label: e.title, href: "/kaju/rules", kind: "page" as const })),
  };
}
