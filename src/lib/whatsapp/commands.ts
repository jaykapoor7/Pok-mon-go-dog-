export type StaffCommand = { action: string; tracking?: string; data?: Record<string, string | number> };
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
/** A deliberately small, deterministic grammar. AI never chooses an operation. */
export function staffCommand(text: string): StaffCommand | null {
  const [verb = "", tracking = "", ...args] = text.trim().split(/\s+/);
  const v = verb.toUpperCase();
  if (["HELP", "MY", "TEAM"].includes(v)) return { action: v.toLowerCase() };
  if (!/^SP-[A-F\d]{12}$/i.test(tracking)) return null;
  const base = { tracking: tracking.toUpperCase() };
  if (["VIEW", "MATCH", "ACCEPT"].includes(v)) return { ...base, action: v.toLowerCase(), data: {} };
  if (v === "CLOSE" && ["recovered", "died", "could_not_locate", "caller_unreachable", "other_ngo", "duplicate", "not_attended", "other"].includes(args[0]?.toLowerCase()) && args.length > 1) return { ...base, action: "close", data: { reason: args[0].toLowerCase(), note: args.slice(1).join(" ").slice(0, 2000) } };
  const verbs: Record<string, string> = { REJECT: "reject", RESCUE: "rescue", TREAT: "treatment", VACCINATE: "vaccination", STERILISE: "sterilisation", STERILIZE: "sterilisation", REOPEN: "reopen", NOTE: "note" };
  if (verbs[v] && args.join(" ").length >= 2) return { ...base, action: verbs[v], data: { note: args.join(" ").slice(0, 2000) } };
  if (["ASSIGN", "ANIMAL", "DONE"].includes(v) && UUID.test(args[0] || "")) {
    return { ...base, action: ({ ASSIGN: "assign", ANIMAL: "link_animal", DONE: "followup_done" })[v]!, data: { [({ ASSIGN: "user_id", ANIMAL: "dog_id", DONE: "followup_id" })[v]!]: args[0] } };
  }
  if (v === "EXPENSE" && /^\d+(\.\d{1,2})?$/.test(args[0] || "") && args.length > 1) return { ...base, action: "expense", data: { amount: Number(args[0]), note: args.slice(1).join(" ").slice(0, 2000) } };
  if (v === "FOLLOWUP" && /T.*(Z|[+-]\d{2}:\d{2})$/.test(args[0] || "") && Number.isFinite(Date.parse(args[0])) && args.length > 1) return { ...base, action: "followup", data: { due_at: new Date(args[0]).toISOString(), note: args.slice(1).join(" ").slice(0, 2000) } };
  return null;
}
