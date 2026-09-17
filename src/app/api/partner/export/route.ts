import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
const cell = (value: unknown) => { const s = String(value ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows: Record<string, unknown>[]) => { const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))); return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n"); };

async function actor(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const admin = getSupabaseAdmin();
  if (!admin || !token) return null;
  const { data: identity } = await admin.auth.getUser(token);
  if (!identity.user) return null;
  const { data: member } = await admin.from("ngo_members").select("ngo_id").eq("user_id", identity.user.id).maybeSingle();
  return member?.ngo_id ? { admin, ngoId: member.ngo_id as string } : null;
}

const isClosed = (status: unknown) => ["resolved", "closed"].includes(String(status ?? "").toLowerCase());
function careCategory(kind: unknown) {
  const s = String(kind ?? "").toLowerCase();
  if (/vaccin|rabies|arv/.test(s)) return "vaccination";
  if (/sterili|abc|spay|neuter/.test(s)) return "sterilisation";
  return "treatment";
}
function period(url: URL) {
  const year = url.searchParams.get("year");
  const from = url.searchParams.get("from") || (year ? `${year}-01-01` : null);
  const to = url.searchParams.get("to") || (year ? `${year}-12-31` : null);
  return {
    from, to,
    fromMs: from ? +new Date(`${from}T00:00:00`) : null,
    toMs: to ? +new Date(`${to}T23:59:59.999`) : null,
  };
}
function within(value: string | null | undefined, fromMs: number | null, toMs: number | null) {
  if (!fromMs && !toMs) return true;
  const ms = value ? +new Date(value) : NaN;
  return Number.isFinite(ms) && (!fromMs || ms >= fromMs) && (!toMs || ms <= toMs);
}
const contains = (value: unknown, q: string | null) => !q || String(value ?? "").toLowerCase().includes(q.toLowerCase());

function casesSheet(rows: any[]) {
  return rows.map((r) => ({
    "Case ID": r.case_code ?? r.id,
    "StrayPaw ID": r.dogs?.straypaw_id ?? "",
    "Source / organisation ID": r.dogs?.code ?? "",
    Animal: r.dogs?.name ?? "",
    Species: r.species ?? r.dogs?.species ?? "animal",
    Condition: r.condition_text ?? r.category,
    Status: r.status,
    Stage: r.stage ?? "",
    Severity: r.severity ?? "",
    Locality: r.zone ?? r.dogs?.zone ?? "",
    Assignee: r.assignee_name ?? "",
    "Next action": r.next_action ?? "",
    "Follow-up": r.follow_up_at ?? "",
    Outcome: r.outcome_note ?? r.resolution ?? "",
    "Evidence status": r.proof_verified ? "Verified" : r.verification_state ?? "Submitted",
    Opened: r.source_event_at ?? r.created_at ?? "",
    "Last updated": r.last_activity_at ?? "",
  }));
}
function animalsSheet(rows: any[]) {
  return rows.map((r) => ({
    "StrayPaw ID": r.straypaw_id ?? r.id,
    "Source / organisation ID": r.code ?? "",
    Name: r.name ?? "",
    Species: r.species ?? "animal",
    Sex: r.sex ?? "Unknown",
    Colour: r.color ?? "Unknown",
    Identifiers: r.identifiers ?? "",
    Locality: r.zone ?? "",
    Status: r.status ?? "",
    Sterilisation: r.sterilisation_status ?? "Unknown",
    Rabies: r.vaccination_status ?? "Unknown",
    "First recorded": r.first_seen ?? r.created_at ?? "",
    "Last seen": r.last_seen ?? "",
    Provenance: r.provenance ?? "",
  }));
}
function careSheet(rows: any[]) {
  return rows.map((r) => ({
    "StrayPaw ID": r.dogs?.straypaw_id ?? r.dog_id,
    "Source / organisation ID": r.dogs?.code ?? "",
    Animal: r.dogs?.name ?? "",
    "Case ID": r.case_id ?? "",
    Event: r.kind,
    Date: r.event_date,
    Locality: r.dogs?.zone ?? "",
    "Performed by": r.performed_by ?? "",
    Notes: r.notes ?? "",
  }));
}
function storySheet(animals: any[], cases: any[], care: any[]) {
  const byCase = new Map<string, any[]>(), byCare = new Map<string, any[]>();
  for (const r of cases) if (r.dog_id) byCase.set(r.dog_id, [...(byCase.get(r.dog_id) ?? []), r]);
  for (const r of care) if (r.dog_id) byCare.set(r.dog_id, [...(byCare.get(r.dog_id) ?? []), r]);
  return animals.filter((a) => byCase.has(a.id) || byCare.has(a.id)).map((a) => {
    const cs = (byCase.get(a.id) ?? []).sort((x, y) => +new Date(y.source_event_at ?? y.created_at ?? 0) - +new Date(x.source_event_at ?? x.created_at ?? 0));
    const ms = (byCare.get(a.id) ?? []).sort((x, y) => +new Date(y.event_date ?? 0) - +new Date(x.event_date ?? 0));
    const outcome = cs.find((c) => c.outcome_note || c.resolution)?.outcome_note ?? cs.find((c) => c.resolution)?.resolution ?? "";
    const label = a.name || a.straypaw_id || "Animal";
    return {
      "StrayPaw ID": a.straypaw_id ?? a.id,
      "Source / organisation ID": a.code ?? "",
      Name: a.name ?? "",
      Species: a.species ?? "animal",
      Locality: a.zone ?? "",
      "Photo URL": a.cover_photo ?? "",
      Cases: cs.length,
      "Care events": ms.length,
      "Latest case": cs[0]?.title ?? "",
      "Latest care": ms[0]?.kind ?? "",
      Outcome: outcome,
      "Story brief": `${label}${a.zone ? ` in ${a.zone}` : ""}: ${cs.length} case${cs.length === 1 ? "" : "s"}, ${ms.length} care event${ms.length === 1 ? "" : "s"}${outcome ? `, outcome: ${String(outcome).replace(/_/g, " ")}` : ""}.`,
    };
  });
}

function reportHtml(input: {
  ngo: any; scope: string; periodLabel: string; filterLabel: string;
  cases: any[]; animals: any[]; care: any[];
  survey?: any; responses?: any[]; areas?: any[];
}) {
  const { ngo, scope, periodLabel, filterLabel, cases, animals, care, survey, responses = [], areas = [] } = input;
  const closed = cases.filter((r) => isClosed(r.status)).length;
  const treatment = care.filter((r) => careCategory(r.kind) === "treatment").length;
  const vaccination = care.filter((r) => careCategory(r.kind) === "vaccination").length;
  const sterilisation = care.filter((r) => careCategory(r.kind) === "sterilisation").length;
  const places = new Map<string, number>();
  for (const r of [...cases, ...care]) { const p = r.zone ?? r.dogs?.zone ?? "Not recorded"; places.set(p, (places.get(p) ?? 0) + 1); }
  const topPlaces = [...places.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const ngoLogo = ngo?.logo_url ? `<img src="${esc(ngo.logo_url)}" alt="" class="ngo-logo">` : "";
  const metrics = survey
    ? [
        [responses.length, "responses"],
        [responses.reduce((n: number, r: any) => n + Number(r.count ?? 1), 0), "animals / observations"],
        [areas.length, "areas"],
      ]
    : [[cases.length, "cases"], [cases.length ? `${Math.round((closed / cases.length) * 100)}%` : "0%", "case completion"], [care.length, "care events"], [animals.length, "animals in scope"]];
  const metricsHtml = metrics.map(([v, label]) => `<div><b>${esc(v)}</b><span>${esc(label)}</span></div>`).join("");
  const detail = survey ? `<section><h2>Project coverage</h2><table><thead><tr><th>Area</th><th>Status</th><th>Target</th><th>Responses</th><th>Animals / observations</th></tr></thead><tbody>${areas.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.status)}</td><td>${esc(a.target_count ?? "—")}</td><td>${esc(a.response_count ?? 0)}</td><td>${esc(a.animal_count ?? 0)}</td></tr>`).join("")}</tbody></table></section>` : `<section class="split"><div><h2>Care delivered</h2><div class="rows"><p><span>Treatment / medical</span><b>${treatment.toLocaleString()}</b></p><p><span>Rabies / vaccination</span><b>${vaccination.toLocaleString()}</b></p><p><span>ABC / sterilisation</span><b>${sterilisation.toLocaleString()}</b></p></div></div><div><h2>Where work concentrated</h2><div class="rows">${topPlaces.map(([p, n]) => `<p><span>${esc(p)}</span><b>${n.toLocaleString()}</b></p>`).join("") || "<p>No locality data in this scope.</p>"}</div></div></section><section><h2>Case register summary</h2><table><thead><tr><th>Date</th><th>Case</th><th>Animal</th><th>Locality</th><th>Status</th><th>Outcome</th></tr></thead><tbody>${cases.slice(0, 60).map((r) => `<tr><td>${esc(String(r.source_event_at ?? r.created_at ?? "").slice(0, 10))}</td><td>${esc(r.case_code ?? r.id)}</td><td>${esc(r.dogs?.straypaw_id ?? r.dogs?.name ?? "")}</td><td>${esc(r.zone ?? r.dogs?.zone ?? "")}</td><td>${esc(r.status)}</td><td>${esc(r.outcome_note ?? r.resolution ?? "")}</td></tr>`).join("")}</tbody></table>${cases.length > 60 ? `<p class="note">Showing 60 of ${cases.length.toLocaleString()} cases. The filtered workbook contains the complete evidence.</p>` : ""}</section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(ngo?.name ?? "Organisation")} · ${esc(scope)} · StrayPaw</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0b1e3d;margin:0}.page{max-width:900px;margin:auto;padding:32px}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2457ce;padding-bottom:18px}.brand-left{display:flex;align-items:center;gap:14px}.ngo-logo{width:52px;height:52px;object-fit:contain;border-radius:10px}.straypaw{font-weight:800}.straypaw i{color:#f05b40;font-style:normal}.muted{color:#667085;font-size:12px}.title{margin:34px 0 8px;font-size:32px}.filters{font-size:12px;color:#667085}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metrics div{border:1px solid #e4e7ec;border-radius:10px;padding:14px}.metrics b{display:block;font-size:26px}.metrics span{display:block;margin-top:4px;font-size:11px;color:#667085}section{margin-top:32px}h2{font-size:17px;margin:0 0 12px}.split{display:grid;grid-template-columns:1fr 1fr;gap:24px}.rows p{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;margin:0;font-size:12px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{text-align:left;padding:7px 5px;border-bottom:1px solid #e9ebef;vertical-align:top}th{font-size:9px;text-transform:uppercase;color:#667085}.note,.footer{font-size:10px;color:#667085}.footer{margin-top:36px;border-top:1px solid #ddd;padding-top:12px}.print{position:fixed;right:18px;top:18px;background:#0b1e3d;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}@media print{.print{display:none}.page{padding:0}}@media(max-width:700px){.metrics{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr}}</style></head><body><button class="print" onclick="window.print()">Print / Save PDF</button><main class="page"><div class="brand"><div class="brand-left">${ngoLogo}<div><strong>${esc(ngo?.name ?? "Organisation")}</strong><div class="muted">${esc([ngo?.city, ngo?.state].filter(Boolean).join(", "))}</div></div></div><div class="straypaw">StrayPaw<i>.</i></div></div><h1 class="title">${esc(scope)}</h1><p>Operational evidence report</p><p class="filters">${esc(periodLabel)}${filterLabel ? ` · ${esc(filterLabel)}` : ""} · Generated ${esc(date)}</p><section><h2>Headline record</h2><div class="metrics">${metricsHtml}</div></section>${detail}<div class="footer">Prepared from ${esc(ngo?.name ?? "the organisation")}'s StrayPaw records. Aggregate programme totals and individually traceable animal records remain distinct. Private reporter contact fields are excluded by default.</div></main></body></html>`;
}

export async function GET(request: Request) {
  const current = await actor(request);
  if (!current) return NextResponse.json({ error: "Organisation access required." }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "report";
  const format = url.searchParams.get("format") ?? "xlsx";
  const category = url.searchParams.get("category") ?? "all";
  const status = url.searchParams.get("status") ?? "all";
  const locality = url.searchParams.get("locality")?.trim() || null;
  const scopeType = url.searchParams.get("scopeType") ?? "all";
  const scopeId = url.searchParams.get("scopeId") || null;
  const range = period(url);

  const [{ data: ngo }, { data: rawCases }, { data: rawAnimals }, { data: rawCare }] = await Promise.all([
    current.admin.from("ngos").select("id,name,logo_url,city,state").eq("id", current.ngoId).maybeSingle(),
    current.admin.from("cases").select("*,dogs(name,code,straypaw_id,species,zone,cover_photo,campaign_id)").eq("ngo_id", current.ngoId).order("last_activity_at", { ascending: false }).limit(10000),
    current.admin.from("dogs").select("*").eq("ngo_id", current.ngoId).order("last_seen", { ascending: false }).limit(10000),
    current.admin.from("medical_events").select("id,dog_id,case_id,kind,event_date,notes,performed_by,created_at,dogs!inner(name,code,straypaw_id,species,zone,cover_photo,campaign_id,ngo_id)").eq("dogs.ngo_id", current.ngoId).order("event_date", { ascending: false }).limit(10000),
  ]);

  let scope = "Organisation-wide report";
  let survey: any = null;
  let responses: any[] = [];
  let areas: any[] = [];

  if (scopeType === "campaign" && scopeId) {
    const { data } = await current.admin.from("campaigns").select("id,name").eq("id", scopeId).eq("ngo_id", current.ngoId).maybeSingle();
    if (data) scope = data.name;
  }
  if (scopeType === "survey" && scopeId) {
    const { data } = await current.admin.from("surveys").select("*").eq("id", scopeId).eq("ngo_id", current.ngoId).maybeSingle();
    if (data) {
      survey = data;
      scope = data.title;
      const [{ data: responseRows }, { data: areaRows }] = await Promise.all([
        current.admin.from("survey_responses").select("*").eq("survey_id", scopeId).order("created_at", { ascending: false }).limit(10000),
        current.admin.from("survey_areas").select("*").eq("survey_id", scopeId).order("created_at"),
      ]);
      responses = (responseRows ?? []).filter((r) => within(r.created_at, range.fromMs, range.toMs));
      const counts = new Map<string, { responses: number; animals: number }>();
      for (const r of responses) if (r.area_id) { const c = counts.get(r.area_id) ?? { responses: 0, animals: 0 }; c.responses += 1; c.animals += Number(r.count ?? 1); counts.set(r.area_id, c); }
      areas = (areaRows ?? []).map((a) => ({ ...a, response_count: counts.get(a.id)?.responses ?? 0, animal_count: counts.get(a.id)?.animals ?? 0 }));
    }
  }

  const campaignOk = (campaignId: unknown, programmeId?: unknown) => scopeType !== "campaign" || !scopeId || campaignId === scopeId || programmeId === scopeId;
  const rawCaseRows = rawCases ?? [];
  const rawAnimalRows = rawAnimals ?? [];
  const rawCareRows = rawCare ?? [];

  const cases = rawCaseRows.filter((r: any) => {
    if (!within(r.source_event_at ?? r.created_at, range.fromMs, range.toMs)) return false;
    if (!campaignOk(r.dogs?.campaign_id, r.programme_id)) return false;
    if (!contains(r.zone ?? r.dogs?.zone, locality)) return false;
    if (status === "open" && isClosed(r.status)) return false;
    if (status === "completed" && !isClosed(r.status)) return false;
    if (status !== "all" && !["open", "completed"].includes(status) && String(r.status).toLowerCase() !== status.toLowerCase()) return false;
    if (category === "rescue" && !/rescue|intake|injury|medical|treatment/i.test(String(r.category ?? ""))) return false;
    return true;
  });
  const care = rawCareRows.filter((r: any) => {
    if (!within(r.event_date ?? r.created_at, range.fromMs, range.toMs)) return false;
    if (!campaignOk(r.dogs?.campaign_id)) return false;
    if (!contains(r.dogs?.zone, locality)) return false;
    return category === "all" || category === "rescue" || careCategory(r.kind) === category;
  });

  const animalIds = new Set<string>([...cases.map((r: any) => r.dog_id), ...care.map((r: any) => r.dog_id)].filter(Boolean));
  const animals = scopeType === "survey" ? [] : rawAnimalRows.filter((r: any) => (animalIds.size ? animalIds.has(r.id) : campaignOk(r.campaign_id)) && contains(r.zone, locality));

  const periodLabel = range.from || range.to ? `${range.from ?? "Start"} to ${range.to ?? "Present"}` : "All time";
  const filterLabel = [category !== "all" ? category : null, status !== "all" ? status : null, locality].filter(Boolean).join(" · ");

  if (format === "html") {
    return new Response(reportHtml({ ngo, scope, periodLabel, filterLabel, cases, animals, care, survey, responses, areas }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const summary: Record<string, unknown>[] = [{
    Organisation: ngo?.name ?? "Organisation",
    Scope: scope,
    Period: periodLabel,
    Category: category,
    Status: status,
    Locality: locality ?? "all",
    "Cases / responses": survey ? responses.length : cases.length,
    "Animals / observations": survey ? responses.reduce((n: number, r: any) => n + Number(r.count ?? 1), 0) : animals.length,
    "Care events": survey ? "" : care.length,
    Generated: new Date().toISOString(),
  }];

  const sheets: Record<string, Record<string, unknown>[]> = survey ? {
    Summary: summary,
    "Project responses": responses.map((r) => ({ Date: r.created_at, Species: r.species ?? survey.species ?? "", Count: r.count ?? 1, Notes: r.notes ?? "", ...Object.fromEntries(Object.entries(r.attributes ?? {}).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v])) })),
    Areas: areas.map((a) => ({ Area: a.name, Code: a.code ?? "", Status: a.status ?? "", Target: a.target_count ?? "", Responses: a.response_count ?? 0, "Animals / observations": a.animal_count ?? 0 })),
  } : {
    Summary: summary,
    Cases: casesSheet(cases),
    Animals: animalsSheet(animals),
    "Care history": careSheet(care),
  };
  if (!survey && type === "story") sheets["Story pack"] = storySheet(animals, cases, care);

  const chosen: Record<string, Record<string, unknown>[]> = !survey && type === "story"
    ? { Summary: sheets.Summary, "Story pack": sheets["Story pack"], Cases: sheets.Cases, "Care history": sheets["Care history"] }
    : sheets;

  const date = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const [name, rows] = Object.entries(chosen).find(([name]) => name !== "Summary") ?? Object.entries(chosen)[0];
    return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="straypaw-${name.toLowerCase().replace(/\s+/g, "-")}-${date}.csv"`, "Cache-Control": "no-store" } });
  }

  const book = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(chosen)) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="straypaw-${type}-${date}.xlsx"`, "Cache-Control": "no-store" } });
}
