"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Crosshair, Download, Lock, Minus, Plus, RefreshCw, WifiOff } from "lucide-react";
import type { Survey, SurveyArea, SurveyResponse } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { compressForUpload } from "@/lib/photo/compress";
import { archiveDraft, offlineUnlocked, offlineVaultExists, putDraft, readDrafts, readSynced, unlockOffline, type FieldDraft } from "@/lib/field/outbox";
import { submitFieldDraft } from "@/lib/field/sync";
import type { SurveyResponseInput } from "@/lib/survey-actions";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Denied, Failed, Field, Modal, RecordHead, Skeleton, TabBar, day, dayTime, errText, toast, useAct } from "../../kit";
import { addArea, addEntry, fieldsOf, getSurveyAreas, getSurveyById, getSurveyResponses, getSurveyTotals, isProject, purposeOf, searchAnimals } from "../../data/ngo-programmes";
import { Grid, TryLink, plural, useWho, type GCol } from "./frame";
import { S_AREAS, S_ENTRIES, S_RESPONSES, S_SURVEYS } from "./sample";
import { animalLine } from "../../animalLabel";

/* One survey or project. A survey has its areas, totals and observations, and a collect view for the field: entries
   are saved encrypted on the phone first (a six-digit PIN unlocks them) and sent when there is signal, each with
   its own request id so a retry never records twice (operations_submit_survey). A project is a register whose
   entries fill its own fields (submit_survey_response). */

type Totals = { areas: number; responses: number; animals: number; covered: number };
type Data = { survey: Survey; areas: SurveyArea[]; responses: SurveyResponse[]; totals: Totals | null };
type Tab = "Overview" | "Collect" | "Register";

export function SurveyRecord({ id, collect }: { id: string; collect?: boolean }) {
  const who = useWho();
  const [d, setD] = useState<{ s: "loading" } | { s: "ok"; d: Data } | { s: "missing" } | { s: "error"; e: string }>({ s: "loading" });
  const live = who.ready && !who.sample && !!who.ngo;
  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getSurveyById(id), getSurveyAreas(id)]);
      if (!s) { setD({ s: "missing" }); return; }
      const [r, t] = await Promise.all([getSurveyResponses(id, 500), getSurveyTotals(id).catch(() => null)]);
      setD({ s: "ok", d: { survey: s, areas: a, responses: r, totals: t } });
    } catch (e) { setD({ s: "error", e: errText(e) }); }
  }, [id]);
  useEffect(() => { if (live) void load(); }, [live, load]);
  const sampleSurvey = S_SURVEYS.find((s) => s.id === id) ?? null;
  const data: Data | null = who.sample ? (sampleSurvey ? { survey: sampleSurvey, areas: S_AREAS.filter((a) => a.survey_id === id), responses: isProject(sampleSurvey) ? (S_ENTRIES as unknown as SurveyResponse[]) : S_RESPONSES.filter((r) => r.survey_id === id), totals: id === "sample-sv1" ? { areas: 3, responses: 27, animals: 63, covered: 2 } : { areas: 0, responses: 0, animals: 0, covered: 0 } } : null) : d.s === "ok" ? d.d : null;
  const project = data ? isProject(data.survey) : false;
  const [tab, setTab] = useState<Tab>(collect ? "Collect" : "Overview");
  const crumb: [string, string] = ["Programmes", data?.survey.title ?? "Survey"];
  if (!who.ready || (live && d.s === "loading")) return <Shell crumb={crumb}><div className="nx-page"><Skeleton rows={6} label="Reading the survey" /></div></Shell>;
  if (who.notNgo) return <Shell crumb={crumb}><div className="nx-page"><Denied what="Surveys are private to the NGO that keeps them" why="Your account is not part of an NGO." /></div></Shell>;
  if (!who.sample && d.s === "error") return <Shell crumb={crumb}><div className="nx-page"><Failed error={d.e} retry={() => void load()} /></div></Shell>;
  if (!data) return <Shell crumb={crumb}><div className="nx-page"><Denied what="This survey is not in your organisation's register" why="It may belong to another organisation, or it does not exist." back={{ href: "/ngo/programmes?tab=surveys", label: "All surveys" }} /></div></Shell>;
  const s = data.survey;
  const tabs: Tab[] = project ? ["Register"] : ["Overview", "Collect"];
  const current: Tab = project ? "Register" : tab;
  return (
    <Shell crumb={crumb}>
      <RecordHead title={<>{s.title}{who.sample ? <Sample /> : null}</>} sub={<><Chip tone={s.status === "active" ? "ok" : "plain"}>{s.status.replace(/^./, (c) => c.toUpperCase())}</Chip><span>{project ? "Project register" : "Dog census"} · since {day(s.created_at)}</span></>}
        actions={<Link className="nx-btn is-quiet" href="/ngo/programmes?tab=surveys">All surveys</Link>} />
      {tabs.length > 1 ? <TabBar id="sv" tabs={tabs} value={current} onChange={setTab} label="Survey sections" /> : <div style={{ borderBottom: "1px solid var(--line)", marginTop: 16 }} />}
      <div className="nx-page" style={{ maxWidth: 1100, paddingTop: 20 }}>
        {(project ? purposeOf(s.description) : s.description) ? <p className="nx-sub" style={{ marginBottom: 12 }}>{project ? purposeOf(s.description) : s.description}</p> : null}
        {current === "Register" ? <Register sample={who.sample} survey={s} entries={data.responses as unknown as Entry[]} total={data.totals?.responses ?? null} onChanged={load} />
          : current === "Overview" ? <Overview sample={who.sample} data={data} onChanged={load} onCollect={() => setTab("Collect")} />
          : who.sample ? <div className="nx-empty"><Lock size={18} /><b>Collect works on a phone, offline if need be</b><p>Signed in, each observation is saved encrypted on the device behind a six-digit PIN and sent when there is signal.</p><div className="nx-empty-a"><TryLink>Open the live demo</TryLink></div></div>
          : <Collect survey={s} areas={data.areas} userId={who.userId} onSynced={load} />}
      </div>
    </Shell>
  );
}

/* ── Overview: totals, areas, observations ── */
function Overview({ sample, data, onChanged, onCollect }: { sample: boolean; data: Data; onChanged: () => Promise<void>; onCollect: () => void }) {
  const { survey, areas, responses, totals } = data;
  const [adding, setAdding] = useState(false);
  const started = totals?.areas ? Math.round((totals.covered / totals.areas) * 100) : null;
  const areaName = new Map(areas.map((a) => [a.id, a.name]));
  const csv = () => downloadCsv(`${survey.title.replace(/\W+/g, "-").toLowerCase()}-responses.csv`, responses.map((r) => ({ date: r.created_at, area: r.area_id ? areaName.get(r.area_id) ?? "" : "", species: "Dog", count: r.count, lat: r.lat ?? "", lng: r.lng ?? "", sterilised: (r.attributes as Record<string, unknown>)?.sterilised ?? "Unknown", vaccination_mark: r.attributes?.vaccination_mark ?? "Unknown", animal_id: r.attributes?.animal_id ?? "Not identified", notes: r.notes ?? "" })), { title: `Survey: ${survey.title}` });
  const aCols: GCol<SurveyArea>[] = [
    { label: "Area", width: "minmax(0, 1.5fr)", render: (a) => <span className="nx-cell-main"><span><b>{a.code ? <span className="nx-t3">{a.code} · </span> : null}{a.name}</b><small>{a.animal_count ?? 0} dogs · {a.response_count ?? 0} responses{a.target_count ? ` · target ${a.target_count}` : ""}</small></span></span> },
    { label: "Dogs", width: "80px", render: (a) => <span className="num">{a.animal_count ?? 0}</span> },
    { label: "Target", width: "80px", render: (a) => <span className="num nx-t2">{a.target_count ?? "—"}</span> },
    { label: "Progress", width: "160px", render: (a) => (a.target_count ? <span className="ns-mini"><span className="ns-meter" style={{ width: 80 }}><i style={{ width: `${Math.min(100, Math.round(((a.animal_count ?? 0) / a.target_count) * 100))}%` }} /></span><span className="num nx-t2">{Math.min(100, Math.round(((a.animal_count ?? 0) / a.target_count) * 100))}%</span></span> : <span className="nx-t3">No target</span>) },
    { label: "State", width: "96px", keep: true, render: (a) => <Chip tone={(a.response_count ?? 0) > 0 ? "ok" : "plain"}>{(a.response_count ?? 0) > 0 ? "Started" : "Pending"}</Chip> },
  ];
  const rCols: GCol<SurveyResponse>[] = [
    { label: "Observation", width: "minmax(0, 1.4fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.count > 1 ? `${r.count} dogs` : "1 dog"}{r.area_id ? ` · ${areaName.get(r.area_id) ?? "an area"}` : ""}</b><small>{[r.attributes?.vaccination_mark ? `mark ${String(r.attributes.vaccination_mark)}` : null, typeof r.attributes?.sterilised === "boolean" ? (r.attributes.sterilised ? "ear-notched" : "not ear-notched") : null, r.notes].filter(Boolean).join(" · ") || "No details"}</small></span></span> },
    { label: "Location", width: "150px", render: (r) => <span className="nx-t3 num">{r.lat != null && r.lng != null ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : "Not captured"}</span> },
    { label: "When", width: "130px", keep: true, render: (r) => <span className="nx-t3">{dayTime(r.created_at)}</span> },
  ];
  return (
    <>
      <dl className="ns-dl"><div><dt>Areas</dt><dd>{totals?.areas ?? "Not read"}</dd></div><div><dt>Responses</dt><dd>{totals?.responses ?? "Not read"}</dd></div><div><dt>Dogs counted</dt><dd>{totals?.animals ?? "Not read"}</dd></div><div><dt>Areas started</dt><dd>{started === null ? "—" : `${started}%`}</dd></div></dl>
      <p className="ns-small" style={{ marginTop: 6 }}>Counts are observations, not a population estimate. An area started is an area with at least one response.</p>
      <div className="ns-acts"><button type="button" className="nx-btn" onClick={onCollect}>Collect data in the field</button></div>
      <section className="ns-sec"><div className="nx-sec-h"><h2>Areas</h2><span className="nx-count">{areas.length}</span><span style={{ marginLeft: "auto" }}>{sample ? <TryLink quiet small><Plus size={12} />Add area</TryLink> : <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAdding(true)}><Plus size={12} />Add area</button>}</span></div>
        <Grid label="Areas" cols={aCols} rows={areas} rowKey={(a) => a.id} empty={<><b>No areas yet</b><p>Add the wards or villages that divide the survey.</p></>} />
      </section>
      <section className="ns-sec"><div className="nx-sec-h"><h2>Recent observations</h2><span className="nx-count">{responses.length}</span><span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" disabled={!responses.length} onClick={csv}><Download size={12} />Export CSV</button></span></div>
        <Grid label="Observations" cols={rCols} rows={responses.slice(0, 100)} rowKey={(r) => r.id} empty={<b>No observations yet.</b>} />
        {responses.length > 100 ? <p className="nx-foot">The latest 100 of {responses.length} read are listed; the CSV has all {responses.length}.</p> : null}
      </section>
      {adding ? <AddArea surveyId={survey.id} onClose={() => setAdding(false)} onDone={async () => { setAdding(false); await onChanged(); }} /> : null}
    </>
  );
}

function AddArea({ surveyId, onClose, onDone }: { surveyId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const { busy, run } = useAct();
  const [f, setF] = useState({ name: "", code: "", target: "" });
  const amount = f.target.trim() ? Number(f.target) : null;
  const bad = amount !== null && (!Number.isInteger(amount) || amount < 1);
  const save = () => void run("area", () => addArea(surveyId, f.name.trim(), f.code.trim(), amount), { ok: "Area added." }).then(async (x) => { if (x.ok) await onDone(); });
  return (
    <Modal title="Add an area" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!f.name.trim() || bad || !!busy} onClick={save}>{busy ? "Adding…" : "Add area"}</button></>}>
      <div className="nx-fields">
        <Field label="Ward or village name" wide><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Code (optional)"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Target dog count (optional)" hint={bad ? "A target must be a positive whole number." : undefined}><input inputMode="numeric" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ── Collect: encrypted on the device first, sent when there is signal ── */
function Collect({ survey, areas, userId, onSynced }: { survey: Survey; areas: SurveyArea[]; userId: string | null; onSynced: () => Promise<void> }) {
  const scope = userId && survey.ngo_id ? `${userId}:${survey.ngo_id}` : null;
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { const check = () => setUnlocked(!!scope && offlineUnlocked(scope)); check(); window.addEventListener("straypaw-offline-locked", check); return () => window.removeEventListener("straypaw-offline-locked", check); }, [scope]);
  if (!userId) return <Denied what="Sign in to record observations" why="Observations are recorded in your name for your organisation." />;
  if (!scope) return <Denied what="This survey has no organisation" why="An administrator must resolve which organisation keeps it before anyone collects for it." />;
  if (!unlocked) return <Pin scope={scope} onUnlock={() => setUnlocked(true)} />;
  return <CollectForm survey={survey} areas={areas} scope={scope} userId={userId} ngoId={survey.ngo_id!} onSynced={onSynced} />;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);
function Pin({ scope, onUnlock }: { scope: string; onUnlock: () => void }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [pin, setPin] = useState(""), [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; offlineVaultExists(scope).then((v) => { if (live) setExists(v); }).catch(() => { if (live) setErr("This browser cannot keep records offline. Record observations from the survey's areas when online."); }); return () => { live = false; }; }, [scope]);
  const ready = pin.length === 6 && (exists || again.length === 6);
  return (
    <form className="ns-pin" onSubmit={async (e) => { e.preventDefault(); if (!exists && pin !== again) { setErr("The PINs do not match."); return; } setBusy(true); setErr(null); try { await unlockOffline(scope, pin); setPin(""); setAgain(""); onUnlock(); } catch (x) { setErr(x instanceof Error && /decrypt|operation/i.test(x.message) ? "That PIN is not right." : errText(x)); } finally { setBusy(false); } }}>
      <Lock size={18} style={{ color: "var(--ink-3)" }} />
      <h2 className="nx-h3" style={{ margin: 0, fontSize: 15 }}>{exists ? "Enter your offline PIN" : "Set an offline PIN"}</h2>
      <p className="nx-sub">{exists ? "Unlocks the observations saved on this phone." : "Observations are saved encrypted on this phone and sent when there is signal. StrayPaw cannot recover a forgotten PIN."}</p>
      {exists === null && !err ? <p className="nx-sub" role="status">Checking this phone…</p> : <>
        <Field label={exists ? "PIN" : "New PIN"}><input type="password" inputMode="numeric" autoComplete={exists ? "current-password" : "new-password"} pattern="\d{6}" maxLength={6} value={pin} onChange={(e) => setPin(digits(e.target.value))} autoFocus required /></Field>
        {!exists ? <Field label="Repeat PIN"><input type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" maxLength={6} value={again} onChange={(e) => setAgain(digits(e.target.value))} required /></Field> : null}
        <div><button type="submit" className="nx-btn" disabled={busy || !ready}>{busy ? "Checking…" : exists ? "Unlock" : "Set PIN"}</button></div>
      </>}
      {err ? <p className="ns-note-bad" role="alert">{err}</p> : null}
    </form>
  );
}

function CollectForm({ survey, areas, scope, userId, ngoId, onSynced }: { survey: Survey; areas: SurveyArea[]; scope: string; userId: string; ngoId: string; onSynced: () => Promise<void> }) {
  const legacyKey = `straypaw:survey-queue:${survey.id}`;
  const [areaId, setAreaId] = useState<string | null>(areas[0]?.id ?? null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [count, setCount] = useState(1);
  const [ster, setSter] = useState<boolean | null>(null);
  const [mark, setMark] = useState("unknown");
  const [find, setFind] = useState(""), [animals, setAnimals] = useState<{ id: string; name: string | null; code: string | null }[]>([]), [animalId, setAnimalId] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [recorded, setRecorded] = useState(0);
  const [legacy, setLegacy] = useState<unknown[]>([]);
  const [moving, setMoving] = useState(false);
  const sending = useRef(false), saving = useRef(false), request = useRef(crypto.randomUUID()), photoRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => { if (!offlineUnlocked(scope)) return; setDrafts((await readDrafts(scope)).filter((d) => d.survey?.surveyId === survey.id)); }, [scope, survey.id]);
  const flush = useCallback(async () => {
    if (sending.current || !navigator.onLine) return;
    sending.current = true; setErr(null); let sent = 0;
    try {
      for (const item of (await readDrafts(scope)).filter((d) => d.survey?.surveyId === survey.id)) {
        try { const r = await submitFieldDraft(item, userId, ngoId); await archiveDraft(item, { id: item.id, scope, caseId: survey.id, at: r.confirmedAt, auditId: r.audit_id, label: "Survey observation synchronised" }); sent++; setRecorded((v) => v + 1); }
        catch (x) { await putDraft({ ...item, status: "failed", error: errText(x) }); setErr("An observation needs a retry. Its copy stays on this device."); }
      }
      await refresh();
      if (sent) { toast({ text: `${plural(sent, "observation")} sent and checked against the server.`, tone: "ok" }); await onSynced(); }
    } catch (x) { setErr(errText(x)); } finally { sending.current = false; }
  }, [scope, survey.id, userId, ngoId, refresh, onSynced]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    setOnline(navigator.onLine); window.addEventListener("online", on); window.addEventListener("offline", off);
    try { const old = JSON.parse(localStorage.getItem(legacyKey) ?? "[]"); setLegacy(Array.isArray(old) ? old : []); } catch { setErr("An earlier device queue could not be read. It was kept."); }
    void refresh().catch(() => setErr("The device queue could not be read."));
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [legacyKey, refresh]);
  useEffect(() => {
    let active = true; setAnimals([]);
    if (find.trim().length < 2) return;
    const t = setTimeout(() => { searchAnimals(ngoId, find).then((r) => { if (active) setAnimals(r); }).catch(() => { if (active) setErr("Animal search needs a connection."); }); }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [find, ngoId]);
  const locate = () => { if (!navigator.geolocation) { setErr("This device cannot share its location."); return; } setLocating(true); navigator.geolocation.getCurrentPosition((p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); }, () => { setLocating(false); setErr("Location was not shared."); }, { enableHighAccuracy: true, timeout: 8000 }); };
  const save = async () => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setErr(null);
    try {
      const attributes: Record<string, unknown> = { vaccination_mark: mark, ...(animalId ? { animal_id: animalId } : {}) };
      if (ster !== null) attributes.sterilised = ster;
      if (animalId && count !== 1) throw new Error("A linked animal needs a count of one.");
      const payload: SurveyResponseInput = { surveyId: survey.id, areaId, lat: coords?.lat ?? null, lng: coords?.lng ?? null, photoUrl: null, species: "dog", count, attributes, notes: notes.trim() || null };
      await putDraft({ id: request.current, scope, caseId: survey.id, code: null, note: notes, at: new Date().toISOString(), status: "pending", survey: payload, ...(photo ? { file: photo } : {}) });
      request.current = crypto.randomUUID();
      await refresh();
      setCount(1); setSter(null); setMark("unknown"); setAnimalId(""); setFind(""); setPhoto(null); setNotes("");
      toast({ text: navigator.onLine ? "Saved on this device. Sending…" : "Saved on this device. It is sent when there is signal.", tone: "ok" });
      if (navigator.onLine) await flush();
    } catch (x) { setErr(`${errText(x)} Your inputs are still here.`); } finally { saving.current = false; setBusy(false); }
  };
  /* Observations an older version kept in plain storage: moved into the encrypted queue only after review, and never
     sent automatically. Their recorder and time were not stored, so they are marked unknown. */
  const moveLegacy = async () => {
    setMoving(false); setBusy(true);
    try {
      const before = localStorage.getItem(legacyKey);
      const synced = new Set((await readSynced(scope)).map((r) => r.id));
      for (const [i, value] of legacy.entries()) {
        if (!value || typeof value !== "object") throw new Error("An earlier observation is malformed. Its source copy was kept.");
        const p = value as SurveyResponseInput;
        if (p.surveyId !== survey.id) throw new Error("An earlier observation belongs to another survey. Nothing was removed.");
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([scope, survey.id, i, value]))))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
        const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
        if (synced.has(id)) continue;
        let file: Blob | undefined;
        if (p.photoUrl) {
          const url = new URL(p.photoUrl), origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
          if (url.origin !== origin || !url.pathname.startsWith("/storage/v1/object/public/")) throw new Error("An earlier external photo needs manual recovery. The source queue was kept.");
          const res = await fetch(url); if (!res.ok) throw new Error("An earlier photo could not be recovered. The source queue was kept.");
          file = await res.blob();
          if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error("An earlier photo needs manual recovery; its source was kept.");
        }
        await putDraft({ id, scope, caseId: survey.id, code: null, note: p.notes ?? "Earlier survey observation", at: new Date().toISOString(), status: "pending", survey: { ...p, photoUrl: null, attributes: { ...p.attributes, legacy_original_actor: "unknown", legacy_capture_time: "unknown" } }, ...(file ? { file } : {}) });
      }
      if (localStorage.getItem(legacyKey) === before) { localStorage.removeItem(legacyKey); setLegacy([]); }
      await refresh();
      toast({ text: "Earlier observations moved into this device's secure queue. Nothing was sent.", tone: "ok" });
    } catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  const pending = drafts.length;
  return (
    <div className="ns-collect">
      {!online || pending ? <div className="ns-queue" role="status">{online ? <RefreshCw size={14} /> : <WifiOff size={14} />}<span style={{ flex: 1 }}>{online ? `${plural(pending, "observation")} on this device, waiting to be sent` : `Offline. ${plural(pending, "observation")} saved on this device`}</span>{online && pending ? <button type="button" className="nx-btn is-sm" onClick={() => void flush()}>Send now</button> : null}</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 className="nx-h3" style={{ margin: 0, fontSize: 15 }}>Record an animal</h2>{recorded ? <Chip tone="ok">{recorded} sent this session</Chip> : null}</div>
      {legacy.length ? <div className="nx-note"><div><b>{plural(legacy.length, "earlier observation")} on this device need review</b><p>An older version kept them unencrypted, without the recorder or the time. Review them, then move them into the secure queue. Nothing is sent automatically.</p><details className="ns-details"><summary>Review earlier observations</summary><pre className="ns-wrap ns-small" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(legacy, null, 2)}</pre></details><div className="ns-acts"><button type="button" className="nx-btn is-quiet is-sm" disabled={busy} onClick={() => setMoving(true)}>Move into secure storage</button></div></div></div> : null}
      {drafts.length ? <ul className="nx-feed" aria-label="On this device, not yet sent">{drafts.map((d) => <li key={d.id}><span className="nx-feed-i">{d.survey?.count}</span><div><b>{d.status === "failed" ? "Needs a retry" : "Waiting to be sent"}</b><p>{dayTime(d.at)} · {d.survey?.count} observed{d.error ? ` · ${d.error}` : ""}</p></div></li>)}</ul> : null}
      {areas.length ? <Field label="Area"><select value={areaId ?? ""} onChange={(e) => setAreaId(e.target.value || null)}>{areas.map((a) => <option key={a.id} value={a.id}>{a.code ? `${a.code} · ` : ""}{a.name}</option>)}</select></Field> : null}
      <div className="nx-field"><span>Location</span><button type="button" className="nx-btn is-quiet" style={{ justifyContent: "space-between", minHeight: 44 }} onClick={locate}>{coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : locating ? "Locating…" : "Tap to capture GPS"}<Crosshair size={15} /></button></div>
      <div className="nx-field"><span>How many</span><div className="ns-count"><button type="button" aria-label="Fewer dogs" onClick={() => setCount((c) => Math.max(1, c - 1))}><Minus size={18} /></button><b aria-live="polite">{count}</b><button type="button" aria-label="More dogs" onClick={() => setCount((c) => c + 1)}><Plus size={18} /></button></div></div>
      <Field label="Vaccination mark observed" hint="Records a campaign mark you saw; it does not certify vaccination."><select value={mark} onChange={(e) => setMark(e.target.value)}><option value="unknown">Unknown or not observed</option><option value="marked">Marked</option><option value="unmarked">Unmarked</option></select></Field>
      <div className="nx-field"><span>Sterilised (ear notch)</span><div className="ns-choice">{([["Yes", true], ["No", false], ["Unsure", null]] as const).map(([l, v]) => <button key={l} type="button" aria-pressed={ster === v} onClick={() => setSter(v)}>{l}</button>)}</div></div>
      <Field label="Find a registered animal (optional)" hint="Needs a connection. An unidentified observation is still a valid field sample."><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Name or tag" /></Field>
      {animals.length || animalId ? <Field label="Observed animal"><select value={animalId} onChange={(e) => setAnimalId(e.target.value)}><option value="">Not independently identified</option>{animals.map((a) => <option key={a.id} value={a.id}>{animalLine(a)}{a.code ? ` · code ${a.code}` : ""}</option>)}</select></Field> : null}
      <div className="nx-field"><span>Photo (optional)</span><button type="button" className="nx-btn is-quiet" style={{ minHeight: 44 }} onClick={() => photoRef.current?.click()}>{photo ? <><Check size={14} />Photo added</> : <><Camera size={14} />Take a photo</>}</button><input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setPhoto(await compressForUpload(f)); } catch { setErr("This photo could not be prepared. Your other inputs are still here."); } }} /></div>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {err ? <p className="ns-note-bad" role="alert">{err}</p> : null}
      <button type="button" className="nx-btn" style={{ minHeight: 46, justifyContent: "center", position: "sticky", bottom: 12 }} disabled={busy} onClick={() => void save()}><Check size={15} />{busy ? "Saving…" : "Save and next"}</button>
      {moving ? <Confirm title="Move earlier observations" confirm="Move them" onClose={() => setMoving(false)} onConfirm={() => void moveLegacy()}><p>{plural(legacy.length, "observation")} move into this organisation&apos;s encrypted queue on this device. The original recorder and time stay unknown. Nothing is sent until you send it.</p></Confirm> : null}
    </div>
  );
}

/* ── A project's register ── */
type Entry = { id: string; attributes: Record<string, unknown>; notes: string | null; created_at: string };
const filled = (v: unknown) => v != null && String(v).trim() !== "";
function Register({ sample, survey, entries, total, onChanged }: { sample: boolean; survey: Survey; entries: Entry[]; total: number | null; onChanged: () => Promise<void> }) {
  const fields = fieldsOf(survey.description);
  const { busy, run } = useAct();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const last = entries.length ? Math.max(...entries.map((e) => Date.parse(e.created_at))) : null;
  const quiet = last ? Math.floor((Date.now() - last) / 864e5) : null;
  const add = () => void run("entry", () => addEntry(survey.id, Object.fromEntries(fields.map((f) => [f, values[f] || ""])), notes || null), { ok: "Entry added. Blank fields are kept as not recorded." }).then(async (x) => { if (x.ok) { setValues({}); setNotes(""); await onChanged(); } });
  const csv = () => downloadCsv(`${survey.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-register.csv`, entries.map((r) => ({ created_at: r.created_at, ...Object.fromEntries(fields.map((f) => [f, r.attributes?.[f] ?? ""])), notes: r.notes ?? "" })), { title: `Project: ${survey.title}` });
  const cols: GCol<Entry>[] = [
    { label: fields[0] ?? "Entry", width: "minmax(0, 1.3fr)", render: (r) => <span className="nx-cell-main"><span><b>{filled(r.attributes?.[fields[0]]) ? String(r.attributes[fields[0]]) : "Not recorded"}</b><small>{fields.slice(1).map((f) => `${f}: ${filled(r.attributes?.[f]) ? String(r.attributes[f]) : "—"}`).join(" · ")}</small></span></span> },
    ...fields.slice(1, 4).map((f): GCol<Entry> => ({ label: f, width: "minmax(0, 1fr)", render: (r) => <span className={filled(r.attributes?.[f]) ? "nx-t2 ns-cell" : "nx-t3"}>{filled(r.attributes?.[f]) ? String(r.attributes[f]) : "Not recorded"}</span> })),
    { label: "Date", width: "110px", keep: true, render: (r) => <span className="nx-t3">{day(r.created_at)}</span> },
  ];
  return (
    <div className="ns-cols">
      <section>
        <div className="nx-sec-h"><h2>Entries</h2><span className="nx-count">{total ?? entries.length}</span><span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" disabled={!entries.length} onClick={csv}><Download size={12} />Export CSV</button></span></div>
        <p className="ns-small">{entries.length ? <>{plural(entries.length, "entry", "entries")}{total !== null && total > entries.length ? `, the latest ${entries.length} of ${total} shown` : ""}; {quiet === 0 ? "the last one today" : <>the last one {quiet} {quiet === 1 ? "day" : "days"} ago</>}.</> : "Nothing recorded yet. The first entry starts this project's clock."}</p>
        <Grid label={`${survey.title} entries`} cols={cols} rows={entries} rowKey={(r) => r.id} />
      </section>
      <aside className="ns-stack">
        <div className="nx-sec-h"><h2>A new entry</h2></div>
        {sample ? <TryLink>Add an entry</TryLink> : <div className="ns-stack">
          {fields.map((f) => <Field key={f} label={f}><input value={values[f] || ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} /></Field>)}
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div><button type="button" className="nx-btn" disabled={!!busy} onClick={add}>{busy ? "Adding…" : "Add the entry"}</button></div>
        </div>}
        {entries.length ? <><div className="nx-sec-h" style={{ marginTop: 16 }}><h2>How often each field is filled</h2></div><dl className="ns-dl" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>{fields.map((f) => { const k = entries.filter((e) => filled(e.attributes?.[f])).length; return <div key={f}><dt>{f}</dt><dd>{Math.round((k / entries.length) * 100)}% <span className="nx-t3" style={{ fontWeight: 400 }}>({k} of {entries.length})</span></dd></div>; })}</dl></> : null}
      </aside>
    </div>
  );
}
