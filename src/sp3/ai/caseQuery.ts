import type { ToolCtx, ToolOut } from "./tools";
import type { Citation } from "./types";
import { closest, describeQuery, type CaseQuery, type GroupBy } from "./understand";

/* ════════════════════════════════════════════════════════════════════
   query_cases: answer a counted, listed or grouped question about the
   organisation's cases.

   One bounded read under the person's own session (at most CAP rows of
   org_case_facts, newest first, narrowed in the database by state and
   date), then filtering and grouping in memory. Rough words in the
   question ("adyar", "ravi", "mange") are matched against the zones,
   people and conditions actually present in those rows, so a name never
   has to be spelled exactly and nothing is matched that is not there.

   Imported historical records that nobody has reviewed are left out
   unless the question asks for them. When the read hits the cap the
   answer says it is a lower bound. Reads only; nothing is changed.
   ════════════════════════════════════════════════════════════════════ */

const CAP = 1000;
const DAY = 86_400_000;
const CRIT = ["Road accident", "Maggot wound", "Human abuse", "Dog bite", "Entrapment", "Suspected rabies"];
const COLS = "id,case_code,title,condition_class,status_class,zone,city,assignee_name,animal_name,occurred_at,last_activity_at,next_due,severity,provenance,reviewed_at";

type Row = { id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null; zone: string | null; city: string | null; assignee_name: string | null; animal_name: string | null; occurred_at: string | null; last_activity_at: string | null; next_due: string | null; severity: string | null; provenance: string | null; reviewed_at: string | null };
export type CaseAnswer = {
  description: string; total: number; capped: boolean; scanned: number;
  groups?: { key: string; count: number }[]; by?: GroupBy;
  rows: { id: string; label: string; zone: string | null; holder: string | null; opened: string | null; condition: string | null }[];
  resolved: { zone: string | null; assignee: string | null; condition: string | null }; unmatched: string[];
};

const isOpen = (r: Row) => r.status_class === "open" || r.status_class === "in_progress";
const label = (r: Row) => r.case_code ?? r.title ?? r.animal_name ?? "Case";
const uniq = (v: (string | null)[]) => [...new Set(v.filter((x): x is string => !!x && !!x.trim()))];

export async function queryCases(q: CaseQuery, ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId) return { data: { error: "Organisation access required" }, summary: "This needs an organisation workspace", citations: [], ok: false };
  let read = ctx.db.from("org_case_facts").select(COLS).eq("ngo_id", ctx.orgId);
  if (q.state === "open") read = read.in("status_class", ["open", "in_progress"]);
  else if (q.state === "closed") read = read.not("status_class", "in", "(open,in_progress)");
  if (q.since) read = read.gte("occurred_at", q.since);
  if (q.until) read = read.lt("occurred_at", q.until);
  const { data, error } = await read.order("occurred_at", { ascending: false, nullsFirst: false }).limit(CAP);
  if (error) return { data: { error: "Records could not be read" }, summary: "Your cases could not be read. Nothing is shown as zero.", citations: [], ok: false };
  const all = (data ?? []) as Row[];
  const capped = all.length >= CAP;
  let rows = q.historical ? all : all.filter((r) => r.provenance !== "imported_historical_record" || !!r.reviewed_at);

  /* Rough words → the zone, person or condition they name in these records. */
  const resolved = { zone: null as string | null, assignee: null as string | null, condition: null as string | null };
  const unmatched: string[] = [];
  const zones = uniq(rows.flatMap((r) => [r.zone, r.city])), people = uniq(rows.map((r) => r.assignee_name)), conds = uniq(rows.map((r) => r.condition_class));
  for (const term of q.terms) {
    const z = !resolved.zone ? closest(term, zones) : null, p = !resolved.assignee ? closest(term, people) : null, c = !resolved.condition ? closest(term, conds) : null;
    if (z) resolved.zone = z; else if (p) resolved.assignee = p; else if (c) resolved.condition = c; else unmatched.push(term);
  }

  const now = Date.now();
  const me = (ctx.userName ?? "").trim().toLowerCase();
  if (resolved.zone) rows = rows.filter((r) => r.zone === resolved.zone || r.city === resolved.zone);
  if (resolved.assignee) rows = rows.filter((r) => r.assignee_name === resolved.assignee);
  if (resolved.condition) rows = rows.filter((r) => r.condition_class === resolved.condition);
  if (q.mine) rows = rows.filter((r) => !!me && (r.assignee_name ?? "").trim().toLowerCase() === me);
  if (q.unassigned) rows = rows.filter((r) => !r.assignee_name);
  if (q.critical) rows = rows.filter((r) => r.severity === "critical" || CRIT.includes(r.condition_class ?? ""));
  if (q.overdue) rows = rows.filter((r) => isOpen(r) && !!r.next_due && Date.parse(r.next_due) < now);
  if (q.olderDays) rows = rows.filter((r) => !!r.occurred_at && now - Date.parse(r.occurred_at) > q.olderDays! * DAY);
  if (q.quietDays) rows = rows.filter((r) => isOpen(r) && now - Date.parse(r.last_activity_at ?? r.occurred_at ?? "") > q.quietDays! * DAY);

  let groups: { key: string; count: number }[] | undefined;
  if (q.by && (q.measure === "breakdown" || q.measure === "top")) {
    const keyOf = (r: Row) => q.by === "zone" ? r.zone || r.city || "No place recorded" : q.by === "assignee" ? r.assignee_name || "Unassigned" : q.by === "condition" ? r.condition_class || "Not recorded" : q.by === "status" ? (r.status_class ?? "not recorded").replace(/_/g, " ") : (r.occurred_at ?? "").slice(0, 7) || "No date";
    const m = new Map<string, number>();
    for (const r of rows) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + 1);
    groups = [...m].map(([key, count]) => ({ key, count }));
    groups.sort(q.by === "month" ? (a, b) => a.key.localeCompare(b.key) : q.order === "least" ? (a, b) => a.count - b.count || a.key.localeCompare(b.key) : (a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }

  const top = rows.slice(0, 8);
  const citations: Citation[] = top.map((r) => ({ id: r.id, label: label(r), href: `/ngo/cases/${r.id}`, kind: "case" as const }));
  const description = describeQuery(q, resolved);
  const answer: CaseAnswer = {
    description, total: rows.length, capped, scanned: all.length, groups, by: q.by,
    rows: top.map((r) => ({ id: r.id, label: label(r), zone: r.zone || r.city, holder: r.assignee_name, opened: r.occurred_at ? r.occurred_at.slice(0, 10) : null, condition: r.condition_class })),
    resolved, unmatched,
  };
  return { data: answer, summary: `${rows.length}${capped ? "+" : ""} ${description}`.slice(0, 160), citations };
}

const n = (v: number) => v.toLocaleString("en-IN");
const ago = (isoDay: string | null) => { if (!isoDay) return "no date"; const d = Math.max(0, Math.floor((Date.now() - Date.parse(isoDay)) / DAY)); return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };

/** The answer in words: the figure first, then the breakdown or the records, then what the figure does not cover. */
export function sayCases(a: CaseAnswer, q: CaseQuery): string {
  const more = a.capped ? " or more" : "";
  const head = a.total === 0 ? `No ${a.description}.` : `**${n(a.total)}${more}** ${a.total === 1 ? a.description.replace(/\bcases\b/, "case") : a.description}.`;
  const lines: string[] = [head];
  if (a.groups?.length) {
    const shown = a.groups.slice(0, q.measure === "top" ? 5 : 10);
    const noun = a.by === "zone" ? "By zone" : a.by === "assignee" ? "By person" : a.by === "condition" ? "By condition" : a.by === "status" ? "By status" : "By month opened";
    if (q.measure === "top" && shown[0]) lines.push("", a.by === "assignee" ? `**${shown[0].key}** holds the ${q.order === "least" ? "fewest" : "most"}: ${n(shown[0].count)}.` : `**${shown[0].key}** has the ${q.order === "least" ? "fewest" : "most"}: ${n(shown[0].count)}.`);
    lines.push("", `${noun}:`, ...shown.map((g) => `- **${g.key}**: ${n(g.count)}`));
    if (a.groups.length > shown.length) lines.push(`- …and ${a.groups.length - shown.length} more.`);
  } else if (a.total && (q.measure === "list" || a.total <= 5)) {
    lines.push("", ...a.rows.map((r) => `- **${r.label}**${r.condition ? ` · ${r.condition}` : ""}${r.zone ? ` · ${r.zone}` : ""} · ${r.holder ?? "unassigned"} · opened ${ago(r.opened)}`));
    if (a.total > a.rows.length) lines.push(`- …and ${n(a.total - a.rows.length)} more in the work queue.`);
  }
  const notes: string[] = [];
  if (a.unmatched.length) notes.push(`I could not match ${a.unmatched.map((t) => `“${t}”`).join(", ")} to a zone, person or condition in these records, so I left ${a.unmatched.length === 1 ? "it" : "them"} out.`);
  if (a.capped) notes.push(`I read the ${n(a.scanned)} most recent cases; older ones are not counted here.`);
  if (!q.historical) notes.push("Imported history that nobody has reviewed is not included.");
  return `${lines.join("\n")}\n\n${notes.join(" ")}`.trim();
}
