/* ════════════════════════════════════════════════════════════════════
   NGO register import: reading a workbook.

   Runs in the browser (and in tests). It turns whatever an organisation
   already keeps (a rescue list, a TVT sheet, an ABC drive ledger, a
   vaccination export with GPS) into plain records, without asking the
   person to map anything when the headers say what they are:

   - every sheet is read; the header row is found, not assumed;
   - each sheet is recognised by its name and its columns (rescue, care,
     vaccination, sterilisation, follow-up, adoption, an animal list), and
     finance, staff and summary sheets are left out;
   - columns are matched by meaning, contact columns are dropped before
     anything leaves the device;
   - dates are read the Indian way (day first), from real date cells,
     Excel serials, "26-Oct" with the year worked out from the sheet, and
     "Oct 2025";
   - nothing is refused because of one odd cell: the cell is left empty
     and the row says so.

   Every record carries a stable key built from its content, so importing
   the same register again, or next month's longer copy, adds only rows
   that are new.
   ════════════════════════════════════════════════════════════════════ */

import { importedSpecies } from "@/lib/dog-only-import";

export type RecordKind = "rescue" | "treatment" | "vaccination" | "sterilisation" | "follow_up" | "adoption" | "animal";
export type SheetKind = RecordKind | "skip";

export const KIND_LABEL: Record<SheetKind, string> = {
  rescue: "Rescues and cases", treatment: "Treatment", vaccination: "Vaccination", sterilisation: "Sterilisation (ABC)",
  follow_up: "Follow-ups", adoption: "Adoption and foster", animal: "Animal list", skip: "Not animal records",
};

export const FIELDS = [
  "code", "name", "sex", "age", "colour", "locality", "city", "lat", "lng", "date", "condition", "detail",
  "status", "outcome", "followUp", "sterilised", "vaccinated", "action", "species",
] as const;
export type Field = (typeof FIELDS)[number];
export type Mapping = Partial<Record<Field, string>>;

export const FIELD_LABEL: Record<Field, string> = {
  code: "Animal ID", name: "Animal name", sex: "Sex", age: "Age", colour: "Colour or markings", locality: "Locality / area",
  city: "City", lat: "Latitude", lng: "Longitude", date: "Date", condition: "Condition / injury", detail: "Case detail",
  status: "Status", outcome: "Outcome / update", followUp: "Review / follow-up date", sterilised: "Sterilisation status",
  vaccinated: "Vaccination status", action: "Action taken", species: "Species",
};

/* Header meanings, most specific first. A header is used for one field only. */
const MATCH: [Field, RegExp][] = [
  ["lat", /^(lat|latitude|gps lat\w*|y)$/i],
  ["lng", /^(lng|lon|long|longitude|gps lon\w*|x)$/i],
  ["code", /^((animal|dog|tag|case|reg(istration)?|microchip)[\s_-]*(id|no\.?|number|code|#)|id|dogid|animal id|tag|ear ?tag|chip)$/i],
  ["followUp", /review|follow.?up|next (date|dose|visit)|appointment|appt|recheck/i],
  ["sterilised", /neuter|steril|spay|castrat|\babc\b/i],
  ["vaccinated", /vacc|rabies|\barv\b/i],
  ["date", /^(date|dated|day|reported( on)?|report date|request date|date of (rescue|admission|report|call|surgery|operation|vaccination)|rescue date|admission date|admit date|call date|date[\s_]*created|created( at| on)?|timestamp|observed( on)?|date reported|surgery date|operation date)$/i],
  ["species", /^(species|animal\s*type|type\s*of\s*animal|animal)$/i],
  ["name", /^((animal|dog|pet)[\s_-]*name|name|nickname|called)$/i],
  ["sex", /^(sex|gender|m\/f)$/i],
  ["age", /^(age|age group|approx\.? age)$/i],
  ["colour", /colou?r|marking|description of (dog|animal)|identif/i],
  ["city", /^(city|town|district|municipality)$/i],
  ["locality", /locat|locality|area|ward|zone|place|address|landmark|colony|street|village|sector|mohalla|region/i],
  ["condition", /injur|condition|diagnos|problem|complaint|health|illness|disease|case type|type of case|issue|ailment/i],
  ["detail", /case detail|details?|descri|remark|note|comment|observation/i],
  ["action", /^action|treatment given|procedure|intervention|service/i],
  ["outcome", /detailed status|update|outcome|result|progress|treatment|released|current status/i],
  ["status", /^(status|case status|state)$/i],
];

/* Columns that identify people. They never leave the device. */
const PRIVATE = /informer|caller|call via|reporter|reported by|contact|phone|mobile|whats ?app|e-?mail|owner|caretaker|feeder name|volunteer name|staff|aadhaar|address of (caller|informer)|vet name|doctor/i;

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const norm = (v: unknown) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type Cell = string | number | boolean | Date | null | undefined;

/* ── Dates ──────────────────────────────────────────────────────────── */

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
export type ReadDate = { y: number | null; m: number; d: number | null };

const iso = (y: number, m: number, d: number) => {
  const t = Date.UTC(y, m - 1, d);
  const x = new Date(t);
  return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d ? x.toISOString().slice(0, 10) : null;
};
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/** Read one date cell. The year may be missing ("26-Oct"); the sheet supplies it. */
export function readDate(v: Cell, dateColumn = true): ReadDate | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.valueOf())) return null;
    const x = new Date(v.valueOf() + 12 * 3600_000); // spreadsheet dates drift by a timezone; round to the day
    return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
  }
  if (typeof v === "number") {
    if (dateColumn && v > 20000 && v < 80000) { // Excel serial day
      const x = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400_000);
      return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
    }
    return null;
  }
  const s = clean(v).toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/[-/.,]+$/, "");
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return { y: +m[1], m: +m[2], d: +m[3] };
  if ((m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})\b/))) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // an American-style date is the only way this reads
    return mo >= 1 && mo <= 12 ? { y: fullYear(+m[3]), m: mo, d } : null;
  }
  if ((m = s.match(/^(\d{1,2})[-/. ]?([a-z]{3,9})[-/. ,]*(\d{2,4})?\b/)) && MONTHS[m[2].slice(0, 3)]) return { y: m[3] ? fullYear(+m[3]) : null, m: MONTHS[m[2].slice(0, 3)], d: +m[1] };
  if ((m = s.match(/^([a-z]{3,9})[-/. ]+(\d{1,2})(?:[-/., ]+(\d{4}))?$/)) && MONTHS[m[1].slice(0, 3)] && +m[2] <= 31) return { y: m[3] ? +m[3] : null, m: MONTHS[m[1].slice(0, 3)], d: +m[2] };
  if ((m = s.match(/^([a-z]{3,9})[-/. ,']+(\d{2,4})$/)) && MONTHS[m[1].slice(0, 3)]) return { y: fullYear(+m[2]), m: MONTHS[m[1].slice(0, 3)], d: null };
  if (dateColumn && /^\d{5}(\.\d+)?$/.test(s)) return readDate(Number(s), true);
  return null;
}

/** Turn a sheet's read dates into ISO days. Dates without a year take the
 *  sheet's year, advancing when the months wrap (Dec → Jan), and never
 *  landing in the future. */
export function settleYears(dates: (ReadDate | null)[], sheetName: string, workbookYear: number | null, today = new Date(), forceYear?: number | null): (string | null)[] & { base?: number } {
  const named = sheetName.match(/\b(20\d{2})\b/);
  const explicit = dates.filter((d): d is ReadDate => !!d && d.y != null).map((d) => d.y as number);
  const common = explicit.length ? [...explicit.reduce((m, y) => m.set(y, (m.get(y) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[1] - a[1])[0][0] : null;
  let base = forceYear ?? (named ? +named[1] : common ?? workbookYear ?? today.getUTCFullYear());
  const todayIso = today.toISOString().slice(0, 10);
  const place = (start: number) => {
    let year = start, last = 0;
    return dates.map((d) => {
      if (!d) return null;
      if (d.y != null) { last = d.m; return d.d ? iso(d.y, d.m, d.d) : iso(d.y, d.m, 1); }
      if (last && d.m + 6 < last) year++;
      last = d.m;
      return iso(year, d.m, d.d ?? 1);
    });
  };
  let out = place(base);
  // A yearless register cannot be in the future: step back until it is not.
  if (!forceYear) for (let guard = 0; guard < 3 && out.some((x, i) => x && x > todayIso && dates[i]?.y == null); guard++) out = place(--base);
  return Object.assign(out, { base });
}

/* ── Sheets ─────────────────────────────────────────────────────────── */

const SKIP_SHEET = /salar|payroll|rent\b|expense|expenditure|account|budget|donation|fund|invoice|bill|van|vehicle|fuel|petrol|diesel|odometer|summary|dashboard|pivot|chart|graph|total|stock|inventory|medicine stock|attendance|staff|volunteer list|contacts?|template|instructions?|readme|lookup|lists?$/i;

export function sheetKind(name: string, headers: string[], mapping: Mapping): SheetKind {
  const n = name.toLowerCase(), h = headers.join(" | ").toLowerCase();
  if (SKIP_SHEET.test(n) && !/rescue|case|dog|animal|abc|tvt|vacc/.test(n)) return "skip";
  if (/adopt|foster|rehom/.test(n)) return "adoption";
  if (/follow.?up|review|appoint|recheck/.test(n)) return "follow_up";
  if (/steril|\babc\b|neuter|spay|castrat|surgery|operation/.test(n)) return "sterilisation";
  if (/vacc|\barv\b|rabies|anti.?rabies|immuni/.test(n)) return "vaccination";
  if (/tvt|treat|medical|clinic|opd|dressing|wound|mange|ward|shelter|hospital|ipd/.test(n)) return "treatment";
  if (/rescue|case|request|call|complaint|emergency|intake|injur/.test(n)) return "rescue";
  // By columns when the sheet name says nothing ("Sheet1", "2025").
  if (mapping.condition || mapping.detail || /injur|case detail|complaint/.test(h)) return "rescue";
  if (mapping.vaccinated && !mapping.sterilised) return "vaccination";
  if (mapping.sterilised || /neuter|steril/.test(h)) return "sterilisation";
  if (mapping.code || mapping.name || (mapping.lat && mapping.lng)) return "animal";
  return "skip";
}

export function suggestMapping(headers: string[]): Mapping {
  const used = new Set<string>(), mapping: Mapping = {};
  for (const [field, re] of MATCH) {
    const header = headers.find((h) => h && !used.has(h) && !PRIVATE.test(h) && re.test(clean(h)));
    if (header) { mapping[field] = header; used.add(header); }
  }
  // "Status" holds the case state; a separate update column holds detail.
  if (!mapping.status && mapping.outcome && /^status$/i.test(mapping.outcome)) { mapping.status = mapping.outcome; delete mapping.outcome; }
  return mapping;
}

function headerScore(row: Cell[]) {
  const cells = row.map(clean).filter(Boolean);
  if (cells.length < 2) return 0;
  const words = cells.filter((c) => c.length <= 40 && !/^\d+([./-]\d+)*$/.test(c));
  const known = cells.filter((c) => MATCH.some(([, re]) => re.test(c))).length;
  return known * 3 + words.length;
}

/* ── Records ────────────────────────────────────────────────────────── */

export type ImportRecord = {
  key: string; sheet: string; row: number; kind: RecordKind;
  date: string | null; code: string | null; name: string | null; sex: "male" | "female" | null; age: string | null; colour: string | null;
  locality: string | null; city: string | null; lat: number | null; lng: number | null;
  condition: string | null; detail: string | null; status: string | null; outcome: string | null; followUp: string | null;
  sterilised: boolean | null; vaccinated: boolean | null; closed: "recovered" | "died" | "closed" | null;
  raw: Record<string, string>; notes: string[];
};

export type ReadSheet = {
  name: string; kind: SheetKind; autoKind: SheetKind; headerRow: number; headers: string[]; mapping: Mapping; privateColumns: string[];
  rows: number; records: ImportRecord[]; empty: number; reason: string;
  /** Dates written without a year, and the year they were read in. */
  yearless: number; year: number | null;
};

export type ReadWorkbook = { fileName: string; hash: string; sheets: ReadSheet[]; workbookYear: number | null };

const yes = (v: string) => /^(y|yes|done|true|1|✓|✔|sterili[sz]ed|neutered|spayed|castrated|vaccinated|given|completed?)$/i.test(v) || /\b(sterili[sz]ed|neutered|spayed|castrated|vaccinated)\b/i.test(v) && !/\bnot\b|\bun|entire|intact|pending|due/i.test(v);
const no = (v: string) => /^(n|no|not done|false|0|entire|intact|pending|due|not sterili[sz]ed|not vaccinated|unvaccinated)$/i.test(v);
const bool = (v: string) => (!v ? null : yes(v) ? true : no(v) ? false : null);

function sexOf(v: string): "male" | "female" | null {
  const s = v.toLowerCase();
  if (/^(m|male|dog|♂)\b|^male/.test(s)) return "male";
  if (/^(f|female|bitch|♀)\b|^female/.test(s)) return "female";
  return null;
}

function closedOf(...texts: (string | null)[]): ImportRecord["closed"] {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\b(died|dead|death|expired|passed away|no more|euthan)/.test(t)) return "died";
  if (/\b(recovered|healed|released|discharged|cured|fit)\b/.test(t)) return "recovered";
  if (/\b(closed|complete(d)?|done|resolved|adopted|rehomed)\b/.test(t)) return "closed";
  return null;
}

/** Small, stable, browser-safe content hash (53-bit). */
export function hash(text: string) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** The animal a record belongs to, when the register says so. */
export function animalIdentity(r: Pick<ImportRecord, "code" | "name" | "locality">) {
  if (r.code) return `code:${norm(r.code)}`;
  if (r.name && r.locality) return `name:${norm(r.name)}@${norm(r.locality)}`;
  return null;
}

/** Build the records of one sheet, with a given kind and mapping. */
export function sheetRecords(name: string, kind: SheetKind, matrix: Cell[][], headerIndex: number, headers: string[], mapping: Mapping, workbookYear: number | null, today = new Date(), forceYear?: number | null, firstRow = 1) {
  const dateCol = mapping.date ? headers.indexOf(mapping.date) : -1;
  const followCol = mapping.followUp ? headers.indexOf(mapping.followUp) : -1;
  const body = matrix.slice(headerIndex + 1);
  const readDates = body.map((row) => (dateCol >= 0 ? readDate(row[dateCol]) : null));
  const dates = settleYears(readDates, name, workbookYear, today, forceYear);
  const follows = settleYears(body.map((row) => (followCol >= 0 ? readDate(row[followCol]) : null)), name, workbookYear, today, forceYear ?? dates.base);
  const yearless = readDates.filter((d) => d && d.y == null).length;
  const ownerCol = headers.findIndex((h) => /^(ownership|owned|owner status|owned\/stray|stray\/owned)$/i.test(clean(h)));
  const seen = new Map<string, number>();
  const records: ImportRecord[] = [];
  let empty = 0;
  if (kind === "skip") return { records, empty, yearless, year: dates.base ?? null };
  body.forEach((cells, i) => {
    const at = (f: Field) => { const h = mapping[f]; if (!h) return ""; const idx = headers.indexOf(h); const v = idx >= 0 ? cells[idx] : ""; return v instanceof Date ? (dates[i] ?? "") : clean(v); };
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => { if (!h || PRIVATE.test(h)) return; const v = cells[idx]; const t = v instanceof Date ? (idx === dateCol ? dates[i] ?? "" : idx === followCol ? follows[i] ?? "" : v.toISOString().slice(0, 10)) : clean(v); if (t) raw[h] = t.slice(0, 500); });
    const notes: string[] = [];
    const num = (f: "lat" | "lng") => { const t = at(f); if (!t) return null; const n = Number(t); if (!Number.isFinite(n) || Math.abs(n) > (f === "lat" ? 90 : 180) || n === 0) { notes.push(`${FIELD_LABEL[f]} "${t}" ignored`); return null; } return n; };
    let lat = num("lat"), lng = num("lng");
    if ((lat == null) !== (lng == null)) { lat = null; lng = null; }
    // Swapped columns are common in India (lat ≈ 8–37, lng ≈ 68–98).
    if (lat != null && lng != null && lat > 60 && lng < 40) [lat, lng] = [lng, lat];
    const species = importedSpecies(raw, mapping.species ?? null, name);
    const condition = at("condition") || null, detail = at("detail") || null, outcome = at("outcome") || null, status = at("status") || null, action = at("action") || null;
    const meaningful = [at("code"), at("name"), at("locality"), condition, detail, outcome, action, lat != null ? "gps" : "", at("sterilised"), at("vaccinated")].filter(Boolean);
    // Rows that are only a month label, a running total or blank.
    if (!meaningful.length || /^(total|grand total|sum)\b/i.test(Object.values(raw)[0] ?? "")) { empty++; return; }
    if (species !== "dog") { notes.push("Not a dog record"); }
    const rawDate = at("date");
    if (rawDate && !dates[i]) notes.push(`Date "${rawDate}" could not be read`);
    let rowKind: RecordKind = kind;
    const actText = `${action} ${outcome ?? ""}`.toLowerCase();
    if (kind === "animal" || kind === "vaccination" || kind === "sterilisation") {
      if (/neuter|steril|spay|castrat|\babc\b/.test(actText) || (kind !== "vaccination" && bool(at("sterilised")) === true)) rowKind = "sterilisation";
      else if (/vacc|rabies|\barv\b|marked/.test(actText) || bool(at("vaccinated")) === true) rowKind = "vaccination";
    }
    const record: Omit<ImportRecord, "key"> = {
      sheet: name, row: firstRow + headerIndex + i + 1, kind: rowKind, date: dates[i],
      code: at("code") || null, name: at("name") || null, sex: sexOf(at("sex")), age: at("age") || null, colour: at("colour") || null,
      locality: at("locality") || null, city: at("city") || null, lat, lng,
      condition, detail: [detail, action && action !== condition ? action : null].filter(Boolean).join(" · ") || null, status, outcome,
      followUp: follows[i], sterilised: rowKind === "sterilisation" ? true : bool(at("sterilised")), vaccinated: rowKind === "vaccination" ? true : bool(at("vaccinated")),
      closed: closedOf(status, outcome), raw, notes,
    };
    if (species !== "dog") record.notes = ["Not a dog record: StrayPaw keeps dog records only"];
    else if (ownerCol >= 0 && /^(owned|pet|domestic|confined|house)/i.test(clean(cells[ownerCol]))) record.notes = ["Not a dog record: an owned pet, not a street animal"];
    // Content key: the same row in a re-uploaded register has the same key;
    // a genuinely repeated row keeps its own by its occurrence.
    const content = [record.kind, record.date, norm(record.code), norm(record.name), norm(record.locality), norm(record.condition), norm(record.detail), norm(record.outcome), record.lat, record.lng].join("|");
    const n = (seen.get(content) ?? 0) + 1; seen.set(content, n);
    records.push({ ...record, key: `${hash(content)}${n > 1 ? `-${n}` : ""}` });
  });
  return { records, empty, yearless, year: dates.base ?? null };
}

/* A CSV is text: SheetJS would otherwise read "05/04/2024" the American
   way. Its cells stay strings and are read day-first here. */
const readOptions = (fileName: string) => ({ type: "array" as const, cellDates: true, raw: /\.(csv|txt)$/i.test(fileName) });

/* Rows keep their spreadsheet numbers: blank rows stay, and a sheet whose
   table starts lower down is offset by its first row. */
const matrixOf = (XLSX: typeof import("xlsx"), ws: import("xlsx").WorkSheet) => XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: "", raw: true, blankrows: true });
const firstRowOf = (XLSX: typeof import("xlsx"), ws: import("xlsx").WorkSheet) => (ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r : 0) + 1;

/** Read a whole workbook. `xlsx` is passed in so the browser can load it lazily. */
export function readWorkbook(XLSX: typeof import("xlsx"), data: ArrayBuffer, fileName: string, today = new Date()): ReadWorkbook {
  const book = XLSX.read(data, readOptions(fileName));
  const sheets: ReadSheet[] = [];
  const matrices = book.SheetNames.map((name) => [name, matrixOf(XLSX, book.Sheets[name]), firstRowOf(XLSX, book.Sheets[name])] as const);
  // A workbook-wide year helps sheets whose dates carry none.
  const years = new Map<number, number>();
  for (const [name, m] of matrices) {
    const named = name.match(/\b(20\d{2})\b/); if (named) years.set(+named[1], (years.get(+named[1]) ?? 0) + 5);
    for (const row of m.slice(0, 400)) for (const c of row) { const d = readDate(c, false); if (d?.y && d.y > 1990 && d.y <= today.getUTCFullYear() + 1) years.set(d.y, (years.get(d.y) ?? 0) + 1); }
  }
  const workbookYear = [...years].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  for (const [name, matrix, firstRow] of matrices) {
    let headerIndex = 0, best = -1;
    matrix.slice(0, 25).forEach((row, i) => { const s = headerScore(row); if (s > best) { best = s; headerIndex = i; } });
    const headers = (matrix[headerIndex] ?? []).map((c, i) => clean(c) || `Column ${i + 1}`);
    const seen = new Map<string, number>();
    const unique = headers.map((h) => { const n = (seen.get(h) ?? 0) + 1; seen.set(h, n); return n === 1 ? h : `${h} (${n})`; });
    const mapping = suggestMapping(unique);
    const autoKind = best < 4 || matrix.length - headerIndex < 2 ? "skip" : sheetKind(name, unique, mapping);
    const { records, empty, yearless, year } = sheetRecords(name, autoKind, matrix, headerIndex, unique, mapping, workbookYear, today, null, firstRow);
    sheets.push({ yearless, year,
      name, kind: autoKind, autoKind, headerRow: firstRow + headerIndex, headers: unique, mapping,
      privateColumns: unique.filter((h) => PRIVATE.test(h)), rows: Math.max(0, matrix.length - headerIndex - 1), records, empty,
      reason: autoKind === "skip" ? (best < 4 ? "No table of records found" : "Looks like finance, staff or a summary") : `${KIND_LABEL[autoKind]}, read from the sheet name and columns`,
    });
  }
  return { fileName, workbookYear, hash: hash(`${fileName}|${sheets.map((s) => `${s.name}:${s.records.map((r) => r.key).join(",")}`).join(";")}`), sheets };
}

/** Re-read one sheet after a person changes its kind or a column. */
export function rereadSheet(XLSX: typeof import("xlsx"), data: ArrayBuffer, fileName: string, sheet: ReadSheet, kind: SheetKind, mapping: Mapping, workbookYear: number | null, year?: number | null, today = new Date()): ReadSheet {
  const book = XLSX.read(data, readOptions(fileName));
  const ws = book.Sheets[sheet.name], firstRow = firstRowOf(XLSX, ws);
  const r = sheetRecords(sheet.name, kind, matrixOf(XLSX, ws), sheet.headerRow - firstRow, sheet.headers, mapping, workbookYear, today, year, firstRow);
  return { ...sheet, kind, mapping, records: r.records, empty: r.empty, yearless: r.yearless, year: r.year, reason: kind === "skip" ? "Left out by you" : KIND_LABEL[kind] };
}

/** What will happen, in the words a team uses. */
export function summarise(sheets: ReadSheet[]) {
  const records = sheets.filter((s) => s.kind !== "skip").flatMap((s) => s.records);
  const dogs = records.filter((r) => !r.notes.some((n) => n.startsWith("Not a dog")));
  const animals = new Set(dogs.map((r) => animalIdentity(r) ?? `row:${r.key}`));
  const by = (k: RecordKind) => dogs.filter((r) => r.kind === k).length;
  return {
    records: dogs.length, animals: animals.size, notDogs: records.length - dogs.length,
    rescue: by("rescue"), treatment: by("treatment"), vaccination: by("vaccination"), sterilisation: by("sterilisation"),
    followUp: by("follow_up"), adoption: by("adoption"), animal: by("animal"),
    undated: dogs.filter((r) => !r.date).length, located: dogs.filter((r) => r.lat != null || r.locality).length,
    withNotes: dogs.filter((r) => r.notes.length).length,
  };
}
