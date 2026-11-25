import type { ToolCtx, ToolOut } from "./tools";
import type { Citation, ComposedDoc, Proposal } from "./types";

/* ════════════════════════════════════════════════════════════════════
   Kaju at work on a document a person attached.

   reconcile_register: the comparison is done here, by rules, against the
     organisation's own register read with the person's own access. A
     model may read a messy page into rows; it never decides what agrees.
   compose_report: a report written for a reader (a municipal office, a
     funder), from figures the tools returned. It is a proposal: the file
     is built and downloaded only when the person presses Confirm.
   ════════════════════════════════════════════════════════════════════ */

export const DOC_TOOL_DEFS = [
  { name: "reconcile_register", description: "Compare rows read from an attached document (a municipal register, a clinic sheet, a contractor's list) with this organisation's animal register and care log, by tag number. Pass every row of the document, including repeated ones, exactly as written. Returns what agrees, tags not on the register, tags repeated in the document, dates and statuses that differ, and procedures on the register in the period that the document leaves out. The comparison is by fixed rules; report its findings as returned.",
    input_schema: { type: "object", properties: {
      document: { type: "string", description: "The attached file's name." },
      procedure: { type: "string", enum: ["sterilisation", "vaccination", "both"], description: "What the document records for each animal." },
      period_from: { type: "string", description: "YYYY-MM-DD, if the document states a period." }, period_to: { type: "string", description: "YYYY-MM-DD" },
      claimed_total: { type: "number", description: "A total the document or its covering letter claims, if any." },
      rows: { type: "array", maxItems: 300, items: { type: "object", properties: { tag: { type: "string" }, name: { type: "string" }, ward: { type: "string" }, sterilised_on: { type: "string", description: "YYYY-MM-DD" }, vaccinated_on: { type: "string", description: "YYYY-MM-DD" } }, required: ["tag"] } },
    }, required: ["rows"] } },
  { name: "compose_report", description: "Prepare a written report as a downloadable file (PDF, Word or Excel) for a reader outside the team: a municipal office, a funder, a programme partner. Use for monthly ABC/ARV, vaccination, sterilisation, programme and reconciliation reports. Every figure, tag, date and name in it must come from tool results in this conversation or from the attached document, and say which. The file is built only when the person confirms.",
    input_schema: { type: "object", properties: {
      format: { type: "string", enum: ["pdf", "docx", "xlsx"] },
      title: { type: "string" }, kind: { type: "string", description: "The kind of document, printed above the title, e.g. 'Monthly ABC and ARV report' or 'Register reconciliation'." },
      addressed_to: { type: "string", description: "Who it is for, e.g. the office named in the letter." }, period: { type: "string" },
      sections: { type: "array", maxItems: 8, items: { type: "object", properties: {
        heading: { type: "string" },
        figures: { type: "array", maxItems: 6, items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
        paragraphs: { type: "array", maxItems: 6, items: { type: "string" } },
        table: { type: "object", properties: { caption: { type: "string" }, columns: { type: "array", maxItems: 8, items: { type: "string" } }, rows: { type: "array", maxItems: 120, items: { type: "array", items: { type: "string" } } } }, required: ["columns", "rows"] },
      } } },
      notes: { type: "array", maxItems: 6, items: { type: "string" }, description: "Method and limits: where the figures came from and what they do not show." },
    }, required: ["format", "title", "sections"] } },
] as const;
export const isDocTool = (name: string) => DOC_TOOL_DEFS.some((t) => t.name === name);

const pid = () => Math.random().toString(36).slice(2, 10);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
/** A date as written on Indian paperwork (03-10-2026, 3/10/26, 2026-10-03) as YYYY-MM-DD; null when it is not a real date. */
export function isoDate(v: unknown): string | null {
  const s = str(v, 40); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
  else return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d && y >= 2000 && y <= 2100 ? t.toISOString().slice(0, 10) : null;
}
export const normTag = (v: unknown) => str(v, 40).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export type DocRow = { tag: string; name: string; ward: string; sterilised_on: string | null; vaccinated_on: string | null };
type Animal = { id: string; code: string | null; name: string | null; zone: string | null; sterilisation_status: string | null; vaccination_status: string | null; medical_events: { kind: string; event_date: string | null }[] | null };
export type Reconciliation = {
  document: string | null; rows_in_document: number; distinct_tags: number; claimed_total: number | null; period: { from: string | null; to: string | null };
  agrees: number;
  not_on_register: { tag: string; name: string; ward: string }[];
  repeated_in_document: { tag: string; times: number }[];
  date_differs: { tag: string; name: string; what: "sterilisation" | "vaccination"; document: string; register: string }[];
  not_recorded_on_register: { tag: string; name: string; what: "sterilisation" | "vaccination"; document: string; register_status: string }[];
  status_not_updated: { tag: string; name: string; what: "sterilisation" | "vaccination"; register_status: string; register_event: string }[];
  on_register_not_in_document: { tag: string; name: string; ward: string; what: "sterilisation"; register: string }[];
  rows_without_tag: number;
};

/** The comparison itself, on rows already read: pure, so it is tested without a database. */
export function compareRows(rows: DocRow[], animals: Animal[], inPeriod: Animal[], opts: { document: string | null; claimed: number | null; from: string | null; to: string | null }): Reconciliation {
  const tagged = rows.filter((r) => r.tag);
  const counts = new Map<string, number>(); for (const r of tagged) counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1);
  const byCode = new Map(animals.filter((a) => a.code).map((a) => [normTag(a.code), a]));
  const label = (a: Animal | undefined, r?: DocRow) => a?.name ?? r?.name ?? "";
  const out: Reconciliation = { document: opts.document, rows_in_document: rows.length, distinct_tags: counts.size, claimed_total: opts.claimed, period: { from: opts.from, to: opts.to }, agrees: 0,
    not_on_register: [], repeated_in_document: [...counts].filter(([, n]) => n > 1).map(([tag, times]) => ({ tag, times })), date_differs: [], not_recorded_on_register: [], status_not_updated: [], on_register_not_in_document: [], rows_without_tag: rows.length - tagged.length };
  const seen = new Set<string>();
  for (const r of tagged) {
    if (seen.has(r.tag)) continue; seen.add(r.tag);
    const a = byCode.get(r.tag);
    if (!a) { out.not_on_register.push({ tag: r.tag, name: r.name, ward: r.ward }); continue; }
    let problems = 0;
    for (const [what, doc, status] of [["sterilisation", r.sterilised_on, a.sterilisation_status], ["vaccination", r.vaccinated_on, a.vaccination_status]] as const) {
      if (!doc) continue;
      const events = (a.medical_events ?? []).filter((e) => e.kind === what && e.event_date).map((e) => e.event_date!.slice(0, 10)).sort();
      const done = what === "sterilisation" ? "sterilised" : "vaccinated";
      /* A vaccination is given again each year: the document's date is checked against the same date on the register, otherwise the nearest one. */
      if (!events.length) { out.not_recorded_on_register.push({ tag: r.tag, name: label(a, r), what, document: doc, register_status: status ?? "unknown" }); problems++; continue; }
      if (!events.includes(doc)) {
        const nearest = events.reduce((best, e) => (Math.abs(Date.parse(e) - Date.parse(doc)) < Math.abs(Date.parse(best) - Date.parse(doc)) ? e : best));
        /* A sterilisation happens once, so any other date is a difference. A vaccination on another date in the same fortnight is the same visit written differently; further apart is a dose the register does not hold. */
        if (what === "sterilisation" || Math.abs(Date.parse(nearest) - Date.parse(doc)) <= 14 * 86_400_000) out.date_differs.push({ tag: r.tag, name: label(a, r), what, document: doc, register: nearest });
        else out.not_recorded_on_register.push({ tag: r.tag, name: label(a, r), what, document: doc, register_status: `${status ?? "unknown"}; last recorded ${nearest}` });
        problems++; continue;
      }
      if (status !== done) { out.status_not_updated.push({ tag: r.tag, name: label(a, r), what, register_status: status ?? "unknown", register_event: doc }); problems++; }
    }
    if (!problems) out.agrees++;
  }
  for (const a of inPeriod) {
    const tag = normTag(a.code); if (!tag || counts.has(tag)) continue;
    const e = (a.medical_events ?? []).filter((x) => x.kind === "sterilisation" && x.event_date).map((x) => x.event_date!.slice(0, 10)).filter((d) => (!opts.from || d >= opts.from) && (!opts.to || d <= opts.to)).sort()[0];
    if (e) out.on_register_not_in_document.push({ tag, name: a.name ?? "", ward: a.zone ?? "", what: "sterilisation", register: e });
  }
  return out;
}

const SELECT = "id,code,name,zone,sterilisation_status,vaccination_status,medical_events(kind,event_date)";
export async function reconcileRegister(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId) return { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
  const raw = Array.isArray(input.rows) ? input.rows.slice(0, 300) : [];
  const rows: DocRow[] = raw.filter((r): r is Record<string, unknown> => !!r && typeof r === "object").map((r) => ({ tag: normTag(r.tag), name: str(r.name, 60), ward: str(r.ward, 60), sterilised_on: isoDate(r.sterilised_on), vaccinated_on: isoDate(r.vaccinated_on) }));
  if (!rows.some((r) => r.tag)) return { data: { error: "No row carried a tag number, so nothing could be compared." }, summary: "No tag numbers to compare", citations: [], ok: false };
  const from = isoDate(input.period_from), to = isoDate(input.period_to);
  const tags = [...new Set(rows.map((r) => r.tag).filter(Boolean))];
  /* The register stores tags as written (KOR-101); documents may drop the hyphen or the case, so both spellings are asked for. */
  const spellings = [...new Set(tags.flatMap((t) => [t, t.replace(/-/g, ""), t.toLowerCase()]))].slice(0, 900);
  try {
    const found = await ctx.db.from("dogs").select(SELECT).eq("ngo_id", ctx.orgId).in("code", spellings).limit(600);
    if (found.error) throw found.error;
    let inPeriod: Animal[] = [];
    if (from && to) {
      const p = await ctx.db.from("dogs").select("id,code,name,zone,sterilisation_status,vaccination_status,medical_events!inner(kind,event_date)").eq("ngo_id", ctx.orgId).eq("medical_events.kind", "sterilisation").gte("medical_events.event_date", from).lte("medical_events.event_date", to).limit(500);
      if (!p.error) inPeriod = (p.data ?? []) as unknown as Animal[];
    }
    const animals = (found.data ?? []) as unknown as Animal[];
    const r = compareRows(rows, animals, inPeriod, { document: str(input.document, 160) || null, claimed: typeof input.claimed_total === "number" && Number.isFinite(input.claimed_total) ? input.claimed_total : null, from, to });
    const issues = r.not_on_register.length + r.repeated_in_document.length + r.date_differs.length + r.not_recorded_on_register.length + r.status_not_updated.length + r.on_register_not_in_document.length;
    const flagged = new Set([...r.date_differs, ...r.not_recorded_on_register, ...r.status_not_updated].map((x) => x.tag));
    const citations: Citation[] = animals.filter((a) => flagged.has(normTag(a.code))).slice(0, 12).map((a) => ({ id: a.id, label: `${a.code}${a.name ? ` · ${a.name}` : ""}`, href: `/ngo/animals/${a.id}`, kind: "animal" as const }));
    return { data: r, summary: `Compared ${r.distinct_tags} tags: ${r.agrees} agree, ${issues} to look at`, citations };
  } catch { return { data: { error: "The register could not be read. Nothing was compared." }, summary: "Register could not be read", citations: [], ok: false }; }
}

/** The model's report, cut to shape: bounded text, a few sections, strings only. Nothing here is trusted as a record. */
export function cleanComposed(input: Record<string, unknown>): ComposedDoc | null {
  const title = str(input.title, 140); if (!title) return null;
  const sections = (Array.isArray(input.sections) ? input.sections : []).slice(0, 8).filter((s): s is Record<string, unknown> => !!s && typeof s === "object").map((s) => {
    const t = s.table && typeof s.table === "object" ? (s.table as Record<string, unknown>) : null;
    const columns = t && Array.isArray(t.columns) ? t.columns.slice(0, 8).map((c) => str(c, 60)).filter(Boolean) : [];
    return {
      heading: str(s.heading, 120) || undefined,
      figures: (Array.isArray(s.figures) ? s.figures : []).slice(0, 6).filter((f): f is Record<string, unknown> => !!f && typeof f === "object").map((f) => ({ label: str(f.label, 60), value: str(f.value, 40) })).filter((f) => f.label && f.value),
      paragraphs: (Array.isArray(s.paragraphs) ? s.paragraphs : []).slice(0, 6).map((p) => str(p, 1400)).filter(Boolean),
      table: columns.length ? { columns, caption: str(t!.caption, 160) || undefined, rows: (Array.isArray(t!.rows) ? t!.rows : []).slice(0, 120).filter(Array.isArray).map((r) => columns.map((_, i) => str((r as unknown[])[i], 200))) } : undefined,
    };
  }).filter((s) => s.heading || s.figures.length || s.paragraphs.length || s.table);
  if (!sections.length) return null;
  return { title, eyebrow: str(input.kind, 80) || undefined, addressedTo: str(input.addressed_to, 160) || undefined, period: str(input.period, 80) || undefined, sections, notes: (Array.isArray(input.notes) ? input.notes : []).slice(0, 6).map((n) => str(n, 400)).filter(Boolean) };
}
export function composeReport(input: Record<string, unknown>, ctx: ToolCtx): ToolOut {
  if (!ctx.orgId) return { data: { error: "Reports need an organisation workspace." }, summary: "Needs an organisation workspace", citations: [], ok: false };
  const doc = cleanComposed(input);
  if (!doc) return { data: { error: "The report needs a title and at least one section with content." }, summary: "Report not prepared", citations: [], ok: false };
  const format = input.format === "docx" || input.format === "xlsx" ? input.format : "pdf";
  const tables = doc.sections.filter((s) => s.table).length, rows = doc.sections.reduce((n, s) => n + (s.table?.rows.length ?? 0), 0);
  const proposal: Proposal = { id: pid(), kind: "composed_report", why: "Report prepared from this conversation", format, title: doc.title, doc };
  return { data: { prepared: true, format, title: doc.title, sections: doc.sections.length, tables, table_rows: rows }, summary: `Prepared “${doc.title}” as ${format.toUpperCase()}`, citations: [], proposals: [proposal] };
}

/* ── without a model ──────────────────────────────────────────────── */
const TAG = /\b([A-Z]{2,5})-?(\d{2,5})\b/;
const DATE = /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:\d{4}|\d{2}))\b/g;
/** Rows read from a tabular attachment by fixed rules: a line with a tag (KOR-101) and its dates. Used when no model may read the file. */
export function rowsFromText(text: string): DocRow[] {
  const out: DocRow[] = [];
  for (const line of text.split(/\r?\n/).slice(0, 600)) {
    const m = line.match(TAG); if (!m) continue;
    const dates = [...line.matchAll(DATE)].map((d) => isoDate(d[1])).filter((d): d is string => !!d);
    if (!dates.length) continue;
    out.push({ tag: normTag(`${m[1]}-${m[2]}`), name: "", ward: "", sterilised_on: dates[0] ?? null, vaccinated_on: dates[1] ?? null });
  }
  return out.slice(0, 300);
}
/** A period a document states in words ("Period: 01-10-2026 to 15-11-2026"), when it states one. */
export function periodFromText(text: string): { from: string; to: string } | null {
  const m = text.slice(0, 4000).match(/(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\s*(?:to|till|until|[-–—])\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  const from = m ? isoDate(m[1]) : null, to = m ? isoDate(m[2]) : null;
  return from && to && from <= to ? { from, to } : null;
}
