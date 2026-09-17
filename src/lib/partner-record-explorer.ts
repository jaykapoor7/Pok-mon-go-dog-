"use client";

import { getSupabase } from "./supabase";

export type PartnerRecordKind = "rescue" | "care" | "follow_up" | "outcome";

export type PartnerRecordRow = {
  id: string;
  kind: PartnerRecordKind;
  subtype: string;
  date: string;
  title: string;
  detail: string | null;
  locality: string | null;
  animalId: string | null;
  animalLabel: string | null;
  caseId: string | null;
  status: string | null;
  source: "case" | "medical" | "follow_up" | "timeline";
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

const animalLabel = (dog: any) => {
  if (!dog) return null;
  return dog.name || dog.code || (dog.zone ? `Animal near ${dog.zone}` : "Unnamed animal");
};

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim() || null;

function outcomeLabel(value: string | null) {
  const t = String(value ?? "").toLowerCase();
  if (!t) return null;
  if (/euthani|put to sleep/.test(t)) return "Euthanised";
  if (/\bdied\b|passed away|dead/.test(t)) return "Died";
  if (/adopt/.test(t)) return "Adopted";
  if (/foster/.test(t)) return "Fostered";
  if (/released|discharged/.test(t)) return "Released / discharged";
  if (/recovered|healed|treatment complete/.test(t)) return "Recovered / treatment completed";
  if (/transfer|another ngo|another organisation/.test(t)) return "Transferred";
  if (/missing|escaped|could not|couldn.?t/.test(t)) return "Could not locate / catch";
  return clean(value);
}

export async function getPartnerRecordRows(): Promise<PartnerRecordRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data: ngoId, error: ngoError } = await supa.rpc("my_ngo");
  if (ngoError || !ngoId) return [];

  const [cases, medical, followups, timeline] = await Promise.all([
    page((from, to) => supa.from("cases")
      .select("id,dog_id,title,description,condition_text,zone,status,category,outcome_note,source_event_at,created_at,resolved_at,dogs(id,name,code,zone,ngo_id)")
      .eq("ngo_id", ngoId)
      .order("source_event_at", { ascending: false, nullsFirst: false })
      .range(from, to)),
    page((from, to) => supa.from("medical_events")
      .select("id,dog_id,case_id,kind,event_date,notes,dogs!inner(id,name,code,zone,ngo_id)")
      .eq("dogs.ngo_id", ngoId)
      .order("event_date", { ascending: false })
      .range(from, to)),
    page((from, to) => supa.from("animal_followups")
      .select("id,dog_id,case_id,kind,status,due_at,completed_at,note,dogs!inner(id,name,code,zone,ngo_id)")
      .eq("dogs.ngo_id", ngoId)
      .order("due_at", { ascending: false })
      .range(from, to)),
    page((from, to) => supa.from("animal_timeline_events")
      .select("id,dog_id,case_id,event_type,title,details,occurred_at,dogs!inner(id,name,code,zone,ngo_id)")
      .eq("ngo_id", ngoId)
      .in("event_type", ["import:release","import:outcome","outcome","release","adoption","foster","death","transfer"])
      .order("occurred_at", { ascending: false })
      .range(from, to)),
  ]);

  const rows: PartnerRecordRow[] = [];

  for (const row of cases) {
    const dog = Array.isArray(row.dogs) ? row.dogs[0] : row.dogs;
    const date = row.source_event_at || row.created_at;
    rows.push({
      id: `case:${row.id}`,
      kind: "rescue",
      subtype: row.category || "rescue",
      date,
      title: row.title || row.condition_text || "Rescue case",
      detail: clean(row.description || row.condition_text),
      locality: clean(row.zone || dog?.zone),
      animalId: row.dog_id || dog?.id || null,
      animalLabel: animalLabel(dog),
      caseId: row.id,
      status: row.status || null,
      source: "case",
    });
    const outcome = outcomeLabel(row.outcome_note);
    if (outcome) rows.push({
      id: `outcome:${row.id}`,
      kind: "outcome",
      subtype: outcome,
      date: row.resolved_at || date,
      title: outcome,
      detail: clean(row.outcome_note),
      locality: clean(row.zone || dog?.zone),
      animalId: row.dog_id || dog?.id || null,
      animalLabel: animalLabel(dog),
      caseId: row.id,
      status: row.status || null,
      source: "case",
    });
  }

  for (const row of medical) {
    const dog = Array.isArray(row.dogs) ? row.dogs[0] : row.dogs;
    rows.push({
      id: `medical:${row.id}`,
      kind: "care",
      subtype: row.kind || "treatment",
      date: row.event_date,
      title: String(row.kind || "care").replace(/_/g, " "),
      detail: clean(row.notes),
      locality: clean(dog?.zone),
      animalId: row.dog_id || dog?.id || null,
      animalLabel: animalLabel(dog),
      caseId: row.case_id || null,
      status: null,
      source: "medical",
    });
  }

  for (const row of followups) {
    const dog = Array.isArray(row.dogs) ? row.dogs[0] : row.dogs;
    rows.push({
      id: `followup:${row.id}`,
      kind: "follow_up",
      subtype: row.kind || "review",
      date: row.completed_at || row.due_at,
      title: row.kind || "Follow-up / review",
      detail: clean(row.note),
      locality: clean(dog?.zone),
      animalId: row.dog_id || dog?.id || null,
      animalLabel: animalLabel(dog),
      caseId: row.case_id || null,
      status: row.status || null,
      source: "follow_up",
    });
  }

  for (const row of timeline) {
    const dog = Array.isArray(row.dogs) ? row.dogs[0] : row.dogs;
    rows.push({
      id: `timeline:${row.id}`,
      kind: "outcome",
      subtype: row.event_type || "outcome",
      date: row.occurred_at,
      title: row.title || "Outcome",
      detail: clean(row.details),
      locality: clean(dog?.zone),
      animalId: row.dog_id || dog?.id || null,
      animalLabel: animalLabel(dog),
      caseId: row.case_id || null,
      status: null,
      source: "timeline",
    });
  }

  const unique = new Map<string, PartnerRecordRow>();
  for (const row of rows) {
    const key = [row.kind,row.subtype,row.date.slice(0,10),row.animalId,row.caseId,row.detail].join("|");
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
