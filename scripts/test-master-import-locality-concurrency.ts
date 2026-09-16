import assert from "node:assert/strict";
import { assessLocalities, LOCALITY_GEOCODE_CONCURRENCY } from "../src/lib/master-import/commit";

const cached = new Set(["area 1, coimbatore, tamil nadu, india", "area 2, coimbatore, tamil nadu, india", "area 3, coimbatore, tamil nadu, india"]);
class CacheQuery {
  key = "";
  select() { return this; }
  eq(_column: string, value: string) { this.key = value; return this; }
  maybeSingle() { return Promise.resolve({ data: cached.has(this.key) ? { lat: 11.01, lng: 76.96, precision: "approximate" } : null, error: null }); }
  upsert(value: { normalized_query: string }) { cached.add(value.normalized_query); return Promise.resolve({ error: null }); }
}

async function main() {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let active = 0, peak = 0, requests = 0;
  globalThis.fetch = (async () => {
    requests++; active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return { json: async () => ({ features: [{ center: [76.96, 11.01] }] }) } as Response;
  }) as typeof fetch;
  try {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      source_sheet: "Rescue Requests 2025", source_row: index + 2, classification: "rescue" as const, classification_reason: "test",
      event_date: "2025-01-01T00:00:00.000Z", locality: `Area ${index + 1}`, city: "Coimbatore", animal_name: null, animal_code: null,
      sex: null, colour: null, condition: "Injury", status: null, case_detail: "Needs help", treatment_update: null,
      review: null, rescue_plan: null, admit_date: null, release_date: null, fingerprint: `row-${index + 1}`,
    }));
    const status = await assessLocalities({ from: () => new CacheQuery() }, rows, { city: "Coimbatore", state: "Tamil Nadu" });
    assert.deepEqual(status, { recordsFound: 12, successfullyGeocoded: 12, unresolved: 0, geocoderConfigured: true, requiredEnv: null });
    assert.equal(requests, 9, "cached localities must not call Mapbox");
    assert.ok(peak <= LOCALITY_GEOCODE_CONCURRENCY, "Mapbox requests must stay within the configured concurrency cap");
    assert.ok(peak > 1, "cache misses should run concurrently");
    console.log(`Master import locality concurrency passed: ${requests} cache misses, peak ${peak}/${LOCALITY_GEOCODE_CONCURRENCY}.`);
  } finally { globalThis.fetch = originalFetch; }
}

void main();
