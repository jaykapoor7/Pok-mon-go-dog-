import type { NormalizedImportRow } from "./pipeline";

export const WORKBOOK_ENRICHMENT_VERSION = "workbook_ops_v1";

export type EnrichmentSource = {
  id?: string;
  batch_id: string;
  raw_row?: Record<string, unknown> | null;
  normalized: NormalizedImportRow & { enrichment_version?: string };
  classification?: string | null;
  imported_dog_id?: string | null;
  imported_case_id?: string | null;
};

export type DerivedMedicalEvent = {
  key: string;
  kind: string;
  eventDate: string;
  note: string;
};

export type DerivedHistoryEvent = {
  key: string;
  eventType: string;
  title: string;
  details: string;
  occurredAt: string;
  followupStatus?: "done" | "missed" | "cancelled";
};

export type DerivedCaseState = {
  category: "injury" | "sterilisation" | "rescue" | "vaccination" | "other";
  status: "in_progress" | "resolved";
  resolution: "sterilized" | "rescued" | "treated" | null;
  outcomeNote: string | null;
  stage: string;
  lastActivityAt: string;
  resolvedAt: string | null;
};

export type ProgrammeCandidate = {
  key: string;
  name: string;
  kind: "census" | "sterilisation" | "vaccination" | "treatment" | "other";
  startsOn: string | null;
  endsOn: string | null;
  count: number;
  publicSummary: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

const DATE_TOKEN = /\b(\d{1,2})\s*[-\/.]\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})(?:\s*[-\/.]\s*(\d{2,4}))?\b/gi;
const EXCEL_SERIAL = /^\d{5}(?:\.\d+)?$/;

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const lower = (value: unknown) => clean(value).toLowerCase();

function rawValue(raw: Record<string, unknown> | null | undefined, matcher: RegExp) {
  if (!raw) return "";
  const key = Object.keys(raw).find((header) => matcher.test(header));
  return key ? clean(raw[key]) : "";
}

export function isRescueRegister(row: NormalizedImportRow) {
  return /^rescue requests(?:\s+20\d{2})?$/i.test(clean(row.source_sheet));
}

export function isSterilisationRegister(row: NormalizedImportRow) {
  return /sterili[sz]ation|\babc\b/i.test(row.source_sheet);
}

export function isTvtRegister(row: NormalizedImportRow) {
  return /^tvt$/i.test(clean(row.source_sheet));
}

export function rowText(source: EnrichmentSource) {
  const row = source.normalized;
  return clean([
    row.condition, row.status, row.case_detail, row.treatment_update, row.review,
    row.rescue_plan, ...Object.values(source.raw_row ?? {}),
  ].filter(Boolean).join(" "));
}

function excelSerialDate(value: string) {
  if (!EXCEL_SERIAL.test(value)) return null;
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.floor(serial) * 86400000);
}

function parseToken(dayText: string, monthText: string, yearText: string | undefined, base: Date, previous: Date | null) {
  const day = Number(dayText);
  const month = /^\d+$/.test(monthText) ? Number(monthText) - 1 : MONTHS[monthText.toLowerCase()];
  if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isInteger(month) || month < 0 || month > 11) return null;
  let year = yearText ? Number(yearText) : base.getUTCFullYear();
  if (yearText && year < 100) year += 2000;
  if (!yearText && month < base.getUTCMonth() - 6) year += 1;
  let candidate = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(candidate.valueOf())) return null;
  if (!yearText && previous && candidate.valueOf() < previous.valueOf() - 45 * 86400000) candidate = new Date(Date.UTC(year + 1, month, day));
  return candidate;
}

export function datedFragments(value: unknown, baseIso: string | null | undefined) {
  const text = clean(value);
  if (!text) return [] as Array<{ date: string; text: string; index: number }>;
  const base = baseIso && !Number.isNaN(Date.parse(baseIso)) ? new Date(baseIso) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const serial = excelSerialDate(text);
  if (serial) return [{ date: serial.toISOString(), text, index: 0 }];
  const matches = [...text.matchAll(DATE_TOKEN)];
  if (!matches.length) return [];
  const result: Array<{ date: string; text: string; index: number }> = [];
  let previous: Date | null = null;
  matches.forEach((match, index) => {
    const parsed = parseToken(match[1], match[2], match[3], base, previous);
    if (!parsed) return;
    previous = parsed;
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    const fragment = clean(text.slice(start, end).replace(/^[-–—,:;\s]+|[-–—,:;\s]+$/g, ""));
    result.push({ date: parsed.toISOString(), text: fragment || match[0], index });
  });
  return result;
}

function isoMax(values: Array<string | null | undefined>, fallback: string) {
  let best = Date.parse(fallback) || 0;
  let bestIso = fallback;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isFinite(time) && time >= best) { best = time; bestIso = value; }
  }
  return bestIso;
}

function positiveVaccination(text: string) {
  const t = lower(text);
  const vaccine = /\b(arv|mcv|anti[- ]?rabies|rabies vaccine|vaccinat(?:ed|ion)|lepto(?:spirosis)?)\b/.test(t);
  const administered = /\b(given|done|administered|completed|vaccinated|shot|dose)\b/.test(t);
  const mereDiagnosis = /\b(rabies (?:positive|negative|suspect|suspected|symptom|case))\b/.test(t) && !/\b(arv|vaccine|vaccinated)\b/.test(t);
  return vaccine && administered && !mereDiagnosis;
}

function explicitSterilisation(text: string) {
  const t = lower(text);
  return /\b(sterili[sz](?:ed|ation)|spay(?:ed)?|neuter(?:ed)?|abc)\b/.test(t) && /\b(done|completed|sterili[sz]ed|spayed|neutered)\b/.test(t) && !/\b(appointment|appt|due|plan|planned|next)\b/.test(t);
}

function historyKind(text: string) {
  const t = lower(text);
  if (positiveVaccination(t)) return { kind: "vaccination", title: "Vaccination / ARV" };
  if (/\b(vincristine|chemo(?:therapy)?)\b/.test(t)) return { kind: "chemotherapy", title: "TVT / chemotherapy treatment" };
  if (/\b(amputation|surgery|operation|sutured?|procedure)\b/.test(t)) return { kind: "surgery", title: "Procedure / surgery" };
  if (/\b(blood test|cbc|x[- ]?ray|scan|diagnostic|test result)\b/.test(t)) return { kind: "diagnostic", title: "Diagnostic / test" };
  if (/\b(admitted|admission|hospitali[sz]ed)\b/.test(t)) return { kind: "admission", title: "Admitted for care" };
  if (/\b(released|discharged)\b/.test(t)) return { kind: "release", title: "Released / discharged" };
  if (/\b(dressing|wound care|bandage)\b/.test(t)) return { kind: "wound_care", title: "Wound care / dressing" };
  if (/\b(iv|drip|fluids?|antibiotic|medicine|meds|treated|treatment)\b/.test(t)) return { kind: "treatment", title: "Treatment" };
  if (/\b(review|appointment|appt|next dose|next shot|check[- ]?up)\b/.test(t)) return { kind: "follow_up", title: "Review / follow-up" };
  return { kind: "follow_up", title: "Follow-up record" };
}

function historyStatus(text: string): DerivedHistoryEvent["followupStatus"] {
  const t = lower(text);
  if (/\b(cancelled|canceled)\b/.test(t)) return "cancelled";
  if (/\b(not done|didn'?t|did not|missed|no show|not attended|missing|escaped|no)\b/.test(t)) return "missed";
  if (/\b(done|completed|given|taken|reviewed|treated|admitted|released|died|put to sleep|euthani[sz]ed)\b/.test(t)) return "done";
  return undefined;
}

export function deriveHistoryEvents(source: EnrichmentSource): DerivedHistoryEvent[] {
  const row = source.normalized;
  const review = row.review || rawValue(source.raw_row, /review|appoint|appt|next dose|next date/i);
  const fragments = datedFragments(review, row.event_date);
  const seen = new Set<string>();
  const events: DerivedHistoryEvent[] = [];
  for (const fragment of fragments) {
    const meta = historyKind(fragment.text);
    const key = `history:${row.fingerprint}:${fragment.index}:${meta.kind}:${fragment.date.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ key, eventType: `import:followup:${meta.kind}`, title: meta.title, details: fragment.text, occurredAt: fragment.date, followupStatus: historyStatus(fragment.text) });
  }
  return events;
}

function addMedical(events: DerivedMedicalEvent[], seen: Set<string>, row: NormalizedImportRow, kind: string, date: string, note: string, suffix: string) {
  const key = `medical:${row.fingerprint}:${suffix}:${kind}:${date.slice(0, 10)}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push({ key, kind, eventDate: date.slice(0, 10), note: clean(note) });
}

export function deriveMedicalEvents(source: EnrichmentSource): DerivedMedicalEvent[] {
  const row = source.normalized;
  const baseDate = row.event_date;
  if (!baseDate) return [];
  const events: DerivedMedicalEvent[] = [];
  const seen = new Set<string>();
  const detail = clean([row.treatment_update, row.case_detail, row.rescue_plan].filter(Boolean).join(" "));
  const reviewEvents = deriveHistoryEvents(source);

  for (const event of reviewEvents) {
    if (event.eventType.includes(":vaccination") && positiveVaccination(event.details)) addMedical(events, seen, row, "vaccination", event.occurredAt, event.details, event.key);
    else if (event.eventType.includes(":chemotherapy")) addMedical(events, seen, row, "chemotherapy", event.occurredAt, event.details, event.key);
    else if (event.eventType.includes(":surgery")) addMedical(events, seen, row, "surgery", event.occurredAt, event.details, event.key);
    else if (event.eventType.includes(":diagnostic")) addMedical(events, seen, row, "diagnostic", event.occurredAt, event.details, event.key);
    else if (event.eventType.includes(":wound_care")) addMedical(events, seen, row, "wound_care", event.occurredAt, event.details, event.key);
  }

  if (positiveVaccination(detail)) addMedical(events, seen, row, "vaccination", baseDate, detail, "base-vaccination");
  if (/\b(vincristine|chemo(?:therapy)?)\b/i.test(detail)) addMedical(events, seen, row, "chemotherapy", baseDate, detail, "base-chemo");
  if (/\b(amputation|surgery|operation|sutured?|procedure)\b/i.test(detail)) addMedical(events, seen, row, "surgery", baseDate, detail, "base-surgery");
  if (/\b(blood test|cbc|x[- ]?ray|scan|diagnostic)\b/i.test(detail)) addMedical(events, seen, row, "diagnostic", baseDate, detail, "base-diagnostic");
  if (/\b(dressing|wound care|bandage)\b/i.test(detail)) addMedical(events, seen, row, "wound_care", baseDate, detail, "base-wound");
  if (/\b(iv|drip|fluids?|antibiotic|medicine|meds|treated|treatment)\b/i.test(detail) && !events.some((event) => event.kind === "treatment")) addMedical(events, seen, row, "treatment", baseDate, detail, "base-treatment");
  if (explicitSterilisation(detail)) addMedical(events, seen, row, "sterilisation", baseDate, detail, "base-sterilisation");
  return events;
}

function outcomeFrom(text: string) {
  const t = lower(text);
  if (/\b(put to sleep|euthani[sz]ed)\b/.test(t)) return "Euthanised";
  if (/\b(died|passed away|dead)\b/.test(t)) return "Died";
  if (/\b(adopted|adoption)\b/.test(t)) return "Adopted";
  if (/\b(fostered|foster)\b/.test(t)) return "Fostered";
  if (/\b(other ngo|another ngo|has rescued|rescued by)\b/.test(t)) return "Transferred / rescued by another organisation";
  if (/\b(released|discharged)\b/.test(t)) return "Released";
  if (/\b(recovered|healed|treatment completed|treatment complete)\b/.test(t)) return "Recovered / treatment completed";
  if (/\b(missing|escaped|could not be caught|couldn'?t be caught)\b/.test(t)) return "Could not be located / caught";
  if (/\b(closed with no action|not attended|no action|unable to rescue)\b/.test(t)) return "Closed without intervention";
  return null;
}

export function deriveCaseState(source: EnrichmentSource): DerivedCaseState {
  const row = source.normalized;
  const text = rowText(source);
  const sourceStatus = lower(row.status || rawValue(source.raw_row, /^status$/i));
  const outcome = outcomeFrom(`${sourceStatus} ${text}`);
  const closed = /\bclosed\b|other ngo rescued|completed|complete/.test(sourceStatus) || Boolean(outcome && !/could not be located/.test(lower(outcome)));
  let category: DerivedCaseState["category"] = "rescue";
  const condition = lower(`${row.condition ?? ""} ${row.case_detail ?? ""}`);
  if (/\b(abc|sterili[sz]|spay|neuter)\b/.test(condition)) category = "sterilisation";
  else if (/\b(vaccin|arv|anti[- ]?rabies)\b/.test(condition) && !/\b(rta|wound|maggot|fracture|tvt|tumou?r|skin|bite|injur|parvo|distemper|mange)\b/.test(condition)) category = "vaccination";
  else if (/\b(rta|wound|maggot|fracture|tvt|tumou?r|skin|bite|injur|parvo|distemper|mange|eye|bleed|abscess|infection)\b/.test(condition)) category = "injury";

  let resolution: DerivedCaseState["resolution"] = null;
  if (explicitSterilisation(text)) resolution = "sterilized";
  else if (/\b(treated|treatment|surgery|dressing|medicine|antibiotic|iv|vincristine|chemo)\b/.test(lower(text))) resolution = "treated";
  else if (/\brescued\b/.test(lower(text))) resolution = "rescued";

  const history = deriveHistoryEvents(source);
  const lastActivityAt = isoMax([row.event_date, row.admit_date, row.release_date, ...history.map((event) => event.occurredAt)], row.event_date || new Date(0).toISOString());
  const resolvedAt = closed ? lastActivityAt : null;
  let stage = "triage";
  if (/\b(admitted|hospital|clinic|treated|treatment|surgery|dressing|iv|chemo)\b/.test(lower(text))) stage = "treatment";
  if (/\b(released|discharged|recovered|healed)\b/.test(lower(text))) stage = "release";
  if (closed) stage = "closed";
  return { category, status: closed ? "resolved" : "in_progress", resolution, outcomeNote: outcome, stage, lastActivityAt, resolvedAt };
}

export function shouldHaveRescueCase(source: EnrichmentSource) {
  const row = source.normalized;
  return isRescueRegister(row) && Boolean(row.event_date && row.locality && (row.case_detail || row.condition || row.treatment_update || row.rescue_plan));
}

export function strictVaccinationRecorded(source: EnrichmentSource) {
  return deriveMedicalEvents(source).some((event) => event.kind === "vaccination");
}

export function strictSterilisationRecorded(source: EnrichmentSource) {
  return isSterilisationRegister(source.normalized) || deriveMedicalEvents(source).some((event) => event.kind === "sterilisation");
}

export function latestHistoricalDate(source: EnrichmentSource) {
  const row = source.normalized;
  return isoMax([row.event_date, row.admit_date, row.release_date, ...deriveHistoryEvents(source).map((event) => event.occurredAt)], row.event_date || new Date(0).toISOString());
}

export function deriveProgrammes(sources: EnrichmentSource[]): ProgrammeCandidate[] {
  const valid = sources.filter((source) => source.normalized);
  const programme: ProgrammeCandidate[] = [];
  const dates = (items: EnrichmentSource[]) => {
    const values = items.map((item) => item.normalized.event_date).filter((value): value is string => Boolean(value)).sort();
    return { startsOn: values[0]?.slice(0, 10) ?? null, endsOn: values[values.length - 1]?.slice(0, 10) ?? null };
  };

  const sterilisation = valid.filter((source) => isSterilisationRegister(source.normalized) && source.normalized.event_date && source.normalized.locality);
  if (sterilisation.length) {
    const d = dates(sterilisation);
    const names = [...new Set(sterilisation.map((source) => clean(source.normalized.source_sheet)).filter(Boolean))];
    const name = names.length === 1 ? names[0] : "Sterilisation field records";
    programme.push({ key: "import:sterilisation", name, kind: "sterilisation", ...d, count: sterilisation.length, publicSummary: `${sterilisation.length} sterilisation records from the organisation's historical field register.` });
  }

  const tvt = valid.filter((source) => isTvtRegister(source.normalized) && source.normalized.event_date);
  if (tvt.length) {
    const d = dates(tvt);
    programme.push({ key: "import:tvt", name: "TVT treatment register", kind: "treatment", ...d, count: tvt.length, publicSummary: `${tvt.length} TVT treatment records, including repeat chemotherapy and review activity, are preserved in the historical register.` });
  }

  const rescue = valid.filter((source) => shouldHaveRescueCase(source));
  if (rescue.length) {
    const d = dates(rescue);
    const resolved = rescue.filter((source) => deriveCaseState(source).status === "resolved").length;
    programme.push({ key: "import:rescue-register", name: "Rescue & treatment register", kind: "other", ...d, count: rescue.length, publicSummary: `${rescue.length} rescue requests are documented in the historical register; ${resolved} carry a closed or resolved outcome in the source record.` });
  }

  const vaccineDogs = new Set(valid.filter((source) => source.imported_dog_id && strictVaccinationRecorded(source)).map((source) => source.imported_dog_id as string));
  const vaccineRows = valid.filter((source) => strictVaccinationRecorded(source));
  const fieldVaccinationRows = valid.filter((source) => /ring vacc|corp vaccination|vaccination drive/i.test(rowText(source)));
  if (vaccineDogs.size || fieldVaccinationRows.length) {
    const d = dates(vaccineRows.length ? vaccineRows : fieldVaccinationRows);
    const suffix = fieldVaccinationRows.length ? ` Field logs also record ${fieldVaccinationRows.length} vaccination-drive day${fieldVaccinationRows.length === 1 ? "" : "s"}.` : "";
    programme.push({ key: "import:vaccination", name: "Rabies & vaccination care", kind: "vaccination", ...d, count: vaccineDogs.size, publicSummary: `${vaccineDogs.size} animals have an explicit ARV or vaccination administration in the historical records.${suffix}` });
  }

  const surveyRows = valid.filter((source) => /dog survey|animal survey|census/i.test(rowText(source)));
  if (surveyRows.length) {
    const d = dates(surveyRows);
    programme.push({ key: "import:survey", name: "Street-animal survey field work", kind: "census", ...d, count: surveyRows.length, publicSummary: `${surveyRows.length} survey field-day record${surveyRows.length === 1 ? "" : "s"} were identified in the organisation's operational log.` });
  }
  return programme;
}
