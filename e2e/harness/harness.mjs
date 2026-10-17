/* LOCAL QA ONLY. Fakes a signed-in NGO member and answers Supabase calls
   with clearly synthetic records ("TEST" codes). Any write is answered
   locally and never reaches the real database; any non-GET request that
   is not mocked is blocked. Public GET reads pass through to the real
   public projection. Never committed to the app. */
import { latLngToCell } from "h3-js";

const REF = "toujthlzjmhmoyykmayx";
const now = Date.now(), D = 86400000;
const iso = (d) => new Date(now - d * D).toISOString();
const ORG = { id: "00000000-0000-4000-8000-0000000000aa", name: "Test Organisation (synthetic)", city: "Coimbatore" };
const ME = { id: "00000000-0000-4000-8000-0000000000u1", name: "Asha (test)", email: "asha.test@example.org" };
const MEMBERS = [{ user_id: ME.id, role: "admin", name: ME.name }, { user_id: "u2", role: "member", name: "Ravi (test)" }, { user_id: "u3", role: "member", name: "Meena (test)" }];
const CONDS = ["Road accident", "Maggot wound", "Skin & mange", "Minor injury", "Eye condition", "Dog bite", "Tumour", "Parvo", "Abandonment", "Sterilisation (ABC)"];
const ZONES = ["Ganapathy", "RS Puram", "Saibaba Colony", "Peelamedu", "Singanallur", "Kuniyamuthur", "Vadavalli", "Ondipudur", "Podanur", "Gandhipuram"];
const pts = [[11.03, 76.96], [11.006, 76.95], [11.02, 76.94], [11.03, 77.0], [10.998, 77.03], [10.96, 76.95], [11.03, 76.9], [11.0, 77.03], [10.96, 76.98], [11.017, 76.97]];
const cases = Array.from({ length: 34 }, (_, i) => {
  const z = i % 10, hist = i >= 28, stale = i >= 23 && i < 28;
  const occ = hist ? 900 + i * 10 : stale ? 140 + i : 1 + (i * 3) % 40;
  return {
    id: `00000000-0000-4000-8000-${String(1000 + i).padStart(12, "0")}`, case_code: `TEST-${String(240 + i)}`, title: `${CONDS[i % CONDS.length]} reported`,
    condition_class: CONDS[i % CONDS.length], status_class: i % 4 === 1 ? "in_progress" : "open", occurred_at: iso(occ), last_activity_at: stale || hist ? iso(occ - 2) : iso(Math.max(0, occ - 1)),
    severity: "normal", assignee_name: i % 3 === 0 ? (i % 2 ? ME.name : null) : MEMBERS[i % 3].name, animal_name: i % 5 === 0 ? null : `Test dog ${i}`, dog_id: i % 5 === 0 ? null : `00000000-0000-4000-9000-${String(2000 + i).padStart(12, "0")}`,
    zone: ZONES[z], city: "Coimbatore", h3_r8: i % 9 === 4 ? null : latLngToCell(pts[z][0], pts[z][1], 8), next_due: null, followups_missed: 0,
    provenance: hist ? "imported_historical_record" : null, reviewed_at: null,
  };
});
const followups = [
  { id: "f1", case_id: cases[3].id, dog_id: cases[3].dog_id, assignee_name: ME.name, due_at: iso(3), status: "upcoming", kind: "wound_recheck", note: "Check dressing", import_batch_id: null, import_source_key: null },
  { id: "f2", case_id: cases[2].id, dog_id: cases[2].dog_id, due_at: iso(1), status: "upcoming", kind: "second_dose", note: null, import_batch_id: null, import_source_key: null },
  { id: "f3", case_id: cases[7].id, dog_id: cases[7].dog_id, due_at: iso(-2), status: "upcoming", kind: "recheck", note: "Weekly recheck", import_batch_id: null, import_source_key: null },
];
const cells = Object.values(cases.reduce((m, c) => { if (!c.h3_r8) return m; const x = m[c.h3_r8] ??= { city: "Coimbatore", h3_r8: c.h3_r8, open_cases: 0, stale_cases: 0, historical_cases: 0, critical_cases: 0 }; if (c.provenance) x.historical_cases++; else { x.open_cases++; if (Date.now() - Date.parse(c.occurred_at) > 90 * D) x.stale_cases++; if (["Road accident", "Maggot wound", "Dog bite"].includes(c.condition_class)) x.critical_cases++; } return m; }, {}));

const animals = cases.filter((c) => c.dog_id).map((c, i) => ({ id: c.dog_id, straypaw_id: `TST${c.case_code.slice(-3)}`, name: c.animal_name, code: `CBE-${100 + i}`, species: "dog", zone: c.zone, city: "Coimbatore", cover_photo: null, status: "active", assignee_name: c.assignee_name, sterilisation_status: ["sterilised", "not_sterilised", "unknown"][i % 3], vaccination_status: ["vaccinated", "unknown", "not_vaccinated"][i % 3], needs_help: i % 7 === 2, sightings_count: i % 4, lat: 11.0, lng: 76.96, created_at: iso(200 - i), last_seen: iso(i * 2), recorded_by: MEMBERS[i % 3].name, total_count: 27, ngo_id: ORG.id, provenance: c.provenance, first_seen: iso(200 - i), sterilised: i % 3 === 0, vaccinated: i % 3 === 0, intake_notes: i % 2 ? "Found near the market; shy but approachable." : null, owner_name: null }));
const incoming = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, photo_url: null, zone: ZONES[(i * 3) % 10], lat: i % 2 ? 11.0 + i / 100 : null, lng: i % 2 ? 76.96 : null, nickname: i % 3 === 0 ? `Test ${["Kaalu", "Bholu", "Rani"][i / 3]}` : null, notes: i % 2 ? "Limping near the bus stop since morning (synthetic)." : null, mood_tags: [["injured"], ["friendly"], ["scared", "puppy"], ["sick"], []][i % 5], sterilisation_status: ["sterilised", "unknown", "not_sterilised"][i % 3], vaccination_status: "unknown", reported_by: i % 2 ? "Resident (test)" : "Ravi (test)", status: "pending", created_at: iso(i / 2), total_count: 9 }));
const drives = [{ id: "c1", name: "Ganapathy ABC drive (test)", kind: "sterilisation", starts_on: iso(60).slice(0, 10), ends_on: null, zone: "Ganapathy", archived: false, observations: 140, people: 6, total: 118, sterilised: 71, not_sterilised: 22, ster_unknown: 25, vaccinated: 64, not_vaccinated: 10, vacc_unknown: 44, needs_help: 4, ster_pct_of_known: 76, ster_pct_of_all: 60, vacc_pct_of_known: 86, vacc_pct_of_all: 54 }, { id: "c2", name: "RS Puram census (test)", kind: "census", starts_on: iso(20).slice(0, 10), ends_on: iso(5).slice(0, 10), zone: "RS Puram", archived: false, observations: 52, people: 3, total: 47, sterilised: 9, not_sterilised: 8, ster_unknown: 30, vaccinated: 3, not_vaccinated: 2, vacc_unknown: 42, needs_help: 1, ster_pct_of_known: 53, ster_pct_of_all: 19, vacc_pct_of_known: 60, vacc_pct_of_all: 6 }];
const json = (route, body, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", ...headers }, body: JSON.stringify(body) });

export async function asMember(context) {
  const session = { access_token: "test.test.test", refresh_token: "test", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, user: { id: ME.id, email: ME.email, user_metadata: { name: ME.name, display_name: ME.name }, app_metadata: {}, aud: "authenticated", role: "authenticated" } };
  await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); localStorage.setItem("straypaw.tour.v2", "1"); } catch {} }, [`sb-${REF}-auth-token`, JSON.stringify(session)]);
  const writes = [];
  await context.route(`https://${REF}.supabase.co/**`, async (route) => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname, m = req.method();
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/user")) return json(route, session.user);
    if (p.startsWith("/rest/v1/rpc/")) {
      const fn = p.split("/").pop();
      const R = { is_ngo_member: true, my_ngo: ORG.id, my_org_members: MEMBERS, org_followup_scope_counts: { scheduled_overdue: 2, scheduled_due_week: 1, historical_upcoming: 0 },
        list_org_open_work_cells_v2: cells, org_historical_review_queue: cases.filter((c) => c.provenance),
        org_animals: animals, org_zones: ZONES.map((z, i) => ({ zone: z, n: 3 + i })), add_medical_event: "me-new", ngo_set_dog_care: true, create_case_with_location: cases[3].id, org_incoming: incoming, org_programme_breakdown: { overall: { ...drives[0], total: 165, sterilised: 80, not_sterilised: 30, ster_unknown: 55, vaccinated: 67, not_vaccinated: 12, vacc_unknown: 86 }, drives, unfiled: { animals: 412, sterilised: 0, not_sterilised: 0, ster_unknown: 412 }, waiting: { ours: 9, community: 9 } }, org_team_codes: [{ id: "tc1", kind: "staff", person_name: "Divya (test)", email: "divya.test@example.org", role: "member", code: "TST-7K2Q", active: true, accepted: false, reports: 0, created_at: iso(3) }, { id: "tc2", kind: "volunteer", person_name: "College club (test)", email: null, role: "volunteer", code: "TST-VOL9", active: true, accepted: true, reports: 31, created_at: iso(40) }], set_member_role: true, ngo_update_profile: { ok: true }, remove_org_member: true, org_campaigns: drives, campaign_stats: drives[0], campaign_animals: [], file_sightings_to_campaign: { filed: 2, registered: 1 }, create_campaign: "c-new", archive_campaign: null, take_case: true, assign_case: null, update_case_status: { ok: true }, add_case_note: null, update_case_followup_status: true, add_case_followup: "fu-new", review_case: { ok: true, status_class: "closed" },
        my_org_feeding_zones: [
          { id: "fz1", name: "Market corner, east gate (test)", description: "About 8 dogs, fed at 7 pm", zone: "RS Puram", lat: 11.0089, lng: 76.9515, photo_url: null, last_fed_at: iso(1), created_at: iso(60), volunteer_count: 3 },
          { id: "fz2", name: "Bus depot wall (test)", description: null, zone: "Ganapathy", lat: 11.0386, lng: 76.9787, photo_url: null, last_fed_at: iso(12), created_at: iso(120), volunteer_count: 1 },
          { id: "fz3", name: "School lane (test)", description: "Puppies seen in March", zone: "Peelamedu", lat: 11.0262, lng: 77.0066, photo_url: null, last_fed_at: null, created_at: iso(5), volunteer_count: 0 },
        ],
        org_volunteers: [
          { id: "v1", name: "Asha (test)", contact: "asha.test@example.org", zone: "RS Puram", message: "Weekends, can drive.", created_at: iso(2) },
          { id: "v2", name: "Karthik (test)", contact: "+91 90000 00000", zone: "Saibaba Colony", message: null, created_at: iso(9) },
        ] };
      if (["take_case", "assign_case", "update_case_status", "add_case_note", "update_case_followup_status", "add_case_followup", "review_case", "add_medical_event", "ngo_set_dog_care", "create_case_with_location", "file_sightings_to_campaign", "create_campaign", "archive_campaign", "set_member_role", "add_org_member", "remove_org_member", "ngo_update_profile", "create_org_feeding_zone"].includes(fn)) writes.push({ fn, body: req.postData() });
      if (fn in R) return json(route, R[fn], 200, fn === "org_historical_review_queue" ? { "content-range": `0-4/${cases.filter((c) => c.provenance).length}` } : {});
      /* Nothing unmocked ever reaches the real project, not even a read. */
      return route.fulfill({ status: m === "GET" ? 503 : 403, body: JSON.stringify({ message: "not answered by the local harness" }), contentType: "application/json" });
    }
    const table = p.replace("/rest/v1/", "");
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const idEq = url.searchParams.get("id")?.replace(/^eq\./, "");
    if (m === "HEAD" || url.searchParams.get("select") === "id" && req.headers()["prefer"]?.includes("count")) {
      return route.fulfill({ status: 200, headers: { "content-range": `*/${table === "org_case_facts" ? 12 : 0}`, "access-control-expose-headers": "content-range" }, body: "" });
    }
    if (table === "ngos") { const o = { ...ORG, verified: true, slug: "test", mission: "Street dogs in Coimbatore get care where they live (synthetic).", about: "A synthetic organisation for local QA.", areas_of_work: ["Rescue", "ABC"], state: "Tamil Nadu", website: "https://example.org" }; return json(route, single ? o : [o]); }
    if (table === "org_case_facts") { const did = url.searchParams.get("dog_id")?.replace(/^eq\./, ""); const rows = idEq ? cases.filter((c) => c.id === idEq) : did ? cases.filter((c) => c.dog_id === did) : cases; return json(route, single ? { ...rows[0], cover_photo: null, straypaw_id: "TEST01" } : rows); }
    if (table === "animal_followups") { const cid = url.searchParams.get("case_id")?.replace(/^eq\./, ""); return json(route, cid ? followups.filter((f) => f.case_id === cid).map((f) => ({ ...f, completed_at: null })) : followups); }
    if (table === "dogs" && idEq) { const a = animals.find((x) => x.id === idEq); return json(route, single ? a ?? null : a ? [a] : []); }
    if (table === "animal_timeline_events") return json(route, [{ id: "t1", event_type: "case_opened", title: "Request opened: Maggot wound", details: "From a web report", occurred_at: iso(20), provenance: "field_record", source_ref: {} }, { id: "t2", event_type: "care", title: "Vaccinated", details: null, occurred_at: iso(12), provenance: "field_record", source_ref: { medical_event_id: "m1" } }]);
    if (table === "medical_events") return json(route, [{ id: "m1", dog_id: idEq, case_id: null, kind: "vaccination", event_date: iso(12).slice(0, 10), notes: "Anti-rabies, batch noted on paper card", performed_by: "Test clinic", created_at: iso(12) }]);
    if (table === "dogs") return json(route, cases.filter((c) => c.dog_id).map((c) => ({ id: c.dog_id, name: c.animal_name, straypaw_id: `TST${c.case_code.slice(-3)}`, zone: c.zone, city: c.city, provenance: c.provenance })));
    if (table === "cases") { const c = cases.find((x) => x.id === idEq) ?? cases[0]; return json(route, { ...c, description: "Synthetic test case for local QA.", lat: null, lng: null, category: "injury", tags: [], status: c.status_class === "in_progress" ? "in_progress" : c.assignee_name ? "assigned" : "unverified", resolution: null, assignee_id: c.assignee_name === ME.name ? ME.id : c.assignee_name ? "u2" : null, ngo_id: ORG.id, created_by_id: null, created_by_name: "Test reporter", created_at: c.occurred_at, updated_at: c.last_activity_at, due_at: null, resolved_at: null, before_url: null, after_url: null, outcome_note: null, proof_verified: false, verified_at: null, cost_estimate: null, cost_spent: null, informer_contact: null, species: "dog", follow_up_at: null, medical_notes: null, photos: [], stage: null, condition_text: "Synthetic description of the animal's condition.", hospital: null, next_action: null, location_precision: "approximate_locality", closure_reason: null, intake_channel: "web_report", first_action_at: null, resolved_at_source: null, status_reviewed_at: null, source_event_at: c.occurred_at }); }
    if (table === "case_updates") return json(route, [{ id: "u1", case_id: idEq, actor_id: "u2", actor_name: "Ravi (test)", type: "note", from_status: null, to_status: null, note: "Visited, animal not found at first; neighbours say it returns at night.", created_at: iso(1) }, { id: "u0", case_id: idEq, actor_id: null, actor_name: "Web report", type: "created", from_status: null, to_status: "unverified", note: null, created_at: iso(4) }]);
    if (table === "medical_events") return json(route, []);
    return route.fulfill({ status: m === "GET" ? 503 : 403, body: JSON.stringify({ message: "not answered by the local harness" }), contentType: "application/json" });
  });
  /* Import and exports: answered locally, never sent to the real service. */
  await context.route("**/api/partner/**", async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (u.pathname.endsWith("/import")) {
      const body = req.postData() ?? "";
      writes.push({ fn: "import:" + (body.includes('name="action"\r\n\r\ncommit') ? "commit" : "preview"), body: "" });
      if (body.includes("commit")) return json(route, { batchId: "b0000000-test", imported: 31, review: 9, failed: 0, sourceStored: true });
      const headers = ["Dog ID", "Name", "Location", "City", "Injury", "Status", "Date", "Review date"];
      const sample = Array.from({ length: 8 }, (_, i) => ({ sourceRowNumber: i + 2, raw: {}, normalized: { name: ["Kaalu", "Bholu", "Rani", "Tiger", "", "Moti", "Lucky", "Sheru"][i], animalCode: `CBE-${100 + i}`, location: ZONES[i], city: "Coimbatore", condition: CONDS[i], status: i % 3 ? "Open" : "Completed", sex: i % 2 ? "Male" : "Female", colour: "Brown" } }));
      return json(route, { sheetName: "Rescue 2024", sheetNames: ["Rescue 2024", "TVT", "Salary"], sheetProfiles: [{ name: "Rescue 2024", rows: 40, headers, kind: "rescue", label: "Rescue / case register", confidence: "medium", reason: "Rescue, intake or condition fields detected." }, { name: "TVT", rows: 12, headers, kind: "care", label: "Care / medical", confidence: "high", reason: "Treatment fields detected." }, { name: "Salary", rows: 6, headers: ["Name", "Amount"], kind: "administrative", label: "Administrative / private", confidence: "high", reason: "Staff, salary or rent sheet; keep outside animal records." }], headers, rows: [], mapping: { name: "Name", animalCode: "Dog ID", location: "Location", city: "City", condition: "Injury", status: "Status", date: "Date", reviewDate: "Review date" }, sample, matches: { 2: [{ id: animals[0].id, label: "CBE-100 · Kaalu · Ganapathy", reasons: ["same legacy ID", "same name"] }] } });
    }
    writes.push({ fn: "export:" + u.pathname.split("/").pop(), body: u.search });
    return route.fulfill({ status: 200, contentType: "text/csv", body: "synthetic,test\n1,2\n" });
  });
  /* The org map: answer with the public projection, never the real org read. */
  await context.route("**/api/livingmap*", async (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("scope") !== "org") return route.continue();
    u.searchParams.delete("scope");
    const r = await route.fetch({ url: u.toString(), headers: {} });
    return route.fulfill({ response: r });
  });
  return { writes, ME, ORG };
}
