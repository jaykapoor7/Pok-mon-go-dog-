import { createHash } from "node:crypto";
import * as XLSX from "xlsx";

export type ImportClassification = "rescue" | "observation" | "treatment" | "follow_up" | "sterilisation" | "vaccination" | "adoption" | "foster" | "expense" | "summary" | "template" | "manual_review" | "skip";
export type ImportDecision = "new" | "merge" | "review" | "skip";

export type NormalizedImportRow = {
  source_sheet: string; source_row: number; source_subrecord?: "adoption" | "foster";
  classification: ImportClassification; classification_reason: string;
  event_date: string | null; locality: string | null; city: string | null;
  animal_name: string | null; animal_code: string | null; sex: string | null; colour: string | null;
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

/** Spreadsheet dates such as "2-Jan" must retain their source sheet's year;
 * they are never silently turned into an import-time timestamp. */
export function sourceDate(value: string | null, fallbackYear: number | null) {
  if (!value) return null;
  const text = clean(value).replace(/-$/, "");
  if (!text) return null;
  const withYear = /\b20\d{2}\b/.test(text) ? text : fallbackYear ? `${text}-${fallbackYear}` : text;
  const parsed = new Date(withYear);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function classify(sheet: string, row: Record<string, string>) : Pick<NormalizedImportRow, "classification" | "classification_reason"> {
  const name = normalKey(sheet);
  const joined = Object.values(row).map(clean).join(" ").toLowerCase();
  if (/van details|salary|rent|monthly graph/.test(name)) return { classification: "expense", classification_reason: "Operations or finance log" };
  if (/^summary$/.test(name)) return { classification: "summary", classification_reason: "Summary worksheet" };
  if (/adopt.*foster/.test(name)) return { classification: "manual_review", classification_reason: "Split adoption/foster worksheet" };
  if (/sterili[sz]|abc/.test(name)) return { classification: "sterilisation", classification_reason: "Sterilisation drive ledger" };
  if (/^tvt$/.test(name)) return { classification: "treatment", classification_reason: "TVT treatment register" };
  if (/review|appoint|follow.?up/.test(name)) return { classification: "follow_up", classification_reason: "Review or appointment register" };
  if (/vaccin|arv|rabies/.test(`${name} ${joined}`)) return { classification: "vaccination", classification_reason: "Vaccination or ARV record" };
  if (/rescue request/.test(name)) return { classification: "rescue", classification_reason: "Rescue request register" };
  return { classification: "manual_review", classification_reason: "Worksheet needs a mapping review" };
}

function normalize(sheet: string, sourceRowNumber: number, raw: Record<string, string>): NormalizedImportRow {
  const kind = classify(sheet, raw);
  const date = value(raw, /^(date|reported|request date)$/i);
  const locality = value(raw, /^(location|locality|area|ward|zone|place)$/i);
  const condition = value(raw, /injury|condition|diagnosis|type/i);
  const caseDetail = value(raw, /case detail|description/i);
  const animalName = value(raw, /^(animal|dog) name$|^nickname$/i);
  const record = {
    source_sheet: sheet, source_row: sourceRowNumber,
    ...kind, event_date: sourceDate(date, yearForSheet(sheet)), locality, city: null,
    animal_name: animalName,
    animal_code: value(raw, /(animal|dog).{0,8}(id|code)|^animal id$/i),
    sex: value(raw, /^sex$|^gender$/i), colour: value(raw, /colou?r|markings?/i),
    condition, status: value(raw, /^status$|completed|outcome/i), case_detail: caseDetail,
    treatment_update: value(raw, /^detailed status$|treatment|update/i),
    review: value(raw, /review|appoint|next dose|next date/i), rescue_plan: value(raw, /rescue plan/i),
    admit_date: sourceDate(value(raw, /admit date/i), yearForSheet(sheet)),
    release_date: sourceDate(value(raw, /release date/i), yearForSheet(sheet)),
  } satisfies Omit<NormalizedImportRow, "fingerprint">;
  return { ...record, fingerprint: fingerprint({ sheet: normalKey(sheet), ...record, source_row: undefined }) };
}

function specialAdoptFoster(sheet: string, sourceRowNumber: number, raw: Record<string, string>) {
  const events: ParsedImportRow[] = [];
  const adoption = clean(raw.Adoptions);
  const foster = clean(raw.Foster);
  for (const [subrecord, label, date, locality] of ([
    ["adoption", adoption, raw.Month, raw.Location],
    ["foster", foster, raw["Month__foster"], raw["Location__foster"]],
  ] as const)) {
    if (!label) continue;
    const normalized = normalize(sheet, sourceRowNumber, { "Animal name": label, Date: date, Location: locality, Status: subrecord });
    normalized.source_subrecord = subrecord;
    normalized.classification = subrecord;
    normalized.classification_reason = `${subrecord === "adoption" ? "Adoption" : "Foster"} register`;
    normalized.fingerprint = fingerprint({ ...normalized, source_row: undefined });
    events.push({ sourceRowNumber, raw, normalized });
  }
  return events;
}

export function hasDefensibleIdentity(row: NormalizedImportRow) {
  return Boolean(row.animal_code || (row.animal_name && row.locality && (row.sex || row.colour)));
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
    const headerIndex = matrix.slice(0, 20).reduce((best, row, index) => headerScore(row) > headerScore(matrix[best] ?? []) ? index : best, 0);
    if (headerScore(matrix[headerIndex] ?? []) < 2) continue;
    const originalHeaders = (matrix[headerIndex] ?? []).map((cell, index) => clean(cell) || `Column ${index + 1}`);
    const seen = new Map<string, number>();
    const headers = originalHeaders.map((header) => { const count = (seen.get(header) ?? 0) + 1; seen.set(header, count); return count === 1 ? header : `${header}__${count === 2 ? "foster" : count}`; });
    const rows = matrix.slice(headerIndex + 1).flatMap((cells, offset) => {
      const raw = Object.fromEntries(headers.map((header, index) => [header, clean(cells[index])]).filter(([, cell]) => Boolean(cell))) as Record<string, string>;
      if (!Object.keys(raw).length) return [];
      const sourceRowNumber = headerIndex + offset + 2;
      if (/adopt.*foster/i.test(name)) return specialAdoptFoster(name, sourceRowNumber, raw);
      return [{ sourceRowNumber, raw: Object.fromEntries(Object.entries(raw).filter(([header]) => !PRIVATE_HEADER.test(header))) as Record<string, string>, normalized: normalize(name, sourceRowNumber, raw) }];
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
