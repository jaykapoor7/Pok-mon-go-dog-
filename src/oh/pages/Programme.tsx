"use client";

/* The programme, seen whole: what needs a decision, then human bites and
   care, laboratory surveillance, dog vaccination, partners and training.
   Every figure is a count from the record; human counts below five are
   suppressed by the database before they reach this page. */
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Plus, Printer } from "lucide-react";
import { OhShell, Glyph, useOh } from "../Shell";
import { call, fmtDate, relDay, select, showCount, useRead, AUDIENCE, HANDOFF, HANDOFF_KIND, KIND_LABEL, SERVICE_LABEL, SERVICE_STATUS, type Count, type Handoff, type Institution, type Overview, type Programme as Prog } from "../data";
import { Bars, Chip, Empty, Failed, Head, Loading, Section, Seg, Sheet, Stat, useToast } from "../ui";

function useProgramme() {
  const { slug } = useParams<{ slug: string }>();
  const prog = useRead<Prog[]>(() => select<Prog>("oh_programmes", { slug }), `p:${slug}`);
  return { slug, prog: prog.data?.[0] ?? null, loading: prog.loading, error: prog.error, reload: prog.reload };
}

function Frame({ children, actions, title, lede }: { children: (p: Prog) => ReactNode; actions?: (p: Prog) => ReactNode; title?: string; lede?: string }) {
  const { slug, prog, loading, error, reload } = useProgramme();
  const path = usePathname();
  const tabs: [string, string][] = [["", "Overview"], ["/follow-ups", "Follow-ups"], ["/services", "Services"], ["/report", "Report"]];
  if (loading && !prog) return <main className="oh-page"><Loading rows={5} /></main>;
  if (error) return <main className="oh-page"><Failed error={error} retry={reload} /></main>;
  if (!prog) return <main className="oh-page"><Empty title="This programme is not visible to you">Only programme partners can open it.</Empty></main>;
  return (
    <main className="oh-page wide" id="main-content">
      <Head eyebrow={<>{prog.city}<span aria-hidden>·</span><Chip tone="blue">{prog.status === "pilot" ? "Pilot" : prog.status}</Chip></>} title={title ?? prog.name} lede={lede ?? prog.summary ?? undefined} actions={actions?.(prog)} />
      <nav className="oh-tabs" aria-label="Programme">{tabs.map(([s, l]) => <Link key={s} href={`/programme/${slug}${s}`} aria-current={path === `/programme/${slug}${s}` ? "page" : undefined}>{l}</Link>)}</nav>
      {children(prog)}
    </main>
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (c: Count) => (typeof c === "number" ? c : null);

/* ── Overview ──────────────────────────────────────────────────────── */
export function ProgrammeOverview() { return <OhShell><Suspense><Frame actions={() => <PeriodPicker />}>{(p) => <OverviewBody p={p} />}</Frame></Suspense></OhShell>; }

function PeriodPicker() {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  const days = sp.get("days") ?? "90";
  return <Seg name="period" value={days} onChange={(v) => router.replace(`${path}?days=${v}`)} options={[["30", "30 days"], ["90", "90 days"], ["365", "12 months"]]} />;
}

function OverviewBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const days = Number(sp.get("days") ?? 90);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `ov:${p.id}:${days}`);
  if (o.loading && !o.data) return <Loading rows={6} />;
  if (o.error || !o.data) return <Failed error={o.error ?? "Could not read the programme."} retry={o.reload} />;
  const d = o.data;
  const decisions: { tone: string; text: ReactNode; href: string }[] = [];
  if (d.samples.positive) decisions.push({ tone: "flame", text: <><b>{d.samples.positive} laboratory-confirmed rabies case{d.samples.positive === 1 ? "" : "s"}</b> in {d.samples.positive_wards.join(", ")}. Agree the response with the partners.</>, href: `/programme/${p.slug}/follow-ups?kind=result_notice` });
  if (d.handoffs.overdue) decisions.push({ tone: "flame", text: <><b>{d.handoffs.overdue} follow-up{d.handoffs.overdue === 1 ? " is" : "s are"} overdue</b> across the partners.</>, href: `/programme/${p.slug}/follow-ups?show=overdue` });
  if (d.services.stale) decisions.push({ tone: "amber", text: <><b>{d.services.stale} service confirmation{d.services.stale === 1 ? " has" : "s have"} expired.</b> The public finder shows them as not verified.</>, href: `/programme/${p.slug}/services` });
  if (d.services.arv_unavailable) decisions.push({ tone: "flame", text: <><b>Anti-rabies vaccine is unavailable at {d.services.arv_unavailable} facilit{d.services.arv_unavailable === 1 ? "y" : "ies"}.</b></>, href: `/programme/${p.slug}/services` });
  const weeks = d.exposures.by_week.map((w) => ({ x: fmtDate(w.week, { day: "numeric", month: "short" }), n: w.n }));
  const maxWard = Math.max(1, ...d.exposures.by_ward.map((w) => num(w.n) ?? 4));
  return (
    <>
      {decisions.length ? (
        <Section title="Needs a decision">
          <div className="oh-rows">{decisions.map((x, i) => <Link className="oh-row" key={i} href={x.href}><AlertTriangle size={16} color={x.tone === "flame" ? "var(--flame)" : "var(--amber)"} aria-hidden /><div className="oh-row-main"><span className="wrap" style={{ color: "var(--body)", fontSize: 14 }}>{x.text}</span></div><ArrowRight size={16} aria-hidden color="var(--muted)" /></Link>)}</div>
        </Section>
      ) : null}
      <dl className="oh-stats" style={{ marginTop: decisions.length ? 28 : 0 }}>
        <Stat label="Bite exposures" value={d.exposures.total} note={<>Category III: {showCount(d.exposures.category_iii)}</>} />
        <Stat label="Courses completed" value={d.pep.completion_rate === null ? null : pct(d.pep.completion_rate)} note={d.pep.completion_rate === null ? "Too few closed courses to show" : `Did not return: ${showCount(d.pep.lost)}`} tone={d.pep.completion_rate !== null && d.pep.completion_rate < 0.8 ? "amber" : "green"} />
        <Stat label="Laboratory-confirmed" value={d.samples.positive} note={`${d.samples.total} samples · ${d.samples.waiting} waiting`} tone={d.samples.positive ? "flame" : undefined} />
        <Stat label="Follow-ups closed" value={d.handoffs.done} note={d.handoffs.median_days_to_close !== null ? `Median ${Math.round(d.handoffs.median_days_to_close * 10) / 10} days to close` : "None closed yet"} href={`/programme/${p.slug}/follow-ups`} />
        <Stat label="Services confirmed" value={`${d.services.confirmed}`} note={`${d.services.stale} expired · ${d.services.facilities} facilities`} href={`/programme/${p.slug}/services`} tone={d.services.stale ? "amber" : undefined} />
      </dl>

      <div className="oh-grid two">
        <Section title="Bite exposures by week" note="Counts below 5 are hidden and drawn hatched"><div className="oh-card pad"><Bars points={weeks} label="Bite exposures by week" /></div></Section>
        <Section title="Where bites happened">
          {d.exposures.by_ward.length ? (
            <div className="oh-table-wrap"><table className="oh-table"><tbody>
              {d.exposures.by_ward.map((w) => <tr key={w.ward}><td className="strong">{w.ward}</td><td style={{ width: "45%" }}><div className="oh-bar"><i style={{ width: `${((num(w.n) ?? 4) / maxWard) * 100}%`, opacity: num(w.n) === null ? 0.35 : 1 }} /></div></td><td className="r">{showCount(w.n)}</td></tr>)}
            </tbody></table></div>
          ) : <Empty title="No bites recorded in this period" />}
        </Section>
      </div>

      <Section title="Dog vaccination by ward" note={`Programme target ${pct(d.programme.target)} of the dog population`}>
        <div className="oh-table-wrap"><table className="oh-table">
          <thead><tr><th>Ward</th><th className="r">On the register</th><th className="r">Vaccinated</th><th>Of registered dogs</th><th>Population estimate</th><th>Coverage against target</th></tr></thead>
          <tbody>
            {d.vaccination.map((v) => {
              const share = v.registered ? v.vaccinated / v.registered : null, cov = v.estimate ? v.vaccinated / v.estimate.dogs : null;
              return (
                <tr key={v.ward}>
                  <td className="strong">{v.ward}</td><td className="r">{v.registered}</td><td className="r">{v.vaccinated}</td>
                  <td>{share === null ? "No dogs registered" : <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="oh-bar" style={{ flex: 1 }}><i data-tone="green" style={{ width: pct(share) }} /></div><span className="num">{pct(share)}</span></div>}</td>
                  <td>{v.estimate ? <span title={`${v.estimate.method}. ${v.estimate.source}.`}>{v.estimate.dogs} dogs <span style={{ color: "var(--muted)" }}>· {v.estimate.method.toLowerCase()}</span></span> : <span style={{ color: "var(--muted)" }}>No estimate</span>}</td>
                  <td>{cov === null ? <span style={{ color: "var(--muted)" }}>Needs an estimate</span> : <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="oh-bar" style={{ flex: 1 }}><i data-tone={cov >= d.programme.target ? "green" : "amber"} style={{ width: pct(Math.min(1, cov)) }} /><span className="target" style={{ left: pct(d.programme.target) }} /></div><span className="num">{pct(cov)}</span></div>}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="oh-note" style={{ marginTop: 10 }}>&ldquo;Of registered dogs&rdquo; is the share of dogs on partner registers recorded as vaccinated. It is <b>not</b> population coverage. Coverage against the target appears only where a population estimate, with its method and source, has been recorded.</p>
      </Section>

      <div className="oh-grid two" style={{ marginTop: 28 }}>
        <Section title="Partners" note="Who is responsible for what, and their open work">
          <div className="oh-rows">
            {d.partners.map((x) => (
              <div className="oh-row" key={x.id}>
                <Glyph kind={x.kind} />
                <div className="oh-row-main"><b>{x.name}</b><span className="wrap">{KIND_LABEL[x.kind]}{x.responsibilities ? ` · ${x.responsibilities}` : ""}</span></div>
                <div className="oh-row-meta">{x.overdue ? <Chip tone="flame">{x.overdue} overdue</Chip> : null}{x.open ? <Chip plain>{x.open} open</Chip> : <Chip plain tone="green">Clear</Chip>}</div>
              </div>
            ))}
          </div>
        </Section>
        <div>
          <Section title="Laboratory surveillance">
            <dl className="oh-facts oh-card pad">
              <div><dt>Samples in period</dt><dd>{d.samples.total}</dd></div>
              <div><dt>Positive · negative</dt><dd>{d.samples.positive} · {d.samples.negative}</dd></div>
              <div><dt>Waiting at the laboratory</dt><dd>{d.samples.waiting}</dd></div>
              <div><dt>Median days to result</dt><dd>{d.samples.median_days_to_result === null ? "None resulted" : Math.round(d.samples.median_days_to_result * 10) / 10}</dd></div>
              <div style={{ gridColumn: "1 / -1" }}><dt>Wards with confirmed cases</dt><dd>{d.samples.positive_wards.length ? d.samples.positive_wards.join(", ") : "None"}</dd></div>
            </dl>
          </Section>
          <Training p={p} d={d} reload={o.reload} />
        </div>
      </div>
    </>
  );
}

function Training({ p, d, reload }: { p: Prog; d: Overview; reload: () => void }) {
  const { place } = useOh();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const can = !!place && (["coordinator", "municipal", "laboratory", "training"].includes(place.kind) || ["lead", "trainer"].includes(place.role));
  return (
    <Section title="Training" action={can ? <button type="button" className="oh-btn small" onClick={() => setOpen(true)}><Plus size={14} aria-hidden />Record a session</button> : undefined}>
      <div className="oh-card pad">
        <p style={{ color: "var(--ink)", fontWeight: 500, marginBottom: 10 }}>{d.training.sessions} session{d.training.sessions === 1 ? "" : "s"}, {d.training.participants} participants</p>
        <ul style={{ display: "grid", gap: 6 }}>{Object.entries(d.training.by_audience).map(([k, n]) => <li key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{AUDIENCE[k] ?? k}</span><span className="num" style={{ color: "var(--ink)" }}>{n}</span></li>)}</ul>
      </div>
      {open ? <TrainingSheet programme={p.id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); toast("Training session recorded."); reload(); }} /> : null}
    </Section>
  );
}

function TrainingSheet({ programme, onClose, onDone }: { programme: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", audience: "veterinarians", on: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), n: "", inst: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_record_training", { p_programme: programme, p_title: f.title, p_audience: f.audience, p_held_on: f.on, p_participants: Number(f.n || 0), p_institutions: f.inst ? Number(f.inst) : null }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title="Record a training session" onClose={onClose} foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || f.title.trim().length < 3} onClick={save}>Save</button></>}>
      <label className="oh-field"><span>Title</span><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="oh-field"><span>Who it was for</span><select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className="oh-fields">
        <label className="oh-field"><span>Date</span><input type="date" value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></label>
        <label className="oh-field"><span>Participants</span><input inputMode="numeric" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value.replace(/\D/g, "") })} /></label>
        <label className="oh-field"><span>Institutions reached</span><input inputMode="numeric" value={f.inst} onChange={(e) => setF({ ...f, inst: e.target.value.replace(/\D/g, "") })} /></label>
      </div>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/* ── Follow-ups across the programme ───────────────────────────────── */
export function ProgrammeFollowUps() { return <OhShell><Suspense><Frame title="Follow-ups" lede="Work passed between partners. Patient details are never part of a follow-up.">{(p) => <FollowUpsBody p={p} />}</Frame></Suspense></OhShell>; }

function FollowUpsBody({ p }: { p: Prog }) {
  const sp = useSearchParams();
  const rows = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { programme_id: p.id }, "*", 1000), `ph:${p.id}`);
  const inst = useRead<Institution[]>(() => select<Institution>("oh_institutions", { programme_id: p.id }), `inst:${p.id}`);
  const name = useMemo(() => new Map((inst.data ?? []).map((i) => [i.id, i.short_name ?? i.name])), [inst.data]);
  const [show, setShow] = useState(sp.get("show") ?? "open"), [kind, setKind] = useState(sp.get("kind") ?? "all"), [raising, setRaising] = useState(false);
  const { place } = useOh(), toast = useToast();
  const t = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (rows.loading && !rows.data) return <Loading rows={6} />;
  if (rows.error) return <Failed error={rows.error} retry={rows.reload} />;
  const all = (rows.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const list = all.filter((h) => (kind === "all" || h.kind === kind) && (show === "all" ? true : show === "overdue" ? (h.status === "open" || h.status === "accepted") && !!h.due_on && h.due_on < t : show === "open" ? h.status === "open" || h.status === "accepted" : h.status === "done" || h.status === "declined"));
  const oversee = place && ["coordinator", "municipal"].includes(place.kind);
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Seg name="show" value={show} onChange={setShow} options={[["open", "Open"], ["overdue", "Overdue"], ["closed", "Closed"], ["all", "All"]]} />
        <select className="oh-btn" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option value="all">Every kind</option>{Object.entries(HANDOFF_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {oversee ? <button type="button" className="oh-btn primary" style={{ marginLeft: "auto" }} onClick={() => setRaising(true)}><Plus size={16} aria-hidden />Ask a partner</button> : null}
      </div>
      {!list.length ? <Empty title="Nothing here" /> : (
        <div className="oh-table-wrap"><table className="oh-table">
          <thead><tr><th>Follow-up</th><th>From</th><th>To</th><th>Ward</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>{list.slice(0, 200).map((h) => {
            const late = (h.status === "open" || h.status === "accepted") && h.due_on && h.due_on < t;
            return <tr key={h.id}><td><div className="strong" style={{ color: "var(--ink)", fontWeight: 600 }}>{h.title}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{HANDOFF_KIND[h.kind]}{h.outcome ? ` · ${h.outcome}` : ""}</div></td><td>{h.from_institution ? name.get(h.from_institution) : "Programme"}</td><td>{name.get(h.to_institution)}</td><td>{h.ward ?? "–"}</td><td style={{ color: late ? "var(--flame)" : undefined, whiteSpace: "nowrap" }}>{h.due_on ? (late ? relDay(h.due_on) : fmtDate(h.due_on)) : "–"}</td><td><Chip tone={HANDOFF[h.status].tone}>{HANDOFF[h.status].label}</Chip></td></tr>;
          })}</tbody>
        </table></div>
      )}
      {raising ? <Raise p={p} partners={inst.data ?? []} onClose={() => setRaising(false)} onDone={() => { setRaising(false); toast("Sent. The partner sees it on their follow-ups."); rows.reload(); }} /> : null}
    </>
  );
}

function Raise({ p, partners, onClose, onDone }: { p: Prog; partners: Institution[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: "vaccination_request", to: partners.find((x) => x.kind === "ngo")?.id ?? "", title: "", detail: "", ward: "", due: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_raise_handoff", { p_programme: p.id, p_kind: f.kind, p_to: f.to, p_title: f.title, p_detail: f.detail || null, p_ward: f.ward || null, p_due: f.due || null }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title="Ask a partner" note="They see it on their own follow-ups" onClose={onClose} foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || f.title.trim().length < 3 || !f.to} onClick={save}>Send</button></>}>
      <label className="oh-field"><span>What kind</span><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{(["vaccination_request", "animal_followup", "sample_request", "service_gap"] as const).map((k) => <option key={k} value={k}>{HANDOFF_KIND[k]}</option>)}</select></label>
      <label className="oh-field"><span>To</span><select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="oh-field"><span>What you are asking</span><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="For example: vaccinate dogs around the market" /></label>
      <label className="oh-field"><span>Details</span><textarea value={f.detail} maxLength={1200} onChange={(e) => setF({ ...f, detail: e.target.value })} /></label>
      <div className="oh-fields">
        <label className="oh-field"><span>Ward</span><select value={f.ward} onChange={(e) => setF({ ...f, ward: e.target.value })}><option value="">Any</option>{p.wards.map((w) => <option key={w}>{w}</option>)}</select></label>
        <label className="oh-field"><span>Due by</span><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
      </div>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

/* ── Services across facilities ────────────────────────────────────── */
export function ProgrammeServices() { return <OhShell><Suspense><Frame title="Services across the programme" lede="What each facility last confirmed. Expired confirmations show as not verified, here and in the public finder.">{(p) => <ServicesBody p={p} />}</Frame></Suspense></OhShell>; }

function ServicesBody({ p }: { p: Prog }) {
  const pub = useRead<{ facilities: { id: string; name: string; kind: "hospital" | "clinic"; ward: string | null; hours: string | null; services: { service: string; status: string; verified_at: string; valid_until: string }[] }[] }>(() => call("oh_public_services", { p_programme_slug: p.slug }), `svc:${p.slug}`);
  if (pub.loading && !pub.data) return <Loading rows={3} />;
  if (pub.error || !pub.data) return <Failed error={pub.error ?? "Could not read services."} retry={pub.reload} />;
  const svcs = ["arv", "rig", "wound_care"];
  return (
    <>
      <div className="oh-table-wrap"><table className="oh-table">
        <thead><tr><th>Facility</th><th>Ward</th>{svcs.map((s) => <th key={s}>{SERVICE_LABEL[s]}</th>)}<th>Hours</th></tr></thead>
        <tbody>{pub.data.facilities.map((f) => (
          <tr key={f.id}><td className="strong">{f.name}</td><td>{f.ward}</td>
            {svcs.map((s) => { const v = f.services.find((x) => x.service === s); const st = v?.status ?? "not_verified"; return <td key={s}><Chip tone={SERVICE_STATUS[st].tone}>{SERVICE_STATUS[st].label}</Chip>{v ? <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{st === "not_verified" ? "Expired" : "Confirmed"} {relDay(v.verified_at).toLowerCase()}</div> : null}</td>; })}
            <td>{f.hours}</td></tr>
        ))}</tbody>
      </table></div>
      <p className="oh-note" style={{ marginTop: 12 }}>The public sees this list on the bite-help page. Confirmations come from facility staff; StrayPaw never shows vaccine stock levels.</p>
    </>
  );
}

/* ── A printable report ────────────────────────────────────────────── */
export function ProgrammeReport() { return <OhShell><Suspense><Frame title="Programme report" lede="A one-page summary for partners and funders. Print or save as PDF." actions={() => <button type="button" className="oh-btn primary" onClick={() => window.print()}><Printer size={16} aria-hidden />Print or save as PDF</button>}>{(p) => <ReportBody p={p} />}</Frame></Suspense></OhShell>; }

function ReportBody({ p }: { p: Prog }) {
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: p.id, p_days: 90 }), `rep:${p.id}`);
  if (o.loading && !o.data) return <Loading rows={6} />;
  if (o.error || !o.data) return <Failed error={o.error ?? "Could not read the programme."} retry={o.reload} />;
  const d = o.data;
  const est = d.vaccination.filter((v) => v.estimate);
  return (
    <article className="oh-card pad" style={{ padding: 32, display: "grid", gap: 22, maxWidth: 860 }}>
      {d.programme.illustrative ? <p className="oh-note" style={{ background: "var(--amber-fill)", color: "#6d4608" }}><b>Illustrative demonstration data.</b> Not a report of a real programme.</p> : null}
      <header><p className="oh-eyebrow">Last 90 days · since {fmtDate(d.since, { day: "numeric", month: "long", year: "numeric" })}</p><h2 className="oh-title" style={{ fontSize: 22 }}>{d.programme.name}</h2></header>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>Human bite care</h3><p>{showCount(d.exposures.total)} bite exposures were recorded at partner facilities, {showCount(d.exposures.category_iii)} assessed as category III. {d.pep.completion_rate === null ? "Too few courses have closed to report a completion rate." : `${pct(d.pep.completion_rate)} of closed post-exposure courses were completed; ${showCount(d.pep.lost)} patients did not return.`}</p></section>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>Laboratory surveillance</h3><p>{d.samples.total} animal samples were submitted: {d.samples.positive} positive, {d.samples.negative} negative, {d.samples.waiting} awaiting results.{d.samples.positive_wards.length ? ` Confirmed cases: ${d.samples.positive_wards.join(", ")}.` : ""}{d.samples.median_days_to_result !== null ? ` Median time to result ${Math.round(d.samples.median_days_to_result * 10) / 10} days.` : ""}</p></section>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>One Health follow-up</h3><p>{d.handoffs.done} follow-ups between partners were closed{d.handoffs.median_days_to_close !== null ? `, with a median of ${Math.round(d.handoffs.median_days_to_close * 10) / 10} days` : ""}; {d.handoffs.open} are open and {d.handoffs.overdue} overdue.</p></section>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>Dog vaccination</h3><p>{d.vaccination.reduce((s, v) => s + v.vaccinated, 0)} of {d.vaccination.reduce((s, v) => s + v.registered, 0)} dogs on partner registers are recorded as vaccinated. {est.length ? `Population estimates exist for ${est.length} of ${d.vaccination.length} wards; coverage against the ${pct(d.programme.target)} target is reported only for those.` : "No ward has a population estimate yet, so coverage against the target cannot be reported."}</p></section>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>Capacity building</h3><p>{d.training.sessions} training sessions reached {d.training.participants} participants.</p></section>
      <section><h3 style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>Partners</h3><ul style={{ display: "grid", gap: 4 }}>{d.partners.map((x) => <li key={x.id}>{x.name} <span style={{ color: "var(--muted)" }}>· {x.responsibilities}</span></li>)}</ul></section>
      <footer style={{ color: "var(--muted)", fontSize: 12 }}>Human counts below five are suppressed. Figures are counts from partner records in StrayPaw; they are not population estimates unless stated.</footer>
    </article>
  );
}
