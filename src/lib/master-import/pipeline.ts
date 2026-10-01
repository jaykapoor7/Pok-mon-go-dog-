Warning: truncated output (original token count: 3349)
Total output lines: 210

import { createHash } from "node:crypto";
import * as XLSX from "xlsx";

export type ImportClassification = "rescue" | "observation" | "treatment" | "follow_up" | "sterilisation" | "vaccination" | "adoption" | "foster" | "expense" | "summary" | "template" | "manual_review" | "skip";
export type ImportDecision = "new" | "merge" | "review" | "skip";

export type NormalizedImportRow = {
  source_sheet: string; source_row: number; source_subrecord?: "adoption" | "foster";
  classification: ImportClassification; classification_reason: string;
  event_date: string | null; locality: string | null; city: string | null;
  animal_name: string | null; animal_code: string | null; species?: string | null; sex: string | null; colour: string | null;
  condition: string | null; status: string | null; case_detail: string | null;
  treatment_update: string | null; review: string | null; rescue_plan: string | null;
  admit_date: string | null; release_date: string | null; fingerprint: string;
};

export type ParsedImportRow = { sourceRowNumber: number; raw: Record<string, string>; normalized: NormalizedImportRow };
export type ParsedSheet = { name: string; rows: ParsedImportRow[]; headerRow: number };
export type ImportPreview = {
  workbookHash: string; sheets: ParsedSheet[]; totalRows: number; acceptedRows: number;
  counts: Record<ImportClassification, number>; identityCandidates: number; unidentified: number;
};

const PRIVATE_HEADER = /informer|contact|phone|mobile|email|whatsapp/i;
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalKey = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const value = (row: Record<string, string>, matcher: RegExp) => {
  const key = Object.keys(row).find((header) => matcher.test(header));
  return key ? clean(row[key]) || null : null;
};
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function headerScore(row: unknown[]) {
  const text = row.map(clean).filter(Boolean).join(" | ").toLowerCase();
  return Number(/date/.test(text)) + Number(/location|area|zone|ward/.test(text)) + Number(/case|detail|injury|status|animal|dog|colour|gender|adoption|foster/.test(text));
}

function yearForSheet(name: string) {
  const match = name.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function explicitYear(value: string) {
  const full = value.match(/\b(20\d{2})\b/);
  if (full) return Number(full[1]);
  const short = value.match(/(?:-|\/)(2\d)(?:\D|$)/);
  return short ? 2000 + Number(short[1]) : null;
}

/** A ledger sometimes writes `31-Jan` in the event column but has dated
 * admission/release cells elsewhere. Use only that explicit workbook year;
 * never accept JavaScript's arbitrary year-2001 fallback for a partial date. */
function inferredYearForSheet(matrix: unknown[][], name: string) {
  const named = yearForSheet(name);
  if (named) return named;
  const tally = new Map<number, number>();
  for (const row of matrix) for (const cell of row) {
    const year = explicitYear(clean(cell));
    if (year) tally.set(year, (tally.get(year) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null;
}

/** Spreadsheet dates such as "2-Jan" must retain their source sheet's year;
 * they are never silently turned into an import-time timestamp. */
export function sourceDate(value: string | null, fallbackYear: number | null) {
  if (!value) return null;
  const text = clean(value).replace(/-$/, "");
  if (!text) return null;
  const withYear = explicitYear(text) ? text : fallbackYear ? `${text}-${fallbackYear}` : null;
  if (!withYear) return null;
  const parsed = new Date(withYear);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}


function inferredSpecies(sheet: string, row: Record<string, string>) {
  const explicit = value(row, /^species$|animal type|animal species/i);
  if (explicit) return …1349 tokens truncated…row.locality)}`;
  return `row:${row.fingerprint}`;
}

/** Only an explicit identifier is reliable enough to join different sheets
 * automatically.  Locality/condition heuristics are intentionally handled
 * by the importer only when they identify a single candidate. */
export function explicitWorkbookIdentity(row: NormalizedImportRow) {
  if (row.animal_code) return `code:${normalKey(row.animal_code)}`;
  if (row.animal_name) return `name:${normalKey(row.animal_name)}@${normalKey(row.locality)}`;
  return null;
}

export function isAccepted(row: NormalizedImportRow) {
  if (["expense", "summary", "template", "skip"].includes(row.classification)) return false;
  if (row.classification === "sterilisation") return Boolean(row.event_date && row.locality);
  if (row.classification === "rescue") return Boolean(row.event_date && row.locality && (row.case_detail || row.condition || row.treatment_update || row.rescue_plan));
  if (["treatment", "follow_up", "vaccination"].includes(row.classification)) return Boolean(row.event_date && row.locality && (row.case_detail || row.condition || row.treatment_update || row.review));
  if (["adoption", "foster"].includes(row.classification)) return Boolean(row.animal_name && row.event_date && row.locality);
  return false;
}

export function parseMasterWorkbook(buffer: ArrayBuffer, _filename = "workbook.xlsx"): ImportPreview {
  const book = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];
  for (const name of book.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, defval: "", raw: false });
    const fallbackYear = inferredYearForSheet(matrix, name);
    const headerIndex = matrix.slice(0, 20).reduce((best, row, index) => headerScore(row) > headerScore(matrix[best] ?? []) ? index : best, 0);
    if (headerScore(matrix[headerIndex] ?? []) < 2) continue;
    const originalHeaders = (matrix[headerIndex] ?? []).map((cell, index) => clean(cell) || `Column ${index + 1}`);
    const seen = new Map<string, number>();
    const headers = originalHeaders.map((header) => { const count = (seen.get(header) ?? 0) + 1; seen.set(header, count); return count === 1 ? header : `${header}__${count === 2 ? "foster" : count}`; });
    const rows = matrix.slice(headerIndex + 1).flatMap((cells, offset) => {
      const raw = Object.fromEntries(headers.map((header, index) => [header, clean(cells[index])]).filter(([, cell]) => Boolean(cell))) as Record<string, string>;
      if (!Object.keys(raw).length) return [];
      const sourceRowNumber = headerIndex + offset + 2;
      if (/adopt.*foster/i.test(name)) return specialAdoptFoster(name, sourceRowNumber, raw, fallbackYear);
      return [{ sourceRowNumber, raw: Object.fromEntries(Object.entries(raw).filter(([header]) => !PRIVATE_HEADER.test(header))) as Record<string, string>, normalized: normalize(name, sourceRowNumber, raw, fallbackYear) }];
    });
    sheets.push({ name, rows, headerRow: headerIndex + 1 });
  }
  const rows = sheets.flatMap((sheet) => sheet.rows);
  const counts = Object.fromEntries((["rescue", "observation", "treatment", "follow_up", "sterilisation", "vaccination", "adoption", "foster", "expense", "summary", "template", "manual_review", "skip"] as ImportClassification[]).map((kind) => [kind, rows.filter((row) => row.normalized.classification === kind).length])) as Record<ImportClassification, number>;
  const accepted = rows.filter((row) => isAccepted(row.normalized));
  // Retry protection is based on file bytes, never on a user-renamed upload
  // or the time it reached the server. Row fingerprints remain for audit.
  return { workbookHash: createHash("sha256").update(Buffer.from(buffer)).digest("hex"), sheets, totalRows: rows.length, acceptedRows: accepted.length, counts, identityCandidates: accepted.filter((row) => hasDefensibleIdentity(row.normalized)).length, unidentified: accepted.filter((row) => !hasDefensibleIdentity(row.normalized)).length };
}
