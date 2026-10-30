"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Building2, CheckCircle2,
  Database, Download, ExternalLink, Globe2, HeartPulse, LockKeyhole,
  RefreshCw, ShieldCheck, Users, AlertTriangle
} from "lucide-react";
import "./founder.css";

type Count = number | null | undefined;
type Daily = { day: string; events: number; sessions: number };
type Org = {
  id: string; name: string; city: string | null; verified: boolean;
  partner_status: string | null; members: number; native_cases: number;
  historical_cases: number; audited_actors: number;
};
type Pilot = {
  id: string; ngo_id: string; organization: string; label: string; stage: string;
  started_on: string | null; ended_on: string | null; target_workflows: string[];
  baseline: Record<string, unknown>; success_criteria: Record<string, unknown>;
  notes: string | null; updated_at: string;
};
type Stats = {
  organizations: { registered: number; verified: number; operational_partners: number; with_members: number; memberships: number };
  organization_rows: Org[];
  cases: { total: number; imported: number; native_total: number; native_created: number; native_resolved: number; native_verified: number; first_action_documented: number; latest_created: string | null };
  care: { events_total: number; imported: number; native_created: number; native_verified: number | null; by_kind: { kind: string; count: number }[] };
  followups: { total: number; imported: number; native_completed: number; native_overdue: number };
  product: { events: number; identified_events: number; identified_users: number; sessions: number; browser_ids: number; last_event: string | null; by_name: { name: string; count: number }[] };
  daily_events: Daily[];
  report_funnel: { started: number; photo: number; located: number; details: number; submitted: number };
  operational_audit: { actions: number; identified_actions: number; identified_actors: number; organizations_with_identified_actions: number };
  pilots: Pilot[];
  coverage: { animals: number; historical_animals: number; public_dataset_animals: number; timeline_events: number; imports: number; latest_import: string | null };
  generated_at: string;
};
type Result = {
  environment: string; period: { days: number; from: string; to: string };
  analytics: Stats;
  authentication: { available: boolean; reason?: string; registered?: number; new_accounts?: number; last_signed_in_period?: number; last_signed_in_7d?: number; note?: string };
  web: { available: boolean; reason?: string; visitors?: number; pageviews?: number; source?: string };
  definitions: Record<string, string>;
};
type Section = "overview" | "traffic" | "users" | "orgs" | "pilots" | "care" | "coverage";
const SECTIONS: { id: Section; title: string; icon: typeof BarChart3 }[] = [
  { id: "overview", title: "Overview", icon: BarChart3 },
  { id: "traffic", title: "Acquisition", icon: Globe2 },
  { id: "users", title: "Users", icon: Users },
  { id: "orgs", title: "Organizations", icon: Building2 },
  { id: "pilots", title: "Pilots", icon: Activity },
  { id: "care", title: "Care & impact", icon: HeartPulse },
  { id: "coverage", title: "Data quality", icon: Database },
];
const STAGES = ["planned", "onboarding", "active", "paused", "completed", "sustained", "cancelled"];
const full = new Intl.NumberFormat("en-US");
const number = (n: Count) => typeof n === "number" && Number.isFinite(n) ? full.format(n) : "—";
const time = (s: string | null | undefined) => s
  ? new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC"
  : "Not recorded";
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function Metric({ title, value, detail, unavailable }: { title: string; value: Count; detail: string; unavailable?: boolean }) {
  return <div className="fi-metric">
    <span>{title}</span><strong>{number(value)}</strong>
    <small>{unavailable ? "Not yet reliably measurable · " : ""}{detail}</small>
  </div>;
}
function Panel({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return <section className="fi-panel">
    <div className="fi-panel-head"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div></div>
    {children}
  </section>;
}
function Note({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return <div className={`fi-note${warning ? " fi-warning" : ""}`}>
    {warning ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
    <span>{children}</span>
  </div>;
}
function Trend({ rows }: { rows: Daily[] }) {
  if (!rows.length) return <div className="fi-empty">No event days recorded in this period.</div>;
  const highest = Math.max(1, ...rows.map((r) => r.events));
  const width = 920, height = 190, xpad = 16, ypad = 16;
  const points = rows.map((r, i) => {
    const x = xpad + i * (width - 2 * xpad) / Math.max(1, rows.length - 1);
    const y = height - ypad - (r.events / highest) * (height - 2 * ypad);
    return `${x},${y}`;
  }).join(" ");
  return <div className="fi-trend">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily recorded product-event occurrences in selected period">
      <line x1={xpad} y1={height - ypad} x2={width - xpad} y2={height - ypad} stroke="#dfe6e3" />
      <polyline points={points} fill="none" stroke="#2d755b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {rows.map((r, i) => {
        const x = xpad + i * (width - 2 * xpad) / Math.max(1, rows.length - 1);
        const y = height - ypad - (r.events / highest) * (height - 2 * ypad);
        return <circle key={r.day} cx={x} cy={y} r="3" fill="#2d755b"><title>{r.day}: {r.events} events</title></circle>;
      })}
    </svg>
    <div className="fi-trend-labels"><span>{rows[0]?.day}</span><span>{rows[rows.length - 1]?.day}</span></div>
    <small>Product event occurrences, not website visitors or unique users</small>
  </div>;
}
function Bars({ rows, max = 10 }: { rows: { label: string; value: number }[]; max?: number }) {
  const visible = [...rows].sort((a, b) => b.value - a.value).slice(0, max);
  if (!visible.length) return <div className="fi-empty">No recorded values for this period.</div>;
  const peak = Math.max(1, ...visible.map((x) => x.value));
  return <div className="fi-bars">{visible.map((item) => <div className="fi-bar-row" key={item.label}>
    <span title={item.label}>{item.label.replaceAll("_", " ")}</span>
    <div className="fi-bar-track"><div className="fi-bar-fill" style={{ width: `${item.value * 100 / peak}%` }} /></div>
    <b>{number(item.value)}</b>
  </div>)}</div>;
}
function exportFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}
export function FounderDashboard() {
  const password = useRef("");
  const [credential, setCredential] = useState("");
  const [days, setDays] = useState(30);
  const [view, setView] = useState<Section>("overview");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [pilotName, setPilotName] = useState("");
  const [pilotStage, setPilotStage] = useState("planned");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (period: number, secret?: string) => {
    const token = secret ?? password.current;
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/founder?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        if (res.status === 401) password.current = "";
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setData(json as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read analytics");
    } finally { setLoading(false); }
  }, []);
  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const secret = credential.trim();
    if (!secret) return;
    password.current = secret;
    setCredential("");
    void load(days, secret);
  };
  const setPeriod = (n: number) => { setDays(n); void load(n); };
  const refresh = () => void load(days);
  const savePilot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg || !pilotName.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/founder", {
        method: "POST", headers: { Authorization: `Bearer ${password.current}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ngo_id: selectedOrg, label: pilotName.trim(), stage: pilotStage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to create pilot");
      setPilotName(""); setSelectedOrg(""); setPilotStage("planned");
      await load(days);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create pilot"); }
    finally { setSaving(false); }
  };
  const changeStage = async (id: string, stage: string) => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/founder", {
        method: "PATCH", headers: { Authorization: `Bearer ${password.current}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to update pilot");
      await load(days);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update pilot"); }
    finally { setSaving(false); }
  };
  const s = data?.analytics;
  const au = data?.authentication;
  const web = data?.web;
  const orgs = s?.organization_rows ?? [];

  if (!data && !loading && !password.current) return <div className="fi-root">
    <div className="fi-lock">
      <div className="fi-lock-icon"><LockKeyhole size={24} /></div>
      <p className="fi-eyebrow">STRAYPAW · PRIVATE OFFICE</p>
      <h1>Founder Intelligence</h1>
      <p>Real website traffic, authenticated users, organization adoption, pilot progress and verified care outcomes. Private reporting, no public access.</p>
      <form onSubmit={unlock}>
        <label htmlFor="fi-secret">Founder access password</label>
        <input id="fi-secret" type="password" autoComplete="off" value={credential} onChange={(e) => setCredential(e.target.value)} required placeholder="Enter administrator credential" />
        <button type="submit">Unlock dashboard <ArrowUpRight size={16} /></button>
      </form>
      {error && <p role="alert" className="fi-error">{error}</p>}
      <small>Protected by the existing StrayPaw admin credential. No password is stored in localStorage.</small>
    </div>
  </div>;

  return <div className="fi-root">
    <div className="fi-app">
      <aside className="fi-sidebar">
        <a className="fi-brand" href="/" aria-label="StrayPaw homepage"><span className="fi-brand-mark">S</span><span>StrayPaw<small>Founder Office</small></span></a>
        <p className="fi-sidebar-label">INTELLIGENCE</p>
        <nav aria-label="Founder analytics sections">{SECTIONS.map((x) => {
          const Icon = x.icon;
          return <button key={x.id} type="button" aria-current={view === x.id ? "page" : undefined}
            onClick={() => setView(x.id)}><Icon size={17} />{x.title}</button>;
        })}</nav>
        <div className="fi-sidebar-foot"><LockKeyhole size={14} /> Private, administrator-only <a href="/">Return to StrayPaw</a></div>
      </aside>
      <main className="fi-content">
        <header className="fi-header">
          <div><p className="fi-eyebrow">FOUNDER INTELLIGENCE / {view.toUpperCase()}</p>
            <h1>{SECTIONS.find((x) => x.id === view)?.title}</h1>
            <p>Measure the platform, not just the database.</p></div>
          <div className="fi-actions">
            <div className="fi-period" role="group" aria-label="Reporting window">
              {[7, 30, 90].map((n) => <button key={n} type="button" aria-pressed={days === n} onClick={() => setPeriod(n)}>{n}d</button>)}
            </div>
            <button className="fi-tool" type="button" onClick={refresh} aria-label="Refresh analytics" disabled={loading}><RefreshCw size={17} /></button>
            <button className="fi-tool" type="button" disabled={!data} onClick={() => data && exportFile(`straypaw-intelligence-${days}d.json`, JSON.stringify(data, null, 2), "application/json")} aria-label="Export JSON"><Download size={17} /></button>
          </div>
        </header>
        {data && <div className="fi-meta">
          <span className={data.environment === "production" ? "fi-env" : "fi-env fi-env-preview"}>{data.environment === "production" ? "Production" : `Environment: ${data.environment}`}</span>
          <span>Rolling {data.period.days} days</span><span>Last calculated {time(s?.generated_at)}</span>
          {loading && <span>Refreshing…</span>}
        </div>}
        {data && data.environment !== "production" && <Note warning>Non-production environment. QA fixtures and staging records must not be treated as StrayPaw production activity.</Note>}
        {error && <div className="fi-error" role="alert">{error} <button type="button" onClick={refresh}>Retry</button></div>}
        {loading && !data && <div className="fi-loading"><RefreshCw size={20} /> Reading authorized analytics…</div>}
        {!s ? null : <>
          {view === "overview" && <>
            <div className="fi-metrics">
              <Metric title="Website visitors" value={web?.available ? web.visitors : null} detail={web?.available ? "Vercel analytics · period" : "Vercel connection required"} unavailable={!web?.available} />
              <Metric title="Pageviews" value={web?.available ? web.pageviews : null} detail="Not distinct visitors" unavailable={!web?.available} />
              <Metric title="Registered accounts" value={au?.available ? au.registered : null} detail="Supabase Auth, all time" unavailable={!au?.available} />
              <Metric title="New signups" value={au?.available ? au.new_accounts : null} detail="Selected period" unavailable={!au?.available} />
              <Metric title="Native cases created" value={s.cases.native_created} detail="Excludes historical imports" />
              <Metric title="Verified native resolutions" value={s.cases.native_verified} detail="Cases with evidence verified" />
            </div>
            <div className="fi-two">
              <Panel title="Product activity" caption="Actual first-party event occurrences"><Trend rows={s.daily_events} /></Panel>
              <Panel title="Executive signal" caption="Separating data coverage from product adoption">
                <div className="fi-signal"><span>Authenticated event users</span><b>{number(s.product.identified_users)}</b></div>
                <div className="fi-signal"><span>Org members</span><b>{number(s.organizations.memberships)}</b></div>
                <div className="fi-signal"><span>Imported historical cases</span><b>{number(s.cases.imported)}</b></div>
                <div className="fi-signal"><span>Actor-attributed audit orgs</span><b>{number(s.operational_audit.organizations_with_identified_actions)}</b></div>
                <Note>Actor-attributed audit activity is diagnostic. It does not establish weekly active organizations until event coverage and qualifying action types are verified.</Note>
              </Panel>
            </div>
            <div className="fi-two">
              <Panel title="Care operations · period"><div className="fi-metrics fi-metrics-in">
                <Metric title="Native case resolutions" value={s.cases.native_resolved} detail="Resolution timestamp in period" />
                <Metric title="Native clinical events" value={s.care.native_created} detail="Not unique treated animals" />
                <Metric title="Completed native follow-ups" value={s.followups.native_completed} detail="Verified workflow status not implied" />
                <Metric title="Overdue native follow-ups" value={s.followups.native_overdue} detail="Requires operational review" />
              </div></Panel>
              <Panel title="Data integrity"><div className="fi-metrics fi-metrics-in">
                <Metric title="Animal records" value={s.coverage.animals} detail="Excluding explicit demos" />
                <Metric title="Historical case records" value={s.cases.imported} detail="Coverage only" />
                <Metric title="Imported clinical events" value={s.care.imported} detail="Not platform-generated impact" />
                <Metric title="Import batches" value={s.coverage.imports} detail="All time" />
              </div></Panel>
            </div>
          </>}
          {view === "traffic" && <>
            <div className="fi-metrics fi-metrics-short">
              <Metric title="Visitors" value={web?.available ? web.visitors : null} detail="Privacy-preserving Vercel measure" unavailable={!web?.available}/>
              <Metric title="Pageviews" value={web?.available ? web.pageviews : null} detail="All measured pages" unavailable={!web?.available}/>
              <Metric title="Tracked landing events" value={s.product.by_name.find(x => x.name === "landing_view")?.count ?? 0} detail="First-party events, different methodology"/>
            </div>
            <Panel title="Website analytics source" caption="Traffic is never derived from anonymous event IDs">
              {web?.available ? <Note>Web traffic was read from {web.source === "vercel_live" ? "the live Vercel API" : "a Vercel API snapshot"} for the selected period.</Note>
                : <Note warning>{web?.reason ?? "Traffic is not configured."} Add FOUNDER_VERCEL_ANALYTICS_TOKEN to the server environment to enable live traffic statistics.</Note>}
              <a className="fi-external" target="_blank" rel="noreferrer" href="https://vercel.com/jaykapoor700-1687s-projects/pok-mon-go-dog/analytics">
                View full acquisition, countries, devices and referrers in Vercel <ExternalLink size={15}/></a>
            </Panel>
            <Panel title="Landing event activity" caption="This is an instrumentation check, not a visitor count">
              <Bars rows={s.product.by_name.filter(x => x.name.endsWith("view") || x.name === "page_view").map(x => ({label:x.name,value:x.count}))} />
            </Panel>
          </>}
          {view === "users" && <>
            <div className="fi-metrics fi-metrics-short">
              <Metric title="Registered accounts" value={au?.available ? au.registered : null} detail="All time" unavailable={!au?.available}/>
              <Metric title="New accounts" value={au?.available ? au.new_accounts : null} detail="Selected period" unavailable={!au?.available}/>
              <Metric title="Last sign-in in period" value={au?.available ? au.last_signed_in_period : null} detail="Not operationally active users" unavailable={!au?.available}/>
              <Metric title="Qualified WAU" value={null} detail="Awaiting complete actor-attributed workflow instrumentation" unavailable />
            </div>
            <div className="fi-two">
              <Panel title="Recorded product events"><Bars rows={s.product.by_name.map(x=>({label:x.name,value:x.count}))} max={14}/></Panel>
              <Panel title="Community reporting journey" caption="Distinct sessions containing a report start">
                <Bars rows={Object.entries(s.report_funnel).map(([label,value])=>({label,value}))} />
                <Note>Reporting-stage counts are observed stages within sessions that started. They are not guaranteed to be ordered or represent successful case creation.</Note>
              </Panel>
            </div>
            <Note warning>Sign-in and event counts cannot alone establish meaningful weekly active users. This metric stays unavailable until the platform records qualified actions with verified actor identity.</Note>
          </>}
          {view === "orgs" && <>
            <div className="fi-metrics fi-metrics-short">
              <Metric title="Organization records" value={s.organizations.registered} detail="Demo-mode records excluded" />
              <Metric title="Verified records" value={s.organizations.verified} detail="Verification flag" />
              <Metric title="Organizations with members" value={s.organizations.with_members} detail="Linked memberships, all time" />
              <Metric title="Weekly active orgs" value={null} detail="Incomplete qualifying-action coverage" unavailable />
            </div>
            <Panel title="Organization adoption" caption="Select an organization for activity detail. Historical records and verified membership are separate.">
              <div className="fi-table-wrap"><table className="fi-table"><thead><tr><th>Organization</th><th>Status</th><th>Members</th><th>Native cases</th><th>Imported cases</th><th>Audited actors</th></tr></thead>
                <tbody>{orgs.map((o) => <tr key={o.id} className="fi-row-click" onClick={()=>setSelectedOrg(o.id)}><td><b>{o.name}</b><small>{o.city ?? "City not recorded"}</small></td><td>{o.partner_status ?? "Unclassified"}{o.verified ? " · verified" : ""}</td><td>{number(o.members)}</td><td>{number(o.native_cases)}</td><td>{number(o.historical_cases)}</td><td>{number(o.audited_actors)}</td></tr>)}</tbody>
              </table></div>
              {!orgs.length && <div className="fi-empty">No organizations in this environment.</div>}
            </Panel>
            {selectedOrg && orgs.some(o => o.id === selectedOrg) && <Panel title={orgs.find(o=>o.id===selectedOrg)?.name ?? "Organization"}>
              <p className="fi-small">This organization's case counts are restricted to the selected period. Membership and historical case inventory are all-time counts. Audited actors are not necessarily active users.</p>
              <button className="fi-secondary" type="button" onClick={()=>setSelectedOrg("")}>Close detail</button>
            </Panel>}
            <Note>Organizations in the directory or source registry must not be automatically categorized as active pilots or active users.</Note>
          </>}
          {view === "pilots" && <>
            <div className="fi-metrics fi-metrics-short">
              <Metric title="Registered pilots" value={s.pilots.length} detail="Explicit pilot records"/>
              <Metric title="Active pilots" value={s.pilots.filter(x=>x.stage==="active").length} detail="Founder-maintained pilot stages"/>
              <Metric title="Sustained use" value={s.pilots.filter(x=>x.stage==="sustained").length} detail="Manually verified stage"/>
            </div>
            <div className="fi-two">
              <Panel title="Pilot pipeline" caption="Only real manually registered pilots appear here">
                {s.pilots.length ? <div className="fi-pilot-list">{s.pilots.map((p) => <div className="fi-pilot" key={p.id}>
                  <div><b>{p.label}</b><small>{p.organization} · {p.started_on ?? "Start date not recorded"}</small></div>
                  <label>Stage <select disabled={saving} value={p.stage} onChange={(e)=>void changeStage(p.id,e.target.value)}>{STAGES.map(stage=><option key={stage} value={stage}>{stage}</option>)}</select></label>
                </div>)}</div> : <div className="fi-empty">No registered pilots. Existing partner records are not automatically counted as pilots.</div>}
              </Panel>
              <Panel title="Register a real pilot" caption="Create only after an organization has agreed to the pilot">
                <form className="fi-pilot-form" onSubmit={savePilot}>
                  <label>Organization <select required value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>
                    <option value="">Select an existing organization</option>
                    {orgs.filter(o=>o.verified).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select></label>
                  <label>Pilot name <input maxLength={160} minLength={2} required value={pilotName} onChange={e=>setPilotName(e.target.value)} placeholder="e.g. Rescue intake field pilot" /></label>
                  <label>Current stage <select value={pilotStage} onChange={e=>setPilotStage(e.target.value)}>{STAGES.map(stage=><option key={stage} value={stage}>{stage}</option>)}</select></label>
                  <button type="submit" disabled={saving || !selectedOrg || !pilotName.trim()}>{saving ? "Saving…" : "Create pilot"}</button>
                </form>
              </Panel>
            </div>
            <Note>Stages are staff-maintained and do not by themselves prove operational usage. Activity and clinical outcomes must come from underlying source records.</Note>
          </>}
          {view === "care" && <>
            <div className="fi-metrics">
              <Metric title="Native cases created" value={s.cases.native_created} detail="Intake in period" />
              <Metric title="Native cases resolved" value={s.cases.native_resolved} detail="Resolved date in period" />
              <Metric title="Evidence-verified resolutions" value={s.cases.native_verified} detail="Explicit proof verification" />
              <Metric title="Native medical events" value={s.care.native_created} detail="Not unique animals" />
              <Metric title="Completed follow-ups" value={s.followups.native_completed} detail="Non-imported records" />
              <Metric title="Verified clinical impact" value={null} detail="Needs deduplicated verification methodology" unavailable />
            </div>
            <div className="fi-two"><Panel title="Native clinical activities" caption="Classification by procedure, not by animal">
              <Bars rows={s.care.by_kind.map(x=>({label:x.kind,value:x.count}))} />
            </Panel><Panel title="Care-record integrity">
              <div className="fi-signal"><span>All case records</span><b>{number(s.cases.total)}</b></div>
              <div className="fi-signal"><span>Historical imported cases</span><b>{number(s.cases.imported)}</b></div>
              <div className="fi-signal"><span>Historical imported clinical events</span><b>{number(s.care.imported)}</b></div>
              <div className="fi-signal"><span>Imported follow-ups</span><b>{number(s.followups.imported)}</b></div>
            </Panel></div>
            <Note warning>Historical care is labeled as documented historical activity. Native records alone do not prove StrayPaw caused the outcome or saved staff time.</Note>
          </>}
          {view === "coverage" && <>
            <div className="fi-metrics">
              <Metric title="Animal records" value={s.coverage.animals} detail="Explicit demos excluded" />
              <Metric title="Historical animal imports" value={s.coverage.historical_animals} detail="Historical provenance" />
              <Metric title="Public dataset animals" value={s.coverage.public_dataset_animals} detail="External records" />
              <Metric title="Animal timeline events" value={s.coverage.timeline_events} detail="Event occurrences" />
              <Metric title="Data import batches" value={s.coverage.imports} detail="All time" />
              <Metric title="Last completed import" value={null} detail={time(s.coverage.latest_import)} unavailable />
            </div>
            <Panel title="Data source audit">
              <div className="fi-signal"><span>Native cases · all time</span><b>{number(s.cases.native_total)}</b></div>
              <div className="fi-signal"><span>Imported cases · all time</span><b>{number(s.cases.imported)}</b></div>
              <div className="fi-signal"><span>Historical clinical events</span><b>{number(s.care.imported)}</b></div>
              <div className="fi-signal"><span>Event records in selected period</span><b>{number(s.product.events)}</b></div>
              <Note>The app does not infer unique animal outcomes from treatment-event counts. Cohort validation and source attribution are required before investor-facing impact claims.</Note>
            </Panel>
          </>}
          <footer className="fi-footer">
            <span><CheckCircle2 size={14} /> Source-aware reporting · no fabricated metrics</span>
            <button type="button" onClick={() => {
              const rows = [["organization","partner_status","verified","members","native_cases","historical_cases","audited_actors"],
                ...orgs.map(o=>[o.name,o.partner_status,o.verified,o.members,o.native_cases,o.historical_cases,o.audited_actors])];
              exportFile(`straypaw-organizations-${days}d.csv`, rows.map(row=>row.map(csvCell).join(",")).join("\n"), "text/csv");
            }}><Download size={14} /> Export organization CSV</button>
          </footer>
        </>}
      </main>
    </div>
  </div>;
}
