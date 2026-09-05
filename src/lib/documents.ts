import { getSupabase } from "./supabase";

/* Scanned source material: ward register pages, ABC ledgers, WhatsApp
   threads. Row-level security scopes every read to the organisation that
   filed it, so these functions return nothing rather than failing loudly
   for anyone else. That is the correct behaviour here: a register page
   carries other people's handwriting, phone numbers and addresses. */

export type DocumentKind =
  | "register_page"
  | "whatsapp"
  | "medical_note"
  | "consent_form"
  | "other";

export const DOCUMENT_KINDS: { value: DocumentKind; label: string }[] = [
  { value: "register_page", label: "Ward or ABC register page" },
  { value: "whatsapp", label: "WhatsApp thread" },
  { value: "medical_note", label: "Medical note" },
  { value: "consent_form", label: "Consent form" },
  { value: "other", label: "Other" },
];

export type SourceDocument = {
  id: string;
  ngo_id: string;
  dog_id: string | null;
  case_id: string | null;
  url: string;
  kind: DocumentKind;
  title: string | null;
  notes: string | null;
  recorded_on: string | null;
  created_at: string;
};

export async function orgDocuments(): Promise<SourceDocument[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error || !Array.isArray(data)) return [];
  return data as SourceDocument[];
}

export async function animalDocuments(dogId: string): Promise<SourceDocument[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("animal_documents", { p_dog_id: dogId });
  if (error || !Array.isArray(data)) return [];
  return data as SourceDocument[];
}

export async function addDocument(input: {
  url: string;
  kind?: DocumentKind;
  title?: string;
  notes?: string;
  dogId?: string | null;
  caseId?: string | null;
  recordedOn?: string | null;
}): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("add_document", {
    p_url: input.url,
    p_kind: input.kind ?? "register_page",
    p_title: input.title ?? null,
    p_notes: input.notes ?? null,
    p_dog_id: input.dogId ?? null,
    p_recorded_on: input.recordedOn ?? null,
    p_case_id: input.caseId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

/** Attach to an animal, a case, or both. Pass clear to detach. */
export async function linkDocument(
  documentId: string,
  opts: { dogId?: string | null; caseId?: string | null; clear?: boolean }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("link_document", {
    p_document_id: documentId,
    p_dog_id: opts.dogId ?? null,
    p_case_id: opts.caseId ?? null,
    p_clear: opts.clear ?? false,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** The written context that makes a scan usable by someone who was not there. */
export async function updateDocument(
  documentId: string,
  fields: {
    title?: string;
    notes?: string;
    kind?: DocumentKind;
    recordedOn?: string | null;
  }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("update_document", {
    p_document_id: documentId,
    p_title: fields.title ?? null,
    p_notes: fields.notes ?? null,
    p_kind: fields.kind ?? null,
    p_recorded_on: fields.recordedOn ?? null,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function caseDocuments(caseId: string): Promise<SourceDocument[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("case_documents", { p_case_id: caseId });
  if (error || !Array.isArray(data)) return [];
  return data as SourceDocument[];
}
