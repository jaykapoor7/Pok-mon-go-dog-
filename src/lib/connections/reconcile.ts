/* ════════════════════════════════════════════════════════════════════
   Register reconciliation: a spreadsheet the team keeps (Google Sheets,
   Excel) against the StrayPaw register, by tag. Pure, so it is tested
   without any provider. Findings are differences to look at, never
   corrections: nothing is imported, merged or changed.
   ════════════════════════════════════════════════════════════════════ */

export type SheetLike = { name: string; header: string[]; rows: string[][]; total: number };
export type RegisterTag = { id: string; tags: string[]; label: string };
export type Reconciliation = {
  sheet: string; tagColumn: string | null; rowsRead: number; rowsTotal: number;
  matched: number; repeatedInSheet: string[];
  notInRegister: string[]; notInSheet: { id: string; label: string }[];
  note: string;
};

const norm = (s: string) => s.toUpperCase().replace(/[\s_]+/g, "").trim();
const TAG_HEADER = /\b(tag|straypaw|sp ?id|animal ?id|dog ?id|ear ?tag|microchip|code|id)\b/i;
const TAG_VALUE = /^(SP-[A-Z]{1,4}-[A-Z0-9]{4,8}|[A-Z]{1,4}[-/]?\d{2,6}[A-Z]?)$/i;

/** The tag column: a header that says so, else the column whose values look most like tags. */
export function tagColumn(s: SheetLike): number {
  const byName = s.header.findIndex((h) => TAG_HEADER.test(h));
  const score = (i: number) => s.rows.filter((r) => TAG_VALUE.test((r[i] ?? "").trim())).length;
  if (byName >= 0 && score(byName) >= Math.min(3, s.rows.length)) return byName;
  let best = -1, top = 0;
  s.header.forEach((_, i) => { const n = score(i); if (n > top) { best = i; top = n; } });
  return top >= Math.max(3, s.rows.length * 0.3) ? best : -1;
}

export function reconcileRegister(s: SheetLike, register: RegisterTag[], cap = 25): Reconciliation {
  const col = tagColumn(s);
  const base = { sheet: s.name, rowsRead: s.rows.length, rowsTotal: s.total };
  if (col < 0) return { ...base, tagColumn: null, matched: 0, repeatedInSheet: [], notInRegister: [], notInSheet: [], note: "No column of animal tags was found, so rows cannot be matched to the register." };
  const index = new Map<string, RegisterTag>();
  for (const a of register) for (const t of a.tags) if (t) index.set(norm(t), a);
  const seen = new Map<string, number>();
  const hit = new Set<string>();
  const missing: string[] = [];
  for (const r of s.rows) {
    const raw = (r[col] ?? "").trim();
    if (!raw) continue;
    const k = norm(raw);
    seen.set(k, (seen.get(k) ?? 0) + 1);
    const a = index.get(k);
    if (a) hit.add(a.id); else if (seen.get(k) === 1) missing.push(raw);
  }
  const partial = s.rows.length < s.total;
  return {
    ...base, tagColumn: s.header[col] || `Column ${col + 1}`, matched: hit.size,
    repeatedInSheet: [...seen].filter(([, n]) => n > 1).map(([k]) => k).slice(0, cap),
    notInRegister: missing.slice(0, cap),
    /* Absence from a partly read sheet proves nothing, so it is only listed for a full read. */
    notInSheet: partial ? [] : register.filter((a) => !hit.has(a.id) && a.tags.length).slice(0, cap).map((a) => ({ id: a.id, label: a.label })),
    note: partial ? `Only the first ${s.rows.length} of ${s.total} rows were read; animals missing from the sheet are not listed.` : "Differences to check at their source. Nothing was imported or changed.",
  };
}
