import type { ToolCtx, ToolOut } from "./tools";
import type { Citation } from "./types";

/* Two read tools about animals, for questions the case tools cannot answer: one animal's whole record (identity,
   sterilisation and vaccination, the care log, its cases), and a filtered view of the register (which animals in a
   ward are not vaccinated, how many are sterilised). Both read with the person's own access, bounded, and change
   nothing. "Unknown" is reported as unknown, never as "no". */

export const ANIMAL_TOOL_DEFS = [
  { name: "animal_record", description: "One animal's whole record from this organisation's register: tag, name, ward, sterilisation and vaccination status, every care-log entry with its date (sterilisation, vaccination, treatment), and its cases. Give the tag (e.g. KOR-101), the StrayPaw ID, or the name; a name shared by several animals returns the candidates to choose from.",
    input_schema: { type: "object", properties: { animal: { type: "string", description: "Tag, StrayPaw ID or name." } }, required: ["animal"] } },
  { name: "query_animals", description: "Count or list animals on this organisation's register by ward and by sterilisation or vaccination status. Use for questions such as which animals in a ward still need vaccination, how many are sterilised, or which have no status recorded. Returns the counts for the filter, a breakdown by ward, and up to 40 matching animals with their last recorded procedure dates.",
    input_schema: { type: "object", properties: {
      ward: { type: "string", description: "Ward or locality name, as written on the register." },
      sterilisation: { type: "string", enum: ["sterilised", "not_sterilised", "unknown", "not_done"], description: "not_done means not sterilised or unknown." },
      vaccination: { type: "string", enum: ["vaccinated", "not_vaccinated", "unknown", "not_done"], description: "not_done means not vaccinated or unknown." },
    } } },
] as const;
export const isAnimalTool = (name: string) => ANIMAL_TOOL_DEFS.some((t) => t.name === name);

const NEEDS_ORG: ToolOut = { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
const FAILED: ToolOut = { data: { error: "The register could not be read. Counts are unknown." }, summary: "Register could not be read", citations: [], ok: false };
const clean = (v: unknown, n = 60) => String(v ?? "").replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
type Dog = { id: string; code: string | null; name: string | null; straypaw_id: string | null; zone: string | null; city: string | null; sex: string | null; species: string | null; sterilisation_status: string | null; vaccination_status: string | null; last_seen: string | null; ear_notch: unknown; medical_events?: { kind: string; event_date: string | null; notes?: string | null; performed_by?: string | null }[] | null };
const label = (d: Dog) => [d.code, d.name].filter(Boolean).join(" · ") || d.straypaw_id || "Animal";
const cite = (d: Dog): Citation => ({ id: d.id, label: label(d), href: `/ngo/animals/${d.id}`, kind: "animal" });
const last = (d: Dog, kind: string) => (d.medical_events ?? []).filter((e) => e.kind === kind && e.event_date).map((e) => e.event_date!.slice(0, 10)).sort().pop() ?? null;
const COLS = "id,code,name,straypaw_id,zone,city,sex,species,sterilisation_status,vaccination_status,last_seen,ear_notch";

export async function animalRecord(input: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const q = clean(input.animal);
  if (q.length < 2) return { data: { error: "Give the animal's tag, StrayPaw ID or name." }, summary: "No animal named", citations: [], ok: false };
  try {
    const select = `${COLS},medical_events(kind,event_date,notes,performed_by)`;
    /* An exact tag or ID first; a name only when nothing matches exactly. */
    let found = await db.from("dogs").select(select).eq("ngo_id", orgId).or(`code.ilike.${q},straypaw_id.ilike.${q}`).limit(3);
    if (found.error) return FAILED;
    if (!found.data?.length) { found = await db.from("dogs").select(select).eq("ngo_id", orgId).or(`name.ilike.%${q}%,code.ilike.%${q}%`).order("last_seen", { ascending: false }).limit(6); if (found.error) return FAILED; }
    const dogs = (found.data ?? []) as unknown as Dog[];
    if (!dogs.length) return { data: { found: false, asked: q }, summary: `No animal matches “${q}” on your register`, citations: [] };
    if (dogs.length > 1) return { data: { found: false, several: dogs.map((d) => ({ tag: d.code, name: d.name, ward: d.zone, sterilisation: d.sterilisation_status ?? "unknown", vaccination: d.vaccination_status ?? "unknown" })) }, summary: `${dogs.length} animals match “${q}”`, citations: dogs.map(cite) };
    const d = dogs[0];
    const cases = await db.from("org_case_facts").select("id,case_code,title,status_class,condition_class,occurred_at,assignee_name,next_due").eq("ngo_id", orgId).eq("dog_id", d.id).order("occurred_at", { ascending: false, nullsFirst: false }).limit(8);
    const care = (d.medical_events ?? []).filter((e) => e.event_date).sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? "")).slice(0, 20).map((e) => ({ kind: e.kind, date: e.event_date!.slice(0, 10), by: e.performed_by ?? null, notes: e.notes ? String(e.notes).slice(0, 200) : null }));
    const steril = last(d, "sterilisation"), vacc = last(d, "vaccination");
    /* What the record itself shows is out of step: stated, never corrected here. */
    const notes = [
      steril && d.sterilisation_status !== "sterilised" ? `A sterilisation is logged on ${steril} but the status reads “${d.sterilisation_status ?? "unknown"}”.` : "",
      vacc && d.vaccination_status !== "vaccinated" ? `A vaccination is logged on ${vacc} but the status reads “${d.vaccination_status ?? "unknown"}”.` : "",
      vacc && Date.now() - Date.parse(vacc) > 365 * 86_400_000 ? `The last recorded vaccination (${vacc}) is more than a year old.` : "",
    ].filter(Boolean);
    const citations: Citation[] = [cite(d), ...((cases.data ?? []) as { id: string; case_code: string | null; title: string | null }[]).map((c) => ({ id: c.id, label: c.case_code ?? c.title ?? "Case", href: `/ngo/cases/${c.id}`, kind: "case" as const }))];
    return { data: { found: true, animal: { tag: d.code, name: d.name, straypaw_id: d.straypaw_id, ward: d.zone, city: d.city, species: d.species, sex: d.sex ?? "not recorded", sterilisation_status: d.sterilisation_status ?? "unknown", vaccination_status: d.vaccination_status ?? "unknown", last_sterilisation: steril, last_vaccination: vacc, last_seen: d.last_seen?.slice(0, 10) ?? null }, care_log: care, cases: cases.error ? "could not be read" : cases.data ?? [], record_notes: notes, href: `/ngo/animals/${d.id}` }, summary: `Read ${label(d)}: ${care.length} care entries`, citations };
  } catch { return FAILED; }
}

export async function queryAnimals(input: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const ward = clean(input.ward, 50);
  const pick = (v: unknown, of: string[]) => (of.includes(String(v)) ? String(v) : null);
  const steril = pick(input.sterilisation, ["sterilised", "not_sterilised", "unknown", "not_done"]), vacc = pick(input.vaccination, ["vaccinated", "not_vaccinated", "unknown", "not_done"]);
  try {
    /* Bounded: at most 2,000 register rows, test rows left out; a larger register says the figures are partial. */
    let q = db.from("dogs").select(`${COLS},medical_events(kind,event_date)`).eq("ngo_id", orgId).eq("is_demo", false);
    if (ward) q = q.ilike("zone", `%${ward}%`);
    if (steril) q = steril === "not_done" ? q.or("sterilisation_status.is.null,sterilisation_status.neq.sterilised") : q.eq("sterilisation_status", steril);
    if (vacc) q = vacc === "not_done" ? q.or("vaccination_status.is.null,vaccination_status.neq.vaccinated") : q.eq("vaccination_status", vacc);
    const got = await q.order("zone", { ascending: true }).limit(2000);
    if (got.error) return FAILED;
    const dogs = (got.data ?? []) as unknown as Dog[];
    const by = new Map<string, number>(); for (const d of dogs) by.set(d.zone ?? "No ward recorded", (by.get(d.zone ?? "No ward recorded") ?? 0) + 1);
    const count = (f: (d: Dog) => boolean) => dogs.filter(f).length;
    const data = { filter: { ward: ward || null, sterilisation: steril, vaccination: vacc }, matching: dogs.length, partial: dogs.length >= 2000,
      status_in_match: { sterilised: count((d) => d.sterilisation_status === "sterilised"), not_sterilised: count((d) => d.sterilisation_status === "not_sterilised"), sterilisation_unknown: count((d) => !d.sterilisation_status || d.sterilisation_status === "unknown"), vaccinated: count((d) => d.vaccination_status === "vaccinated"), not_vaccinated: count((d) => d.vaccination_status === "not_vaccinated"), vaccination_unknown: count((d) => !d.vaccination_status || d.vaccination_status === "unknown") },
      by_ward: [...by].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w, n]) => ({ ward: w, animals: n })),
      animals: dogs.slice(0, 40).map((d) => ({ tag: d.code, name: d.name, ward: d.zone, sterilisation: d.sterilisation_status ?? "unknown", vaccination: d.vaccination_status ?? "unknown", last_sterilisation: last(d, "sterilisation"), last_vaccination: last(d, "vaccination"), href: `/ngo/animals/${d.id}` })),
      note: "Recorded statuses on the register, not a street count. Unknown means the record does not say." };
    return { data, summary: `${dogs.length} animal${dogs.length === 1 ? "" : "s"} match${ward ? ` in ${ward}` : ""}`, citations: dogs.slice(0, 10).map(cite) };
  } catch { return FAILED; }
}
