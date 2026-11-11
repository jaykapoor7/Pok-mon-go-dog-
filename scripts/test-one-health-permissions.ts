/* One Health permissions, proved against the STAGING demonstration.

   Signs in as the illustrative demo people and calls the same database
   functions the app calls, asserting who can and cannot do what. Read and
   refusal checks only; nothing is written. Refuses to run against anything
   but the staging project.

   STAGING_URL=https://<staging>.supabase.co STAGING_ANON_KEY=... DEMO_ONEHEALTH_PASSWORD=... \
     node --import tsx scripts/test-one-health-permissions.ts */

const url = process.env.STAGING_URL ?? "";
const anon = process.env.STAGING_ANON_KEY ?? "";
const pw = process.env.DEMO_ONEHEALTH_PASSWORD ?? "";
if (!url.includes("ucxfxiddufwqithtdtix") || !anon || !pw) { console.log("SKIP: set STAGING_URL (staging only), STAGING_ANON_KEY and DEMO_ONEHEALTH_PASSWORD"); process.exit(0); }

const BLR = "f0000000-0000-4000-8000-000000000002";
const HOSPITAL = "f1000000-0000-4000-8000-000000000004";
let failed = 0, n = 0;
const check = (name: string, ok: boolean, detail = "") => { n++; if (ok) console.log(`PASS ${n} ${name}`); else { failed++; console.log(`FAIL ${n} ${name} ${detail}`); } };

async function token(who: string): Promise<string> {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anon, "Content-Type": "application/json" }, body: JSON.stringify({ email: `demo-oh-${who}@straypaw.invalid`, password: pw }) });
  const j = (await r.json()) as { access_token?: string };
  if (!j.access_token) throw new Error(`could not sign in as ${who}`);
  return j.access_token;
}
async function rpc(tok: string, fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const text = await r.text();
  let body: unknown = null; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}
const refused = (r: { status: number }) => r.status >= 400;

async function main() {
  const [lead, nurse, field, other, analyst, clinician] = await Promise.all(["programme", "nurse", "field", "coimbatore", "analyst", "clinician"].map(token));

  /* The public */
  check("anonymous visitors cannot read programme alerts", refused(await rpc(anon, "oh_alerts", { p_programme: BLR })));
  const pub = await rpc(anon, "oh_public_services", { p_programme_slug: "bengaluru-demo" });
  const pubText = JSON.stringify(pub.body);
  check("the public finder answers anonymous visitors", pub.status === 200 && pubText.includes("facilities"));
  check("the public finder carries no patient or programme-internal data", !/patient|exposure|OPD-|active_courses|reminder/i.test(pubText));
  const tbl = await fetch(`${url}/rest/v1/exposures?select=*`, { headers: { apikey: anon, "Accept-Profile": "health" } });
  check("the health schema is not reachable through the API", tbl.status >= 400);

  /* Clinical authority */
  const reg = await rpc(clinician, "oh_clinic_register", { p_facility: HOSPITAL, p_filter: "all", p_limit: 1 });
  const exposureId = Array.isArray(reg.body) && reg.body[0] ? (reg.body[0] as { id: string }).id : null;
  check("a clinician reads their facility's register", reg.status === 200 && !!exposureId);
  check("a nurse cannot record an exposure category", refused(await rpc(nurse, "oh_set_category", { p_exposure: exposureId, p_category: "II" })));
  check("a nurse cannot prescribe", refused(await rpc(nurse, "oh_prescribe", { p_exposure: exposureId, p_regimen: "x", p_rig_given: false, p_due_dates: ["2030-01-01"] })));

  /* Patient data stays at the treating facility */
  check("an NGO cannot read a hospital's bite register", refused(await rpc(field, "oh_clinic_register", { p_facility: HOSPITAL, p_filter: "all", p_limit: 5 })));
  check("an NGO cannot open an exposure record", refused(await rpc(field, "oh_clinic_exposure", { p_exposure: exposureId })));
  check("the programme lead cannot open an individual exposure record", refused(await rpc(lead, "oh_clinic_exposure", { p_exposure: exposureId })));

  /* Aggregates and suppression */
  const ov = await rpc(lead, "oh_programme_overview", { p_programme: BLR, p_days: 90 });
  const byArea = ((ov.body as { exposures?: { by_area?: { n: unknown }[] } })?.exposures?.by_area ?? []).map((x) => x.n);
  check("the programme lead reads the overview", ov.status === 200);
  check("small human counts are suppressed, never shown exactly", byArea.every((v) => v === "<5" || v === 0 || (typeof v === "number" && v >= 5)), JSON.stringify(byArea));
  const rx = await rpc(analyst, "oh_research_extract", { p_programme: BLR, p_days: 365 });
  const rows = (rx.body as { rows?: Record<string, unknown>[] })?.rows ?? [];
  check("the research extract has rows", rx.status === 200 && rows.length > 0);
  check("research rows describe counts, never people", rows.every((r) => Object.keys(r).sort().join(",") === "area,category,exposures,species,week"));

  /* Programmes are isolated from each other */
  check("another city's lead cannot read this programme's overview", refused(await rpc(other, "oh_programme_overview", { p_programme: BLR, p_days: 90 })));
  check("another city's lead cannot read this programme's alerts", refused(await rpc(other, "oh_alerts", { p_programme: BLR })));
  check("another city's lead cannot read this programme's care network", refused(await rpc(other, "oh_programme_network", { p_programme: BLR })));

  /* Alerts follow the person's place */
  const la = await rpc(lead, "oh_alerts", { p_programme: BLR });
  const na = await rpc(nurse, "oh_alerts", { p_programme: BLR });
  const leadKinds = new Set((la.body as { organisation_id: string | null }[]).map((a) => a.organisation_id));
  const nurseOrgs = new Set((na.body as { organisation_id: string | null; kind: string }[]).filter((a) => a.kind !== "positive_result").map((a) => a.organisation_id));
  check("the programme lead sees alerts across facilities", leadKinds.size > 2);
  check("a nurse sees alerts for her own facility only (and confirmed cases)", [...nurseOrgs].every((o) => o === HOSPITAL), JSON.stringify([...nurseOrgs]));

  console.log(`\n${n - failed}/${n} One Health permission checks passed against staging.`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
