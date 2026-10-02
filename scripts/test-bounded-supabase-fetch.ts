import assert from "node:assert/strict";
import { createBoundedSupabaseFetch } from "../src/lib/bounded-supabase-fetch";

async function main() {
  const base = "https://example.supabase.co/rest/v1/";
  const retry = async (path: string, method = "GET") => {
    let calls = 0;
    const request = (async () => ++calls === 1 ? new Response("unavailable", { status: 503 }) : new Response("[]")) as typeof fetch;
    const response = await createBoundedSupabaseFetch({ request, retryDelayMs: 0 })(base + path, { method });
    return { calls, status: response.status };
  };
  assert.deepEqual(await retry("dogs?limit=10"), { calls: 2, status: 200 });
  assert.deepEqual(await retry("rpc/list_public_spatial_cities", "POST"), { calls: 2, status: 200 });
  for (const path of ["dogs", "rpc/create_org_case_with_location", "rpc/import_partner_row", "rpc/log_seen"])
    assert.deepEqual(await retry(path, "POST"), { calls: 1, status: 503 }, `Never replay ${path}`);
  assert.deepEqual(await retry("dogs", "PATCH"), { calls: 1, status: 503 });
  console.log("Bounded read retries and non-replayed writes passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
