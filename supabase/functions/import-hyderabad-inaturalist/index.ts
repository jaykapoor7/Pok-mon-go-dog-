// @ts-nocheck
// Standalone Deno edge function kept alongside the Next.js app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NGO_ID = "c683aa60-7340-5bd0-bc1f-b349fee19201";
const SOURCE_ID = "b4e4a3f3-d312-5b5b-bd73-f9c5963d9201";
const BATCH_ID = "d5ae3279-2b02-5f66-98f8-5013d1a79201";
const CITY = { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.487 };
const LICENSES = new Set(["cc0", "cc-by", "cc-by-sa"]);
const IMPORTER_VERSION = "hyderabad-inaturalist-v1";
const API_URL = "https://api.inaturalist.org/v2/observations?taxon_id=47144&lat=17.3850&lng=78.4867&radius=35&photos=true&photo_license=cc0%2Ccc-by%2Ccc-by-sa&per_page=200&order_by=observed_on&order=desc&fields=id,captive,observed_on,time_observed_at,geojson,photos.url,photos.license_code,photos.attribution";

function uuid(input: string) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xc0decafe, h4 = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761); h2 = Math.imul(h2 ^ code, 1597334677);
    h3 = Math.imul(h3 ^ code, 974711); h4 = Math.imul(h4 ^ code, 2246822519);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1].map((part) => (part >>> 0).toString(16).padStart(8, "0")).join("");
  const versioned = `${hex.slice(0, 12)}5${hex.slice(13, 16)}${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20)}`;
}

async function rest(table: string, method: "POST" | "PATCH", body: unknown, suffix = "") {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${table}${suffix}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
}

Deno.serve(async () => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`iNaturalist API returned ${response.status}.`);
    const payload = await response.json();
    const observations = (payload.results ?? []).map((observation: any) => {
      const photo = (observation.photos ?? []).find((item: any) => LICENSES.has(String(item.license_code ?? "").toLowerCase()));
      const coordinates = observation.geojson?.coordinates;
      return { observation, photo, coordinates };
    }).filter((item: any) => !item.observation.captive && item.photo && Array.isArray(item.coordinates) && item.coordinates.length === 2)
      .slice(0, 49);
    if (observations.length < 1) throw new Error("No usable Creative Commons Hyderabad dog observations were returned.");

    await rest("ngos", "POST", [{
      id: NGO_ID, name: "iNaturalist contributors", slug: "inaturalist-hyderabad-contributors", area: "Hyderabad", city: CITY.name, state: CITY.state,
      about: "Record contributor for licensed public Hyderabad dog observations.", partner_status: "record_contributor", verified: false,
      dogs_helped: observations.length, config: { public_directory_label: "Record contributor", data_only_relationship: true },
    }], "?on_conflict=id");
    await rest("data_sources", "POST", [{
      id: SOURCE_ID, slug: "inaturalist-hyderabad-dogs-cc", source_type: "public_api", source_name: "Licensed Hyderabad dog observations", source_dataset: "iNaturalist v2 observations API", organization_name: "iNaturalist contributors", reporting_org_id: NGO_ID,
      source_url: "https://www.inaturalist.org/observations?taxon_id=47144", source_license: "Individual image licences verified per observation (CC0, CC BY or CC BY-SA).", source_license_url: "https://www.inaturalist.org/api", license_status: "verified", publication_status: "published",
      attribution_requirements: "Display the photo attribution and link to the individual iNaturalist observation.", restrictions: "No care history is inferred from wildlife observations. Locations are stored and displayed approximately.", importer_version: IMPORTER_VERSION, geographic_precision: "approximate", record_count: observations.length, published_record_count: observations.length,
      metadata: { taxon_id: 47144, city: CITY.name, radius_km: 35, photo_licenses: [...LICENSES] }, validated_at: new Date().toISOString(), published_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }], "?on_conflict=id");
    await rest("import_batches", "POST", [{
      id: BATCH_ID, ngo_id: NGO_ID, data_source_id: SOURCE_ID, source_filename: "iNaturalist Hyderabad observations", source_kind: "csv", source_storage_path: API_URL,
      mapping: { identity: "iNaturalist observation id", photo: "licensed observation photo", observed_at: "observed_on" }, preview: { city: CITY.name, location_precision: "approximate", photo_licensed: true },
      status: "reviewing", rows_total: observations.length, rows_imported: 0, rows_needing_review: 0,
    }], "?on_conflict=id");

    const dogs = observations.map(({ observation, photo, coordinates }: any) => {
      const [rawLng, rawLat] = coordinates;
      const lat = Math.round(Number(rawLat) * 1000) / 1000;
      const lng = Math.round(Number(rawLng) * 1000) / 1000;
      const observedAt = observation.time_observed_at ?? observation.observed_on ?? new Date().toISOString();
      const sourceUrl = `https://www.inaturalist.org/observations/${observation.id}`;
      const attribution = photo.attribution ?? `iNaturalist observation ${observation.id} (${String(photo.license_code).toUpperCase()})`;
      return {
        id: uuid(`inaturalist:hyderabad:dog:${observation.id}`), name: `Hyderabad dog ${observation.id}`, code: `INAT-HYD-${observation.id}`, identifiers: `iNaturalist observation ${observation.id}`,
        species: "dog", zone: "Hyderabad (approximate observation)", city: CITY.name, state: CITY.state, district: "Hyderabad", lat, lng, location_precision: "approximate", geographic_precision: "approximate",
        status: "seen", cover_photo: photo.url, external_image_url: photo.url, size: "medium", color: "Unknown", is_friendly: null, needs_help: false, sterilised: false, vaccinated: false, sterilisation_status: "unknown", vaccination_status: "unknown", trust_score: 80, sightings_count: 1, feed_count: 0,
        first_seen: observedAt, last_seen: observedAt, original_observed_at: observedAt, observed_date_precision: "day", ngo_id: NGO_ID, data_source_id: SOURCE_ID, source_record_id: `observation:${observation.id}`, import_batch_id: BATCH_ID,
        provenance: "imported_historical_record", importer_version: IMPORTER_VERSION, identity_state: "confirmed",
        source_metadata: { data_source_id: SOURCE_ID, import_batch_id: BATCH_ID, source_record_id: String(observation.id), source_url: sourceUrl, source_platform: "iNaturalist", photo_attribution: attribution, photo_source_url: sourceUrl, photo_license: photo.license_code, location_note: "Observation coordinates rounded before storage; public map applies a coarser display rounding.", care_history: "None supplied by the observation source." },
      };
    });
    await rest("dogs", "POST", dogs, "?on_conflict=id");
    await rest("import_batches", "PATCH", { status: "imported", rows_imported: dogs.length, completed_at: new Date().toISOString() }, `?id=eq.${BATCH_ID}`);
    return Response.json({ ok: true, imported_profiles: dogs.length, city: CITY.name, care_histories_imported: 0 });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
