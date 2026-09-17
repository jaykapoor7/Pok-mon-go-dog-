export type RescueText = {
  subtype?: string | null;
  title?: string | null;
  detail?: string | null;
  status?: string | null;
};

const text = (row: RescueText | string | null | undefined) => {
  if (typeof row === "string" || row == null) return String(row ?? "").toLowerCase();
  return [row.subtype, row.title, row.detail, row.status].filter(Boolean).join(" ").toLowerCase();
};

/**
 * Source-led rescue taxonomy.
 *
 * These buckets come from the vocabulary repeatedly used in partner rescue
 * registers (RTA, maggot, TVT, skin, bites, tumour, CD, etc.). The original
 * text remains the source of truth; this is only a reporting layer so teams
 * can see patterns without manually cleaning spelling/capitalisation first.
 */
export function rescueCategory(row: RescueText | string | null | undefined) {
  const t = text(row);
  if (/\b(rta|road traffic|road accident|vehicle hit|hit by (a )?(car|bike|vehicle)|accident)\b/.test(t)) return "RTA";
  if (/\bmaggot/.test(t)) return "Maggot wound";
  if (/\btvt\b/.test(t)) return "TVT";
  if (/\b(skin|mange|dermat|itch|hair loss)\b/.test(t)) return "Skin / mange";
  if (/\b(dog bite|bite wound|bitten by|animal bite)\b/.test(t)) return "Dog bite";
  if (/\b(tumou?r|cancer|growth)\b/.test(t)) return "Tumour";
  if (/\b(cd|distemper)\b/.test(t)) return "Distemper / CD";
  if (/\b(human abuse|abuse|cruel|beaten|attack by people)\b/.test(t)) return "Human abuse";
  if (/\b(eye|blind|vision)\b/.test(t)) return "Eye condition";
  if (/\b(ear infection|aural|ear issue)\b/.test(t)) return "Ear condition";
  if (/\b(minor injury|minor wound)\b/.test(t)) return "Minor injury";
  if (/\b(abc|sterili[sz]|spay|neuter)\b/.test(t)) return "ABC / sterilisation";
  if (/\b(rabies|arv|vaccin)\b/.test(t)) return "Rabies / vaccination";
  if (/\bparvo\b/.test(t)) return "Parvo";
  if (/\bprolapse\b/.test(t)) return "Prolapse";
  if (/\b(wire trap|metal wire|wire|trap)\b/.test(t)) return "Wire / trap";
  if (/\b(tick fever|ticks?)\b/.test(t)) return "Tick-borne / ticks";
  if (/\b(abandon|pet abandoned)\b/.test(t)) return "Abandonment";
  if (/\b(fracture|broken bone|paralys|mobility)\b/.test(t)) return "Fracture / mobility";
  if (/\b(wound|injury|injured|cut|bleed|lacerat)\b/.test(t)) return "Other wound / injury";
  if (/\b(unknown|uknown|unkown)\b/.test(t)) return "Unknown";
  return "Other";
}

export function isNoAction(row: RescueText | string | null | undefined) {
  const t = text(row);
  return /no action|without intervention|not attended|could not attend|couldn.?t attend/.test(t);
}

export function isClosedStatus(value: string | null | undefined) {
  const t = String(value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
  return /^(resolved|closed|completed|released|adopted|safe)$/.test(t) || /closed with no action|closed\s*\(not attended\)|other ngo rescued|transferred/.test(t);
}

export function isMissingOrEscaped(row: RescueText | string | null | undefined) {
  const t = text(row);
  return /missing|escaped|could not locate|couldn.?t locate|could not catch|couldn.?t catch|unable to catch/.test(t);
}

export function rescueStatusLabel(status: string | null | undefined, detail?: string | null) {
  const t = `${status ?? ""} ${detail ?? ""}`.toLowerCase();
  if (isNoAction(t)) return "Closed without intervention";
  if (/other ngo|another ngo|transferred/.test(t)) return "Transferred";
  if (/in.?progress|assigned/.test(t)) return "In progress";
  if (/open|unverified/.test(t)) return "Open";
  if (/resolved|closed|completed|released/.test(t)) return "Completed";
  return String(status ?? "Recorded").replace(/_/g, " ");
}
