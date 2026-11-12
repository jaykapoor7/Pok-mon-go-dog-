"use client";

/* A programme, seen whole. The same pages serve a city pilot, a municipal
   ABC programme and a state that oversees several cities: what each shows
   follows from the programme's modules and the person's role, never from
   which city it is. Human counts below the programme's threshold are
   suppressed by the database before they reach the browser. */
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Download, MapPin, Plus, Printer } from "lucide-react";
import { usePlaces, oversees } from "../places";
import { call, fmtDate, fmtTime, num, relDay, select, showCount, useNames, useRead, AUDIENCE, HANDOFF, HANDOFF_KIND, KIND_LABEL, MODULES, ROLE_LABEL, SERVICE_LABEL, SERVICE_SHORT, SERVICE_STATUS, type Alert, type Area, type Count, type Handoff, type Kind, type Network, type NetworkFacility, type Overview, type Role } from "../data";
import { AlertList, Bars, Chip, Empty, Failed, Glyph, Head, Loading, Page, Section, Seg, Sheet, Stat, useToast } from "../ui";
import { AreaIntel } from "../AreaMap";

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

/** The frame every programme page shares; tabs appear only for visitors whose
    sidebar does not already list these pages. */
function Frame({ children, actions, title, lede, wide = true }: { children: (p: Prog, reload: () => void) => ReactNode; actions?: (p: Prog) => ReactNode; title?: string; lede?: string; wide?: boolean }) {
  const { slug, prog, loading, error, reload } = useProgramme();
  const path = usePathname();
  const { places } = usePlaces();
  const overseer = places.some((p) => oversees(p.kind) && p.programmes.some((x) => x.slug === slug));
  if (loading && !prog) return <Page wide><Loading rows={5} /></Page>;
  if (error) return <Page><Failed error={error} retry={reload} /></Page>;
  if (!prog) return <Page><Empty title="This programme is not visible to you">Only organisations taking part in a programme can open it.</Empty></Page>;
  const tabs: [string, string][] = [["", "Overview"], ["/network", "Care network"]];
  return (
    <Page illustrative={prog.illustrative} wide={wide}>
      <Head eyebrow={<><span>{KIND_PLAN[prog.plan] ?? "Programme"}</span><Chip tone="blue">{STATUS[prog.status] ?? prog.status}</Chip></>} title={title ?? prog.name} lede={lede ?? prog.summary ?? undefined} actions={actions?.(prog)} />
      {!overseer ? <nav className="oh-tabs" aria-label="Programme">{tabs.map(([s, l]) => <Link key={s} href={`/programme/${slug}${s}`} aria-current={path === `/programme/${slug}${s}` ? "page" : undefined}>{l}</Link>)}</nav> : null}
      {children(prog, reload)}
    </Page>
  );
}
const KIND_PLAN: Record<string, string> = { pilot: "Pilot programme", programme: "City programme", state: "State programme", national: "National programme" };

/* ── Overview ──────────────────────────────────────────────────────── */
export function ProgrammeOverview() { return <Suspense><Frame actions={() => <PeriodPicker />}>{(p) => <OverviewBody p={p} />}</Frame></Suspense>; }

function PeriodPicker() {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  const days = sp.get("days") ?? "90";
  return <Seg name="period" label="Period" value={days} onChange={(v) => router.replace(`${path}?days=${v}`)} options={[["30", "30 days"], ["90", "90 days"], ["365", "12 months"]]} />;
}

function OverviewBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const days = Number(sp.get("days") ?? 90);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `ov:${p.id}:${days}`);
  const alerts = useRead<Alert[]>(() => call("oh_alerts", { p_programme: p.id }), `al:${p.id}`);
  const { places } = usePlaces();
  const canAck = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("ack_alert"));
  const mods = modulesOf(p);
  if (o.loading && !o.data) return <Loading rows={6} />;
  if (o.error || !o.data) return <Failed error={o.error ?? "Could not read the programme."} retry={o.reload} />;
  const d = o.data;
  const weeks = (d.exposures?.by_week ?? []).map((w) => ({ x: fmtDate(w.week, { day: "numeric", month: "short" }), n: w.n }));
  const maxArea = Math.max(1, ...(d.exposures?.by_area ?? []).map((w) => (typeof w.n === "number" ? w.n : 4)));
  const open = (alerts.data ?? []).filter((a) => !a.ack);
  const alertHref = (a: Alert) => a.kind === "positive_result" ? `/programme/${p.slug}/work` : a.kind === "pep_readiness" ? `/programme/${p.slug}/network` : a.kind === "coverage_below_target" ? `/programme/${p.slug}/coverage` : a.kind === "followups_overdue" ? `/programme/${p.slug}/work?show=overdue` : null;
  const stats = (
    <dl className="oh-stats">
      {mods.includes("bite_care") && d.exposures ? <Stat label="Bite exposures" value={d.exposures.total} note={<>Category III: {showCount(d.exposures.category_iii)}</>} /> : null}
      {mods.includes("bite_care") && d.pep ? <Stat label="Courses completed" value={d.pep.completion_rate === null ? null : pct(d.pep.completion_rate)} note={d.pep.completion_rate === null ? "Too few closed courses to show" : `Did not return: ${showCount(d.pep.lost)}`} tone={d.pep.completion_rate !== null && d.pep.completion_rate < 0.8 ? "amber" : "green"} /> : null}
      {mods.includes("bite_care") && d.exposures ? <Stat label="Wounds washed" value={num(d.exposures.washed_known) ? pct(num(d.exposures.washed) / num(d.exposures.washed_known)) : null} note="Where it was recorded" /> : null}
      {mods.includes("laboratory") ? <Stat label="Laboratory-confirmed" value={d.samples.positive} note={`${d.samples.total} samples · ${d.samples.waiting} waiting`} tone={d.samples.positive ? "flame" : undefined} href={`/programme/${p.slug}/work`} /> : null}
      {mods.includes("services") ? <Stat label="Care facilities" value={d.services.facilities} note={`${d.services.arv_unavailable} without vaccine · ${d.services.stale} confirmations expired`} href={`/programme/${p.slug}/network`} tone={d.services.arv_unavailable ? "flame" : d.services.stale ? "amber" : undefined} /> : null}
    </dl>
  );
  return (
    <>
      {stats}
      <div className="oh-grid two">
        <Section title="Needs a decision" note={alerts.data ? `${open.length} open` : undefined}>
          {alerts.loading && !alerts.data ? <Loading rows={2} /> : alerts.error ? <Failed error={alerts.error} retry={alerts.reload} /> : <AlertList alerts={alerts.data ?? []} programmeId={p.id} onChange={alerts.reload} canAck={canAck} hrefFor={alertHref} limit={6} />}
        </Section>
        <div>
          {mods.includes("bite_care") && d.exposures ? <Section title="Bites by week" note="Hatched: fewer than the threshold"><div className="oh-card pad"><Bars points={weeks} label="Bite exposures by week" /></div></Section> : null}
          {mods.includes("laboratory") ? (
            <Section title="Laboratory">
              <dl className="oh-facts oh-card pad">
                <div><dt>Positive · negative</dt><dd>{d.samples.positive} · {d.samples.negative}</dd></div>
                <div><dt>Waiting</dt><dd>{d.samples.waiting}</dd></div>
                <div><dt>Median days to result</dt><dd>{d.samples.median_days_to_result === null ? "None resulted" : Math.round(d.samples.median_days_to_result * 10) / 10}</dd></div>
                <div><dt>Confirmed in</dt><dd>{d.samples.positive_areas.join(", ") || "None"}</dd></div>
              </dl>
            </Section>
          ) : null}
        </div>
      </div>

      {d.children.length ? (
        <Section title="Programmes in this one" note="Each city keeps its own records; this view sums what they share">
          <div className="oh-rows">{d.children.map((c) => (
            <Link className="oh-row" key={c.slug} href={`/programme/${c.slug}`}>
              <div className="oh-row-main"><b>{c.name}</b><span>{STATUS[c.status] ?? c.status} · bites {showCount(c.exposures)} · confirmed cases {c.positives} · overdue work {c.overdue}</span></div>
              <ArrowRight size={16} aria-hidden color="var(--muted)" />
            </Link>))}</div>
        </Section>
      ) : null}

      {mods.includes("bite_care") || mods.includes("laboratory") ? (
        <Section title="Where to act" note="Bites, confirmed cases and dog vaccination, by area">
          <AreaIntel programme={p.id} slug={p.slug} d={d} />
        </Section>
      ) : null}

      <Section title="Partners" note="Who is responsible for what, and their open work">
        <div className="oh-partners">
          {d.partners.map((x) => (
            <div className="oh-partner" key={x.id}>
              <Glyph kind={x.kind} />
              <div><b>{x.name}</b><span>{x.responsibilities ?? KIND_LABEL[x.kind]}</span></div>
              <div className="oh-svc">{x.overdue ? <Chip tone="flame">{x.overdue} overdue</Chip> : null}{x.open ? <Chip plain>{x.open} open</Chip> : <Chip plain tone="green">Clear</Chip>}</div>
            </div>
          ))}
        </div>
      </Section>
      {mods.includes("training") ? <Training p={p} d={d} reload={o.reload} /> : null}
    </>
  );
}

function Training({ p, d, reload }: { p: Prog; d: Overview; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { places } = usePlaces();
  const can = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("record_training"));
  return (
    <Section title="Training" note={`${d.training.sessions} sessions · ${d.training.participants} people`} action={can ? <button type="button" className="oh-btn small" onClick={() => setOpen(true)}><Plus size={14} aria-hidden />Record a session</button> : undefined}>
      {Object.keys(d.training.by_audience).length ? (
        <div className="oh-rows">{Object.entries(d.training.by_audience).map(([k, v]) => <div className="oh-row" key={k} style={{ minHeight: 44 }}><div className="oh-row-main"><b style={{ fontWeight: 500 }}>{AUDIENCE[k] ?? k}</b></div><div className="oh-row-meta num">{v} people</div></div>)}</div>
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
    <Sheet title="Record a training session" onClose={onClose} foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || f.title.trim().length < 3} onClick={() => void save()}>Save</button></>}>
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
export function ProgrammeNetwork() { return <Frame title="Care network" lede="Where people get wound washing, vaccine and immunoglobulin, and how recently each was confirmed.">{(p) => <NetworkBody p={p} />}</Frame>; }

const statusOf = (f: NetworkFacility, svc: string) => f.services.find((s) => s.service === svc)?.status ?? null;
function tone(f: NetworkFacility): string {
  if (f.kind === "laboratory") return "#5b4bc4";
  const arv = statusOf(f, "arv"), wc = statusOf(f, "wound_care");
  if (arv === "unavailable") return "#d9452b";
  if (arv === "available") return "#1f7a4d";
  if (!arv && wc === "available") return "#2457ce";
  return "#e0a530";
}

function NetworkBody({ p }: { p: Prog }) {
  const net = useRead<Network>(() => call("oh_programme_network", { p_programme: p.id }), `net:${p.id}`);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  if (net.loading && !net.data) return <Loading rows={5} />;
  if (net.error || !net.data) return <Failed error={net.error ?? "Could not read the network."} retry={net.reload} />;
  const n = net.data;
  const byId = new Map(n.facilities.map((f) => [f.id, f]));
  const remove = async (r: Network["referrals"][number]) => {
    const x = await call("oh_set_referral", { p_programme: p.id, p_from: r.from, p_to: r.to, p_service: r.service, p_note: null, p_remove: true });
    if (x.error) toast(x.error, "flame"); else { toast("Referral pathway removed."); net.reload(); }
  };
  return (
    <>
      <div className="oh-split">
        <NetworkMap facilities={n.facilities} referrals={n.referrals} selected={sel} onSelect={setSel} />
        <div className="oh-rows" style={{ maxHeight: 460, overflowY: "auto" }}>
          {n.facilities.map((f) => {
            const refers = n.referrals.filter((r) => r.from === f.id);
            return (
              <div className="oh-fac" key={f.id} aria-current={sel === f.id ? "true" : undefined} onMouseEnter={() => setSel(f.id)}>
                <div><b>{f.name}</b><div className="meta">{KIND_LABEL[f.kind]}{f.area ? ` · ${f.area}` : ""}{f.hours ? ` · ${f.hours}` : ""}{f.kind !== "laboratory" && f.active_courses !== null ? ` · in a course: ${showCount(f.active_courses)}` : ""}</div></div>
                <div>{f.lat === null ? <Chip plain>Not on the map</Chip> : null}</div>
                <div className="oh-svc" style={{ gridColumn: "1 / -1" }}>
                  {f.services.length ? f.services.map((s) => <Chip key={s.service} tone={SERVICE_STATUS[s.status]?.tone}>{SERVICE_SHORT[s.service] ?? s.service}: {SERVICE_STATUS[s.status]?.label ?? s.status}</Chip>) : <Chip tone="amber">No service confirmed</Chip>}
                </div>
                {refers.length ? <div className="refer">Sends people for {refers.map((r) => `${(SERVICE_LABEL[r.service] ?? r.service).toLowerCase()} to ${byId.get(r.to)?.short_name ?? byId.get(r.to)?.name ?? "a partner"}`).join("; ")}.</div> : null}
              </div>
            );
          })}
        </div>
      </div>

      <Section title="Referral pathways" note="Where a place sends people for a service it does not offer" action={n.can_configure ? <button type="button" className="oh-btn small" onClick={() => setAdding(true)}><Plus size={14} aria-hidden />Add a pathway</button> : undefined}>
        {n.referrals.length ? (
          <div className="oh-table-wrap"><table className="oh-table">
            <thead><tr><th>From</th><th>For</th><th>To</th><th>Note</th>{n.can_configure ? <th /> : null}</tr></thead>
            <tbody>{n.referrals.map((r) => (
              <tr key={`${r.from}${r.to}${r.service}`}>
                <td className="strong">{byId.get(r.from)?.name ?? "A partner"}</td><td>{SERVICE_LABEL[r.service]}</td><td>{byId.get(r.to)?.name ?? "A partner"}</td><td>{r.note ?? ""}</td>
                {n.can_configure ? <td className="r"><button type="button" className="oh-btn quiet small" onClick={() => void remove(r)}>Remove</button></td> : null}
              </tr>))}</tbody>
          </table></div>
        ) : <Empty title="No referral pathways yet">Add one so a health centre without immunoglobulin knows where to send people.</Empty>}
      </Section>
      <p className="oh-note" style={{ marginTop: 16 }}>Availability is what each facility confirmed, for up to a week at a time. StrayPaw is <b>not connected</b> to any stock system. Area boundaries are not loaded, so the map shows places, not wards.</p>
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
    <Sheet title="Add a referral pathway" onClose={onClose} foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || !from || !to || from === to} onClick={() => void save()}>Save</button></>}>
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
        map.addLayer({ id: "ref", type: "line", source: "ref", paint: { "line-color": "#2457ce", "line-width": 1.6, "line-opacity": 0.55, "line-dasharray": [2, 2] } });
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
  if (!placed.length) return <div className="oh-map" style={{ display: "grid", placeItems: "center" }}><Empty title="No place has a location yet">Add coordinates in programme setup to see them on the map.</Empty></div>;
  return (
    <div className="oh-map" role="region" aria-label="Map of the care network">
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      <div className="oh-map-legend" aria-hidden>
        <span><i style={{ background: "#1f7a4d" }} />Vaccine available</span>
        <span><i style={{ background: "#e0a530" }} />Limited or not confirmed</span>
        <span><i style={{ background: "#d9452b" }} />Vaccine not available</span>
        <span><i style={{ background: "#2457ce" }} />Wound washing only</span>
        <span><i style={{ background: "#5b4bc4", borderRadius: 4 }} />Laboratory</span>
      </div>
    </div>
  );
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/* ── Work between partners ─────────────────────────────────────────── */
export function ProgrammeWork() { return <Suspense><Frame title="Work between partners" lede="Requests between partners: who has each, when it is due, what they found.">{(p) => <WorkBody p={p} />}</Frame></Suspense>; }

function WorkBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const [show, setShow] = useState(sp.get("show") ?? "open");
  const hand = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { programme_id: p.id }, "*", 500), `ph:${p.id}`);
  const names = useNames();
  const [asking, setAsking] = useState(false);
  const toast = useToast();
  const t = new Date().toLocaleDateString("en-CA", { timeZone: p.time_zone });
  const all = (hand.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const list = all.filter((h) => show === "open" ? ["open", "accepted"].includes(h.status) : show === "overdue" ? ["open", "accepted"].includes(h.status) && !!h.due_on && h.due_on < t : ["done", "declined"].includes(h.status));
  const { places } = usePlaces();
  const raiser = places.find((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("raise_handoff"));
  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <Seg name="show" label="Show" value={show} onChange={setShow} options={[["open", "Open"], ["overdue", "Overdue"], ["closed", "Closed"]]} />
        {raiser ? <button type="button" className="oh-btn primary" style={{ marginLeft: "auto" }} onClick={() => setAsking(true)}><Plus size={16} aria-hidden />Ask a partner</button> : null}
      </div>
      {hand.loading && !hand.data ? <Loading rows={5} /> : hand.error ? <Failed error={hand.error} retry={hand.reload} /> : !list.length ? <Empty title={show === "closed" ? "Nothing closed yet" : "Nothing open"} /> : (
        <div className="oh-table-wrap"><table className="oh-table">
          <thead><tr><th>Request</th><th>From</th><th>To</th><th>Area</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>{list.map((h) => {
            const late = ["open", "accepted"].includes(h.status) && h.due_on && h.due_on < t;
            return (
              <tr key={h.id}>
                <td className="strong">{h.title}<div style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>{HANDOFF_KIND[h.kind]}{h.outcome ? ` · ${h.outcome}` : ""}</div></td>
                <td>{names.org(h.from_org) ?? "Programme"}</td><td>{names.org(h.to_org) ?? "Partner"}</td><td>{names.area(h.area_id) ?? "Not recorded"}</td>
                <td>{h.due_on ? (late ? <Chip tone="flame">{relDay(h.due_on)}</Chip> : fmtDate(h.due_on)) : "–"}</td>
                <td><Chip tone={HANDOFF[h.status]?.tone}>{HANDOFF[h.status]?.label ?? h.status}</Chip>{h.closed_by_name ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{h.closed_by_name}</div> : null}</td>
              </tr>);
          })}</tbody>
        </table></div>
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
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || f.title.trim().length < 3 || !f.to} onClick={() => void save()}>Send</button></>}>
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
export function ProgrammeCoverage() { return <Frame title="Dog vaccination coverage" lede="Dogs recorded vaccinated, against a population estimate where one exists.">{(p) => <CoverageBody p={p} />}</Frame>; }

function CoverageBody({ p }: { p: Prog }) {
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: 365 }), `cov:${p.id}`);
  const [est, setEst] = useState<{ id: string; name: string } | null>(null);
  const toast = useToast();
  const { places } = usePlaces();
  const canEst = places.some((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("record_estimate"));
  if (o.loading && !o.data) return <Loading rows={5} />;
  if (o.error || !o.data) return <Failed error={o.error ?? "Could not read coverage."} retry={o.reload} />;
  const d = o.data, target = d.programme.target;
  const withEst = d.vaccination.filter((v) => v.estimate);
  const totVac = withEst.reduce((s, v) => s + v.vaccinated, 0), totEst = withEst.reduce((s, v) => s + (v.estimate?.dogs ?? 0), 0);
  return (
    <>
      <dl className="oh-stats">
        <Stat label="Target" value={pct(target)} note="Of the dog population" />
        <Stat label="Coverage where estimated" value={totEst ? pct(totVac / totEst) : null} note={totEst ? `${totVac} of an estimated ${totEst} dogs` : "No estimate recorded"} tone={totEst && totVac / totEst < target ? "amber" : "green"} />
        <Stat label="Areas with an estimate" value={`${withEst.length} of ${d.vaccination.length}`} note="Coverage is shown only where there is one" />
        <Stat label="Dogs on registers" value={d.vaccination.reduce((s, v) => s + v.registered, 0)} note={`${d.vaccination.reduce((s, v) => s + v.vaccinated, 0)} recorded vaccinated`} />
      </dl>
      <div className="oh-table-wrap"><table className="oh-table">
        <thead><tr><th>Area</th><th className="r">On registers</th><th className="r">Vaccinated</th><th>Population estimate</th><th>Coverage against target</th>{canEst ? <th /> : null}</tr></thead>
        <tbody>{d.vaccination.map((v) => {
          const cov = v.estimate ? v.vaccinated / v.estimate.dogs : null;
          return (
            <tr key={v.area_id}>
              <td className="strong">{v.area}</td><td className="r">{v.registered}</td><td className="r">{v.vaccinated}</td>
              <td>{v.estimate ? <span title={`${v.estimate.method}. ${v.estimate.source}.`}>{v.estimate.dogs} dogs <span style={{ color: "var(--muted)" }}>· {v.estimate.method} · {fmtDate(v.estimate.on, { month: "short", year: "numeric" })}</span></span> : <span style={{ color: "var(--muted)" }}>No estimate</span>}</td>
              <td>{cov === null ? <span style={{ color: "var(--muted)" }}>Needs an estimate</span> : <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="oh-bar" style={{ flex: 1 }}><i data-tone={cov >= target ? "green" : "amber"} style={{ width: pct(Math.min(1, cov)) }} /><span className="target" style={{ left: pct(target) }} /></div><span className="num">{pct(cov)}</span></div>}</td>
              {canEst ? <td className="r"><button type="button" className="oh-btn quiet small" onClick={() => setEst({ id: v.area_id, name: v.area })}>{v.estimate ? "Update estimate" : "Add estimate"}</button></td> : null}
            </tr>);
        })}</tbody>
      </table></div>
      <p className="oh-note" style={{ marginTop: 12 }}>Vaccinated dogs come from partner registers (animals recorded vaccinated in each area). Registers undercount dogs vaccinated in drives without individual records. Coverage is <b>never</b> shown without a population estimate.</p>
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
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || !Number(f.dogs) || f.method.trim().length < 3 || f.source.trim().length < 3} onClick={() => void save()}>Save</button></>}>
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
export function ProgrammeReport() { return <Suspense><Frame title="Programme report" lede="A printable summary. Every figure comes from the shared record." actions={() => <button type="button" className="oh-btn primary" onClick={() => window.print()}><Printer size={16} aria-hidden />Print or save as PDF</button>}>{(p) => <ReportBody p={p} />}</Frame></Suspense>; }

function ReportBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const days = Number(sp.get("days") ?? 90);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `rep:${p.id}:${days}`);
  if (o.loading && !o.data) return <Loading rows={6} />;
  if (o.error || !o.data) return <Failed error={o.error ?? "Could not read the programme."} retry={o.reload} />;
  const d = o.data;
  return (
    <article className="oh-card pad" style={{ display: "grid", gap: 24 }}>
      <p style={{ color: "var(--muted)" }}>Period {fmtDate(d.since, { day: "numeric", month: "long", year: "numeric" })} to {fmtDate(d.today, { day: "numeric", month: "long", year: "numeric" })} · prepared {fmtTime(new Date().toISOString())}</p>
      <Section title="Partners and responsibilities"><ul style={{ display: "grid", gap: 4 }}>{d.partners.map((x) => <li key={x.id}><b style={{ color: "var(--ink)" }}>{x.name}</b> · {KIND_LABEL[x.kind]}{x.responsibilities ? `: ${x.responsibilities}` : ""}</li>)}</ul></Section>
      {d.exposures && d.pep ? <Section title="Human bite care"><dl className="oh-facts">
        <div><dt>Bite exposures</dt><dd>{showCount(d.exposures.total)}</dd></div><div><dt>Category III</dt><dd>{showCount(d.exposures.category_iii)}</dd></div>
        <div><dt>Courses prescribed</dt><dd>{showCount(d.pep.courses)}</dd></div><div><dt>Completion</dt><dd>{d.pep.completion_rate === null ? "Too few to show" : pct(d.pep.completion_rate)}</dd></div>
        <div><dt>Did not return</dt><dd>{showCount(d.pep.lost)}</dd></div><div><dt>Doses overdue now</dt><dd>{showCount(d.pep.doses_overdue)}</dd></div>
      </dl></Section> : null}
      <Section title="Laboratory surveillance"><dl className="oh-facts">
        <div><dt>Samples</dt><dd>{d.samples.total}</dd></div><div><dt>Positive</dt><dd>{d.samples.positive}</dd></div><div><dt>Negative</dt><dd>{d.samples.negative}</dd></div>
        <div><dt>Median days to result</dt><dd>{d.samples.median_days_to_result === null ? "None" : Math.round(d.samples.median_days_to_result * 10) / 10}</dd></div>
        <div><dt>Areas with confirmed cases</dt><dd>{d.samples.positive_areas.join(", ") || "None"}</dd></div>
      </dl></Section>
      <Section title="Coordination"><dl className="oh-facts">
        <div><dt>Requests closed</dt><dd>{d.handoffs.done}</dd></div><div><dt>Open</dt><dd>{d.handoffs.open}</dd></div><div><dt>Overdue</dt><dd>{d.handoffs.overdue}</dd></div>
        <div><dt>Median days to close</dt><dd>{d.handoffs.median_days_to_close === null ? "None" : Math.round(d.handoffs.median_days_to_close * 10) / 10}</dd></div>
        <div><dt>Facilities confirming services</dt><dd>{d.services.confirmed} of {d.services.facilities}</dd></div>
      </dl></Section>
      <Section title="Dog vaccination" note={`Target ${pct(d.programme.target)}`}><div className="oh-table-wrap"><table className="oh-table"><thead><tr><th>Area</th><th className="r">Vaccinated</th><th className="r">Estimate</th><th className="r">Coverage</th></tr></thead><tbody>{d.vaccination.map((v) => <tr key={v.area_id}><td>{v.area}</td><td className="r">{v.vaccinated}</td><td className="r">{v.estimate?.dogs ?? "None"}</td><td className="r">{v.estimate ? pct(v.vaccinated / v.estimate.dogs) : "Needs an estimate"}</td></tr>)}</tbody></table></div></Section>
      <Section title="Training"><p>{d.training.sessions} sessions, {d.training.participants} people: {Object.entries(d.training.by_audience).map(([k, v]) => `${AUDIENCE[k] ?? k} ${v}`).join(", ") || "none recorded"}.</p></Section>
      <p className="oh-note">{p.illustrative ? "Illustrative demonstration: every figure is invented. " : ""}Human counts below {d.programme.suppress_below} are shown as “fewer than {d.programme.suppress_below}”. Vaccination coverage appears only where a population estimate exists.</p>
    </article>
  );
}

/* ── Research data ─────────────────────────────────────────────────── */
export function ProgrammeData() { return <Frame title="Research data" lede="Weekly counts by area, animal and category. Small counts suppressed.">{(p) => <DataBody p={p} />}</Frame>; }

function DataBody({ p }: { p: Prog }) {
  const x = useRead<{ since: string; suppress_below: number; rows: { week: string; area: string; species: string; category: string; exposures: Count }[] }>(() => call("oh_research_extract", { p_programme: p.id, p_days: 365 }), `rx:${p.id}`);
  if (x.loading && !x.data) return <Loading rows={5} />;
  if (x.error || !x.data) return <Failed error={x.error ?? "Could not read the extract."} retry={x.reload} />;
  const rows = x.data.rows;
  const csv = () => {
    const lines = [["week", "area", "species", "category", "exposures"].join(","), ...rows.map((r) => [r.week, `"${r.area.replace(/"/g, '""')}"`, r.species, r.category, r.exposures === "<5" ? `<${x.data!.suppress_below}` : String(r.exposures)].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${p.slug}-exposures-by-week.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="oh-actions" style={{ marginBottom: 16 }}><button type="button" className="oh-btn primary" onClick={csv} disabled={!rows.length}><Download size={16} aria-hidden />Download CSV</button><span style={{ color: "var(--muted)", fontSize: 12, alignSelf: "center" }}>{rows.length} rows since {fmtDate(x.data.since, { day: "numeric", month: "short", year: "numeric" })}{p.illustrative ? " · illustrative" : ""}</span></div>
      {rows.length ? <div className="oh-table-wrap" style={{ maxHeight: 560 }}><table className="oh-table"><thead><tr><th>Week</th><th>Area</th><th>Animal</th><th>Category</th><th className="r">Exposures</th></tr></thead><tbody>{rows.slice(0, 300).map((r, i) => <tr key={i}><td>{fmtDate(r.week)}</td><td>{r.area}</td><td>{r.species}</td><td>{r.category}</td><td className="r">{showCount(r.exposures)}</td></tr>)}</tbody></table></div> : <Empty title="No exposures in the last year" />}
    </>
  );
}

/* ── Setup: one programme configured without engineering ─────────── */
export function ProgrammeSetup() { return <Frame title="Programme setup" lede="Modules, partners, areas and people. Changes apply at once." wide={false}>{(p, reload) => <SetupBody p={p} reload={reload} />}</Frame>; }

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
      {manager ? (
        <Section title="What this programme does">
          <div style={{ display: "grid", gap: 8 }}>{ALL_MODULES.map((m) => <label key={m} className="oh-toggle"><input type="checkbox" checked={mods.includes(m)} onChange={(e) => setMods(e.target.checked ? [...mods, m] : mods.filter((x) => x !== m))} /><div><b>{MODULES[m].label}</b><span>{MODULES[m].note}</span></div></label>)}</div>
          <div className="oh-fields" style={{ marginTop: 18 }}>
            <label className="oh-field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="oh-field"><span>Vaccination target (%)</span><input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 3))} /></label>
            <label className="oh-field"><span>Days to answer a follow-up</span><input inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
            <label className="oh-field"><span>Dog revaccination interval (days)</span><input inputMode="numeric" value={revac} onChange={(e) => setRevac(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Off" /><small>Set by the programme&apos;s veterinary lead. Leave empty to switch reminders off.</small></label>
            <label className="oh-field full"><span>Summary</span><textarea value={summary} maxLength={600} onChange={(e) => setSummary(e.target.value)} /></label>
          </div>
          {err ? <Failed error={err} /> : null}
          <div className="oh-submit" style={{ marginTop: 14 }}><button type="button" className="oh-btn primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save settings"}</button><p>Human counts below {p.config?.suppress_below ?? 5} are always hidden outside the treating facility.</p></div>
        </Section>
      ) : <p className="oh-note">Only the programme lead changes modules and settings. You can invite people to your own organisation below.</p>}
      {manager ? <Partners p={p} onChange={() => { reload(); reloadPlaces(); }} /> : null}
      <Invites orgs={mine.filter((x) => x.capabilities.includes("invite")).map((x) => ({ id: x.organisation_id, name: x.name, kind: x.kind }))} />
    </>
  );
}

function Partners({ p, onChange }: { p: Prog; onChange: () => void }) {
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: 30 }), `setup-ov:${p.id}`);
  const [adding, setAdding] = useState(false), [area, setArea] = useState(""), [busy, setBusy] = useState(false);
  const toast = useToast();
  const addArea = async () => { setBusy(true); const r = await call("oh_add_area", { p_programme: p.id, p_name: area, p_level: "ward", p_code: null }); setBusy(false); if (r.error) toast(r.error, "flame"); else { setArea(""); toast("Area added."); o.reload(); } };
  return (
    <>
      <Section title="Partners" action={<button type="button" className="oh-btn small" onClick={() => setAdding(true)}><Plus size={14} aria-hidden />Add a partner</button>}>
        {o.data ? <div className="oh-rows">{o.data.partners.map((x) => <div className="oh-row" key={x.id}><Glyph kind={x.kind} /><div className="oh-row-main"><b>{x.name}</b><span className="wrap">{KIND_LABEL[x.kind]}{x.responsibilities ? ` · ${x.responsibilities}` : ""}</span></div><div className="oh-row-meta">{showCount(x.members)} people</div></div>)}</div> : <Loading rows={3} />}
      </Section>
      <Section title="Areas" note="Wards or localities this programme covers">
        {o.data ? <p style={{ marginBottom: 10 }}>{o.data.vaccination.map((v) => v.area).join(", ") || "None yet"}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input className="oh-input" style={{ maxWidth: 320 }} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ward or locality name" aria-label="New area name" /><button type="button" className="oh-btn" disabled={busy || area.trim().length < 2} onClick={() => void addArea()}><MapPin size={14} aria-hidden />Add area</button></div>
        <p className="oh-note" style={{ marginTop: 10 }}>Boundaries can be loaded later from the municipality&apos;s official ward map. Until then areas are names, and maps show places rather than wards.</p>
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
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || f.name.trim().length < 2} onClick={() => void save()}>Add partner</button></>}>
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
      <div className="oh-fields">
        <label className="oh-field"><span>Organisation</span><select value={org} onChange={(e) => { setOrg(e.target.value); setRole(INVITE_ROLES[orgs.find((o) => o.id === e.target.value)?.kind ?? "clinic"][0]); }}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="oh-field"><span>Role</span><select value={role} onChange={(e) => setRole(e.target.value as Role)}>{INVITE_ROLES[kind].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
        <label className="oh-field"><span>Name</span><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
        <label className="oh-field"><span>Email (optional)</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      </div>
      {err ? <Failed error={err} /> : null}
      <div className="oh-submit" style={{ marginTop: 12 }}><button type="button" className="oh-btn primary" disabled={busy} onClick={() => void create()}>Create invite code</button>{code ? <p>Give them this code: <span className="oh-code">{code}</span> · they sign in to StrayPaw and enter it under <b>Have an invite code?</b> on Today.</p> : null}</div>
      {list.data ? <div className="oh-rows" style={{ marginTop: 16 }}>
        {list.data.members.map((m, i) => <div className="oh-row" key={`m${i}`} style={{ minHeight: 48 }}><div className="oh-row-main"><b>{m.name ?? "Member"}</b><span>{ROLE_LABEL[m.role]} · since {fmtDate(m.since)}</span></div></div>)}
        {list.data.invites.map((v) => <div className="oh-row" key={v.code} style={{ minHeight: 48 }}><div className="oh-row-main"><b>{v.name ?? v.email ?? "Invited"}</b><span>{ROLE_LABEL[v.role]} · code {v.code} · expires {relDay(v.expires_at).toLowerCase()}</span></div><div className="oh-row-meta"><Chip tone="amber">Not yet accepted</Chip></div></div>)}
      </div> : null}
    </Section>
  );
}

export { ProgrammeOverview as default };
