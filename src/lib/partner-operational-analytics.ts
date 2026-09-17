import { getSupabase } from "./supabase";

export type AnalyticsRow = { label: string; count: number };
export type PartnerOperationalAnalytics = {
  conditions: AnalyticsRow[];
  outcomes: AnalyticsRow[];
  localities: AnalyticsRow[];
  years: AnalyticsRow[];
  careKinds: AnalyticsRow[];
  followupStatuses: AnalyticsRow[];
};

async function page(load: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) return rows;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

function add(map: Map<string, number>, label: string | null | undefined) {
  const clean = String(label ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return;
  map.set(clean, (map.get(clean) ?? 0) + 1);
}

function ranked(map: Map<string, number>, limit = 8): AnalyticsRow[] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([label, count]) => ({ label, count }));
}

function conditionBucket(value: unknown) {
  const t = String(value ?? "").toLowerCase();
  if (/\b(rta|road accident|vehicle|hit by|accident)\b/.test(t)) return "Road traffic injury";
  if (/\b(maggot|wound|cut|lacerat|bleed|injur)\b/.test(t)) return "Wound / injury";
  if (/\b(fracture|broken|limb|leg injury|paralys)\b/.test(t)) return "Fracture / mobility";
  if (/\b(tvt|tumou?r|cancer|growth)\b/.test(t)) return "TVT / tumour";
  if (/\b(mange|skin|dermat|itch|hair loss)\b/.test(t)) return "Skin condition";
  if (/\b(parvo|distemper|fever|infection|ill|sick|weak|vomit|diarr)\b/.test(t)) return "Illness / infection";
  if (/\b(eye|vision|blind)\b/.test(t)) return "Eye condition";
  if (/\b(bite|attack)\b/.test(t)) return "Bite / attack";
  if (/\b(abc|sterili[sz]|spay|neuter)\b/.test(t)) return "ABC / sterilisation";
  if (/\b(rabies|arv|vaccin)\b/.test(t)) return "Rabies / vaccination";
  if (t.trim()) return "Other rescue / welfare";
  return null;
}

function careLabel(kind: string) {
  const labels: Record<string, string> = {
    vaccination: "Vaccination / ARV",
    sterilisation: "Sterilisation / ABC",
    chemotherapy: "TVT / chemotherapy",
    surgery: "Surgery / procedure",
    diagnostic: "Diagnostics / tests",
    wound_care: "Wound care / dressing",
    wound: "Wound care / dressing",
    treatment: "Treatment / medication",
    rehabilitation: "Rehabilitation",
    checkup: "Check-up",
    deworming: "Deworming",
    rescue: "Rescue care",
  };
  return labels[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function outcomeLabel(value: unknown) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const t = clean.toLowerCase();
  if (/euthani|put to sleep/.test(t)) return "Euthanised";
  if (/\bdied\b|passed away|dead/.test(t)) return "Died";
  if (/adopt/.test(t)) return "Adopted";
  if (/foster/.test(t)) return "Fostered";
  if (/another organisation|another ngo|transferred/.test(t)) return "Transferred to another organisation";
  if (/released|discharged/.test(t)) return "Released / discharged";
  if (/recovered|treatment completed|treatment complete|healed/.test(t)) return "Recovered / treatment completed";
  if (/could not|couldn.?t|missing|escaped/.test(t)) return "Could not locate / catch";
  if (/no action|without intervention|not attended/.test(t)) return "Closed without intervention";
  return clean;
}

/** RLS-scoped analytics over the same native records used by the NGO workspace. */
export async function getPartnerOperationalAnalytics(): Promise<PartnerOperationalAnalytics> {
  const supa = getSupabase();
  if (!supa) return { conditions: [], outcomes: [], localities: [], years: [], careKinds: [], followupStatuses: [] };

  const [cases, medical, followups] = await Promise.all([
    page((from, to) => supa.from("cases").select("condition_text,description,title,outcome_note,zone,created_at,source_event_at").order("created_at", { ascending: false }).range(from, to)),
    page((from, to) => supa.from("medical_events").select("kind,event_date").order("event_date", { ascending: false }).range(from, to)),
    page((from, to) => supa.from("animal_followups").select("kind,status,due_at").order("due_at", { ascending: false }).range(from, to)),
  ]);

  const conditions = new Map<string, number>();
  const outcomes = new Map<string, number>();
  const localityCanonical = new Map<string, string>();
  const localityCounts = new Map<string, number>();
  const years = new Map<string, number>();
  const careKinds = new Map<string, number>();
  const followupStatuses = new Map<string, number>();

  for (const row of cases) {
    add(conditions, conditionBucket([row.condition_text, row.title, row.description].filter(Boolean).join(" ")));
    add(outcomes, outcomeLabel(row.outcome_note));
    const locality = String(row.zone ?? "").replace(/\s+/g, " ").trim();
    if (locality) {
      const key = locality.toLowerCase();
      if (!localityCanonical.has(key)) localityCanonical.set(key, locality);
      localityCounts.set(key, (localityCounts.get(key) ?? 0) + 1);
    }
    const rawDate = row.source_event_at ?? row.created_at;
    const d = rawDate ? new Date(rawDate) : null;
    if (d && !Number.isNaN(d.valueOf())) add(years, String(d.getUTCFullYear()));
  }
  for (const row of medical) add(careKinds, careLabel(String(row.kind ?? "other")));
  for (const row of followups) {
    const status = String(row.status ?? "").toLowerCase();
    add(followupStatuses, status === "done" ? "Completed / historical" : status === "missed" ? "Missed" : status === "cancelled" ? "Cancelled" : status === "postponed" ? "Postponed" : "Upcoming");
  }

  const localities = [...localityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ label: localityCanonical.get(key) ?? key, count }));

  return {
    conditions: ranked(conditions, 10),
    outcomes: ranked(outcomes, 10),
    localities,
    years: [...years.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([label, count]) => ({ label, count })),
    careKinds: ranked(careKinds, 10),
    followupStatuses: ranked(followupStatuses, 6),
  };
}
