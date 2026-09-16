import "server-only";

import { getSupabaseAdmin } from "./supabase";

export type StandardAnimalRecord = {
  id: string;
  classification: string;
  eventDate: string | null;
  locality: string | null;
  animalName: string | null;
  animalCode: string | null;
  sex: string | null;
  colour: string | null;
  sourceStatus: string | null;
  condition: string | null;
  caseDetail: string | null;
  treatmentUpdate: string | null;
  review: string | null;
  rescuePlan: string | null;
  admitDate: string | null;
  releaseDate: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
  provenance: string;
};

export type ProfileOperationalRecord = {
  imported: StandardAnimalRecord[];
  medical: Array<{
    id: string;
    kind: string;
    eventDate: string;
    notes: string | null;
    performedBy: string | null;
  }>;
  followUps: Array<{
    id: string;
    dueAt: string | null;
    kind: string;
    note: string | null;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    title: string;
    details: string | null;
    occurredAt: string;
    provenance: string;
  }>;
};

type NormalizedSource = {
  fingerprint?: string;
  classification?: string;
  event_date?: string | null;
  locality?: string | null;
  animal_name?: string | null;
  animal_code?: string | null;
  sex?: string | null;
  colour?: string | null;
  status?: string | null;
  condition?: string | null;
  case_detail?: string | null;
  treatment_update?: string | null;
  review?: string | null;
  rescue_plan?: string | null;
  admit_date?: string | null;
  release_date?: string | null;
  source_sheet?: string | null;
  source_row?: number | null;
};

function normalizedFrom(meta: any): NormalizedSource | null {
  const value = meta?.normalized;
  return value && typeof value === "object" ? value as NormalizedSource : null;
}

function recordFrom(meta: any, provenance: string, fallbackId: string): StandardAnimalRecord | null {
  const n = normalizedFrom(meta);
  if (!n?.classification) return null;
  return {
    id: n.fingerprint || fallbackId,
    classification: n.classification,
    eventDate: n.event_date ?? null,
    locality: n.locality ?? null,
    animalName: n.animal_name ?? null,
    animalCode: n.animal_code ?? null,
    sex: n.sex ?? null,
    colour: n.colour ?? null,
    sourceStatus: n.status ?? null,
    condition: n.condition ?? null,
    caseDetail: n.case_detail ?? null,
    treatmentUpdate: n.treatment_update ?? null,
    review: n.review ?? null,
    rescuePlan: n.rescue_plan ?? null,
    admitDate: n.admit_date ?? null,
    releaseDate: n.release_date ?? null,
    sourceSheet: n.source_sheet ?? null,
    sourceRow: typeof n.source_row === "number" ? n.source_row : null,
    provenance,
  };
}

export async function getProfileOperationalRecord(dogId: string): Promise<ProfileOperationalRecord> {
  const supa = getSupabaseAdmin();
  if (!supa) return { imported: [], medical: [], followUps: [], timeline: [] };

  const [dogRes, casesRes, medicalRes, followRes, timelineRes, importRowsRes] = await Promise.all([
    supa.from("dogs").select("id,source_metadata,provenance").eq("id", dogId).maybeSingle(),
    supa.from("cases").select("id,source_metadata,created_at").eq("dog_id", dogId),
    supa.from("medical_events").select("id,kind,event_date,notes,performed_by,source_metadata").eq("dog_id", dogId).order("event_date", { ascending: false }),
    supa.from("animal_followups").select("id,due_at,kind,note,source_metadata").eq("dog_id", dogId).order("due_at", { ascending: false }),
    supa.from("animal_timeline_events").select("id,event_type,title,details,occurred_at,provenance,source_ref").eq("dog_id", dogId).order("occurred_at", { ascending: false }),
    supa.from("import_rows").select("id,normalized,decision,error").eq("imported_dog_id", dogId),
  ]);

  const imported = new Map<string, StandardAnimalRecord>();
  const add = (meta: any, provenance: string, fallbackId: string) => {
    const record = recordFrom(meta, provenance, fallbackId);
    if (!record) return;
    const key = `${record.id}:${record.classification}`;
    if (!imported.has(key)) imported.set(key, record);
  };

  for (const row of importRowsRes.data ?? []) add({ normalized: row.normalized }, "import_row", `import:${row.id}`);
  if (dogRes.data) add(dogRes.data.source_metadata, dogRes.data.provenance ?? "animal", `dog:${dogId}`);
  for (const row of casesRes.data ?? []) add(row.source_metadata, "case", `case:${row.id}`);
  for (const row of medicalRes.data ?? []) add(row.source_metadata, "medical", `medical:${row.id}`);
  for (const row of followRes.data ?? []) add(row.source_metadata, "follow_up", `follow:${row.id}`);
  for (const row of timelineRes.data ?? []) add(row.source_ref, row.provenance ?? "timeline", `timeline:${row.id}`);

  return {
    imported: [...imported.values()].sort((a, b) => +new Date(b.eventDate ?? 0) - +new Date(a.eventDate ?? 0)),
    medical: (medicalRes.data ?? []).map((row: any) => ({
      id: row.id,
      kind: row.kind,
      eventDate: row.event_date,
      notes: row.notes ?? null,
      performedBy: row.performed_by ?? null,
    })),
    followUps: (followRes.data ?? []).map((row: any) => ({
      id: row.id,
      dueAt: row.due_at ?? null,
      kind: row.kind ?? "follow-up",
      note: row.note ?? null,
    })),
    timeline: (timelineRes.data ?? []).map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      details: row.details ?? null,
      occurredAt: row.occurred_at,
      provenance: row.provenance ?? "record",
    })),
  };
}
