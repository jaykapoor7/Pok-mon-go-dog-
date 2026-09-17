import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function csvCell(value: unknown) { const text = value == null ? "" : String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function toCsv(rows: Record<string, unknown>[]) { const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n"); }
function esc(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)); }
async function actor(request: Request) { const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); const admin = getSupabaseAdmin(); if (!admin || !token) return null; const { data: identity } = await admin.auth.getUser(token); if (!identity.user) return null; const { data: member } = await admin.from("ngo_members").select("ngo_id").eq("user_id", identity.user.id).maybeSingle(); return member?.ngo_id ? { admin, ngoId: member.ngo_id as string } : null; }

function caseRows(rows: any[]) { return rows.map((row) => ({ "Case ID": row.case_code ?? row.id, "StrayPaw ID": row.dogs?.straypaw_id ?? "", "Source / organisation ID": row.dogs?.code ?? "", Animal: row.dogs?.name ?? "", Species: row.species ?? row.dogs?.species ?? "animal", Condition: row.condition_text ?? row.category, Status: row.status, Stage: row.stage ?? "", Severity: row.severity, Locality: row.zone ?? row.dogs?.zone ?? "", Assignee: row.assignee_name ?? "", "Next action": row.next_action ?? "", "Follow-up": row.follow_up_at ?? "", Outcome: row.outcome_note ?? row.resolution ?? "", "Evidence status": row.proof_verified ? "Verified" : row.verification_state ?? "Submitted", Opened: row.source_event_at ?? row.created_at ?? "", "Last updated": row.last_activity_at ?? "" })); }
function animalRows(rows: any[]) { return rows.map((row) => ({ "StrayPaw ID": row.straypaw_id ?? row.id, "Source / organisation ID": row.code ?? "", Name: row.name ?? "", Species: row.species ?? "animal", Sex: row.sex ?? "Unknown", Colour: row.color ?? "Unknown", Identifiers: row.identifiers ?? "", Locality: row.zone ?? "", Status: row.status ?? "", Sterilisation: row.sterilisation_status ?? "Unknown", Rabies: row.vaccination_status ?? "Unknown", "First recorded": row.first_seen ?? row.created_at ?? "", "Last seen": row.last_seen ?? "", Provenance: row.provenance ?? "" })); }
function careRows(rows: any[]) { return rows.map((row) => ({ "StrayPaw ID": row.dogs?.straypaw_id ?? row.dog_id, "Source / organisation ID": row.dogs?.code ?? "", Animal: row.dogs?.name ?? "", "Case ID": row.case_id ?? "", Event: row.kind, Date: row.event_date, Locality: row.dogs?.zone ?? "", "Performed by": row.performed_by ?? "", Notes: row.notes ?? "" })); }

function parseDateRange(url: URL) {
  const year = url.searchParams.get("year");
  const from = url.searchParams.get("from") || (year ? `${year}-01-01` : null);
  const to = url.searchParams.get("to") || (year ? `${year}-12-31` : null);
  const fromMs = from ? +new Date(`${from}T00:00:00`) : null;
  const toMs = to ? +new Date(`${to}T23:59:59.999`) : null;
  return { year, from, to, fromMs, toMs };
}
function within(value: string | null | undefined, fromMs: number | null, toMs: number | null) { if (!fromMs && !toMs) return true; const ms = value ? +new Date(value) : NaN; if (!Number.isFinite(ms)) return false; return (!fromMs || ms >= fromMs) && (!toMs || ms <= toMs); }
function textMatch(value: unknown, query: string | null) { return !query || String(value ?? "").toLowerCase().includes(query.toLowerCase()); }
function isClosed(status: unknown) { return ["resolved", "closed"].includes(String(status ?? "").toLowerCase()); }
function careCategory(kind: unknown) { const s = String(kind ?? "").toLowerCase(); if (/vaccin|rabies|arv/.test(s)) return "vaccination"; if (/sterili|abc|spay|neuter/.test(s)) return "sterilisation"; return "treatment"; }

function buildStoryPack(animals: any[], cases: any[], care: any[]) {
  const casesBy = new Map<string, any[]>(), careBy = new Map<string, any[]>();
  for (const row of cases) if (row.dog_id) casesBy.set(row.dog_id, [...(casesBy.get(row.dog_id) ?? []), row]);
  for (const row of care) if (row.dog_id) careBy.set(row.dog_id, [...(careBy.get(row.dog_id) ?? []), row]);
  return animals.filter((a) => casesBy.has(a.id) || careBy.has(a.id)).map((a) => {
    const cs = (casesBy.get(a.id) ?? []).sort((x, y) => +new Date(y.source_event_at ?? y.created_at ?? 0) - +new Date(x.source_event_at ?? x.created_at ?? 0));
    const ms = (careBy.get(a.id) ?? []).sort((x, y) => +new Date(y.event_date ?? 0) - +new Date(x.event_date ?? 0));
    const outcome = cs.find((c) => c.outcome_note || c.resolution)?.outcome_note ?? cs.find((c) => c.resolution)?.resolution ?? "";
    const label = a.name || a.straypaw_id || "Animal";
    const summary = `${label}${a.zone ? ` in ${a.zone}` : ""}: ${cs.length} case${cs.length === 1 ? "" : "s"}, ${ms.length} care event${ms.length === 1 ? "" : "s"}${outcome ? `, outcome: ${String(outcome).replace(/_/g, " ")}` : ""}.`;
    return { "StrayPaw ID": a.straypaw_id ?? a.id, "Source / organisation ID": a.code ?? "", Name: a.name ?? "", Species: a.species ?? "animal", Locality: a.zone ?? "", "Photo URL": a.cover_photo ?? "", Cases: cs.length, "Care events": ms.length, "Latest case": cs[0]?.title ?? "", "Latest care": ms[0]?.kind ?? "", Outcome: outcome, "Story brief": summary };
  });
}

function brandedHtml(input: { ngo: any; scope: string; period: string; category: string; locality: string | null; status: string | null; cases: any[]; animals: any[]; care: any[]; survey?: any; surveyResponses?: any[]; surveyAreas?: any[] }) {
  const { ngo, scope, period, category, locality, status, cases, animals, care, survey, surveyResponses = [], surveyAreas = [] } = input;
  const closed = cases.filter((r) => isClosed(r.status)).length;
  const vaccination = care.filter((r) => careCategory(r.kind) === "vaccination").length;
  const sterilisation = care.filter((r) => careCategory(r.kind) === "sterilisation").length;
  const treatment = care.filter((r) => careCategory(r.kind) === "treatment").length;
  const localityCounts = new Map<string, number>(); for (const row of [...cases, ...care]) { const place = row.zone ?? row.dogs?.zone ?? "Not recorded"; localityCounts.set(place, (localityCounts.get(place) ?? 0) + 1); }
  const topLocalities = [...localityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const filterLine = [period !== "All time" ? period : null, category !== "all" ? category : null, locality, status].filter(Boolean).join(" · ") || "All eligible records";
  const generated = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const logo = ngo?.logo_url ? `<img class="ngo-logo" src="${esc(ngo.logo_url)}" alt="${esc(ngo.name)} logo">` : "";
  const surveyBlock = survey ? `<section><h2>Project evidence</h2><div class="metrics"><div><b>${surveyResponses.length.toLocaleString()}</b><span>responses</span></div><div><b>${surveyResponses.reduce((n, r) => n + Number(r.count ?? 1), 0).toLocaleString()}</b><span>animals / observations counted</span></div><div><b>${surveyAreas.length.toLocaleString()}</b><span>areas</span></div></div><table><thead><tr><th>Area</th><th>Status</th><th>Target</th><th>Responses</th><th>Animals / observations</th></tr></thead><tbody>${surveyAreas.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.status)}</td><td>${esc(a.target_count ?? "—")}</td><td>${esc(a.response_count ?? 0)}</td><td>${esc(a.animal_count ?? 0)}</td></tr>`).join("")}</tbody></table></section>` : "";
  const operationsBlock = survey ? "" : `<section><h2>Headline record</h2><div class="metrics"><div><b>${cases.length.toLocaleString()}</b><span>cases</span></div><div><b>${cases.length ? Math.round((closed / cases.length) * 100) : 0}%</b><span>case completion</span></div><div><b>${care.length.toLocaleString()}</b><span>care events</span></div><div><b>${animals.length.toLocaleString()}</b><span>animals in scope</span></div></div></section><section class="split"><div><h2>Care delivered</h2><div class="rows"><p><span>Treatment / medical</span><b>${treatment.toLocaleString()}</b></p><p><span>Rabies / vaccination</span><b>${vaccination.toLocaleString()}</b></p><p><span>ABC / sterilisation</span><b>${sterilisation.toLocaleString()}</b></p></div></div><div><h2>Where work concentrated</h2><div class="rows">${topLocalities.map(([place, n]) => `<p><span>${esc(place)}</span><b>${n.toLocaleString()}</b></p>`).join("") || "<p>No locality data in this scope.</p>"}</div></div></section><section><h2>Case register summary</h2><table><thead><tr><th>Date</th><th>Case</th><th>Animal</th><th>Locality</th><th>Status</th><th>Outcome</th></tr></thead><tbody>${cases.slice(0, 60).map((r) => `<tr><td>${esc(String(r.source_event_at ?? r.created_at ?? "").slice(0, 10))}</td><td>${esc(r.case_code ?? r.id)}</td><td>${esc(r.dogs?.straypaw_id ?? r.dogs?.name ?? "")}</td><td>${esc(r.zone ?? r.dogs?.zone ?? "")}</td><td>${esc(r.status)}</td><td>${esc(r.outcome_note ?? r.resolution ?? "")}</td></tr>`).join("")}</tbody></table>${cases.length > 60 ? `<p class="note">Showing 60 of ${cases.length.toLocaleString()} cases. The accompanying workbook contains the complete filtered evidence.</p>` : ""}</section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(ngo?.name ?? "Organisation")} · ${esc(scope)} · StrayPaw</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0b1e3d;margin:0;background:#fff}.page{max-width:900px;margin:auto;padding:32px}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2457ce;padding-bottom:18px}.brand-left{display:flex;align-items:center;gap:14px}.ngo-logo{width:52px;height:52px;object-fit:contain;border-radius:10px}.straypaw{font-weight:800;letter-spacing:.02em}.straypaw i{color:#f05b40;font-style:normal}.muted{color:#667085;font-size:12px}.title{margin:34px 0 8px;font-size:32px;line-height:1.1}.scope{font-size:15px;margin:0 0 4px}.filters{font-size:12px;color:#667085;margin:0}section{margin-top:32px}h2{font-size:17px;margin:0 0 12px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metrics div{border:1px solid #e4e7ec;border-radius:10px;padding:14px}.metrics b{display:block;font-size:26px}.metrics span{display:block;margin-top:4px;font-size:11px;color:#667085}.split{display:grid;grid-template-columns:1fr 1fr;gap:24px}.rows p{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;margin:0;font-size:12px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{text-align:left;padding:7px 5px;border-bottom:1px solid #e9ebef;vertical-align:top}th{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#667085}.note{font-size:10px;color:#667085}.footer{margin-top:36px;border-top:1px solid #ddd;padding-top:12px;font-size:10px;color:#667085}.print{position:fixed;right:18px;top:18px;background:#0b1e3d;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}@media print{.print{display:none}.page{padding:0}}@media(max-width:700px){.metrics{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr}}</style></head><body><button class="print" onclick="window.print()">Print / Save PDF</button><main class="page"><div class="brand"><div class="brand-left">${logo}<div><div><strong>${esc(ngo?.name ?? "Organisation")}</strong></div><div class="muted">${esc([ngo?.city, ngo?.state].filter(Boolean).join(", "))}</div></div></div><div class="straypaw">StrayPaw<i>.</i></div></div><h1 class="title">${esc(scope)}</h1><p class="scope">Operational evidence report</p><p class="filters">${esc(filterLine)} · Generated ${esc(generated)}</p>${operationsBlock}${surveyBlock}<div class="footer">Prepared from the organisation's StrayPaw records. Aggregate programme totals and individually traceable records are kept distinct. This report excludes private reporter contact fields by default.</div></main></body></html>`;
}

export async function GET(request: Request) {
  const current = await actor(request); if (!current) return NextResponse.json({ error: "Organisation access required." }, { status: 401 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "report";
  const format = url.searchParams.get("format") ?? "xlsx";
  const category = url.searchParams.get("category") ?? "all";
  const status = url.searchParams.get("status");
  const locality = url.searchParams.get("locality")?.trim() || null;
  const scopeType = url.searchParams.get("scopeType") ?? "all";
  const scopeId = url.searchParams.get("scopeId") || null;
  const { from, to, fromMs, toMs } = parseDateRange(url);

  const [{ data: ngo }, { data: rawCases }, { data: rawAnimals }, { data: rawCare }] = await Promise.all([
    current.admin.from("ngos").select("id,name,logo_url,city,state").eq("id", current.ngoId).maybeSingle(),
    current.admin.from("cases").select("*, dogs(name,code,straypaw_id,species,zone,cover_photo,campaign_id)").eq("ngo_id", current.ngoId).order("last_activity_at", { ascending: false }).limit(10000),
    current.admin.from("dogs").select("*").eq("ngo_id", current.ngoId).order("last_seen", { ascending: false }).limit(10000),
    current.admin.from("medical_events").select("id,dog_id,case_id,kind,event_date,notes,performed_by,created_at,dogs!inner(name,code,straypaw_id,species,zone,cover_photo,campaign_id,ngo_id)").eq("dogs.ngo_id", current.ngoId).order("event_date", { ascending: false }).limit(10000),
  ]);

  let scope = "Organisation-wide report";
  let survey: any = null, surveyResponses: any[] = [], surveyAreas: any[] = [];
  if (scopeType === "campaign" && scopeId) {
    const { data } = await current.admin.from("campaigns").select("id,name,kind,starts_on,ends_on,zone").eq("id", scopeId).eq("ngo_id", current.ngoId).maybeSingle();
    if (data) scope = data.name;
  } else if (scopeType === "survey" && scopeId) {
    const { data } = await current.admin.from("surveys").select("*").eq("id", scopeId).eq("ngo_id", current.ngoId).maybeSingle();
    if (data) {
      survey = data; scope = data.title;
      const [{ data: responses }, { data: areas }] = await Promise.all([
        current.admin.from("survey_responses").select("*").eq("survey_id", scopeId).order("created_at", { ascending: false }).limit(10000),
        current.admin.from("survey_areas").select("*").eq("survey_id", scopeId).order("created_at"),
      ]);
      const filteredResponses = (responses ?? []).filter((r) => within(r.created_at, fromMs, toMs));
      const areaCounts = new Map<string, { responses: number; animals: number }>();
      for (const r of filteredResponses) if (r.area_id) { const v = areaCounts.get(r.area_id) ?? { responses: 0, animals: 0 }; v.responses += 1; v.animals += Number(r.count ?? 1); areaCounts.set(r.area_id, v); }
      surveyResponses = filteredResponses;
      surveyAreas = (areas ?? []).map((a) => ({ ...a, response_count: areaCounts.get(a.id)?.responses ?? 0, animal_count: areaCounts.get(a.id)?.animals ?? 0 }));
    }
  }

  const rawCaseRows = rawCases ?? [], rawAnimalRows = rawAnimals ?? [], rawCareRows = rawCare ?? [];
  const campaignOk = (campaignId: unknown, programmeId?: unknown) => scopeType !== "campaign" || !scopeId || campaignId === scopeId || programmeId === scopeId;
  const cases = rawCaseRows.filter((r: any) => within(r.source_event_at ?? r.created_at, fromMs, toMs) && campaignOk(r.dogs?.campaign_id, r.programme_id) && textMatch(r.zone ?? r.dogs?.zone, locality) && (category === "all" || category === "rescue" ? category === "all" || /rescue|intake|injury|medical|treatment/i.test(String(r.category ?? "")) : true) && (!status || status === "all" || (status === "open" ? !isClosed(r.status) : status === "completed" ? isClosed(r.status) : String(r.status).toLowerCase() === status.toLowerCase())));
  const care = rawCareRows.filter((r: any) => within(r.event_date ?? r.created_at, fromMs, toMs) && campaignOk(r.dogs?.campaign_id) && textMatch(r.dogs?.zone, locality) && (category === "all" || category === "rescue" ? category === "all" : careCategory(r.kind) === category));
  const includedIds = new Set<string>([...cases.map((r: any) => r.dog_id), ...care.map((r: any) => r.dog_id)].filter(Boolean));
  const animals = rawAnimalRows.filter((r: any) => (scopeType === "survey" ? false : (includedIds.size ? includedIds.has(r.id) : campaignOk(r.campaign_id)) && textMatch(r.zone, locality)));

  const period = from || to ? `${from ?? "Start"} to ${to ?? "Present"}` : "All time";
  if (format === "html") return new Response(brandedHtml({ ngo, scope, period, category, locality, status, cases, animals, care, survey, surveyResponses, surveyAreas }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

  const summary = [{ Organisation: ngo?.name ?? "Organisation", Scope: scope, Period: period, Category: category, Status: status ?? "all", Locality: locality ?? "all", "Cases / responses": survey ? surveyResponses.length : cases.length, "Animals in scope": survey ? surveyResponses.reduce((n, r) => n + Number(r.count ?? 1), 0) : animals.length, "Care events": survey ? "" : care.length, Generated: new Date().toISOString() }];
  const workbookData: Record<string, Record<string, unknown>[]> = survey ? {
    Summary: summary,
    "Project responses": surveyResponses.map((r) => ({ Date: r.created_at, Species: r.species ?? survey.species ?? "", Count: r.count ?? 1, Notes: r.notes ?? "", ...Object.fromEntries(Object.entries(r.attributes ?? {}).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v])) })),
    Areas: surveyAreas.map((a) => ({ Area: a.name, Code: a.code ?? "", Status: a.status ?? "", Target: a.target_count ?? "", Responses: a.response_count ?? 0, "Animals / observations": a.animal_count ?? 0 })),
  } : {
    Summary: summary,
    Cases: caseRows(cases),
    Animals: animalRows(animals),
    "Care history": careRows(care),
  };
  if (!survey && type === "story") workbookData["Story pack"] = buildStoryPack(animals, cases, care);

  const selected = type === "animals" && !survey ? { Summary: summary, Animals: workbookData.Animals } : type === "cases" && !survey ? { Summary: summary, Cases: workbookData.Cases } : type === "story" && !survey ? { Summary: summary, "Story pack": workbookData["Story pack"], Cases: workbookData.Cases, "Care history": workbookData["Care history"] } : workbookData;
  const date = new Date().toISOString().slice(0, 10);
  if (format === "csv") { const [name, rows] = Object.entries(selected).find(([name]) => name !== "Summary") ?? Object.entries(selected)[0]; return new Response(toCsv(rows as Record<string, unknown>[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="straypaw-${name.toLowerCase().replace(/\s+/g, "-")}-${date}.csv"`, "Cache-Control": "no-store" } }); }
  const book = XLSX.utils.book_new(); for (const [name, rows] of Object.entries(selected)) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="straypaw-${type}-${date}.xlsx"`, "Cache-Control": "no-store" } });
}
