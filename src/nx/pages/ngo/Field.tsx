"use client";

/* Field mode: the phone in one hand, on the street. The page is a round of stops: follow-ups due on the cases the person
   holds, then the cases themselves. One large control records an animal that is in front of them. Each case opens four
   tools (note, evidence, vaccination, care or movement), one form at a time.

   Where a record goes is said at the top, not chosen first: online, it saves straight to the register; offline, it is
   kept on this phone, encrypted with a PIN, and sent when there is signal. "This phone" lists what is waiting, what was
   sent and what failed, with a way to correct each failure. Sending is idempotent: every record carries its own request
   id (src/lib/field), so sending twice never saves twice, and nothing is called sent until the server's copy and its
   audit row are checked. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Camera, Check as Tick, HeartPulse, LifeBuoy, Lock, MapPin, PenLine, Play, Plus, Route, ScanLine, Scissors, Search, Smartphone, Syringe, Trash2, WifiOff, X } from "lucide-react";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Field as F, day, dayTime, errText, toast, useAct, words } from "../../kit";
import { useLive, type Workspace } from "../../live";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { compressForUpload } from "@/lib/photo/compress";
import { EVIDENCE_LABEL, type EvidenceKind } from "@/lib/abc";
import type { IntakeData, LifecycleData, OperationKind, WorkflowPolicy } from "@/lib/operations";
import { archiveDraft, clearOfflineDevice, deleteDraft, fieldCache, lockOffline, offlineUnlocked, offlineVaultExists, putDraft, readDrafts, readSynced, startOnlineSession, unlockOffline, type FieldDraft, type SyncedFieldRecord, type VaccinationData } from "@/lib/field/outbox";
import { submitFieldDraft } from "@/lib/field/sync";
import { backToAssigned, isoDay, setFollowup, shortCode, startWork, type Actor } from "../../data/ngo";
import { LifecycleForm, TryLink, undoWith } from "./parts";
import "../../css/ngo-records.css";

type KnownAnimal = { id: string; name: string | null; code: string | null; straypaw_id: string | null; identifiers: string | null };
type Cached = { cases: OpenCase[]; fus: DueFollowup[]; assignedIds: string[]; known?: KnownAnimal[]; policies?: WorkflowPolicy[] };
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ext = (t: string) => (t === "application/pdf" ? "pdf" : t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg");

export function Field() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Operations", "Field mode"]}><div className="nf"><p className="nx-sub">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (!live.org) return <SampleField />;
  if (!org || !live.userId) return <Shell crumb={["Operations", "Field mode"]}><div className="nf"><h1 className="nx-h1">Field mode</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it has no field round.</p></div></Shell>;
  return <LiveField org={org} actor={{ id: live.userId, name: live.userName ?? "Team member" }} />;
}

/* ── The service worker keeps the field page and its assets for use without signal ── */
function useWarmShell() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let live = true;
    void (async () => {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const worker = reg.installing ?? reg.waiting ?? reg.active;
      if (!worker) return;
      if (worker.state !== "activated") await new Promise<void>((resolve, reject) => { worker.addEventListener("statechange", () => { if (worker.state === "activated") resolve(); if (worker.state === "redundant") reject(new Error("Offline setup interrupted")); }); });
      const urls = performance.getEntriesByType("resource").map((e) => e.name);
      const ok = await new Promise<boolean>((resolve) => { const ch = new MessageChannel(); const t = window.setTimeout(() => resolve(false), 15000); ch.port1.onmessage = (e) => { window.clearTimeout(t); resolve(e.data?.ready === true); }; worker.postMessage({ type: "warm-field-shell", urls }, [ch.port2]); });
      if (live) setReady(ok);
    })().catch(() => {});
    return () => { live = false; };
  }, []);
  return ready;
}

function LiveField({ org, actor }: { org: Workspace; actor: Actor }) {
  const base = `${actor.id}:${org.org_id}`;
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [scope, setScope] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [netOpen, setNetOpen] = useState(false);
  const offlineReady = useWarmShell();
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "offline" || !navigator.onLine) setMode("offline"); }, []);
  useEffect(() => { const s = () => setOnline(navigator.onLine); s(); window.addEventListener("online", s); window.addEventListener("offline", s); return () => { window.removeEventListener("online", s); window.removeEventListener("offline", s); }; }, []);
  useEffect(() => {
    let live = true; setOpen(false);
    const begin = () => { if (mode === "online") void startOnlineSession(base).then((s) => { if (live) { setScope(s); setOpen(true); } }).catch(() => { if (live) setStorageError("This browser cannot keep field records. Use the case pages while you have signal."); }); else { setScope(base); setOpen(offlineUnlocked(base)); } };
    begin(); const relock = () => { if (live) begin(); };
    window.addEventListener("straypaw-offline-locked", relock);
    return () => { live = false; window.removeEventListener("straypaw-offline-locked", relock); };
  }, [base, mode]);

  const signal = mode === "offline" ? "offline" : online ? "online" : "nosignal";
  const head = (waiting: number, sum: React.ReactNode) => (
    <>
      <header className="nf-head">
        <div><p className="nx-t3">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} · {org.name}</p><h1>Your round</h1><p aria-live="polite">{sum}</p></div>
        <button type="button" className="nf-net" data-s={signal} aria-expanded={netOpen || signal === "nosignal"} aria-controls="nf-netp" onClick={() => setNetOpen((v) => !v)}><i aria-hidden />{signal === "online" ? "Online" : signal === "offline" ? "Offline" : "No signal"}{waiting ? <Chip tone="warn">{waiting} waiting</Chip> : null}</button>
      </header>
      {netOpen || signal === "nosignal" ? <div id="nf-netp" className="nf-netp" role="group" aria-label="Connection">
        <p>{signal === "online" ? "Every record saves straight to your register as you make it." : signal === "offline" ? (waiting ? `${waiting} ${waiting === 1 ? "record is" : "records are"} waiting on this phone. They are sent when you choose, once there is signal.` : "Records stay on this phone, locked with your PIN, until you are back in signal.") : "Nothing can be sent right now. Carry on offline and send when the signal is back."}</p>
        {signal === "nosignal" ? <button type="button" className="nx-btn" onClick={() => setMode("offline")}><WifiOff size={14} />Keep working offline</button>
          : <button type="button" role="switch" aria-checked={mode === "offline"} className="nf-switch" onClick={() => setMode(mode === "offline" ? "online" : "offline")}><span>Work offline</span><i aria-hidden /></button>}
      </div> : null}
    </>
  );
  if (mode === "offline" && !open) return <Shell crumb={["Operations", "Field mode"]}><div className="nf">{head(0, "Unlock this phone's records to carry on offline.")}<Pin scope={base} onUnlock={() => setOpen(true)} /></div></Shell>;
  return <Shell crumb={["Operations", "Field mode"]}>{scope && open ? <Round key={scope} org={org} actor={actor} scope={scope} mode={mode} online={online} head={head} offlineReady={offlineReady} storageError={storageError} setStorageError={setStorageError} relock={() => setOpen(false)} /> : <div className="nf">{head(0, storageError ?? "Preparing this phone…")}</div>}</Shell>;
}

/** The PIN: set once per phone, entered when field mode opens offline. A forgotten PIN cannot be recovered; unsent records stay on the phone. */
function Pin({ scope, onUnlock }: { scope: string; onUnlock: () => void }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [pin, setPin] = useState(""), [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; void offlineVaultExists(scope).then((v) => { if (live) setExists(v); }).catch(() => { if (live) setError("This browser cannot store records offline. Work online from the case pages."); }); return () => { live = false; }; }, [scope]);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  const ready = pin.length === 6 && (exists || again.length === 6);
  return (
    <div className="nf-pin">
      <span className="nf-lock" aria-hidden><Lock size={18} /></span>
      <h1>{exists ? "Enter your offline PIN" : "Set an offline PIN"}</h1>
      <p>{exists ? "It unlocks the field records saved on this phone." : "Records are saved encrypted on this phone and sent when there is signal. You will use this PIN whenever you work offline. It cannot be recovered, so choose one you will remember."}</p>
      {exists === null && !error ? <p className="nr-quiet" role="status">Checking this phone…</p> : (
        <form onSubmit={async (e) => { e.preventDefault(); if (!exists && pin !== again) { setError("The PINs do not match."); return; } setBusy(true); setError(null); try { await unlockOffline(scope, pin); setPin(""); setAgain(""); onUnlock(); } catch (x) { setError(x instanceof Error && /decrypt|operation|did not unlock/i.test(x.message) ? "That PIN is not right. Nothing was removed." : errText(x)); } finally { setBusy(false); } }}>
          <label className="nx-field"><span>{exists ? "PIN" : "New PIN"}</span><input type="password" inputMode="numeric" autoComplete={exists ? "current-password" : "new-password"} pattern="\d{6}" maxLength={6} value={pin} onChange={(e) => setPin(digits(e.target.value))} autoFocus required /></label>
          {!exists ? <label className="nx-field"><span>Repeat the PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" maxLength={6} value={again} onChange={(e) => setAgain(digits(e.target.value))} required /></label> : null}
          <button className="nx-btn" style={{ height: 46, justifyContent: "center" }} disabled={busy || !ready}>{busy ? "Checking…" : exists ? "Unlock" : "Set the PIN"}</button>
        </form>
      )}
      {error ? <p role="alert" className="nr-err">{error}</p> : null}
    </div>
  );
}

type Head = (waiting: number, sum: React.ReactNode) => React.ReactNode;
function Round({ org, actor, scope, mode, online, head, offlineReady, storageError, setStorageError, relock }: { org: Workspace; actor: Actor; scope: string; mode: "online" | "offline"; online: boolean; head: Head; offlineReady: boolean; storageError: string | null; setStorageError: (s: string | null) => void; relock: () => void }) {
  const [cases, setCases] = useState<OpenCase[] | null>(null);
  const [fus, setFus] = useState<DueFollowup[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [known, setKnown] = useState<KnownAnimal[]>([]);
  const [policies, setPolicies] = useState<WorkflowPolicy[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [synced, setSynced] = useState<SyncedFieldRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [capture, setCapture] = useState(false);
  const [done, setDone] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<null | { title: string; body: string; confirm: string; danger?: boolean; go: () => Promise<void> }>(null);
  const [vaccDefaults, setVaccDefaults] = useState<Pick<VaccinationData, "vaccine" | "batch" | "performedBy"> | undefined>();
  const lock = useRef(false);
  const { busy, run } = useAct();

  const fromCache = useCallback(async () => {
    const c = await fieldCache<Cached>(scope).catch(() => undefined);
    setCases(c?.value.cases ?? null); setFus(c?.value.fus ?? []); setAssigned(c?.value.assignedIds ?? []); setKnown(c?.value.known ?? []); setPolicies(c?.value.policies ?? []); setCachedAt(c?.at ?? null);
    return !!c;
  }, [scope]);
  const load = useCallback(async () => {
    setFailed(false);
    if (!navigator.onLine) { setFailed(!(await fromCache())); return; }
    try {
      const db = getSupabase(); if (!db) throw new Error("Workspace unavailable");
      const [c, f, a, k, p] = await Promise.all([openCases(), dueFollowups(), db.from("cases").select("id").eq("ngo_id", org.org_id).eq("assignee_id", actor.id).limit(800), db.from("dogs").select("id,name,code,straypaw_id,identifiers").eq("ngo_id", org.org_id).order("created_at", { ascending: false }).limit(500), db.from("operations_policies").select("id,name,version,rules,source_reference").eq("ngo_id", org.org_id).order("created_at", { ascending: false }).limit(100)]);
      if (a.error || k.error || p.error) throw a.error ?? k.error ?? p.error;
      const ids = (a.data ?? []).map((x) => x.id as string);
      setCases(c); setFus(f); setAssigned(ids); setKnown((k.data ?? []) as KnownAnimal[]); setPolicies((p.data ?? []) as WorkflowPolicy[]); setCachedAt(null);
      await fieldCache<Cached>(scope, { cases: c, fus: f, assignedIds: ids, known: (k.data ?? []) as KnownAnimal[], policies: (p.data ?? []) as WorkflowPolicy[] }).catch(() => setStorageError("Your stops could not be kept on this phone. Keep this page open if you go offline."));
    } catch { setFailed(true); await fromCache(); }
  }, [scope, org.org_id, actor.id, fromCache, setStorageError]);
  const readBox = useCallback(async () => { try { setDrafts(await readDrafts(scope)); setSynced(await readSynced(scope)); } catch { setStorageError("The records on this phone could not be read. Nothing was discarded; reload the page."); } }, [scope, setStorageError]);
  useEffect(() => { void load(); void readBox(); void fieldCache<Pick<VaccinationData, "vaccine" | "batch" | "performedBy">>(`vaccination-settings:${scope}`).then((c) => setVaccDefaults(c?.value)).catch(() => {}); }, [load, readBox, scope]);

  const mine = useMemo(() => (cases ?? []).filter((c) => assigned.includes(c.id) && c.provenance !== "imported_historical_record"), [cases, assigned]);
  const myFus = useMemo(() => { const ids = new Set(mine.map((c) => c.id)); return fus.filter((f) => f.source === "scheduled" && f.case_id && ids.has(f.case_id)).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)); }, [fus, mine]);
  const unowned = useMemo(() => (cases ?? []).filter((c) => !c.assignee_name && c.provenance !== "imported_historical_record").length, [cases]);

  const keep = async (d: FieldDraft) => { try { await putDraft(d); setStorageError(null); await readBox(); } catch (e) { setStorageError(`${errText(e)} Copy what you wrote before leaving this page.`); throw e; } };
  const note = (c: OpenCase, text: string) => keep({ id: uuid(), scope, caseId: c.id, code: c.case_code, note: text, at: new Date().toISOString(), status: "pending" });
  const evidence = async (c: OpenCase, kind: EvidenceKind, file: File | null, location: string) => {
    if (kind !== "release_location" && !file) throw new Error("Choose the photo or file first.");
    if (file && !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo, or a PDF.");
    const body = file ? await compressForUpload(file) : undefined; if (body && body.size > 15 * 1024 * 1024) throw new Error("The file is over 15 MB.");
    await keep({ id: uuid(), scope, caseId: c.id, code: c.case_code, note: EVIDENCE_LABEL[kind], kind, file: body, location, at: new Date().toISOString(), status: "pending" });
  };
  const vaccination = async (c: OpenCase, v: VaccinationData) => {
    if (c.dog_id !== v.dogId) throw new Error("Open the case of the registered animal first.");
    await keep({ id: uuid(), scope, caseId: c.id, code: c.case_code, note: `Vaccination record · ${v.vaccine} · batch ${v.batch}`, vaccination: v, at: new Date().toISOString(), status: "pending" });
    const d = { vaccine: v.vaccine, batch: v.batch, performedBy: v.performedBy }; setVaccDefaults(d); await fieldCache(`vaccination-settings:${scope}`, d).catch(() => {});
  };
  const intake = async (data: IntakeData, file: File | null, requestId: string) => {
    if (file && !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo.");
    const body = file ? await compressForUpload(file) : undefined; if (body && body.size > 15 * 1024 * 1024) throw new Error("The photo is over 15 MB.");
    await keep({ id: requestId, caseId: requestId, scope, code: null, note: `Animal intake · ${data.name || data.code || data.identifiers || "identity provisional"}`, intake: data, file: body, at: data.observedAt, status: "pending" });
  };
  const operation = (caseId: string, code: string | null, kind: OperationKind, data: LifecycleData, policyId: string | null, requestId: string, intakeRequest?: string) => keep({ id: requestId, scope, caseId, code, note: `${words(kind)} · ${data.notes}`, lifecycle: { kind, data, policyId }, intakeRequest, at: data.occurredAt, status: "pending" });

  /* Send in order: intakes first (later records on a new animal need its case), then oldest first. Each is idempotent. */
  const send = useCallback(async (only?: string[]) => {
    if (lock.current) return; lock.current = true; setSyncing(true);
    let sent = 0, bad = 0;
    try {
      const queued = (await readDrafts(scope)).filter((d) => !only || only.includes(d.id)).sort((a, b) => Number(!!b.intake) - Number(!!a.intake) || Date.parse(a.at) - Date.parse(b.at));
      for (const d of queued) {
        try { const saved = await submitFieldDraft(d, actor.id, org.org_id); await archiveDraft(d, { id: d.id, scope, at: saved.confirmedAt, caseId: saved.caseId, dogId: saved.dogId, auditId: saved.audit_id, label: d.note.slice(0, 120) }); sent++; }
        catch (e) { bad++; await putDraft({ ...d, status: "failed", error: errText(e) }).catch(() => {}); }
      }
      if (sent) toast({ text: `${sent} ${sent === 1 ? "record" : "records"} sent; the server's copy and audit were checked.`, tone: "ok" });
      if (bad) toast({ text: `${bad} ${bad === 1 ? "record" : "records"} did not go. ${bad === 1 ? "It stays" : "They stay"} on this phone with the reason.`, tone: "bad" });
      if (sent) await load();
    } catch (e) { setStorageError(`${errText(e)} The records stay on this phone.`); }
    finally { lock.current = false; setSyncing(false); await readBox(); }
  }, [scope, actor.id, org.org_id, load, readBox, setStorageError]);
  /* Online, a saved record goes straight away; offline, it waits until the person chooses to send. */
  /* Each record is tried once by itself; a record that fails waits for a person, so a refusal never loops. */
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (mode !== "online" || !online || syncing) return;
    const fresh = drafts.filter((d) => d.status === "pending" && !tried.current.has(d.id));
    if (!fresh.length) return;
    fresh.forEach((d) => tried.current.add(d.id));
    void send(fresh.map((d) => d.id));
  }, [mode, online, syncing, drafts, send]);
  /* Online records live only as long as this page: leaving with some unsent asks first. */
  useEffect(() => {
    if (mode !== "online" || !drafts.length) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [mode, drafts.length]);
  /* Coming back into signal offline sends nothing by itself, but says so. */
  const prevOnline = useRef(online);
  useEffect(() => { if (!prevOnline.current && online && mode === "offline" && drafts.length) toast({ text: `Signal is back. ${drafts.length} ${drafts.length === 1 ? "record waits" : "records wait"} to be sent.`, tone: "plain" }); prevOnline.current = online; }, [online, mode, drafts.length]);

  const lateN = myFus.filter((f) => Date.parse(f.due_at) < Date.now()).length;
  const stops = mine.length + myFus.length;
  const waiting = drafts.length;
  const sum = cases === null ? (failed ? "Your stops could not be read." : "Reading your stops…") : stops === 0 ? "Nothing is held by you right now." : <><b className="num">{stops}</b> {stops === 1 ? "stop" : "stops"}{lateN ? <> · <b style={{ color: "var(--bad)" }}>{lateN} late</b></> : null}</>;
  const fu = (f: DueFollowup, s: "done" | "missed") => run(`f${f.id}`, () => setFollowup(f.id, s), { ok: s === "done" ? "Follow-up marked done." : "Follow-up marked missed.", undo: () => undoWith(() => setFollowup(f.id, "upcoming"), async () => { setDone((m) => { const x = { ...m }; delete x[`f${f.id}`]; return x; }); await load(); }, "Follow-up reopened.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`f${f.id}`]: s === "done" ? "Done" : "Missed" })); });
  const start = (c: OpenCase) => run(`s${c.id}`, () => startWork(c.id, actor), { ok: "Marked in progress.", undo: () => undoWith(() => backToAssigned(c.id, actor), async () => { setDone((m) => { const x = { ...m }; delete x[`s${c.id}`]; return x; }); await load(); }, "Back to assigned.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`s${c.id}`]: "Started" })); });

  return (
    <div className="nf">
      {head(waiting, sum)}
      <button type="button" className="nf-capture" aria-expanded={capture} onClick={() => setCapture(true)}><span aria-hidden><Camera size={20} /></span><span><b>Record an animal</b><small>A photo, the place and why it is here. About a minute.</small></span></button>
      {capture ? <IntakeSheet known={known} online={mode === "online" && online} onSave={intake} onClose={() => setCapture(false)} /> : null}
      {storageError ? <p className="nr-err" role="alert">{storageError}</p> : null}
      {cachedAt ? <p className="nr-hint" role="status">Showing the stops kept on this phone at {dayTime(cachedAt)}. They may have changed since; sending checks your current access.</p> : null}
      {failed ? <div className="nr-err" role="alert">Your stops could not be read. Records you make are still kept on this phone. <button type="button" className="nr-link" onClick={() => void load()}>Try again</button></div> : null}
      {cases === null && !failed ? <p className="nr-quiet" role="status">Reading your stops…</p> : null}

      {myFus.length ? <section aria-labelledby="nf-due"><h2 className="nf-h" id="nf-due">Due <span className="nx-count">{myFus.length}</span></h2>
        <ol className="nf-stops">{myFus.map((f) => { const late = Date.parse(f.due_at) < Date.now(), d = done[`f${f.id}`]; return (
          <li key={f.id} className={`nf-stop ${late ? "is-late" : ""} ${d ? "is-done" : ""}`}>
            <div className="nf-stop-t"><b>{words(f.kind, "Recheck")}{f.animal_name ? ` · ${f.animal_name}` : ""}</b><small>{late ? "Late" : "Due"} {day(f.due_at)} · {[shortCode(f.case_code, "follow-up"), f.zone, f.note].filter(Boolean).join(" · ")}</small></div>
            {d ? <p className="nr-ok"><Tick size={13} /> {d}</p> : <div className="nf-acts"><button type="button" className="nx-btn" disabled={!online || !!busy} onClick={() => void fu(f, "done")}><Tick size={15} />Done</button><button type="button" className="nx-btn is-quiet" disabled={!online || !!busy} onClick={() => void fu(f, "missed")}>Missed</button></div>}
            {!online && !d ? <p className="nr-hint">Marking a follow-up needs signal.</p> : null}
          </li>); })}</ol></section> : null}

      {mine.length ? <section aria-labelledby="nf-mine"><h2 className="nf-h" id="nf-mine">In your hands <span className="nx-count">{mine.length}</span></h2>
        <ol className="nf-stops">{mine.map((c) => <CaseStop key={c.id} c={c} online={online} started={c.status_class === "in_progress" || done[`s${c.id}`] === "Started"} busy={!!busy} drafted={drafts.filter((d) => d.caseId === c.id).length} onStart={() => void start(c)}
          onNote={(t) => note(c, t)} onEvidence={(k, f, l) => evidence(c, k, f, l)} onVaccination={(v) => vaccination(c, v)} vaccDefaults={vaccDefaults} policies={policies} onOperation={(k, d, p, r) => operation(c.id, c.case_code, k, d, p, r)} keepWord={mode === "online" && online ? "Save" : "Keep on this phone"} />)}</ol></section> : null}

      {cases !== null && !failed && !stops ? <div className="nx-empty"><b>Nothing is held by you</b><p>Take a case from the list and it becomes a stop here.</p><div className="nx-empty-a"><Link className="nx-btn" href={unowned ? "/next/ngo/cases?view=unassigned" : "/next/ngo/cases"}>{unowned ? `See ${unowned} unassigned ${unowned === 1 ? "case" : "cases"}` : "Open the cases"}</Link></div></div> : null}

      <section className="nf-phone" aria-label="This phone">
        <header><span className="nf-lock" aria-hidden><Smartphone size={16} /></span><div><b>This phone</b><small>{waiting ? `${waiting} ${waiting === 1 ? "record" : "records"} not sent yet` : offlineReady ? "Ready to work without signal" : "Nothing waiting to be sent"}</small></div>
          {waiting ? <button type="button" className="nx-btn is-sm" style={{ marginLeft: "auto" }} disabled={!online || syncing} onClick={() => void send()}>{syncing ? "Sending…" : online ? (waiting === 1 ? "Send it" : `Send all ${waiting}`) : "Waiting for signal"}</button> : null}</header>
        {waiting ? <div className="nf-tray">{drafts.map((d) => <Draft key={d.id} d={d} online={online} syncing={syncing} policies={policies} onSend={() => void send([d.id])} onChanged={readBox}
          onRemove={() => setAsk({ title: "Remove this copy from the phone?", body: d.status === "failed" ? "It was not confirmed by the server. Removing it loses what it holds unless you have copied it." : "It has not been sent. Removing it loses what it holds.", confirm: "Remove it", danger: true, go: async () => { await deleteDraft(d.id); await readBox(); } })}
          onReplace={async (text) => { await keep({ ...d, id: uuid(), note: text, status: "pending", error: undefined }); await deleteDraft(d.id); await readBox(); }}
          onOperation={(k, data, p, r) => operation(d.caseId, d.code, k, data, p, r, d.id)} />)}</div> : null}
        {synced.length ? <details className="nr-more-d"><summary>Sent from this phone · {synced.length}</summary><ul className="nr-items">{[...synced].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 30).map((x) => <li key={x.id} className="nr-item"><span className="nr-item-t"><b><Link className="nr-link" href={`/next/ngo/cases/${x.caseId}`}>{x.label}</Link></b><small>Sent {dayTime(x.at)} · receipt {x.auditId}</small></span><span className="nf-dot" data-s="sent" aria-label="Sent" /></li>)}</ul></details> : null}
        <div className="nr-acts">
          <Link className="nx-btn is-quiet is-sm" href="/next/ngo/animals?view=scan"><ScanLine size={13} />Scan a tag</Link>
          <Link className="nx-btn is-quiet is-sm" href="/next/ngo/operations"><Route size={13} />Visits this week</Link>
          {mode === "offline" ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => { lockOffline(); relock(); }}><Lock size={13} />Lock offline records</button> : null}
          {mode === "offline" ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAsk({ title: "Clear sent records from this phone?", body: "Records already sent stay on the server. Records still waiting must be sent or removed first; this phone will ask for a new PIN next time.", confirm: "Clear them", danger: true, go: async () => { await clearOfflineDevice(scope); relock(); } })}><Trash2 size={13} />Clear sent records</button> : null}
        </div>
      </section>
      {ask ? <Confirm title={ask.title} confirm={ask.confirm} danger={ask.danger} onClose={() => setAsk(null)} onConfirm={() => void ask.go().then(() => setAsk(null)).catch((e) => { setStorageError(errText(e)); setAsk(null); })}><p>{ask.body}</p></Confirm> : null}
    </div>
  );
}

/* One record waiting on the phone, with what went wrong and how to put it right. */
function Draft({ d, online, syncing, policies, onSend, onRemove, onReplace, onOperation, onChanged }: { d: FieldDraft; online: boolean; syncing: boolean; policies: WorkflowPolicy[]; onSend: () => void; onRemove: () => void; onReplace: (text: string) => Promise<void>; onOperation: (k: OperationKind, data: LifecycleData, p: string | null, r: string) => Promise<void>; onChanged: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(d.note);
  const [addOp, setAddOp] = useState(false);
  const plain = !d.intake && !d.kind && !d.vaccination && !d.lifecycle && !d.survey;
  const err = d.error ?? "";
  /* A refusal before the server saved anything can be corrected and sent as a new record. A record whose saved copy could not be
     checked may already be on the server, so it is retried as the same request instead, never copied. */
  const unverified = /verif|differs|audit|receipt/i.test(err);
  const fix = /sign in|session/i.test(err) ? <Link className="nr-link" href="/sign-in?next=/next/ngo/field">Sign in again</Link>
    : /intake first/i.test(err) ? <span>Send the animal&apos;s intake first; this one follows it.</span>
    : unverified ? <span>It may already be saved. Send this one again: the same request is checked, never saved twice.{d.caseId && !d.intake && !d.intakeRequest ? <> Or <Link className="nr-link" href={`/next/ngo/cases/${d.caseId}`}>open the case</Link> to look.</> : null}</span>
    : plain ? <span>Correct it and send it again.</span> : <span>Send it again, or remove it and record it once more.</span>;
  return (
    <details className="nf-draft" open={d.status === "failed" || undefined}>
      <summary><i className="nf-dot" data-s={d.status === "failed" ? "failed" : "pending"} aria-hidden /><span><b>{d.survey ? "Survey observation" : d.intake ? "Animal intake" : d.code ? shortCode(d.code) : "Field record"}</b><small>{dayTime(d.at)} · {d.status === "failed" ? "Did not go" : "Waiting"}</small></span><Chip tone={d.status === "failed" ? "bad" : "warn"}>{d.status === "failed" ? "Failed" : "Pending"}</Chip></summary>
      <div>
        <p style={{ whiteSpace: "pre-wrap" }}>{d.note}</p>
        {d.location ? <p className="nx-t3">{d.location}</p> : null}
        {d.vaccination ? <p className="nx-t3">{d.vaccination.eventDate} · vaccinator {d.vaccination.performedBy} · {d.vaccination.dose || "dose not recorded"} · {d.vaccination.route || "route not recorded"} · {d.vaccination.location}</p> : null}
        {d.status === "failed" ? <p className="nr-err" role="alert">{err || "It did not go."} {fix}</p> : null}
        {edit ? <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void onReplace(text.trim()).then(() => setEdit(false)); }}><F label="Correct the note"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} /></F><div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!text.trim()}>Keep the corrected note</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setEdit(false)}>Cancel</button></div></form> : null}
        <div className="nr-acts">
          <button className="nx-btn is-sm" type="button" disabled={!online || syncing} onClick={onSend}>{d.status === "failed" ? "Try again" : "Send this one"}</button>
          {plain && d.status === "failed" && !unverified && !edit ? <button className="nx-btn is-quiet is-sm" type="button" onClick={() => setEdit(true)}><PenLine size={13} />Correct it</button> : null}
          {d.file ? <button className="nx-btn is-quiet is-sm" type="button" onClick={() => { const u = URL.createObjectURL(d.file!); const a = document.createElement("a"); a.href = u; a.download = `field-record-${d.id}.${ext(d.file!.type)}`; a.click(); window.setTimeout(() => URL.revokeObjectURL(u), 1000); }}>Download the file</button> : null}
          <button className="nx-btn is-quiet is-sm" type="button" onClick={onRemove}><Trash2 size={13} />Remove from phone</button>
        </div>
        {d.intake ? (addOp ? <LifecycleForm policies={policies} submitLabel="Keep with this animal" onCancel={() => setAddOp(false)} onSave={async (k, data, p, r) => { await onOperation(k, data, p, r); await onChanged(); }} /> : <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAddOp(true)}>Add what was done to this animal</button>) : null}
      </div>
    </details>
  );
}

type Tool = "note" | "evidence" | "vacc" | "care";
function CaseStop({ c, online, started, busy, drafted, onStart, onNote, onEvidence, onVaccination, vaccDefaults, policies, onOperation, keepWord }: { c: OpenCase; online: boolean; started: boolean; busy: boolean; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void>; onEvidence: (k: EvidenceKind, f: File | null, l: string) => Promise<void>; onVaccination: (v: VaccinationData) => Promise<void>; vaccDefaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; policies: WorkflowPolicy[]; onOperation: (k: OperationKind, d: LifecycleData, p: string | null, r: string) => Promise<void>; keepWord: string }) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("capture_photo");
  const [file, setFile] = useState<File | null>(null);
  const [loc, setLoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const shut = () => { setTool(null); setError(null); };
  const tools: [Tool, string, typeof PenLine, boolean][] = [["note", "Note", PenLine, true], ["evidence", "Evidence", Camera, true], ["vacc", "Vaccination", Syringe, !!c.dog_id], ["care", "Care or movement", Route, !!c.dog_id]];
  const save = async (fn: () => Promise<void>) => { setSaving(true); setError(null); try { await fn(); shut(); toast({ text: online && keepWord === "Save" ? "Saved. Sending now." : "Kept on this phone, encrypted. Send it when there is signal.", tone: "ok" }); } catch (e) { setError(errText(e)); } finally { setSaving(false); } };
  const gps = () => navigator.geolocation?.getCurrentPosition((p) => setLoc(`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`), () => setError("Location is unavailable. Say where it was in words."));
  return (
    <li className="nf-stop">
      <div className="nf-stop-t"><b><Link href={`/next/ngo/cases/${c.id}`}>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Case"}</Link></b><small>{started ? "Started" : "Open"} · {[shortCode(c.case_code), c.animal_name, c.zone].filter(Boolean).join(" · ") || "Animal and place not recorded"}</small></div>
      <div className="nf-acts">
        {!started ? <button type="button" className="nx-btn" disabled={!online || busy} onClick={onStart}><Play size={15} />Start</button> : null}
        <button type="button" className={`nx-btn ${started ? "" : "is-quiet"}`} aria-expanded={open} onClick={() => { setOpen((v) => !v); shut(); }}><Plus size={15} />Record</button>
      </div>
      {!online && !started ? <p className="nr-hint">Starting work needs signal. Records can still be kept on this phone.</p> : null}
      {open ? <div className="nf-tools" role="group" aria-label="What to record on this case">
        {tools.filter((x) => x[3]).map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => setTool(tool === id ? null : id)}><Icon size={18} /><span>{label}</span></button>)}
        <Link href={`/next/ngo/cases/${c.id}`}><ArrowUpRight size={18} /><span>Open the case</span></Link>
      </div> : null}
      {error ? <p className="nr-err" role="alert">{error}</p> : null}
      {open && tool === "note" ? <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (t.trim()) void save(async () => { await onNote(t.trim()); setT(""); }); }}>
        <F label="Note"><textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="What you saw or did" maxLength={1500} autoFocus /></F>
        <div className="nf-acts"><button type="submit" className="nx-btn" disabled={saving || !t.trim()}>{saving ? "Saving…" : `${keepWord} the note`}</button><button type="button" className="nx-btn is-quiet" onClick={shut}>Cancel</button></div>
      </form> : null}
      {open && tool === "evidence" ? <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); void save(async () => { await onEvidence(kind, file, loc); setFile(null); setLoc(""); }); }}>
        <F label="Evidence type"><select value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>{Object.entries(EVIDENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
        {kind !== "release_location" ? <F label="Photo or file"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></F> : null}
        <F label={kind === "release_location" ? "Where it was released" : "Where (optional)"}><textarea value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={1500} required={kind === "release_location"} /></F>
        <button type="button" className="nx-btn is-quiet" onClick={gps}><MapPin size={14} />Use my location</button>
        <div className="nf-acts"><button type="submit" className="nx-btn" disabled={saving}>{saving ? "Saving…" : `${keepWord} the evidence`}</button><button type="button" className="nx-btn is-quiet" onClick={shut}>Cancel</button></div>
      </form> : null}
      {open && tool === "vacc" && c.dog_id ? <VaccinationForm dogId={c.dog_id} defaults={vaccDefaults} keepWord={keepWord} onCancel={shut} onSave={(v) => save(() => onVaccination(v))} /> : null}
      {open && tool === "care" ? <LifecycleForm policies={policies} submitLabel={`${keepWord} the record`} onCancel={shut} onSave={async (k, d, p, r) => { await onOperation(k, d, p, r); toast({ text: keepWord === "Save" ? "Saved. Sending now." : "Kept on this phone, encrypted.", tone: "ok" }); }} /> : null}
      {drafted ? <p className="nx-t3"><i className="nf-dot" data-s="pending" style={{ display: "inline-block", marginRight: 6 }} aria-hidden />{drafted} {drafted === 1 ? "record" : "records"} on this phone, not sent</p> : null}
    </li>
  );
}

/** What was given, as recorded in the field. Veterinary sign-off and municipal review stay separate. */
function VaccinationForm({ dogId, defaults, keepWord, onSave, onCancel }: { dogId: string; defaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; keepWord: string; onSave: (v: VaccinationData) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<VaccinationData>({ template: "arv-field-v1", dogId, eventDate: isoDay(new Date()), vaccine: defaults?.vaccine ?? "", batch: defaults?.batch ?? "", performedBy: defaults?.performedBy ?? "", dose: "", route: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const f = (k: "vaccine" | "batch" | "performedBy" | "dose" | "route" | "location" | "notes", label: string, req = false, max = 100) => <F label={label}><input required={req} maxLength={max} value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} /></F>;
  return (
    <form className="nr-sheet" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave(v); } finally { setBusy(false); } }}>
      {defaults ? <p className="nr-hint">The last product and batch are filled in. Check them for this animal.</p> : null}
      <div className="nx-fields">
        <F label="Date given"><input type="date" required max={isoDay(new Date())} value={v.eventDate} onChange={(e) => setV((x) => ({ ...x, eventDate: e.target.value }))} /></F>
        {f("vaccine", "Vaccine product", true, 200)}{f("batch", "Batch or lot", true)}{f("performedBy", "Vaccinator", true)}{f("dose", "Dose (optional)", false, 50)}{f("route", "Route (optional)", false, 50)}
      </div>
      {f("location", "Where it was given", true, 300)}
      <button type="button" className="nx-btn is-quiet" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setV((x) => ({ ...x, location: `Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}` })))}><MapPin size={14} />Use my location</button>
      {f("notes", "Note (optional)", false, 500)}
      <p className="nr-hint">A field record of what was given. Veterinary sign-off and municipal review remain separate.</p>
      <div className="nf-acts"><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Saving…" : `${keepWord} the vaccination`}</button><button type="button" className="nx-btn is-quiet" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

/* ── Record an animal: one question at a time ────────────────────── */

const WHY: { id: IntakeData["category"]; label: string; note: string; icon: typeof Scissors; says: string }[] = [
  { id: "sterilisation", label: "Sterilise", note: "Caught for the ABC programme", icon: Scissors, says: "Caught for sterilisation" },
  { id: "vaccination", label: "Vaccinate", note: "Anti-rabies vaccine", icon: Syringe, says: "Recorded for vaccination" },
  { id: "injury", label: "Hurt or sick", note: "Needs treatment", icon: HeartPulse, says: "Found hurt or sick" },
  { id: "rescue", label: "Rescue", note: "In danger, needs moving", icon: LifeBuoy, says: "Rescue needed" },
];
const STEPS = ["Why", "Photo", "Where", "The dog", "Save"] as const;
const PLACE_KEY = "sp.field.place";
function IntakeSheet({ known, online, onSave, onClose }: { known: KnownAnimal[]; online: boolean; onSave: (d: IntakeData, f: File | null, id: string) => Promise<void>; onClose: () => void }) {
  const request = useRef(uuid()), saving = useRef(false);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<IntakeData>({ template: "field-intake-v1", name: "", code: "", city: "", zone: "", sex: "", identifiers: "", description: "", category: "sterilisation", lat: NaN, lng: NaN, accuracy: null, observedAt: new Date().toISOString() });
  const [chosen, setChosen] = useState(false);
  const [file, setFile] = useState<File | null>(null), [shot, setShot] = useState<string | null>(null);
  const [gps, setGps] = useState<"idle" | "finding" | "found" | "failed">("idle");
  const [search, setSearch] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const set = (p: Partial<IntakeData>) => setD((x) => ({ ...x, ...p }));
  const located = Number.isFinite(d.lat) && Number.isFinite(d.lng);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? "null") as { city?: string; zone?: string } | null; if (p) setD((x) => ({ ...x, city: p.city ?? "", zone: p.zone ?? "" })); } catch { /* nothing remembered */ } }, []);
  useEffect(() => { if (!file) { setShot(null); return; } const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => { box.current?.querySelector<HTMLElement>("h2")?.focus(); }, [step]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const locate = () => { if (!navigator.geolocation) { setGps("failed"); return; } setGps("finding"); navigator.geolocation.getCurrentPosition((p) => { set({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, observedAt: new Date(p.timestamp).toISOString() }); setGps("found"); }, () => setGps("failed"), { enableHighAccuracy: true, timeout: 15000 }); };
  /* Arriving at Where asks the phone once; nobody has to. */
  useEffect(() => { if (step === 2 && gps === "idle" && !located) locate(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const why = WHY.find((w) => w.id === d.category)!;
  const matches = search.trim() ? known.filter((a) => [a.name, a.code, a.straypaw_id, a.identifiers].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).slice(0, 5) : [];
  const canNext = step === 0 ? chosen : step === 2 ? located && !!d.city.trim() && !!d.zone.trim() : true;
  const save = async () => {
    if (saving.current) return; saving.current = true; setBusy(true); setError(null);
    try {
      if (!located) throw new Error("Where you are is still needed. Go back to Where.");
      try { localStorage.setItem(PLACE_KEY, JSON.stringify({ city: d.city.trim(), zone: d.zone.trim() })); } catch { /* not remembered */ }
      await onSave({ ...d, city: d.city.trim(), zone: d.zone.trim(), description: d.description.trim() || why.says }, file, request.current);
      toast({ text: online ? "Animal recorded. Sending now." : "Animal recorded and kept on this phone, encrypted.", tone: "ok" });
      onClose();
    } catch (x) { setError(`${errText(x)} Nothing was lost; try again.`); } finally { saving.current = false; setBusy(false); }
  };
  return (
    <section className="nf-sheet" role="dialog" aria-modal="true" aria-label="Record an animal">
      <header>
        {step > 0 ? <button type="button" className="nx-ib" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft size={20} /></button> : <span style={{ width: 44 }} />}
        <ol className="nf-dots" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>{STEPS.map((s, i) => <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : undefined} aria-hidden />)}</ol>
        <button type="button" className="nx-ib" onClick={onClose} aria-label="Close without saving"><X size={20} /></button>
      </header>
      <div ref={box} key={step}>
        {step === 0 ? <><h2 tabIndex={-1}>Why are you recording this dog?</h2>
          <div className="nf-tiles" role="radiogroup" aria-label="Why">{WHY.map((w) => <button key={w.id} type="button" role="radio" aria-checked={chosen && d.category === w.id} onClick={() => { set({ category: w.id }); setChosen(true); setStep(1); }}><w.icon size={26} /><b>{w.label}</b><small>{w.note}</small></button>)}</div></>
        : step === 1 ? <><h2 tabIndex={-1}>Take a photo</h2>
          <label className="nf-photo">{/* eslint-disable-next-line @next/next/no-img-element */}{shot ? <img src={shot} alt="The photo you took" /> : <><Camera size={36} /><b>Open the camera</b><small>Whole dog, side on if you can</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Photo of the dog" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          {shot ? <p className="nr-hint">Tap the photo to take it again.</p> : null}</>
        : step === 2 ? <><h2 tabIndex={-1}>Where are you?</h2>
          <div className={`nf-gps ${located ? "is-found" : ""}`} role="status"><MapPin size={22} />{located ? <span><b>Location found</b><small>{d.accuracy !== null ? `Within about ${Math.round(d.accuracy)} m` : "Entered by hand"}</small></span> : gps === "finding" ? <span><b>Finding you…</b><small>Keep the phone still for a moment</small></span> : <span><b>Location is off</b><small>Allow location for this site, then try again</small></span>}{gps !== "finding" ? <button type="button" className="nx-btn is-quiet is-sm" onClick={locate}>{located ? "Refresh" : "Try again"}</button> : null}</div>
          <F label="Area or street"><input value={d.zone} maxLength={120} onChange={(e) => set({ zone: e.target.value })} placeholder="HSR Layout, 14th Main" autoComplete="off" /></F>
          <F label="City"><input value={d.city} maxLength={120} onChange={(e) => set({ city: e.target.value })} placeholder="Bengaluru" autoComplete="off" /></F></>
        : step === 3 ? <><h2 tabIndex={-1}>About the dog</h2>
          <div className="nx-field"><span>Sex</span><div className="nr-seg" role="radiogroup" aria-label="Sex">{[["Female", "Female"], ["Male", "Male"], ["Unknown", "Not sure"]].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={d.sex === v} data-on={d.sex === v} style={{ minHeight: 44 }} onClick={() => set({ sex: d.sex === v ? "" : v })}>{l}</button>)}</div></div>
          <F label="Name or tag, if it has one"><input value={d.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></F>
          <F label="Marks that tell it apart"><input value={d.identifiers} maxLength={500} onChange={(e) => set({ identifiers: e.target.value })} placeholder="White patch on the left ear" autoComplete="off" /></F>
          {known.length ? <><F label="Seen this dog before?"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your register" autoComplete="off" /></F>
            {matches.length ? <div className="nr-pick">{matches.map((a) => <button key={a.id} type="button" onClick={() => { set({ existingDogId: a.id, name: a.name ?? "", code: a.code ?? a.straypaw_id ?? "" }); setSearch(""); }}><b><Search size={12} /> {a.name || a.straypaw_id || a.code}</b><small>{a.identifiers || a.code || ""}</small></button>)}</div> : null}
            {d.existingDogId ? <p className="nr-ok" role="status"><Tick size={13} /> Added to this dog&apos;s history. <button type="button" className="nr-link" onClick={() => set({ existingDogId: undefined, code: "" })}>Undo</button></p> : null}</> : null}</>
        : <><h2 tabIndex={-1}>Save this record?</h2>
          <dl className="nf-sum">{/* eslint-disable-next-line @next/next/no-img-element */}{shot ? <img src={shot} alt="" /> : null}
            <div><dt>Why</dt><dd>{why.label}</dd></div><div><dt>Where</dt><dd>{[d.zone, d.city].filter(Boolean).join(", ") || "Not given"}</dd></div>
            <div><dt>Dog</dt><dd>{[d.name, d.sex && (d.sex === "Unknown" ? "sex not sure" : d.sex.toLowerCase()), d.identifiers].filter(Boolean).join(" · ") || "No details added"}</dd></div><div><dt>Photo</dt><dd>{file ? "Attached" : "None"}</dd></div></dl>
          <F label="Anything to add? (optional)"><input value={d.description} maxLength={3000} onChange={(e) => set({ description: e.target.value })} autoComplete="off" /></F>
          <p className="nr-hint">{online ? "It saves to your register now: a provisional animal and its case." : "It is kept on this phone, encrypted, and sent when you choose."}</p>
          {error ? <p className="nr-err" role="alert">{error}</p> : null}</>}
      </div>
      {step > 0 ? <footer>
        {step < 4 ? <button type="button" className="nx-btn" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 1 && !file ? "Skip the photo" : "Next"}</button> : <button type="button" className="nx-btn" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>}
        {step === 2 && !canNext ? <p className="nr-hint" style={{ textAlign: "center" }}>{!located ? "Waiting for your location." : "Add the area and the city."}</p> : null}
      </footer> : <footer />}
    </section>
  );
}

/* ── Sample: the same round, every action opening the live demo ──── */
function SampleField() {
  const stops = [
    { id: "s1", t: "Recovery check · Black and white puppy", s: "Due today · CASE-0241 · Indiranagar", late: false },
    { id: "s2", t: "Day 7 observation · Tan female", s: "Late since 12 Nov · CASE-0214 · Ward 08", late: true },
  ];
  return (
    <Shell crumb={["Operations", "Field mode"]}>
      <div className="nf">
        <header className="nf-head"><div><p className="nx-t3">Sample round<Sample /></p><h1>Your round</h1><p><b className="num">4</b> stops · <b style={{ color: "var(--bad)" }}>1 late</b></p></div><span className="nf-net" data-s="online"><i aria-hidden />Online</span></header>
        <TryLink><Camera size={16} />Record an animal</TryLink>
        <section aria-labelledby="nf-due"><h2 className="nf-h" id="nf-due">Due <span className="nx-count">2</span></h2>
          <ol className="nf-stops">{stops.map((x) => <li key={x.id} className={`nf-stop ${x.late ? "is-late" : ""}`}><div className="nf-stop-t"><b>{x.t}</b><small>{x.s}</small></div><div className="nf-acts"><TryLink><Tick size={15} />Done</TryLink><TryLink quiet>Missed</TryLink></div></li>)}</ol></section>
        <section aria-labelledby="nf-mine"><h2 className="nf-h" id="nf-mine">In your hands <span className="nx-count">2</span></h2>
          <ol className="nf-stops">{[["Road accident", "CASE-0278 · Ward 12"], ["Limping grey dog, old injury", "CASE-0236 · Ward 12"]].map(([t, s]) => <li key={t} className="nf-stop"><div className="nf-stop-t"><b>{t}</b><small>Open · {s}</small></div><div className="nf-acts"><TryLink><Play size={15} />Start</TryLink><TryLink quiet><Plus size={15} />Record</TryLink></div></li>)}</ol></section>
        <section className="nf-phone" aria-label="This phone"><header><span className="nf-lock" aria-hidden><Smartphone size={16} /></span><div><b>This phone</b><small>Offline, records are kept here encrypted with a PIN and sent when there is signal.</small></div></header>
          <div className="nr-acts"><TryLink sm quiet><WifiOff size={13} />Work offline</TryLink><TryLink sm quiet><ScanLine size={13} />Scan a tag</TryLink></div></section>
      </div>
    </Shell>
  );
}
