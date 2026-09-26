import "server-only";

import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════════
   The Kind Hour Foundation, as the public record holds it.

   Kind Hour's rescue register was imported as historical records
   (scripts/import-kind-hour.mjs), and its teaching material is credited
   on /education. Pages that cite either read the published source row
   and the public profile views here, so a figure on a page is always the
   figure in the register. Nothing here claims the teaching caused a
   rescue: the two are shown side by side, never joined.
   ════════════════════════════════════════════════════════════════════ */

export const KIND_HOUR_SLUG = "the-kind-hour-foundation";
export const KIND_HOUR_SOURCE = "kind-hour-rescue-register-2024-2026";

export type KindHourSource = {
  lines: number; encounters: number; canonicalAnimals: number; atLocality: number; cityLevel: number; duplicates: number;
  from: string | null; to: string | null; city: string | null;
};
export type KindHourExample = {
  id: string; straypawId: string | null; name: string | null; zone: string | null; city: string | null;
  firstSeen: string | null; lastSeen: string | null; care: number; cases: number;
};

async function read(): Promise<{ source: KindHourSource | null; example: KindHourExample | null; orgSlug: string }> {
  const supa = getSupabase();
  if (!supa) return { source: null, example: null, orgSlug: KIND_HOUR_SLUG };
  const [{ data: src }, { data: ex }] = await Promise.all([
    supa.from("data_sources").select("record_count,published_record_count,metadata").eq("slug", KIND_HOUR_SOURCE).maybeSingle(),
    /* The register's first line, "chachi", is the worked example: a
       spreadsheet row that became a record. */
    supa.from("public_animal_profiles").select("id,straypaw_id,name,zone,city,first_seen,last_seen,data_source_id").eq("source_record_id", "KH-RR-001").not("data_source_id", "is", null).maybeSingle(),
  ]);
  const m = (src?.metadata ?? {}) as {
    audit?: { canonical_animal_profiles?: number; encounters_at_named_locality?: number; encounters_at_city_level?: number; exact_duplicates?: number };
    register_span?: { from?: string; to?: string };
  };
  const source: KindHourSource | null = src ? {
    lines: src.record_count ?? 0,
    encounters: src.published_record_count ?? 0,
    canonicalAnimals: m.audit?.canonical_animal_profiles ?? 0,
    atLocality: m.audit?.encounters_at_named_locality ?? 0,
    cityLevel: m.audit?.encounters_at_city_level ?? 0,
    duplicates: m.audit?.exact_duplicates ?? 0,
    from: m.register_span?.from ?? null, to: m.register_span?.to ?? null, city: "Lucknow",
  } : null;
  let example: KindHourExample | null = null;
  if (ex) {
    const [{ count: care }, { count: cases }] = await Promise.all([
      supa.from("public_care_facts").select("id", { count: "exact", head: true }).eq("dog_id", ex.id),
      supa.from("public_case_facts").select("id", { count: "exact", head: true }).eq("dog_id", ex.id),
    ]);
    example = { id: ex.id, straypawId: ex.straypaw_id, name: ex.name, zone: ex.zone, city: ex.city, firstSeen: ex.first_seen, lastSeen: ex.last_seen, care: care ?? 0, cases: cases ?? 0 };
  }
  return { source, example, orgSlug: KIND_HOUR_SLUG };
}

export const getKindHour = unstable_cache(read, ["kind-hour-v2"], { revalidate: 900 });
