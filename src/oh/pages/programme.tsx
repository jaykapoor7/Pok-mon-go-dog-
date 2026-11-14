"use client";

/* A programme, seen whole. The same pages serve a city pilot, a municipal
   ABC programme and a state that oversees several cities: what each shows
   follows from the programme's modules and the person's role, never from
   which city it is. Human counts below the programme's threshold are
   suppressed by the database before they reach the browser. */
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, MapPin, Plus, Printer } from "lucide-react";
import { Btn, Lanes, More, Note, Panel, Props, Split, Stats, Table, Tag, Tools, type Col, type Lane } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { usePlaces, oversees } from "../places";
import { call, fmtDate, fmtTime, num, relDay, select, showCount, useNames, useRead, AUDIENCE, HANDOFF, HANDOFF_KIND, KIND_LABEL, MODULES, ROLE_LABEL, SERVICE_LABEL, SERVICE_SHORT, SERVICE_STATUS, type Alert, type Area, type Count, type Handoff, type Kind, type Network, type NetworkFacility, type Overview, type Role } from "../data";
import { AlertList, Bars, Chip, Empty, Failed, figure, Glyph, Head, Loading, Meter, Page, Row, Rows, Section, Sheet, toneOf, useToast } from "../ui";
import { AreaIntel } from "../AreaMap";
import { OrgMark } from "@/components/orgs/OrgMark";
import { getSupabase } from "@/lib/supabase";

type Prog = { id: string; slug: string; name: string; parent_id: string | null; summary: string | null; status: string; vaccination_target: number; config: { modules?: string[]; suppress_below?: number; followup_due_days?: number; dog_revaccination_days?: number; alert_window_days?: number }; plan: string; illustrative: boolean; time_zone: string };
const ALL_MODULES = ["bite_care", "laboratory", "followups", "vaccination", "services", "training"];
const modulesOf = (p: Prog) => p.config?.modules ?? ALL_MODULES;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const STATUS: Record<string, string> = { planning: "Planning", pilot: "Pilot", active: "Active", closed: "Closed" };

function useProgramme() {
  const { slug } = useParams<{ slug: string }>();
  const prog = useRead<Prog[]>(() => select<Prog>("oh_programmes", { slug }, "id,slug,name,parent_id,summary,status,vaccination_target,config,plan,illustrative,time_zone", 1), `p:${slug}`);
  return { slug, prog: prog.data?.[0] ?? null, loading: prog.loading, error: prog.error, reload: prog.reload };
}

/** What every programme page shares: the programme itself, read once, or a plain reason it cannot be shown. */
function Frame({ children, wide = false, narrow = false }: { children: (p: Prog, reload: () => void) => ReactNode; wide?: boolean; narrow?: boolean }) {
  const { prog, loading, error, reload } = useProgramme();
  if (loading && !prog) return <Page wide={wide} narrow={narrow}><Loading rows={5} /></Page>;
  if (error) return <Page><Failed error={error} retry={reload} /></Page>;
  if (!prog) return <Page><Empty title="This programme is not visible to you">Only organisations taking part in a programme can open it.</Empty></Page>;
  return <Page illustrative={prog.illustrative} wide={wide} narrow={narrow}>{children(prog, reload)}</Page>;
}
const KIND_PLAN: Record<string, string> = { pilot: "Pilot programme", programme: "City programme", state: "State programme", national: "National programme" };

/* ── Overview ──────────────────────────────────────────────────────── */
export function ProgrammeOverview() { return <Suspense><Frame wide>{(p) => <OverviewBody p={p} />}</Frame></Suspense>; }

const PERIODS: Lane<string>[] = [{ id: "30", label: "30 days" }, { id: "90", label: "90 days" }, { id: "365", label: "12 months" }];
function PeriodPicker() {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  const days = sp.get("days") ?? "90";
  return <Lanes label="Period" lanes={PERIODS} value={days} onChange={(v) => router.replace(`${path}?days=${v}`)} />;
}

function OverviewBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const days = Number(sp.get("days") ?? 90);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `ov:${p.id}:${days}`);
  const alerts = useRead<Alert[]>(() => call("oh_alerts", { p_programme: p.id }), `al:${p.id}`);
  const { places } = usePlaces();
  const canAck = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("ack_alert"));
  const mods = modulesOf(p);
  const marks = useMarks(p.id);
  const open = (alerts.data ?? []).filter((a) => !a.ack), urgent = open.filter((a) => a.severity === "urgent").length;
  const head = <Head title="Overview" lede={<><b>{p.name}</b> · {KIND_PLAN[p.plan] ?? "Programme"}, {(STATUS[p.status] ?? p.status).toLowerCase()}. {alerts.error ? "What needs a decision could not be read." : !alerts.data ? "Reading what needs a decision…" : open.length ? <><b>{open.length}</b> {open.length === 1 ? "thing needs" : "things need"} a decision{urgent ? <>, <span className="is-hot">{urgent} urgent</span></> : null}.</> : "Nothing needs a decision."}</>} actions={<PeriodPicker />} />;
  if (o.loading && !o.data) return <>{head}<Loading rows={6} /></>;
  if (o.error || !o.data) return <>{head}<Failed error={o.error ?? "Could not read the programme."} retry={o.reload} /></>;
  const d = o.data;
  const weeks = (d.exposures?.by_week ?? []).map((w) => ({ x: fmtDate(w.week, { day: "numeric", month: "short" }), n: w.n }));
  const alertHref = (a: Alert) => a.kind === "positive_result" ? `/programme/${p.slug}/work` : a.kind === "pep_readiness" ? `/programme/${p.slug}/network` : a.kind === "coverage_below_target" ? `/programme/${p.slug}/coverage` : a.kind === "followups_overdue" ? `/programme/${p.slug}/work?show=overdue` : null;
  const stats = [
    ...(mods.includes("bite_care") && d.exposures ? [figure("Bite exposures", d.exposures.total, { note: <>Category III: {showCount(d.exposures.category_iii)}</> })] : []),
    ...(mods.includes("bite_care") && d.pep ? [figure("Courses completed", d.pep.completion_rate === null ? null : pct(d.pep.completion_rate), { note: d.pep.completion_rate === null ? "Too few closed courses to show" : `Did not return: ${showCount(d.pep.lost)}`, tone: d.pep.completion_rate !== null && d.pep.completion_rate < 0.8 ? "amber" : "green" })] : []),
    ...(mods.includes("bite_care") && d.exposures ? [figure("Wounds washed", num(d.exposures.washed_known) ? pct(num(d.exposures.washed) / num(d.exposures.washed_known)) : null, { note: "Where it was recorded" })] : []),
    ...(mods.includes("laboratory") ? [figure("Laboratory-confirmed", d.samples.positive, { note: `${d.samples.total} samples · ${d.samples.waiting} waiting${d.samples.median_days_to_result === null ? "" : ` · ${Math.round(d.samples.median_days_to_result * 10) / 10} days to a result`}`, tone: d.samples.positive ? "flame" : undefined, href: `/programme/${p.slug}/work` })] : []),
    ...(mods.includes("services") ? [figure("Care facilities", d.services.facilities, { note: `${d.services.arv_unavailable} without vaccine · ${d.services.stale} confirmations expired`, href: `/programme/${p.slug}/network`, tone: d.services.arv_unavailable ? "flame" : d.services.stale ? "amber" : undefined })] : []),
  ];
  return (
    <>
      {head}
      <Section title="Needs a decision">
        {alerts.loading && !alerts.data ? <Loading rows={2} /> : alerts.error ? <Failed error={alerts.error} retry={alerts.reload} /> : <Panel><AlertList alerts={alerts.data ?? []} programmeId={p.id} onChange={alerts.reload} canAck={canAck} hrefFor={alertHref} limit={4} /></Panel>}
      </Section>
      {stats.length ? <Section title={`The last ${days === 365 ? "12 months" : `${days} days`}`}><Stats items={stats} label="Programme figures" /></Section> : null}

      {mods.includes("bite_care") || mods.includes("laboratory") ? (
        <Section title="Where to act" note="Bites, confirmed cases and dog vaccination, by area">
          <AreaIntel programme={p.id} slug={p.slug} d={d} />
        </Section>
      ) : null}

      <Section title="Partners" count={d.partners.length}>
        <PartnerWork partners={d.partners} marks={marks} />
      </Section>

      {d.children.length ? (
        <Section title="Programmes in this one" note="Each city keeps its own records; this view sums what they share">
          <Panel><Rows label="Programmes in this one">{d.children.map((c) => <Row key={c.slug} href={`/programme/${c.slug}`} title={c.name} meta={`${STATUS[c.status] ?? c.status} · bites ${showCount(c.exposures)} · confirmed cases ${c.positives} · overdue work ${c.overdue}`} />)}</Rows></Panel>
        </Section>
      ) : null}
      {mods.includes("bite_care") && d.exposures ? <Section title="Bites by week" fold="weeks" open={false} note="Hatched: fewer than the threshold"><Bars points={weeks} label="Bite exposures by week" /></Section> : null}
      {mods.includes("training") ? <Training p={p} d={d} reload={o.reload} /> : null}
    </>
  );
}

/* Partners: the ones with open work, most overdue first; the rest in one line that opens the full list. */
function PartnerWork({ partners, marks }: { partners: Overview["partners"]; marks: Record<string, string> }) {
  const [all, setAll] = useState(false);
  const busy = partners.filter((x) => x.open || x.overdue).sort((a, b) => b.overdue - a.overdue || b.open - a.open);
  const clear = partners.filter((x) => !x.open && !x.overdue);
  const shown = all ? [...busy, ...clear] : busy;
  const cols: Col<Overview["partners"][number]>[] = [
    { key: "name", label: "Partner", width: "minmax(0, 1.2fr)", render: (x) => <span className="oh-cov"><Mark kind={x.kind} name={x.name} url={marks[x.id]} />{x.name}</span> },
    { key: "does", label: "Responsible for", width: "minmax(0, 2fr)", render: (x) => x.responsibilities ?? KIND_LABEL[x.kind] },
    { key: "open", label: "Open", width: "96px", keep: true, align: "end", render: (x) => x.overdue ? <Tag tone="flame">{x.overdue} overdue</Tag> : x.open ? `${x.open} open` : <Tag tone="green">Clear</Tag> },
  ];
  return (
    <>
      {shown.length ? <Panel><Table label="Partners" cols={cols} rows={shown} rowKey={(x) => x.id} /></Panel> : null}
      {clear.length ? <button type="button" className="k-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? "Show only partners with open work" : busy.length ? `${clear.length} more ${clear.length === 1 ? "partner has" : "partners have"} nothing open` : `All ${clear.length} partners: nothing open`}</button> : null}
    </>
  );
}

function Training({ p, d, reload }: { p: Prog; d: Overview; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { places } = usePlaces();
  const can = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("record_training"));
  return (
    <Section title="Training" fold="training" open={false} note={`${d.training.sessions} sessions · ${d.training.participants} people`} action={can ? <Btn small icon={<Plus size={14} />} onClick={() => setOpen(true)}>Record a session</Btn> : undefined}>
      {Object.keys(d.training.by_audience).length ? (
        <Panel><Rows label="Training by audience">{Object.entries(d.training.by_audience).map(([k, v]) => <Row key={k} title={AUDIENCE[k] ?? k} end={<span className="num">{v} people</span>} />)}</Rows></Panel>
      ) : <Empty title="No training recorded in this period" />}
      {open ? <TrainingSheet p={p} onClose={() => setOpen(false)} onDone={() => { setOpen(false); toast("Training session recorded."); reload(); }} /> : null}
    </Section>
  );
}

function TrainingSheet({ p, onClose, onDone }: { p: Prog; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", audience: "healthcare", on: new Date().toLocaleDateString("en-CA"), n: "", inst: "", notes: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_record_training", { p_programme: p.id, p_title: f.title, p_audience: f.audience, p_held_on: f.on, p_participants: Number(f.n || 0), p_institutions: f.inst ? Number(f.inst) : null, p_notes: f.notes || null });
    setBusy(false); if (r.error) setErr(r.error); else onDone();
  };
  return (
    <Sheet title="Record a training session" onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || f.title.trim().length < 3} onClick={() => void save()}>Save</Btn></>}>
      <label className="oh-field"><span>Title</span><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="oh-field"><span>Audience</span><select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className="oh-fields">
        <label className="oh-field"><span>Held on</span><input type="date" value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></label>
        <label className="oh-field"><span>People trained</span><input inputMode="numeric" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value.replace(/\D/g, "") })} /></label>
        <label className="oh-field"><span>Institutions reached</span><input inputMode="numeric" value={f.inst} onChange={(e) => setF({ ...f, inst: e.target.value.replace(/\D/g, "") })} /></label>
      </div>
      <label className="oh-field"><span>Notes</span><textarea value={f.notes} maxLength={600} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/* ── Care network: map, readiness and referral pathways ───────────── */
export function ProgrammeNetwork() { return <Frame wide>{(p) => <NetworkBody p={p} />}</Frame>; }

const statusOf = (f: NetworkFacility, svc: string) => f.services.find((s) => s.service === svc)?.status ?? null;
/* Marks on the map are drawn outside the page, so they carry Notion's own mark colours rather than a theme variable. */
const PIN = { ok: "#448361", part: "#cb912f", none: "#d44c47", wash: "#337ea9", lab: "#9065b0" };
function tone(f: NetworkFacility): string {
  if (f.kind === "laboratory") return PIN.lab;
  const arv = statusOf(f, "arv"), wc = statusOf(f, "wound_care");
  if (arv === "unavailable") return PIN.none;
  if (arv === "available") return PIN.ok;
  if (!arv && wc === "available") return PIN.wash;
  return PIN.part;
}

function NetworkBody({ p }: { p: Prog }) {
  const net = useRead<Network>(() => call("oh_programme_network", { p_programme: p.id }), `net:${p.id}`);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const head = (sum: ReactNode) => <Head title="Hospitals" lede={sum} />;
  if (net.loading && !net.data) return <>{head("Reading the care network…")}<Loading rows={5} /></>;
  if (net.error || !net.data) return <>{head("The care network could not be read.")}<Failed error={net.error ?? "Could not read the network."} retry={net.reload} /></>;
  const n = net.data;
  const byId = new Map(n.facilities.map((f) => [f.id, f]));
  const remove = async (r: Network["referrals"][number]) => {
    const x = await call("oh_set_referral", { p_programme: p.id, p_from: r.from, p_to: r.to, p_service: r.service, p_note: null, p_remove: true });
    if (x.error) toast(x.error, "flame"); else { toast("Referral pathway removed."); net.reload(); }
  };
  const care = n.facilities.filter((f) => f.kind !== "laboratory");
  const noVac = care.filter((f) => statusOf(f, "arv") === "unavailable").length, unconfirmed = care.filter((f) => !f.services.length).length;
  type Ref = Network["referrals"][number];
  const refCols: Col<Ref>[] = [
    { key: "from", label: "From", width: "minmax(0, 1.4fr)", render: (r) => byId.get(r.from)?.name ?? "A partner" },
    { key: "for", label: "For", width: "minmax(0, 1fr)", keep: true, render: (r) => SERVICE_LABEL[r.service] },
    { key: "to", label: "To", width: "minmax(0, 1.4fr)", render: (r) => byId.get(r.to)?.name ?? "A partner" },
    { key: "note", label: "Note", width: "minmax(0, 1fr)", render: (r) => r.note ?? "" },
    ...(n.can_configure ? [{ key: "act", label: "", width: "88px", align: "end" as const, keep: true, render: (r: Ref) => <Btn small variant="quiet" onClick={() => void remove(r)}>Remove</Btn> }] : []),
  ];
  return (
    <>
      {head(<><b>{care.length}</b> care {care.length === 1 ? "facility" : "facilities"}{noVac ? <>, <span className="is-hot">{noVac} without vaccine</span></> : null}{unconfirmed ? <>, {unconfirmed} with no service confirmed</> : null}. Availability is what each facility confirmed, with its date.</>)}
      <Split side={
        <div className="oh-facs" tabIndex={0} role="region" aria-label="Facilities">
          <Panel>
            <Rows label="Facilities">
              {n.facilities.map((f) => {
                const refers = n.referrals.filter((r) => r.from === f.id);
                return <Row key={f.id} on={sel === f.id} onHover={() => setSel(f.id)} title={f.name}
                  meta={<>{KIND_LABEL[f.kind]}{f.area ? ` · ${f.area}` : ""}{f.hours ? ` · ${f.hours}` : ""}{f.kind !== "laboratory" && f.active_courses !== null ? ` · in a course: ${showCount(f.active_courses)}` : ""}{f.lat === null ? " · not on the map" : ""}{refers.length ? ` · sends people for ${refers.map((r) => `${(SERVICE_LABEL[r.service] ?? r.service).toLowerCase()} to ${byId.get(r.to)?.short_name ?? byId.get(r.to)?.name ?? "a partner"}`).join("; ")}` : ""}</>}
                  end={f.services.length ? f.services.map((s) => <Chip key={s.service} tone={SERVICE_STATUS[s.status]?.tone}>{SERVICE_SHORT[s.service] ?? s.service}: {SERVICE_STATUS[s.status]?.label ?? s.status}</Chip>) : <Tag tone="amber">No service confirmed</Tag>} />;
              })}
            </Rows>
          </Panel>
        </div>}>
        <NetworkMap facilities={n.facilities} referrals={n.referrals} selected={sel} onSelect={setSel} />
      </Split>

      <Section title="Referral pathways" note="Where a place sends people for a service it does not offer" action={n.can_configure ? <Btn small icon={<Plus size={14} />} onClick={() => setAdding(true)}>Add a pathway</Btn> : undefined}>
        {n.referrals.length ? <Panel><Table label="Referral pathways" cols={refCols} rows={n.referrals} rowKey={(r) => `${r.from}${r.to}${r.service}`} /></Panel>
          : <Empty title="No referral pathways yet">Add one so a health centre without immunoglobulin knows where to send people.</Empty>}
      </Section>
      <p className="oh-foot">Availability is what each facility confirmed, for up to a week at a time. StrayPaw is <b>not connected</b> to any stock system. Area boundaries are not loaded, so the map shows places, not wards.</p>
      {adding ? <ReferralSheet p={p} facilities={n.facilities} onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast("Referral pathway saved."); net.reload(); }} /> : null}
    </>
  );
}

function ReferralSheet({ p, facilities, onClose, onDone }: { p: Prog; facilities: NetworkFacility[]; onClose: () => void; onDone: () => void }) {
  const fac = facilities.filter((f) => f.kind !== "laboratory");
  const [from, setFrom] = useState(fac[0]?.id ?? ""), [to, setTo] = useState(fac[1]?.id ?? ""), [svc, setSvc] = useState("rig"), [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); setErr(null); const r = await call("oh_set_referral", { p_programme: p.id, p_from: from, p_to: to, p_service: svc, p_note: note || null, p_remove: false }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title="Add a referral pathway" onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || !from || !to || from === to} onClick={() => void save()}>Save</Btn></>}>
      <label className="oh-field"><span>From</span><select value={from} onChange={(e) => setFrom(e.target.value)}>{fac.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label className="oh-field"><span>For</span><select value={svc} onChange={(e) => setSvc(e.target.value)}>{["rig", "arv", "wound_care"].map((s) => <option key={s} value={s}>{SERVICE_LABEL[s]}</option>)}</select></label>
      <label className="oh-field"><span>To</span><select value={to} onChange={(e) => setTo(e.target.value)}>{fac.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label className="oh-field"><span>Note (optional)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="For example: category III exposures" /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/** Places on StrayPaw's own map ground, coloured by what they confirmed;
    referral pathways drawn as lines. Nothing is drawn where nothing was recorded. */
function NetworkMap({ facilities, referrals, selected, onSelect }: { facilities: NetworkFacility[]; referrals: Network["referrals"]; selected: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<Map<string, HTMLButtonElement>>(new Map());
  const placed = useMemo(() => facilities.filter((f) => f.lat !== null && f.lng !== null), [facilities]);
  useEffect(() => {
    if (!el.current || !placed.length) return;
    let map: import("maplibre-gl").Map | null = null, gone = false;
    const pins = markers.current;
    void Promise.all([import("maplibre-gl"), import("@/sp/map/ground")]).then(([ml, g]) => {
      if (gone || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); /* without it the referral lines (GeoJSON) never load */
      const lng = placed.map((f) => f.lng!), lat = placed.map((f) => f.lat!);
      map = new ml.Map({ container: el.current, style: { ...g.groundStyle(), glyphs: g.GLYPHS }, bounds: [[Math.min(...lng) - 0.03, Math.min(...lat) - 0.03], [Math.max(...lng) + 0.03, Math.max(...lat) + 0.03]], fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true }, cooperativeGestures: true });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      /* Referral lines need the style, not the base map's tiles: draw them as soon as the style is parsed. */
      const lines = () => {
        if (!map || map.getSource("ref")) return;
        const at = new Map(placed.map((f) => [f.id, [f.lng!, f.lat!] as [number, number]]));
        map.addSource("ref", { type: "geojson", data: { type: "FeatureCollection", features: referrals.filter((r) => at.has(r.from) && at.has(r.to)).map((r) => ({ type: "Feature", properties: { s: r.service }, geometry: { type: "LineString", coordinates: [at.get(r.from)!, at.get(r.to)!] } })) } });
        map.addLayer({ id: "ref", type: "line", source: "ref", paint: { "line-color": "#1a73d4", "line-width": 1.6, "line-opacity": 0.55, "line-dasharray": [2, 2] } });
      };
      const tryLines = () => { try { lines(); } catch { /* not parsed yet */ } };
      map.on("styledata", tryLines); map.once("load", tryLines);
      /* the streets and water beneath the facilities, as on every map in the product */
      map.on("styledata", () => { if (map && map.getLayer("ref") && !map.getLayer("g-land")) void g.drawGround(map, "ref"); });
      for (const f of placed) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "oh-pin"; b.dataset.kind = f.kind; b.style.background = tone(f);
        b.setAttribute("aria-label", `${f.name}: ${f.services.map((s) => `${SERVICE_LABEL[s.service]} ${SERVICE_STATUS[s.status]?.label ?? s.status}`).join(", ") || "no service confirmed"}`);
        b.addEventListener("click", () => onSelect(f.id));
        pins.set(f.id, b);
        const pop = new ml.Popup({ offset: 14, closeButton: false }).setHTML(`<div class="oh-pop"><b>${esc(f.name)}</b>${f.services.map((s) => `${esc(SERVICE_LABEL[s.service] ?? s.service)}: ${esc(SERVICE_STATUS[s.status]?.label ?? s.status)}`).join("<br/>") || "No service confirmed"}</div>`);
        new ml.Marker({ element: b }).setLngLat([f.lng!, f.lat!]).setPopup(pop).addTo(map);
      }
    });
    return () => { gone = true; pins.clear(); map?.remove(); };
  }, [placed, referrals, onSelect]);
  useEffect(() => { markers.current.forEach((b, id) => { b.style.transform = id === selected ? "scale(1.35)" : ""; b.style.zIndex = id === selected ? "2" : ""; }); }, [selected]);
  if (!placed.length) return <div className="oh-map is-none"><Empty title="No place has a location yet">Add coordinates in programme setup to see them on the map.</Empty></div>;
  return (
    <div>
      <div className="oh-map" role="region" aria-label="Map of the care network"><div ref={el} className="oh-map-fill" /></div>
      <ul className="oh-legend" aria-hidden>
        <li><i style={{ background: PIN.ok }} />Vaccine available</li>
        <li><i style={{ background: PIN.part }} />Limited or not confirmed</li>
        <li><i style={{ background: PIN.none }} />Vaccine not available</li>
        <li><i style={{ background: PIN.wash }} />Wound washing only</li>
        <li><i className="sq" style={{ background: PIN.lab }} />Laboratory</li>
      </ul>
    </div>
  );
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/* ── Work between partners ─────────────────────────────────────────── */
export function ProgrammeWork() { return <Suspense><Frame wide>{(p) => <WorkBody p={p} />}</Frame></Suspense>; }

function WorkBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const [show, setShow] = usePageState<string>("lane", sp.get("show") ?? "open");
  const hand = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { programme_id: p.id }, "*", 500), `ph:${p.id}`);
  const names = useNames();
  const [asking, setAsking] = useState(false);
  const toast = useToast();
  const t = new Date().toLocaleDateString("en-CA", { timeZone: p.time_zone });
  const all = (hand.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const isOpen = (h: Handoff) => ["open", "accepted"].includes(h.status), isLate = (h: Handoff) => isOpen(h) && !!h.due_on && h.due_on < t;
  const list = all.filter((h) => show === "open" ? isOpen(h) : show === "overdue" ? isLate(h) : ["done", "declined"].includes(h.status));
  const { places } = usePlaces();
  const raiser = places.find((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("raise_handoff"));
  const nOpen = all.filter(isOpen).length, nLate = all.filter(isLate).length;
  const lanes: Lane<string>[] = [{ id: "open", label: "Open", count: nOpen }, { id: "overdue", label: "Overdue", count: nLate, tone: nLate ? "flame" : undefined }, { id: "closed", label: "Closed", count: all.length - nOpen }];
  const cols: Col<Handoff>[] = [
    { key: "what", label: "Request", width: "minmax(0, 2.4fr)", render: (h) => <span className="oh-stack"><span>{h.title}</span><small>{HANDOFF_KIND[h.kind]}{h.outcome ? ` · ${h.outcome}` : ""}</small></span> },
    { key: "from", label: "From", width: "minmax(0, 1fr)", render: (h) => names.org(h.from_org) ?? "Programme" },
    { key: "to", label: "To", width: "minmax(0, 1fr)", render: (h) => names.org(h.to_org) ?? "Partner" },
    { key: "area", label: "Area", width: "minmax(0, 1fr)", render: (h) => names.area(h.area_id) ?? <span className="oh-quiet">Not recorded</span> },
    { key: "due", label: "Due", width: "104px", render: (h) => h.due_on ? (isLate(h) ? <span className="oh-hot">{relDay(h.due_on)}</span> : fmtDate(h.due_on)) : "–" },
    { key: "status", label: "Status", width: "minmax(0, 1fr)", keep: true, render: (h) => <><Chip tone={HANDOFF[h.status]?.tone}>{HANDOFF[h.status]?.label ?? h.status}</Chip>{h.closed_by_name ? <span className="oh-quiet"> {h.closed_by_name}</span> : null}</> },
  ];
  return (
    <>
      <Head title="Requests" lede={hand.error ? "The requests could not be read." : !hand.data ? "Reading the requests…" : <><b>{nOpen}</b> {nOpen === 1 ? "request is" : "requests are"} open between partners{nLate ? <>, <span className="is-hot">{nLate} overdue</span></> : null}.</>}
        actions={raiser ? <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setAsking(true)}>Ask a partner</Btn> : undefined} />
      <Tools><Lanes label="Show" lanes={lanes} value={show} onChange={setShow} /></Tools>
      {hand.loading && !hand.data ? <Loading rows={5} /> : hand.error ? <Failed error={hand.error} retry={hand.reload} /> : !list.length ? <Empty title={show === "closed" ? "Nothing closed yet" : "Nothing open"} /> : (
        <Panel><More items={list} cap={15} noun="requests">{(shown) => <Table label="Requests between partners" cols={cols} rows={shown} rowKey={(h) => h.id} />}</More></Panel>
      )}
      {asking && raiser ? <AskSheet p={p} from={raiser.organisation_id} orgs={names.orgs.filter((o) => o.id !== raiser.organisation_id)} onClose={() => setAsking(false)} onDone={() => { setAsking(false); toast("Sent. It is on the partner's list now."); hand.reload(); }} /> : null}
    </>
  );
}

function AskSheet({ p, orgs, onClose, onDone }: { p: Prog; from: string; orgs: { id: string; name: string; kind: Kind }[]; onClose: () => void; onDone: () => void }) {
  const areas = useRead<Area[]>(() => select<Area>("oh_areas", {}, "id,name,level", 500), "areas:all");
  const [f, setF] = useState({ kind: "vaccination_request", to: orgs[0]?.id ?? "", title: "", detail: "", area: "", due: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_raise_handoff", { p_programme: p.id, p_kind: f.kind, p_to: f.to, p_title: f.title, p_detail: f.detail || null, p_area: f.area || null, p_due: f.due || null });
    setBusy(false); if (r.error) setErr(r.error); else onDone();
  };
  return (
    <Sheet title="Ask a partner" note="The partner sees it on their list with the due date. Never include patient details." onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || f.title.trim().length < 3 || !f.to} onClick={() => void save()}>Send</Btn></>}>
      <label className="oh-field"><span>What kind of request</span><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["vaccination_request", "animal_followup", "sample_request", "service_gap"].map((k) => <option key={k} value={k}>{HANDOFF_KIND[k]}</option>)}</select></label>
      <label className="oh-field"><span>To</span><select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label className="oh-field"><span>What you need</span><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="For example: vaccinate dogs around the market" /></label>
      <label className="oh-field"><span>Details</span><textarea value={f.detail} maxLength={1200} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
      <div className="oh-fields">
        <label className="oh-field"><span>Area</span><select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">Not specific</option>{(areas.data ?? []).filter((a) => ["ward", "locality", "zone"].includes(a.level ?? "")).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="oh-field"><span>Due</span><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
      </div>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/* ── Vaccination coverage ──────────────────────────────────────────── */
export function ProgrammeCoverage() { return <Frame>{(p) => <CoverageBody p={p} />}</Frame>; }

function CoverageBody({ p }: { p: Prog }) {
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: 365 }), `cov:${p.id}`);
  const [est, setEst] = useState<{ id: string; name: string } | null>(null);
  const toast = useToast();
  const { places } = usePlaces();
  const canEst = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("record_estimate"));
  if (o.loading && !o.data) return <><Head title="Dog vaccination" lede="Reading coverage…" /><Loading rows={5} /></>;
  if (o.error || !o.data) return <><Head title="Dog vaccination" lede="Coverage could not be read." /><Failed error={o.error ?? "Could not read coverage."} retry={o.reload} /></>;
  const d = o.data, target = d.programme.target;
  const withEst = d.vaccination.filter((v) => v.estimate);
  const totVac = withEst.reduce((s, v) => s + v.vaccinated, 0), totEst = withEst.reduce((s, v) => s + (v.estimate?.dogs ?? 0), 0);
  type V = Overview["vaccination"][number];
  const cols: Col<V>[] = [
    { key: "area", label: "Area", width: "minmax(0, 1.2fr)", render: (v) => v.area },
    { key: "reg", label: "On registers", width: "96px", align: "end", render: (v) => v.registered },
    { key: "vac", label: "Vaccinated", width: "88px", align: "end", render: (v) => v.vaccinated },
    { key: "est", label: "Population estimate", width: "minmax(0, 1.6fr)", render: (v) => v.estimate ? <span title={`${v.estimate.method}. ${v.estimate.source}.`}>{v.estimate.dogs} dogs <span className="oh-quiet">· {v.estimate.method} · {fmtDate(v.estimate.on, { month: "short", year: "numeric" })}</span></span> : <span className="oh-quiet">No estimate</span> },
    { key: "cov", label: "Coverage", width: "168px", keep: true, render: (v) => { const cov = v.estimate ? v.vaccinated / v.estimate.dogs : null; return cov === null ? <span className="oh-quiet">Needs an estimate</span> : <span className="oh-cov"><Meter value={cov} target={target} label={`${pct(cov)} of the estimate, target ${pct(target)}`} /><span className="num">{pct(cov)}</span>{cov >= target ? <Tag tone="green">At target</Tag> : null}</span>; } },
    ...(canEst ? [{ key: "act", label: "", width: "128px", align: "end" as const, render: (v: V) => <Btn small variant="quiet" onClick={() => setEst({ id: v.area_id, name: v.area })}>{v.estimate ? "Update estimate" : "Add estimate"}</Btn> }] : []),
  ];
  return (
    <>
      <Head title="Dog vaccination" lede={totEst ? <><b>{pct(totVac / totEst)}</b> of an estimated {totEst.toLocaleString("en-IN")} dogs are recorded vaccinated, against a target of <b>{pct(target)}</b>. {withEst.length} of {d.vaccination.length} areas have a population estimate.</> : <>No population estimate is recorded, so coverage cannot be shown. The target is <b>{pct(target)}</b> of the dog population.</>} />
      <Stats label="Dogs on partner registers" items={[figure("Dogs on registers", d.vaccination.reduce((s, v) => s + v.registered, 0)), figure("Recorded vaccinated", d.vaccination.reduce((s, v) => s + v.vaccinated, 0)), figure("Areas without an estimate", d.vaccination.length - withEst.length, { tone: d.vaccination.length - withEst.length ? "amber" : undefined })]} />
      <Panel><More items={d.vaccination} cap={15} noun="areas">{(shown) => <Table label="Coverage by area" cols={cols} rows={shown} rowKey={(v) => v.area_id} />}</More></Panel>
      <p className="oh-foot">The tick on each bar is the target. Vaccinated dogs come from partner registers (animals recorded vaccinated in each area). Registers undercount dogs vaccinated in drives without individual records. Coverage is <b>never</b> shown without a population estimate.</p>
      {est ? <EstimateSheet p={p} area={est} onClose={() => setEst(null)} onDone={() => { setEst(null); toast("Estimate recorded."); o.reload(); }} /> : null}
    </>
  );
}

function EstimateSheet({ p, area, onClose, onDone }: { p: Prog; area: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ dogs: "", method: "", source: "", on: new Date().toLocaleDateString("en-CA") });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); setErr(null); const r = await call("oh_record_estimate", { p_programme: p.id, p_area: area.id, p_dogs: Number(f.dogs), p_method: f.method, p_source: f.source, p_on: f.on }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title={`Population estimate · ${area.name}`} note="Coverage is calculated against this. Record how it was made." onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || !Number(f.dogs) || f.method.trim().length < 3 || f.source.trim().length < 3} onClick={() => void save()}>Save</Btn></>}>
      <div className="oh-fields">
        <label className="oh-field"><span>Estimated dogs</span><input inputMode="numeric" value={f.dogs} onChange={(e) => setF({ ...f, dogs: e.target.value.replace(/\D/g, "") })} /></label>
        <label className="oh-field"><span>Estimated on</span><input type="date" value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></label>
      </div>
      <label className="oh-field"><span>Method</span><input value={f.method} maxLength={200} onChange={(e) => setF({ ...f, method: e.target.value })} placeholder="For example: mark–resight street survey" /></label>
      <label className="oh-field"><span>Source</span><input value={f.source} maxLength={200} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Who made it, and where it is published" /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/* ── Report ────────────────────────────────────────────────────────── */
export function ProgrammeReport() { return <Suspense><Frame narrow>{(p) => <ReportBody p={p} />}</Frame></Suspense>; }

function ReportBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const days = Number(sp.get("days") ?? 90);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `rep:${p.id}:${days}`);
  const marks = useMarks(p.id);
  const d = o.data;
  const head = <Head title="Report" lede={d ? <><b>{p.name}</b>, {fmtDate(d.since, { day: "numeric", month: "long", year: "numeric" })} to {fmtDate(d.today, { day: "numeric", month: "long", year: "numeric" })}. Prepared {fmtTime(new Date().toISOString())}; every figure comes from the shared record.</> : o.error ? "The report could not be read." : "Reading the programme…"}
    actions={<><PeriodPicker /><Btn variant="primary" icon={<Printer size={14} />} onClick={() => window.print()}>Print or save as PDF</Btn></>} />;
  if (o.loading && !d) return <>{head}<Loading rows={6} /></>;
  if (o.error || !d) return <>{head}<Failed error={o.error ?? "Could not read the programme."} retry={o.reload} /></>;
  type V = Overview["vaccination"][number];
  const vcols: Col<V>[] = [
    { key: "area", label: "Area", width: "minmax(0, 1.4fr)", render: (v) => v.area },
    { key: "vac", label: "Vaccinated", width: "88px", align: "end", keep: true, render: (v) => v.vaccinated },
    { key: "est", label: "Estimate", width: "88px", align: "end", render: (v) => v.estimate?.dogs ?? "None" },
    { key: "cov", label: "Coverage", width: "136px", align: "end", keep: true, render: (v) => v.estimate ? pct(v.vaccinated / v.estimate.dogs) : "Needs an estimate" },
  ];
  const days1 = (x: number | null) => (x === null ? "None" : Math.round(x * 10) / 10);
  return (
    <article className="oh-doc">
      {head}
      {/* Co-branding: every partner that has given a logo, at one size, in programme order. Nothing is drawn for a partner without one. */}
      {Object.keys(marks).length ? <ul className="oh-marks" aria-label="Partners">{d.partners.filter((x) => marks[x.id]).map((x) => <li key={x.id}><OrgMark name={x.name} logoUrl={marks[x.id]} size={48} /><span>{x.short_name ?? x.name}</span></li>)}</ul> : null}
      {d.exposures && d.pep ? <Section title="Human bite care"><Props items={[
        { label: "Bite exposures", value: showCount(d.exposures.total) }, { label: "Category III", value: showCount(d.exposures.category_iii) },
        { label: "Courses prescribed", value: showCount(d.pep.courses) }, { label: "Completion", value: d.pep.completion_rate === null ? "Too few to show" : pct(d.pep.completion_rate) },
        { label: "Did not return", value: showCount(d.pep.lost) }, { label: "Doses overdue now", value: showCount(d.pep.doses_overdue) },
      ]} /></Section> : null}
      <Section title="Laboratory surveillance"><Props items={[
        { label: "Samples", value: d.samples.total }, { label: "Positive", value: d.samples.positive }, { label: "Negative", value: d.samples.negative },
        { label: "Median days to result", value: days1(d.samples.median_days_to_result) }, { label: "Confirmed in", value: d.samples.positive_areas.join(", ") || "None" },
      ]} /></Section>
      <Section title="Coordination"><Props items={[
        { label: "Requests closed", value: d.handoffs.done }, { label: "Open", value: d.handoffs.open }, { label: "Overdue", value: d.handoffs.overdue },
        { label: "Median days to close", value: days1(d.handoffs.median_days_to_close) }, { label: "Services confirmed", value: `${d.services.confirmed} across ${d.services.facilities} facilities` },
      ]} /></Section>
      <Section title="Dog vaccination" note={`Target ${pct(d.programme.target)}`}><Panel><Table label="Dog vaccination by area" cols={vcols} rows={d.vaccination} rowKey={(v) => v.area_id} /></Panel></Section>
      <Section title="Training"><p>{d.training.sessions} sessions, {d.training.participants} people: {Object.entries(d.training.by_audience).map(([k, v]) => `${AUDIENCE[k] ?? k} ${v}`).join(", ") || "none recorded"}.</p></Section>
      <Section title="Partners and responsibilities" count={d.partners.length}><ul className="oh-plain">{d.partners.map((x) => <li key={x.id}><b>{x.name}</b> · {KIND_LABEL[x.kind]}{x.responsibilities ? `: ${x.responsibilities}` : ""}</li>)}</ul></Section>
      <p className="oh-foot">{p.illustrative ? "Illustrative demonstration: every figure is invented. " : ""}Human counts below {d.programme.suppress_below} are shown as “fewer than {d.programme.suppress_below}”. Vaccination coverage appears only where a population estimate exists.</p>
    </article>
  );
}

/* ── Research data ─────────────────────────────────────────────────── */
export function ProgrammeData() { return <Frame narrow>{(p) => <DataBody p={p} />}</Frame>; }

function DataBody({ p }: { p: Prog }) {
  const x = useRead<{ since: string; suppress_below: number; rows: { week: string; area: string; species: string; category: string; exposures: Count }[] }>(() => call("oh_research_extract", { p_programme: p.id, p_days: 365 }), `rx:${p.id}`);
  if (x.loading && !x.data) return <><Head title="Research data" lede="Reading the extract…" /><Loading rows={5} /></>;
  if (x.error || !x.data) return <><Head title="Research data" lede="The extract could not be read." /><Failed error={x.error ?? "Could not read the extract."} retry={x.reload} /></>;
  const rows = x.data.rows;
  const csv = () => {
    const lines = [["week", "area", "species", "category", "exposures"].join(","), ...rows.map((r) => [r.week, `"${r.area.replace(/"/g, '""')}"`, r.species, r.category, r.exposures === "<5" ? `<${x.data!.suppress_below}` : String(r.exposures)].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${p.slug}-exposures-by-week.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  type R = (typeof rows)[number] & { i: number };
  const cols: Col<R>[] = [
    { key: "week", label: "Week", width: "88px", render: (r) => fmtDate(r.week) },
    { key: "area", label: "Area", width: "minmax(0, 1.4fr)", keep: true, render: (r) => r.area },
    { key: "species", label: "Animal", width: "minmax(0, 1fr)", render: (r) => r.species },
    { key: "cat", label: "Category", width: "minmax(0, 1fr)", render: (r) => r.category },
    { key: "n", label: "Exposures", width: "112px", align: "end", keep: true, render: (r) => showCount(r.exposures) },
  ];
  return (
    <>
      <Head title="Research data" lede={<><b>{rows.length}</b> weekly counts by area, animal and category since {fmtDate(x.data.since, { day: "numeric", month: "short", year: "numeric" })}{p.illustrative ? ", illustrative" : ""}. Counts below {x.data.suppress_below} are hidden.</>}
        actions={<Btn variant="primary" icon={<Download size={14} />} onClick={csv} disabled={!rows.length}>Download CSV</Btn>} />
      {rows.length ? <Panel><More items={rows.slice(0, 300).map((r, i) => ({ ...r, i }))} cap={15} noun="rows">{(shown) => <Table label="Exposures by week" cols={cols} rows={shown} rowKey={(r) => String(r.i)} />}</More></Panel> : <Empty title="No exposures in the last year" />}
    </>
  );
}

/* ── Setup: one programme configured without engineering ─────────── */
export function ProgrammeSetup() { return <Frame narrow>{(p, reload) => <SetupBody p={p} reload={reload} />}</Frame>; }

function SetupBody({ p, reload }: { p: Prog; reload: () => void }) {
  const toast = useToast();
  const { places, reload: reloadPlaces } = usePlaces();
  const mine = places.filter((x) => x.programmes.some((y) => y.id === p.id));
  const manager = mine.some((x) => x.capabilities.includes("manage"));
  const [mods, setMods] = useState<string[]>(modulesOf(p));
  const [target, setTarget] = useState(String(Math.round(p.vaccination_target * 100)));
  const [due, setDue] = useState(String(p.config?.followup_due_days ?? 3));
  const [revac, setRevac] = useState(p.config?.dog_revaccination_days ? String(p.config.dog_revaccination_days) : "");
  const [summary, setSummary] = useState(p.summary ?? ""), [status, setStatus] = useState(p.status);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const config: Record<string, unknown> = { modules: mods, followup_due_days: Number(due) || 3 };
    if (p.config?.suppress_below) config.suppress_below = p.config.suppress_below;
    if (revac) config.dog_revaccination_days = Number(revac);
    const r = await call("oh_set_programme", { p_programme: p.id, p_summary: summary, p_status: status, p_target: Number(target) / 100, p_config: config });
    setBusy(false); if (r.error) setErr(r.error); else { toast("Programme settings saved."); reload(); }
  };
  return (
    <>
      <Head title="Programme setup" lede={<><b>{p.name}</b>: what it does, its partners, areas and people. Changes apply at once.</>} />
      {manager ? (
        <Section title="What this programme does">
          <ul className="oh-toggles">{ALL_MODULES.map((m) => <li key={m}><label className="oh-toggle"><input type="checkbox" checked={mods.includes(m)} onChange={(e) => setMods(e.target.checked ? [...mods, m] : mods.filter((x) => x !== m))} /><span><b>{MODULES[m].label}</b><small>{MODULES[m].note}</small></span></label></li>)}</ul>
          <div className="oh-form oh-fields">
            <label className="oh-field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="oh-field"><span>Vaccination target (%)</span><input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 3))} /></label>
            <label className="oh-field"><span>Days to answer a follow-up</span><input inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
            <label className="oh-field"><span>Dog revaccination interval (days)</span><input inputMode="numeric" value={revac} onChange={(e) => setRevac(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Off" /><small>Set by the programme&apos;s veterinary lead. Leave empty to switch reminders off.</small></label>
            <label className="oh-field"><span>Summary</span><textarea value={summary} maxLength={600} onChange={(e) => setSummary(e.target.value)} /></label>
            {err ? <Failed error={err} /> : null}
          </div>
          <div className="oh-submit"><Btn variant="primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save settings"}</Btn><p>Human counts below {p.config?.suppress_below ?? 5} are always hidden outside the treating facility.</p></div>
        </Section>
      ) : <Note>Only the programme lead changes modules and settings. You can invite people to your own organisation below.</Note>}
      {manager ? <Partners p={p} onChange={() => { reload(); reloadPlaces(); }} /> : null}
      <Invites orgs={mine.filter((x) => x.capabilities.includes("invite")).map((x) => ({ id: x.organisation_id, name: x.name, kind: x.kind }))} />
    </>
  );
}

function Partners({ p, onChange }: { p: Prog; onChange: () => void }) {
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: 30 }), `setup-ov:${p.id}`);
  const marks = useMarksRead(p.id);
  const [adding, setAdding] = useState(false), [area, setArea] = useState(""), [busy, setBusy] = useState(false);
  const toast = useToast();
  const addArea = async () => { setBusy(true); const r = await call("oh_add_area", { p_programme: p.id, p_name: area, p_level: "ward", p_code: null }); setBusy(false); if (r.error) toast(r.error, "flame"); else { setArea(""); toast("Area added."); o.reload(); } };
  type Pt = Overview["partners"][number];
  const cols: Col<Pt>[] = [
    { key: "name", label: "Partner", width: "minmax(0, 1.6fr)", render: (x) => <span className="oh-cov"><Mark kind={x.kind} name={x.name} url={marks.data?.[x.id]} />{x.name}</span> },
    { key: "kind", label: "Kind", width: "minmax(0, 1fr)", render: (x) => <span title={x.responsibilities ?? undefined}>{KIND_LABEL[x.kind]}</span> },
    { key: "people", label: "People", width: "96px", align: "end", keep: true, render: (x) => showCount(x.members) },
    ...(marks.ready ? [{ key: "logo", label: "Logo", width: "184px", align: "end" as const, render: (x: Pt) => <LogoButton org={x.id} name={x.name} has={!!marks.data?.[x.id]} onDone={(m) => { toast(m); marks.reload(); }} /> }] : []),
  ];
  return (
    <>
      <Section title="Partners" count={o.data?.partners.length ?? null} action={<Btn small icon={<Plus size={14} />} onClick={() => setAdding(true)}>Add a partner</Btn>}>
        {o.data ? <Panel><More items={o.data.partners} cap={8} noun="partners">{(shown) => <Table label="Partners" cols={cols} rows={shown} rowKey={(x) => x.id} />}</More></Panel> : o.error ? <Failed error={o.error} retry={o.reload} /> : <Loading rows={3} />}
      </Section>
      <Section title="Areas" count={o.data?.vaccination.length ?? null} note="Wards or localities this programme covers">
        {o.data ? <p className="oh-inline">{o.data.vaccination.length ? o.data.vaccination.map((v) => <Tag key={v.area_id}>{v.area}</Tag>) : "None yet"}</p> : null}
        <div className="oh-inline"><input className="oh-input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ward or locality name" aria-label="New area name" /><Btn icon={<MapPin size={14} />} disabled={busy || area.trim().length < 2} onClick={() => void addArea()}>Add area</Btn></div>
        <p className="oh-foot">Boundaries can be loaded later from the municipality&apos;s official ward map. Until then areas are names, and maps show places rather than wards.</p>
      </Section>
      {adding ? <PartnerSheet p={p} onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast("Partner added. Invite their people next."); o.reload(); onChange(); }} /> : null}
    </>
  );
}

function PartnerSheet({ p, onClose, onDone }: { p: Prog; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: "clinic" as Kind, name: "", short: "", resp: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); setErr(null); const r = await call("oh_add_partner", { p_programme: p.id, p_kind: f.kind, p_name: f.name, p_short_name: f.short || null, p_responsibilities: f.resp || null, p_area: null, p_existing: null, p_ngo: null }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title="Add a partner" note="An organisation that takes part in this programme. The same organisation can take part in several programmes." onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || f.name.trim().length < 2} onClick={() => void save()}>Add partner</Btn></>}>
      <label className="oh-field"><span>Kind</span><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}>{(Object.keys(KIND_LABEL) as Kind[]).filter((k) => k !== "ngo").map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select><small>NGOs join by linking their existing StrayPaw organisation; ask StrayPaw support.</small></label>
      <label className="oh-field"><span>Name</span><input value={f.name} maxLength={160} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="oh-field"><span>Short name</span><input value={f.short} maxLength={40} onChange={(e) => setF({ ...f, short: e.target.value })} /></label>
      <label className="oh-field"><span>Responsibilities</span><textarea value={f.resp} maxLength={400} onChange={(e) => setF({ ...f, resp: e.target.value })} /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

const INVITE_ROLES: Record<string, Role[]> = { hospital: ["clinician", "nurse", "records"], clinic: ["clinician", "nurse", "records"], laboratory: ["lab_scientist", "trainer"], coordinator: ["coordinator", "analyst", "trainer"], state: ["coordinator", "analyst"], municipal: ["coordinator", "field", "analyst"], research: ["analyst"], training: ["trainer"], ngo: ["field", "coordinator"] };

function Invites({ orgs }: { orgs: { id: string; name: string; kind: Kind }[] }) {
  const [org, setOrg] = useState(orgs[0]?.id ?? "");
  const kind = orgs.find((o) => o.id === org)?.kind ?? "clinic";
  const [role, setRole] = useState<Role>(INVITE_ROLES[kind][0]), [name, setName] = useState(""), [email, setEmail] = useState("");
  const [code, setCode] = useState<string | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const list = useRead<{ members: { name: string; role: Role; since: string }[]; invites: { code: string; role: Role; email: string | null; name: string | null; expires_at: string }[] }>(() => call("oh_org_invites", { p_org: org }), `inv:${org}:${code}`, !!org);
  if (!orgs.length) return null;
  const create = async () => { setBusy(true); setErr(null); const r = await call<string>("oh_create_invite", { p_org: org, p_role: role, p_email: email || null, p_display_name: name || null }); setBusy(false); if (r.error) setErr(r.error); else { setCode(r.data); setName(""); setEmail(""); } };
  return (
    <Section title="People" note="Invite someone with a code; they enter it after signing in">
      <div className="oh-form oh-fields">
        <label className="oh-field"><span>Organisation</span><select value={org} onChange={(e) => { setOrg(e.target.value); setRole(INVITE_ROLES[orgs.find((o) => o.id === e.target.value)?.kind ?? "clinic"][0]); }}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="oh-field"><span>Role</span><select value={role} onChange={(e) => setRole(e.target.value as Role)}>{INVITE_ROLES[kind].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
        <label className="oh-field"><span>Name</span><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
        <label className="oh-field"><span>Email (optional)</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {err ? <Failed error={err} /> : null}
        <div><Btn disabled={busy} onClick={() => void create()}>Create invite code</Btn></div>
        {code ? <InviteLink code={code} /> : null}
      </div>
      {list.data && list.data.members.length + list.data.invites.length ? (
        <Section title="Members and invitations" count={list.data.members.length + list.data.invites.length}>
          <Panel><More items={[...list.data.members.map((m, i) => ({ key: `m${i}`, name: m.name ?? "Member", line: `${ROLE_LABEL[m.role]} · since ${fmtDate(m.since)}`, waiting: false })), ...list.data.invites.map((v) => ({ key: v.code, name: v.name ?? v.email ?? "Invited", line: `${ROLE_LABEL[v.role]} · code ${v.code} · expires ${relDay(v.expires_at).toLowerCase()}`, waiting: true }))]} cap={8} noun="people">
            {(shown) => <Rows label="Members and invitations">{shown.map((m) => <Row key={m.key} title={m.name} meta={m.line} end={m.waiting ? <Tag tone="amber">Not yet accepted</Tag> : undefined} />)}</Rows>}
          </More></Panel>
        </Section>
      ) : null}
    </Section>
  );
}

export { ProgrammeOverview as default };

/* ── Partner logos (v2.6) ─────────────────────────────────────────────
   Read from oh_partner_marks; a partner without a logo keeps its glyph.
   Before v2.6 the function does not exist: no logo is shown and no upload
   is offered. */
const noFn = (e: string | null) => !!e && /could not find the function|does not exist|schema cache/i.test(e);
function useMarksRead(pid: string) {
  const r = useRead<Record<string, string>>(() => call("oh_partner_marks", { p_programme: pid }), `marks:${pid}`);
  return { data: r.data ?? {}, ready: !!r.data && !noFn(r.error), reload: r.reload };
}
function useMarks(pid: string): Record<string, string> { return useMarksRead(pid).data; }

function Mark({ kind, name, url }: { kind: Kind; name: string; url?: string | null }) {
  return url ? <OrgMark name={name} logoUrl={url} size={24} /> : <Glyph kind={kind} />;
}

/** Upload or remove a partner's logo. The database decides who may: a lead of the partner or of the programme. */
function LogoButton({ org, name, has, onDone }: { org: string; name: string; has: boolean; onDone: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast("Use a PNG, JPEG or WebP image.", "flame"); return; }
    if (file.size > 512 * 1024) { toast("Keep the logo under 512 KB.", "flame"); return; }
    const supa = getSupabase();
    if (!supa) return;
    setBusy(true);
    const path = `${org}/logo-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    const up = await supa.storage.from("oh-logos").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { setBusy(false); toast(/row-level security|not authori[sz]ed|403/i.test(up.error.message) ? "Only a lead of this partner or of the programme can set its logo." : up.error.message, "flame"); return; }
    const url = supa.storage.from("oh-logos").getPublicUrl(path).data.publicUrl;
    const r = await call("oh_set_logo", { p_org: org, p_url: url });
    setBusy(false);
    if (r.error) toast(r.error, "flame"); else onDone(`Logo saved for ${name}.`);
  };
  const remove = async () => { setBusy(true); const r = await call("oh_set_logo", { p_org: org, p_url: null }); setBusy(false); if (r.error) toast(r.error, "flame"); else onDone(`Logo removed for ${name}.`); };
  return (
    <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
      <Btn small variant="quiet" disabled={busy} onClick={() => input.current?.click()} aria-label={`${has ? "Change" : "Add"} the logo of ${name}`}>{busy ? "Saving…" : has ? "Change logo" : "Add logo"}</Btn>
      {has ? <Btn small variant="quiet" disabled={busy} onClick={() => void remove()} aria-label={`Remove the logo of ${name}`}>Remove</Btn> : null}
    </>
  );
}

/** The invite as a link that opens Today with the code filled in (after sign-in), and the code itself for reading out. */
function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? `/today?invite=${code}` : `${window.location.origin}/today?invite=${code}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return (
    <div className="oh-invite-out" role="status">
      <p>Send them this link. It opens StrayPaw with the code filled in; they sign in and press Join.</p>
      <div className="oh-invite-link"><code>{link}</code><Btn small onClick={() => void copy()}>{copied ? "Copied" : "Copy link"}</Btn></div>
      <p>Or read out the code <span className="oh-invite-code">{code}</span>. It works once and expires in 14 days.</p>
    </div>
  );
}
