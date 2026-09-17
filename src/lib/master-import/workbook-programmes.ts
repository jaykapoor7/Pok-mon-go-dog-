import * as XLSX from "xlsx";
import type { ProgrammeCandidate } from "./enrichment";

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const number = (value: unknown) => {
  const text = clean(value).replace(/,/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > 100000 || (n >= 2000 && n <= 2100)) return null;
  return Math.round(n);
};

/**
 * NGO workbooks often keep programme totals in summary/graph/vehicle sheets
 * rather than animal ledgers. Those cells should become programme evidence,
 * not fake animal profiles. We only accept a number when the SAME spreadsheet
 * row explicitly names the programme, and retain the sheet name in the public
 * summary for auditability.
 */
export function extractWorkbookProgrammeTotals(buffer: ArrayBuffer): ProgrammeCandidate[] {
  const book = XLSX.read(buffer, { type: "array", cellDates: true });
  const hits = new Map<string, { count: number; sheet: string; label: string; kind: ProgrammeCandidate["kind"] }>();
  const rules: Array<{ key: string; kind: ProgrammeCandidate["kind"]; re: RegExp; name: string }> = [
    { key: "rabies-summary", kind: "vaccination", re: /rabies|anti[- ]?rabies|\barv\b|vaccination drive/i, name: "Rabies vaccination drive" },
    { key: "abc-summary", kind: "sterilisation", re: /\babc\b|sterili[sz]ation drive/i, name: "ABC / sterilisation programme" },
    { key: "survey-summary", kind: "census", re: /dog survey|animal survey|street.?dog survey|census/i, name: "Street-animal survey" },
    { key: "education-summary", kind: "other", re: /education|awareness|questionnaire|students? reached|kind index/i, name: "Education & awareness programme" },
  ];

  for (const sheetName of book.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, defval: "", raw: false });
    for (const cells of rows) {
      const text = cells.map(clean).filter(Boolean).join(" | ");
      if (!text) continue;
      for (const rule of rules) {
        if (!rule.re.test(text)) continue;
        const values = cells.map(number).filter((v): v is number => v !== null);
        if (!values.length) continue;
        // Programme totals are normally the largest plausible count on the
        // labelled row. This intentionally ignores dates/years and does not
        // turn the total into per-animal records.
        const count = Math.max(...values);
        const previous = hits.get(rule.key);
        if (!previous || count > previous.count) hits.set(rule.key, { count, sheet: sheetName, label: rule.name, kind: rule.kind });
      }
    }
  }

  return [...hits.entries()].map(([key, hit]) => ({
    key: `workbook:${key}`,
    name: hit.label,
    kind: hit.kind,
    startsOn: null,
    endsOn: null,
    count: hit.count,
    publicSummary: `${hit.count.toLocaleString()} recorded by the organisation as a programme total in the “${hit.sheet}” worksheet. This is programme-level evidence and is not treated as ${hit.count.toLocaleString()} uniquely identified animal profiles.`,
  }));
}
