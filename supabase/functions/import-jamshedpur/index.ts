// @ts-nocheck
// This standalone Deno edge function lives inside the Next.js repository;
// the app's TypeScript program does not include Deno's runtime globals.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Imports the public HSI Jamshedpur CNVR clinical register as historical,
 * city-level animal records. Source data has no individual coordinates or
 * photos, so every map point is intentionally generalised to Jamshedpur.
 */

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CSV_URL = "https://raw.githubusercontent.com/lauren-smith-r/HSI_DPM/main/data/clinical.csv";
const SOURCE_URL = "https://github.com/lauren-smith-r/HSI_DPM";
const PAPER_URL = "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0322290";
const NGO_ID = "5b57a357-3c1c-5b83-a6c3-9e3c8f205901";
const SOURCE_ID = "7ad70b42-5d20-52e0-93c8-78488a826901";
const BATCH_ID = "0a18bd29-7c9a-5c46-9d6a-69b6906c8d01";
const JSR_CENTER = { lat: 22.8046, lng: 86.2029 };
const IMPORTER_VERSION = "jamshedpur-cnvr-v1";

type ClinicalRow = Record<string, string>;

function parseLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (character === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value); value = "";
    } else value += character;
  }
  values.push(value);
  return values;
}

function parseCsv(csv: string): ClinicalRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseLine(lines.shift() ?? "");
  return lines.filter(Boolean).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function toDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function truthy(value: string) { return /^(1|true|yes|y)$/i.test(value.trim()); }

function stableUuid(value: string) {
  // cyrb128: a deterministic 128-bit non-cryptographic identifier. It makes
  // retries idempotent without spending one async digest per record/event.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xc0decafe, h4 = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761); h2 = Math.imul(h2 ^ code, 1597334677);
    h3 = Math.imul(h3 ^ code, 974711); h4 = Math.imul(h4 ^ code, 2246822519);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1].map((part) => (part >>> 0).toString(16).padStart(8, "0")).join("");
  const versioned = `${hex.slice(0, 12)}5${hex.slice(13, 16)}${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20)}`;
}

async function rest(table: string, method: "POST" | "PATCH", body: unknown, extra = "") {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${table}${extra}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
}

async function upsertChunks(table: string, rows: unknown[], size = 350) {
  const requests: Promise<void>[] = [];
  for (let index = 0; index < rows.length; index += size) {
    requests.push(rest(table, "POST", rows.slice(index, index + size), "?on_conflict=id"));
  }
  await Promise.all(requests);
}

function sourceMeta(id: string, row: ClinicalRow) {
  return {
    data_source_id: SOURCE_ID,
    import_batch_id: BATCH_ID,
    source_record_id: id,
    source_url: SOURCE_URL,
    source_file: "data/clinical.csv",
    provenance: "imported_historical_record",
    location_note: "City-level generalised location; source has no individual coordinates.",
    source_fields: {
      date_in: row.date_in || null,
      date_out: row.date_out || null,
      sex_age: row.sex_age || null,
      distemper: row.distemper || null,
      rabies: row.rabies || null,
      venereal_cancer: row.venereal_cancer || null,
    },
  };
}

Deno.serve(async (request) => {
  try {
    const sourceResponse = await fetch(CSV_URL);
    if (!sourceResponse.ok) throw new Error(`Could not retrieve source CSV (${sourceResponse.status}).`);
    const rows = parseCsv(await sourceResponse.text()).filter((row) => row.IDno);
    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dry_run") === "1";
    if (dryRun) return Response.json({ ok: true, dry_run: true, rows: rows.length, source: CSV_URL });
    const start = Math.max(0, Number.parseInt(url.searchParams.get("start") ?? "0", 10) || 0);
    // Keep every invocation well below the hosted edge request window.
    const limit = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "1000", 10) || 1000));
    const chunk = rows.slice(start, start + limit);
    if (!chunk.length) return Response.json({ ok: true, complete: true, rows: rows.length });

    await rest("ngos", "POST", [{
      id: NGO_ID,
      name: "Humane World for Animals / HSI",
      slug: "humane-world-hsi-jamshedpur-records",
      area: "Jamshedpur",
      city: "Jamshedpur",
      state: "Jharkhand",
      areas_of_work: ["CNVR clinical records"],
      website: "https://www.humaneworld.org/",
      about: "Record contributor for historical Jamshedpur CNVR clinical records.",
      partner_status: "record_contributor",
      dogs_helped: rows.length,
      verified: false,
      config: { public_directory_label: "Record contributor", data_only_relationship: true },
    }], "?on_conflict=id");

    await rest("data_sources", "POST", [{
      id: SOURCE_ID,
      slug: "hsi-jamshedpur-cnvr-clinical-2013-2016",
      source_type: "research_dataset",
      source_name: "Jamshedpur CNVR clinical register",
      source_dataset: "HSI_DPM data/clinical.csv",
      organization_name: "Humane World for Animals / HSI",
      reporting_org_id: NGO_ID,
      source_url: SOURCE_URL,
      source_license: "Public clinical research data; dataset licence not stated in repository.",
      source_license_url: PAPER_URL,
      license_status: "pending",
      publication_status: "published",
      attribution_requirements: "Attribute Humane World for Animals / HSI and the linked Jamshedpur CNVR research record.",
      restrictions: "City-level map placement only; no individual coordinates or photos supplied.",
      importer_version: IMPORTER_VERSION,
      geographic_precision: "city",
      record_count: rows.length,
      published_record_count: rows.length,
      metadata: { paper_url: PAPER_URL, source_file: "data/clinical.csv", observed_years: "2013-2016", public_profile_label: "Record contributor" },
      validated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }], "?on_conflict=id");

    await rest("import_batches", "POST", [{
      id: BATCH_ID,
      ngo_id: NGO_ID,
      data_source_id: SOURCE_ID,
      source_filename: "clinical.csv",
      source_kind: "csv",
      source_storage_path: CSV_URL,
      mapping: { identity: "IDno", admitted_at: "date_in", discharged_at: "date_out", clinical_flags: ["distemper", "rabies", "venereal_cancer"] },
      preview: { source: SOURCE_URL, geographic_precision: "city", city: "Jamshedpur" },
      status: "reviewing",
      rows_total: rows.length,
      rows_imported: Math.min(start, rows.length),
      rows_needing_review: 0,
    }], "?on_conflict=id");

    const dogs: unknown[] = [];
    const cases: unknown[] = [];
    const medical: unknown[] = [];
    const timeline: unknown[] = [];
    for (const row of chunk) {
      const sourceId = row.IDno.trim();
      const dogId = stableUuid(`hsi-jamshedpur:dog:${sourceId}`);
      const caseId = stableUuid(`hsi-jamshedpur:case:${sourceId}`);
      const admitted = toDate(row.date_in) ?? toDate(row.date_out) ?? "2013-01-01";
      const discharged = toDate(row.date_out);
      const flags = [truthy(row.distemper) ? "distemper" : null, truthy(row.rabies) ? "rabies" : null, truthy(row.venereal_cancer) ? "venereal cancer" : null].filter(Boolean);
      const metadata = sourceMeta(sourceId, row);
      const sex = /^f/i.test(row.sex_age) ? "female" : /^m/i.test(row.sex_age) ? "male" : null;
      const adult = truthy(row.Adult) || /adult/i.test(row.sex_age);
      dogs.push({
        id: dogId, name: `Jamshedpur dog ${sourceId}`, code: `HSI-JAM-${sourceId}`, identifiers: `HSI clinical ID ${sourceId}`,
        species: "dog", sex, size: adult ? "medium" : "small", color: "Unknown", is_friendly: null,
        zone: "Jamshedpur (city-level)", city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand",
        lat: JSR_CENTER.lat, lng: JSR_CENTER.lng, location_precision: "approximate", geographic_precision: "city",
        status: "sterilised", sterilised: true, sterilisation_status: "sterilised", vaccinated: true, vaccination_status: "vaccinated",
        needs_help: false, trust_score: 80, sightings_count: 1, feed_count: 0,
        first_seen: `${admitted}T12:00:00.000Z`, last_seen: `${(discharged ?? admitted)}T12:00:00.000Z`, original_observed_at: `${admitted}T12:00:00.000Z`, observed_date_precision: "day",
        ngo_id: NGO_ID, data_source_id: SOURCE_ID, source_record_id: `clinical:${sourceId}`, import_batch_id: BATCH_ID,
        provenance: "imported_historical_record", importer_version: IMPORTER_VERSION, identity_state: "confirmed", source_metadata: { ...metadata, programme_protocol_inference: { sterilisation: true, rabies_vaccination: true } },
      });
      cases.push({
        id: caseId, dog_id: dogId, ngo_id: NGO_ID, title: "CNVR clinical care record", description: `Historical clinical admission to the Jamshedpur CNVR programme.${flags.length ? ` Recorded clinical flags: ${flags.join(", ")}.` : ""}`,
        zone: "Jamshedpur (city-level)", city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", lat: JSR_CENTER.lat, lng: JSR_CENTER.lng, location_precision: "approximate",
        severity: "low", category: "sterilisation", tags: ["CNVR", "historical record"], status: "resolved", resolution: "sterilized", stage: "closed", condition_text: flags.length ? flags.join(", ") : "CNVR clinical record", status_class: "closed", closure_reason: "other", intake_channel: "partner_org", resolved_at_source: "recorded", first_action_at: `${admitted}T12:00:00.000Z`, resolved_at: `${(discharged ?? admitted)}T12:00:00.000Z`, source_event_at: `${admitted}T12:00:00.000Z`, imported_at: new Date().toISOString(), import_batch_id: BATCH_ID,
        provenance: "imported_historical_record", verification_state: "source_record", source_metadata: metadata, is_demo: false,
      });
      medical.push({
        id: stableUuid(`hsi-jamshedpur:medical:cnvr:${sourceId}`), dog_id: dogId, case_id: caseId, kind: "sterilisation", event_date: admitted,
        notes: "Clinical CNVR programme record. Sterilisation and rabies vaccination are recorded as programme-protocol care; the CSV records admission/discharge rather than a separate procedure timestamp.",
        performed_by: "Humane World for Animals / HSI", import_batch_id: BATCH_ID,
        source_metadata: { ...metadata, event_evidence: "programme_protocol" }, is_demo: false,
      });
      timeline.push({
        id: stableUuid(`hsi-jamshedpur:timeline:admitted:${sourceId}`), ngo_id: NGO_ID, dog_id: dogId, case_id: caseId,
        event_type: "clinical_admission", title: "Admitted to CNVR clinical care", details: "Admission date recorded in the Jamshedpur clinical register.", occurred_at: `${admitted}T12:00:00.000Z`, actor_name: "Humane World for Animals / HSI", provenance: "imported_historical_record", source_ref: { ...metadata, derived_event_key: "admission" }, visibility: "public",
      });
      timeline.push({
        id: stableUuid(`hsi-jamshedpur:timeline:care:${sourceId}`), ngo_id: NGO_ID, dog_id: dogId, case_id: caseId,
        event_type: "cnvr_programme_care", title: "CNVR care programme recorded", details: "Programme protocol included sterilisation and rabies vaccination; this entry is clearly marked as programme-level protocol evidence.", occurred_at: `${admitted}T12:00:00.000Z`, actor_name: "Humane World for Animals / HSI", provenance: "imported_historical_record", source_ref: { ...metadata, derived_event_key: "cnvr-protocol", event_evidence: "programme_protocol" }, visibility: "public",
      });
      if (discharged) timeline.push({
        id: stableUuid(`hsi-jamshedpur:timeline:discharged:${sourceId}`), ngo_id: NGO_ID, dog_id: dogId, case_id: caseId,
        event_type: "clinical_discharge", title: "Discharged from clinical observation", details: "Discharge date recorded in the Jamshedpur clinical register.", occurred_at: `${discharged}T12:00:00.000Z`, actor_name: "Humane World for Animals / HSI", provenance: "imported_historical_record", source_ref: { ...metadata, derived_event_key: "discharge" }, visibility: "public",
      });
    }
    // Preserve foreign-key order while allowing independent care records to
    // write concurrently once the profiles and their cases exist.
    await upsertChunks("dogs", dogs);
    await upsertChunks("cases", cases);
    await Promise.all([upsertChunks("medical_events", medical), upsertChunks("animal_timeline_events", timeline)]);
    const complete = start + chunk.length >= rows.length;
    await rest("import_batches", "PATCH", {
      status: complete ? "imported" : "reviewing",
      rows_imported: Math.min(start + chunk.length, rows.length),
      ...(complete ? { completed_at: new Date().toISOString() } : {}),
    }, `?id=eq.${BATCH_ID}`);

    return Response.json({ ok: true, start, next_start: start + chunk.length, complete, imported: { dogs: dogs.length, cases: cases.length, medical_events: medical.length, timeline_events: timeline.length }, location_precision: "city" });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
