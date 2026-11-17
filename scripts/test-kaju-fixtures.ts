/* A record store double for Kaju's tests: tables and database functions answered from rows in memory, with the filters
   the engine uses (eq, ilike, or, in, limit …) applied the way PostgREST applies them. It has no row-level security of
   its own: a row is returned only when the engine's own filters select it, so a test that puts another organisation's
   rows beside the caller's shows whether the engine names the organisation on every read.

   Fake data only. Used by scripts/test-kaju-capture.ts and by the differential run of the old and new engines. */
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
export type Res = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };
export type RpcFn = (args: Record<string, unknown>) => Res | Promise<Res>;
export type Log = { tables: string[]; rpcs: { name: string; args: Record<string, unknown> }[]; writes: { table: string; op: string; rows: Row[] }[] };

const like = (pattern: string) => new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, "is");
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
/** "name.ilike.tiger,code.ilike.%132" → its parts, keeping commas inside parentheses. */
function orParts(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = "";
  for (const ch of s) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch; }
  if (cur) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
function test(row: Row, col: string, op: string, val: unknown): boolean {
  const v = row[col];
  switch (op) {
    case "eq": return str(v) === str(val);
    case "neq": return str(v) !== str(val);
    case "ilike": return v !== null && v !== undefined && like(String(val)).test(String(v));
    case "like": return v !== null && v !== undefined && new RegExp(like(String(val)).source, "s").test(String(v));
    case "in": { const list = Array.isArray(val) ? val.map(str) : String(val).replace(/^\(|\)$/g, "").split(",").map((x) => x.trim()); return list.includes(str(v)); }
    case "is": return val === null || val === "null" ? v === null || v === undefined : str(v) === str(val);
    case "lt": return v !== null && v !== undefined && String(v) < String(val);
    case "lte": return v !== null && v !== undefined && String(v) <= String(val);
    case "gt": return v !== null && v !== undefined && String(v) > String(val);
    case "gte": return v !== null && v !== undefined && String(v) >= String(val);
    default: return true;
  }
}
function orTest(row: Row, expr: string): boolean {
  return orParts(expr).some((part) => {
    const m = part.match(/^([a-z_]+)\.(not\.)?([a-z]+)\.(.*)$/i);
    if (!m) return false;
    const r = test(row, m[1], m[3], m[3] === "in" ? m[4] : m[4]);
    return m[2] ? !r : r;
  });
}

export function fakeDb(tables: Record<string, Row[]>, rpcs: Record<string, RpcFn> = {}, opts: { fail?: Set<string>; unique?: Record<string, string[]> } = {}) {
  const log: Log = { tables: [], rpcs: [], writes: [] };
  const fail = opts.fail ?? new Set<string>();
  const builder = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let limit = Infinity, op: "select" | "insert" | "upsert" | "update" | "delete" = "select", payload: Row[] = [], patch: Row = {}, countHead = false, selected = false, single: "maybe" | "one" | null = null;
    let order: { col: string; asc: boolean } | null = null;
    const run = (): Res => {
      if (fail.has(table)) return { data: null, error: { message: `${table} unavailable` } };
      const rows = (tables[table] ??= []);
      if (op === "insert" || op === "upsert") {
        log.writes.push({ table, op, rows: payload });
        for (const r of payload) {
          const keys = opts.unique?.[table] ?? ["id"];
          if (rows.some((x) => keys.every((k) => x[k] !== undefined && x[k] === r[k]))) {
            if (op === "upsert") continue;
            return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
          }
          rows.push({ created_at: "2026-11-17T06:00:00.000Z", state: "open", ...r });
        }
        return { data: selected ? payload : null, error: null };
      }
      let hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") { log.writes.push({ table, op, rows: hit.map((r) => ({ id: r.id, ...patch })) }); hit.forEach((r) => Object.assign(r, patch)); return { data: selected ? hit : null, error: null }; }
      if (op === "delete") { log.writes.push({ table, op, rows: hit }); tables[table] = rows.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
      if (order) { const { col, asc } = order; hit = [...hit].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1)); }
      const count = hit.length;
      hit = hit.slice(0, limit);
      if (countHead) return { data: null, error: null, count };
      if (single) { if (hit.length > 1 && single === "one") return { data: null, error: { message: "more than one row" } }; return { data: hit[0] ?? null, error: single === "one" && !hit[0] ? { message: "no rows" } : null, count }; }
      return { data: hit.map((r) => ({ ...r })), error: null, count };
    };
    const q: Record<string, unknown> = {
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => { selected = true; if (o?.head) countHead = true; return q; },
      insert: (r: Row | Row[]) => { op = "insert"; payload = Array.isArray(r) ? r : [r]; return q; },
      upsert: (r: Row | Row[]) => { op = "upsert"; payload = Array.isArray(r) ? r : [r]; return q; },
      update: (p: Row) => { op = "update"; patch = p; return q; },
      delete: () => { op = "delete"; return q; },
      eq: (c: string, v: unknown) => { filters.push((r) => test(r, c, "eq", v)); return q; },
      neq: (c: string, v: unknown) => { filters.push((r) => test(r, c, "neq", v)); return q; },
      ilike: (c: string, v: unknown) => { filters.push((r) => test(r, c, "ilike", v)); return q; },
      like: (c: string, v: unknown) => { filters.push((r) => test(r, c, "like", v)); return q; },
      in: (c: string, v: unknown) => { filters.push((r) => test(r, c, "in", v)); return q; },
      is: (c: string, v: unknown) => { filters.push((r) => test(r, c, "is", v)); return q; },
      lt: (c: string, v: unknown) => { filters.push((r) => test(r, c, "lt", v)); return q; },
      lte: (c: string, v: unknown) => { filters.push((r) => test(r, c, "lte", v)); return q; },
      gt: (c: string, v: unknown) => { filters.push((r) => test(r, c, "gt", v)); return q; },
      gte: (c: string, v: unknown) => { filters.push((r) => test(r, c, "gte", v)); return q; },
      not: (c: string, o: string, v: unknown) => { filters.push((r) => !test(r, c, o, v)); return q; },
      or: (expr: string) => { filters.push((r) => orTest(r, expr)); return q; },
      contains: () => q, overlaps: () => q, textSearch: () => q, match: (m: Row) => { for (const [k, v] of Object.entries(m)) filters.push((r) => test(r, k, "eq", v)); return q; },
      order: (col: string, o?: { ascending?: boolean }) => { if (!order) order = { col, asc: o?.ascending !== false }; return q; },
      limit: (n: number) => { limit = n; return q; },
      range: (a: number, b: number) => { limit = b - a + 1; return q; },
      maybeSingle: async () => { single = "maybe"; return run(); },
      single: async () => { single = "one"; return run(); },
      abortSignal: () => q,
      then: (res: (r: Res) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve().then(run).then(res, rej),
    };
    return q;
  };
  const store = {
    from: (table: string) => { log.tables.push(table); return builder(table); },
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      log.rpcs.push({ name, args });
      if (fail.has(name)) return { data: null, error: { message: `${name} unavailable` } };
      const f = rpcs[name];
      return f ? await f(args) : { data: null, error: { message: `no function ${name}` } };
    },
    schema: () => store,
    auth: { getSession: async () => ({ data: { session: null } }) },
  };
  return { db: store as unknown as SupabaseClient, log, tables };
}

/* ── one sample world: two NGOs, two hospitals, fake people ─────────────────────────────────────────────────────── */
export const ORG = "a0000000-0000-4000-8000-00000000000a";
export const OTHER_ORG = "b0000000-0000-4000-8000-00000000000b";
export const ME = "c0000000-0000-4000-8000-0000000000c1";
export const RAVI = "c0000000-0000-4000-8000-0000000000c2";
export const PRIYA = "c0000000-0000-4000-8000-0000000000c3";
export const OUTSIDER = "c0000000-0000-4000-8000-0000000000c9";
export const CASE_MAX = "d0000000-0000-4000-8000-0000000000d1";
export const CASE_CLOSED = "d0000000-0000-4000-8000-0000000000d2";
export const CASE_OTHER = "d0000000-0000-4000-8000-0000000000d9";
export const TIGER = "e0000000-0000-4000-8000-0000000000e1";
export const TIGER_TWO = "e0000000-0000-4000-8000-0000000000e2";
export const MAX = "e0000000-0000-4000-8000-0000000000e3";
export const BHOLU = "e0000000-0000-4000-8000-0000000000e4";
export const TIGER_OTHER = "e0000000-0000-4000-8000-0000000000e9";
export const HOSPITAL = "f0000000-0000-4000-8000-0000000000f1";
export const OTHER_HOSPITAL = "f0000000-0000-4000-8000-0000000000f9";
export const AREA = "f1000000-0000-4000-8000-0000000000a1";

const iso = (daysAgo: number, now = Date.now()) => new Date(now - daysAgo * 86_400_000).toISOString();
const dayIn = (offset: number, now = Date.now()) => new Date(now + 5.5 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

export function ngoWorld(opts: { twoRavis?: boolean; noCity?: boolean } = {}) {
  const tables: Record<string, Row[]> = {
    ngos: [{ id: ORG, name: "Paws Coimbatore", city: opts.noCity ? null : "Coimbatore" }, { id: OTHER_ORG, name: "Other Trust", city: "Chennai" }],
    dogs: [
      { id: TIGER, ngo_id: ORG, name: "Tiger", code: "DDS-00132", straypaw_id: "SPA-DOG-ACC70743182B", zone: "Ward 12" },
      { id: TIGER_TWO, ngo_id: ORG, name: "Tiger", code: "DDS-00777", straypaw_id: "SPA-DOG-BBB70743182B", zone: "Ward 3" },
      { id: MAX, ngo_id: ORG, name: "Max", code: "DDS-00125", straypaw_id: "SPA-DOG-CCC70743182B", zone: "Ward 12" },
      { id: BHOLU, ngo_id: ORG, name: "Bholu", code: "DDS-00421", straypaw_id: "SPA-DOG-DDD70743182B", zone: "Ward 5" },
      { id: TIGER_OTHER, ngo_id: OTHER_ORG, name: "Tiger", code: "DDS-00132", straypaw_id: "SPA-DOG-EEE70743182B", zone: "Ward 12" },
    ],
    org_case_facts: [
      { id: CASE_MAX, ngo_id: ORG, case_code: "SPC-36A0546FD2E1B04A9C8E2D7F3A1B5C9E", title: "Max limping", condition_class: "Injury", status_class: "open", zone: "Ward 12", city: "Coimbatore", dog_id: MAX, animal_name: "Max", assignee_id: null, assignee_name: null, occurred_at: iso(3), last_activity_at: iso(1), next_due: null, provenance: null, reviewed_at: null },
      { id: CASE_CLOSED, ngo_id: ORG, case_code: "SPC-47A86E67E8E443BD920C8838432C7F15", title: "Bholu skin", condition_class: "Skin disease", status_class: "closed", zone: "Ward 5", city: "Coimbatore", dog_id: BHOLU, animal_name: "Bholu", assignee_id: RAVI, assignee_name: "Ravi Kumar", occurred_at: iso(30), last_activity_at: iso(20), next_due: null, provenance: null, reviewed_at: null },
      { id: CASE_OTHER, ngo_id: OTHER_ORG, case_code: "SPC-36A054AAAA0000BBBB1111CCCC2222DD", title: "Other org case", condition_class: "Injury", status_class: "open", zone: "Ward 12", city: "Chennai", dog_id: TIGER_OTHER, animal_name: "Tiger", assignee_id: null, assignee_name: null, occurred_at: iso(2), last_activity_at: iso(1), next_due: null, provenance: null, reviewed_at: null },
    ],
    cases: [], case_updates: [], animal_followups: [], medical_events: [], nx_tasks: [], ai_action_log: [], report_packages: [], public_programme_cards: [], public_spatial_animals: [], abc_attestations: [], campaigns: [], operations_contracts: [], oh_handoffs: [], kaju_action_receipts: [], operational_audit_log: [],
  };
  const people = [
    { user_id: ME, name: "Asha Menon", role: "coordinator" },
    { user_id: RAVI, name: "Ravi Kumar", role: "field" },
    { user_id: PRIYA, name: "Priya Nair", role: "field" },
    ...(opts.twoRavis ? [{ user_id: OUTSIDER, name: "Ravi Shankar", role: "vet" }] : []),
  ];
  const rpcs: Record<string, RpcFn> = {
    my_ngo: () => ({ data: ORG, error: null }),
    nx_my_workspaces: () => ({ data: [{ org_id: ORG, name: "Paws Coimbatore", short_name: null, source: "ngo", kind: "ngo", workspace: "ngo", role: "coordinator", sample: false }], error: null }),
    nx_org_people: (a) => (a.p_org === ORG ? { data: people, error: null } : { data: [], error: null }),
    oh_my_today: () => ({ data: [], error: null }),
    abc_my_context: () => ({ data: { offices: [], role: "coordinator" }, error: null }),
  };
  return { tables, rpcs };
}

export function healthWorld(opts: { role?: "clinician" | "nurse" | "records" | "field"; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  const caps = opts.role === "field" ? [] : opts.role === "records" ? ["view_register", "record_exposure"] : opts.role === "nurse" ? ["view_register", "record_exposure", "record_dose"] : ["view_register", "record_exposure", "assess", "prescribe", "record_dose"];
  const today = dayIn(0, now), tomorrow = dayIn(1, now), past = dayIn(-2, now);
  const dose = (n: number, due: string, code: string, ref: string | null, phone: string | null, exposure: string) => ({ dose_id: `dose-${code}-${n}`, dose_no: n, doses_total: 4, due_on: due, exposure_id: exposure, code, patient_ref: ref, age_band: "15-29", regimen: "ID 4-dose", phone, last_reminder: null });
  const exposures: Record<string, Row[]> = {
    [HOSPITAL]: [
      { id: "aa000000-0000-4000-8000-000000000001", code: "BX-2611-AB12CD", patient_ref: "OPD 4521", age_band: "15-29", sex: "female", species: "dog", exposure_on: dayIn(-7, now), presented_on: dayIn(-7, now), kind: "bite", category: "III", course_status: "active", doses_given: 2, doses_total: 4, next_due: today },
      { id: "aa000000-0000-4000-8000-000000000002", code: "BX-2611-EF34GH", patient_ref: null, age_band: "5-14", sex: "male", species: "cat", exposure_on: dayIn(-1, now), presented_on: dayIn(-1, now), kind: "scratch", category: "not_recorded", course_status: null, doses_given: 0, doses_total: 0, next_due: null },
    ],
    [OTHER_HOSPITAL]: [
      { id: "bb000000-0000-4000-8000-000000000009", code: "BX-2611-ZZ99ZZ", patient_ref: "OPD 9999", age_band: "30-49", sex: "male", species: "dog", exposure_on: dayIn(-3, now), presented_on: dayIn(-3, now), kind: "bite", category: "II", course_status: "active", doses_given: 1, doses_total: 4, next_due: today },
    ],
  };
  const dues: Record<string, Row[]> = {
    [HOSPITAL]: [dose(3, today, "BX-2611-AB12CD", "OPD 4521", "9845012345", "aa000000-0000-4000-8000-000000000001"), dose(2, tomorrow, "BX-2611-CD56EF", null, null, "aa000000-0000-4000-8000-000000000003"), dose(2, past, "BX-2611-GH78IJ", "OPD 4700", "9845099999", "aa000000-0000-4000-8000-000000000004")],
    [OTHER_HOSPITAL]: [dose(2, today, "BX-2611-ZZ99ZZ", "OPD 9999", "9000000000", "bb000000-0000-4000-8000-000000000009")],
  };
  const mine = new Set([HOSPITAL]);
  const allowed = (f: unknown) => typeof f === "string" && mine.has(f) && caps.includes("view_register");
  const refuse = { data: null, error: { message: "Only staff of this facility can read its register" } };
  const recorded: Record<string, unknown>[] = [];
  const rpcs: Record<string, RpcFn> = {
    my_ngo: () => ({ data: null, error: null }),
    abc_my_context: () => ({ data: { offices: [], role: null }, error: null }),
    nx_my_workspaces: () => ({ data: [{ org_id: HOSPITAL, name: "City General Hospital", short_name: "City General", source: "programme_partner", kind: "hospital", workspace: "healthcare", role: opts.role ?? "clinician", sample: false }], error: null }),
    nx_org_people: (a) => (a.p_org === HOSPITAL ? { data: [{ user_id: ME, name: "Dr Asha Menon", role: opts.role ?? "clinician" }, { user_id: RAVI, name: "Ravi Kumar", role: "nurse" }], error: null } : { data: [], error: null }),
    oh_my_today: () => ({ data: [{ organisation_id: HOSPITAL, name: "City General Hospital", short_name: "City General", kind: "hospital", role: opts.role ?? "clinician", capabilities: caps, programmes: [] }], error: null }),
    oh_clinic_due: (a) => (allowed(a.p_facility) ? { data: { today, due: dues[String(a.p_facility)], completed: [{ course_id: "course-1", exposure_id: "aa000000-0000-4000-8000-000000000005", code: "BX-2611-KL90MN", patient_ref: "OPD 4100", completed_at: iso(1, now), phone: "9845011111", told: false }] }, error: null } : refuse),
    oh_clinic_register: (a) => (allowed(a.p_facility) ? { data: (exposures[String(a.p_facility)] ?? []).filter((r) => a.p_filter !== "needs_assessment" || r.category === "not_recorded" || (!r.course_status && r.category !== "I")), error: null } : refuse),
    oh_clinic_transfers: (a) => (allowed(a.p_facility) ? { data: { incoming: [{ id: "t1", code: "BX-2611-PQ12RS", service: "rig", status: "sent", from: "Rural Health Centre", from_short: "RHC", sent_at: iso(1, now) }], outgoing: [] }, error: null } : refuse),
    oh_clinic_exposure: (a) => {
      const all = Object.entries(exposures).flatMap(([f, rows]) => rows.map((r) => ({ ...r, facility_id: f }) as Row & { facility_id: string }));
      const e = all.find((r) => r.id === a.p_exposure);
      if (!e || !allowed(e.facility_id)) return { data: null, error: { message: "Only staff of this facility can open this record" } };
      return { data: { id: e.id, code: e.code, facility_id: e.facility_id, patient_ref: e.patient_ref, age_band: e.age_band ?? "not_recorded", sex: e.sex ?? "not_recorded", exposure_on: e.exposure_on, presented_on: e.presented_on, exposure_kind: e.kind, category: e.category, category_by_name: e.category === "not_recorded" ? null : "Dr Asha Menon", wound_washed: "at_facility", animal_species: e.species ?? "dog", today, created_at: iso(0, now), course: e.course_status ? { regimen: "ID 4-dose", status: e.course_status, prescribed_by_name: "Dr Asha Menon", rig_given: true } : null, doses: e.course_status ? [{ id: "d1", dose_no: 1, due_on: dayIn(-7, now), given_on: dayIn(-7, now), status: "given" }, { id: "d2", dose_no: 2, due_on: dayIn(-4, now), given_on: dayIn(-4, now), status: "given" }, { id: "d3", dose_no: 3, due_on: today, given_on: null, status: "due" }] : [] }, error: null };
    },
    oh_org_areas: (a) => (a.p_org === HOSPITAL ? { data: [{ id: AREA, name: "Ward 12" }], error: null } : { data: [], error: null }),
    /* The bite form's function, with its own checks, as the database makes them. */
    oh_record_exposure: (a) => {
      const f = String(a.p_facility);
      if (!mine.has(f) || !caps.includes("record_exposure")) return { data: null, error: { message: "Only staff of this facility can record a bite" } };
      if (a.p_category !== "not_recorded" && !caps.includes("assess")) return { data: null, error: { message: "Only a clinician can record the exposure category" } };
      if (String(a.p_exposure_on) > today) return { data: null, error: { message: "The date it happened cannot be in the future" } };
      const n = (exposures[f] ??= []).length + 1;
      const row = { id: `aa000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`, code: `BX-2611-NEW${String(n).padStart(3, "0")}`, patient_ref: a.p_patient_ref ?? null, age_band: a.p_age_band, sex: a.p_sex, species: a.p_species, exposure_on: a.p_exposure_on, presented_on: today, kind: a.p_kind, category: a.p_category, course_status: null, doses_given: 0, doses_total: 0, next_due: null };
      exposures[f].unshift(row);
      recorded.push(a);
      return { data: { id: row.id, code: row.code, handoff_id: null }, error: null };
    },
  };
  return { rpcs, recorded, exposures, tables: { nx_tasks: [] as Row[], ai_action_log: [] as Row[] } };
}
