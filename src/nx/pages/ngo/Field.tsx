"use client";

/* Field mode: the phone in one hand, on the street. The page is a round of stops: follow-ups due on the cases the person
   holds, then the cases themselves. One blue control at the top records an animal that is in front of them, on one
   screen: a photo, why, where (found by the phone, with a way to type it), optional details folded away, and one Save.
   /ngo/field?record=1 opens that screen straight away, so Today, Operations and the command bar can lead to it. Each
   case opens four tools (note, photo or proof, vaccination, care or movement), one form at a time.

   Where a record goes is said, not chosen first: online, it saves straight to the register; offline, it is kept on this
   phone, encrypted with a PIN, and sent when there is signal. "On this phone" lists what is waiting, what was sent and
   what failed, with a way to correct each failure. Sending is idempotent: every record carries its own request id
   (src/lib/field), so sending twice never saves twice, and nothing is called sent until the server's copy and its audit
   row are checked. The styles are src/nx/field.css (prefix fm-). */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Camera, Check as Tick, ChevronDown, HeartPulse, LifeBuoy, Lock, MapPin, PawPrint, PenLine, Play, Plus, Route, Scissors, Search, Syringe, Trash2, WifiOff, X } from "lucide-react";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Confirm, Field as F, day, dayTime, errText, toast, useAct, words } from "../../kit";
import { useLive, type Workspace } from "../../live";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { compressForUpload } from "@/lib/photo/compress";
import { EVIDENCE_LABEL, type EvidenceKind } from "@/lib/abc";
import type { IntakeData, LifecycleData, OperationKind, WorkflowPolicy } from "@/lib/operations";
import { archiveDraft, clearOfflineDevice, deleteDraft, fieldCache, lockOffline, offlineUnlocked, offlineVaultExists, putDraft, readDrafts, readSynced, startOnlineSession, unlockOffline, type FieldDraft, type SyncedFieldRecord, type VaccinationData } from "@/lib/field/outbox";
import { submitFieldDraft } from "@/lib/field/sync";
import { areaNear, cityNear, findPhone } from "@/lib/field/place";
import { backToAssigned, ensureVolunteer, isoDay, setFollowup, shortCode, startWork, type Actor } from "../../data/ngo";
import { LifecycleForm, TRY, undoWith } from "./parts";
import { animalLine, animalName, animalSearch } from "@/nx/animalLabel";
import { SayIt } from "../../KajuCapture";
import { readField } from "../../data/capture";
import { AnimatePresence, motion } from "framer-motion";
import { CheckDraw, ResultButton, Swap, settle, useCalm, useResult, useSpring, type ResultState } from "../../motion";
import "../../css/ngo-records.css";
import "../../field.css";

type KnownAnimal = { id: string; name: string | null; code: string | null; straypaw_id: string | null; identifiers: string | null };
type Cached = { cases: OpenCase[]; fus: DueFollowup[]; assignedIds: string[]; known?: KnownAnimal[]; policies?: WorkflowPolicy[] };
/** Where a record goes from this screen: straight to the register, held until the signal is back, or kept behind the PIN. */
type Route3 = "send" | "hold" | "keep";
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ext = (t: string) => (t === "application/pdf" ? "pdf" : t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg");
const today = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** A phone or tablet with a camera to open from a tap; a desktop gets the file picker only when it asks for it. */
const phoneCamera = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function Field() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Operations", "Field mode"]}><div className="fm"><p className="fm-quiet">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (!live.org) return <SampleField />;
  if (!org || !live.userId) return <Shell crumb={["Operations", "Field mode"]}><div className="fm"><header className="fm-head"><h1>Field mode</h1><p className="fm-sum">{live.org.name} is not an NGO workspace, so it has no field round.</p></header></div></Shell>;
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

type HeadOpts = { record?: () => void; tools?: ReactNode };
type Head = (waiting: number, sum: ReactNode, opts?: HeadOpts) => ReactNode;

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
  const head: Head = (waiting, sum, opts) => (
    <>
      <header className="fm-head">
        <p className="fm-eyebrow">{today()} · {org.name}</p>
        <h1>Your round</h1>
        <p className="fm-sum" aria-live="polite">{sum}</p>
        <button type="button" className="fm-net" data-s={signal} aria-expanded={netOpen || signal === "nosignal"} aria-controls="fm-netp" onClick={() => setNetOpen((v) => !v)}><i aria-hidden />{signal === "online" ? "Online" : signal === "offline" ? "Offline" : "No signal"}{waiting ? <span className="fm-tag is-wait">{waiting} waiting</span> : null}</button>
        {opts?.record ? <button type="button" className="fm-btn is-go fm-record" onClick={opts.record}><Camera size={18} aria-hidden />Record an animal</button> : null}
      </header>
      {netOpen || signal === "nosignal" ? <div id="fm-netp" className="fm-netp" role="group" aria-label="Connection">
        <p>{signal === "online" ? "Every record saves straight to your register as you make it." : signal === "offline" ? (waiting ? `${plural(waiting, "record is", "records are")} waiting on this phone. ${waiting === 1 ? "It is" : "They are"} sent when you choose, once there is signal.` : "Records stay on this phone, locked with your PIN, until you are back in signal.") : "Nothing can be sent right now. Carry on offline and send when the signal is back."}</p>
        {signal === "online" && offlineReady ? <p className="fm-quiet">This phone is ready to work without signal.</p> : null}
        {signal === "nosignal" ? <div className="fm-netp-a"><button type="button" className="fm-btn" onClick={() => { setMode("offline"); setNetOpen(false); }}><WifiOff size={16} aria-hidden />Keep working offline</button></div>
          : <button type="button" role="switch" aria-checked={mode === "offline"} className="fm-switch" onClick={() => { setMode(mode === "offline" ? "online" : "offline"); setNetOpen(false); }}><span>Work offline</span><i aria-hidden /></button>}
        {opts?.tools ? <div className="fm-netp-a">{opts.tools}</div> : null}
      </div> : null}
    </>
  );
  if (mode === "offline" && !open) return <Shell crumb={["Operations", "Field mode"]}><div className="fm">{head(0, "Unlock this phone's records to carry on offline.")}<Pin scope={base} onUnlock={() => setOpen(true)} /></div></Shell>;
  return <Shell crumb={["Operations", "Field mode"]}>{scope && open ? <Round key={scope} org={org} actor={actor} scope={scope} mode={mode} online={online} head={head} storageError={storageError} setStorageError={setStorageError} relock={() => setOpen(false)} /> : <div className="fm">{head(0, storageError ?? "Preparing this phone…")}</div>}</Shell>;
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
    <section className="fm-pin" aria-labelledby="fm-pin-h">
      <span className="fm-lock" aria-hidden><Lock size={20} /></span>
      <h2 id="fm-pin-h">{exists ? "Enter your offline PIN" : "Set an offline PIN"}</h2>
      <p>{exists ? "It unlocks the field records saved on this phone." : "Records are saved encrypted on this phone and sent when there is signal. You will use this PIN whenever you work offline. It cannot be recovered, so choose one you will remember."}</p>
      {exists === null && !error ? <p className="fm-quiet" role="status">Checking this phone…</p> : (
        <form onSubmit={async (e) => { e.preventDefault(); if (!exists && pin !== again) { setError("The PINs do not match."); return; } setBusy(true); setError(null); try { await unlockOffline(scope, pin); setPin(""); setAgain(""); onUnlock(); } catch (x) { setError(x instanceof Error && /decrypt|operation|did not unlock/i.test(x.message) ? "That PIN is not right. Nothing was removed." : errText(x)); } finally { setBusy(false); } }}>
          <label className="nx-field"><span>{exists ? "PIN" : "New PIN"}</span><input type="password" inputMode="numeric" autoComplete={exists ? "current-password" : "new-password"} pattern="\d{6}" maxLength={6} value={pin} onChange={(e) => setPin(digits(e.target.value))} autoFocus required /></label>
          {!exists ? <label className="nx-field"><span>Repeat the PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" maxLength={6} value={again} onChange={(e) => setAgain(digits(e.target.value))} required /></label> : null}
          <button className="fm-btn is-go is-wide" disabled={busy || !ready}>{busy ? "Checking…" : exists ? "Unlock" : "Set the PIN"}</button>
        </form>
      )}
      {error ? <p role="alert" className="fm-err">{error}</p> : null}
    </section>
  );
}

function Round({ org, actor, scope, mode, online, head, storageError, setStorageError, relock }: { org: Workspace; actor: Actor; scope: string; mode: "online" | "offline"; online: boolean; head: Head; storageError: string | null; setStorageError: (s: string | null) => void; relock: () => void }) {
  const [cases, setCases] = useState<OpenCase[] | null>(null);
  const [fus, setFus] = useState<DueFollowup[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [known, setKnown] = useState<KnownAnimal[]>([]);
  /* An animal is named the way the register names it: "Tiger (132)" or "Dog 128", never "Unnamed". */
  const dogLine = (id: string | null, name: string | null) => { const k = id ? known.find((a) => a.id === id) : undefined; return k ? animalLine(k) : animalName(name); };
  const [policies, setPolicies] = useState<WorkflowPolicy[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [synced, setSynced] = useState<SyncedFieldRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  /* What is on its way right now, and what has just arrived: a record's row stays where it was and turns from
     "Saved on this phone" to "Sending" to "Sent", then joins the sent list. */
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [justSent, setJustSent] = useState<SyncedFieldRecord[]>([]);
  const [capture, setCapture] = useState(false);
  /* The record's photo is taken through one camera input that lives here, so the tap that opens the record screen can
     open the camera in the same moment (a browser opens a camera only straight from a tap). */
  const [shot, setShot] = useState<File | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  /* The record the open record screen is showing as sent: its own confirmation says so, so no toast repeats it. */
  const showing = useRef<string | null>(null);
  const shoot = useCallback(() => cam.current?.click(), []);
  const record = useCallback((camera: boolean) => { setShot(null); setCapture(true); if (camera && phoneCamera()) shoot(); }, [shoot]);
  const [done, setDone] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<null | { title: string; body: string; confirm: string; danger?: boolean; go: () => Promise<void> }>(null);
  const [vaccDefaults, setVaccDefaults] = useState<Pick<VaccinationData, "vaccine" | "batch" | "performedBy"> | undefined>();
  const lock = useRef(false);
  const { busy, run } = useAct();
  /* /ngo/field?record=1 (from Today, Operations or the command bar, even while field mode is open) opens the record
     screen once; the address then drops it, so a reload or Back does not open it again. */
  const wantRecord = useSearchParams().get("record") === "1";
  useEffect(() => {
    if (!wantRecord) return;
    /* Arriving from the phone's "+": the camera opens too while the tap that brought the person here still counts. */
    record(!!(navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive);
    try { const u = new URL(window.location.href); u.searchParams.delete("record"); window.history.replaceState(null, "", u); } catch { /* the address stays as it was */ }
  }, [wantRecord, record]);

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
    let sent = 0, bad = 0, seen = 0;
    try {
      const queued = (await readDrafts(scope)).filter((d) => !only || only.includes(d.id)).sort((a, b) => Number(!!b.intake) - Number(!!a.intake) || Date.parse(a.at) - Date.parse(b.at));
      setSendingIds(new Set(queued.map((d) => d.id)));
      // An intake opens a case assigned to this person, which needs their volunteer row; someone whose first record is
      // made in the field has none yet, and the server would refuse the case.
      if (queued.some((d) => d.intake)) await ensureVolunteer(actor);
      for (const d of queued) {
        try {
          const saved = await submitFieldDraft(d, actor.id, org.org_id);
          const rec: SyncedFieldRecord = { id: d.id, scope, at: saved.confirmedAt, caseId: saved.caseId, dogId: saved.dogId, auditId: saved.audit_id, label: d.note.slice(0, 120) };
          await archiveDraft(d, rec); sent++; if (showing.current === d.id) seen++;
          setJustSent((cur) => [...cur.filter((x) => x.id !== rec.id), rec]);
          window.setTimeout(() => setJustSent((cur) => cur.filter((x) => x.id !== rec.id)), 5000);
        }
        catch (e) { bad++; await putDraft({ ...d, status: "failed", error: errText(e) }).catch(() => {}); }
      }
      if (sent > seen) toast({ text: `${sent} ${sent === 1 ? "record" : "records"} sent; the server's copy and audit were checked.`, tone: "ok" });
      if (bad) toast({ text: `${bad} ${bad === 1 ? "record" : "records"} did not go. ${bad === 1 ? "It stays" : "They stay"} on this phone with the reason.`, tone: "bad" });
      if (sent) await load();
    } catch (e) { setStorageError(`${errText(e)} The records stay on this phone.`); }
    finally { lock.current = false; setSyncing(false); setSendingIds(new Set()); await readBox(); }
  }, [scope, actor, org.org_id, load, readBox, setStorageError]);
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

  const route: Route3 = mode === "offline" ? "keep" : online ? "send" : "hold";
  const whereabouts = (id: string): { at: Whereabouts; error?: string } => {
    if (justSent.some((x) => x.id === id) || synced.some((x) => x.id === id)) return { at: "sent" };
    const d = drafts.find((x) => x.id === id);
    if (!d) return { at: null };
    return syncing && sendingIds.has(id) ? { at: "sending" } : d.status === "failed" ? { at: "failed", error: d.error } : { at: "waiting" };
  };
  const lateN = myFus.filter((f) => Date.parse(f.due_at) < Date.now()).length;
  const stops = mine.length + myFus.length;
  const waiting = drafts.length;
  const calm = useCalm();
  const panelSpring = useSpring("panel");
  const arrived = justSent.filter((x) => !drafts.some((d) => d.id === x.id));
  const sum = cases === null ? (failed ? "Your stops could not be read." : "Reading your stops…") : stops === 0 ? "Nothing is held by you right now." : <><b className="num">{plural(stops, "stop", "stops")}</b>{lateN ? <> · <b className="num is-late">{lateN} late</b></> : null}</>;
  const fu = (f: DueFollowup, s: "done" | "missed") => run(`f${f.id}`, () => setFollowup(f.id, s), { ok: s === "done" ? "Follow-up marked done." : "Follow-up marked missed.", undo: () => undoWith(() => setFollowup(f.id, "upcoming"), async () => { setDone((m) => { const x = { ...m }; delete x[`f${f.id}`]; return x; }); await load(); }, "Follow-up reopened.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`f${f.id}`]: s === "done" ? "Done" : "Missed" })); });
  const start = (c: OpenCase) => run(`s${c.id}`, () => startWork(c.id, actor), { ok: "Marked in progress.", undo: () => undoWith(() => backToAssigned(c.id, actor), async () => { setDone((m) => { const x = { ...m }; delete x[`s${c.id}`]; return x; }); await load(); }, "Back to assigned.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`s${c.id}`]: "Started" })); });
  const tools = mode === "offline" ? <>
    <button type="button" className="fm-btn is-sm" onClick={() => { lockOffline(); relock(); }}><Lock size={16} aria-hidden />Lock offline records</button>
    <button type="button" className="fm-btn is-sm" onClick={() => setAsk({ title: "Clear sent records from this phone?", body: "Records already sent stay on the server. Records still waiting must be sent or removed first; this phone will ask for a new PIN next time.", confirm: "Clear them", danger: true, go: async () => { await clearOfflineDevice(scope); relock(); } })}><Trash2 size={16} aria-hidden />Clear sent records</button>
  </> : undefined;

  return (
    <div className="fm">
      {head(waiting, sum, { record: () => record(true), tools })}
      <input ref={cam} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="fm-cam" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setShot(f); }} />
      {capture ? <RecordSheet known={known} route={route} file={shot} onShoot={shoot} onDropShot={() => setShot(null)} whereabouts={whereabouts} showing={showing} onSave={intake} onClose={() => { setCapture(false); setShot(null); }} /> : null}
      {storageError ? <p className="fm-err" role="alert">{storageError}</p> : null}
      {cachedAt ? <p className="fm-hint" role="status">Showing the stops kept on this phone at {dayTime(cachedAt)}. They may have changed since; sending checks your current access.</p> : null}
      {failed ? <div className="fm-err" role="alert">Records you make are still kept on this phone. <button type="button" className="fm-link" onClick={() => void load()}>Read your stops again</button></div> : null}

      {myFus.length ? <section className="fm-sec" aria-labelledby="fm-due"><div className="fm-sec-h"><h2 id="fm-due">Follow-ups due</h2><span className="fm-count">{myFus.length}</span></div>
        <ol className="fm-list">{myFus.map((f) => { const late = Date.parse(f.due_at) < Date.now(), d = done[`f${f.id}`]; return (
          <li key={f.id} className={`fm-stop ${d ? "is-done" : ""}`}>
            <div className="fm-stop-t"><b>{words(f.kind, "Recheck")}{dogLine(f.dog_id, f.animal_name) ? ` · ${dogLine(f.dog_id, f.animal_name)}` : ""}</b><span className="fm-meta">{late ? <span className="fm-tag is-late">Late</span> : null}<span>Due {day(f.due_at)}</span>{[shortCode(f.case_code, "follow-up"), f.zone].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</span>{f.note ? <span className="fm-meta">{f.note}</span> : null}</div>
            {d ? <p className="fm-ok">{d === "Done" ? <CheckDraw size={16} /> : <Tick size={16} aria-hidden />}{d}</p> : <div className="fm-acts"><button type="button" className="fm-btn" disabled={!online || !!busy} onClick={() => void fu(f, "done")}><Tick size={16} aria-hidden />Done</button><button type="button" className="fm-btn" disabled={!online || !!busy} onClick={() => void fu(f, "missed")}>Missed</button></div>}
            {!online && !d ? <p className="fm-hint fm-full">Marking a follow-up needs signal.</p> : null}
          </li>); })}</ol></section> : null}

      {mine.length ? <section className="fm-sec" aria-labelledby="fm-mine"><div className="fm-sec-h"><h2 id="fm-mine">Your cases</h2><span className="fm-count">{mine.length}</span></div>
        <ol className="fm-list">{mine.map((c) => <CaseStop key={c.id} c={c} animal={dogLine(c.dog_id, c.animal_name)} online={online} started={c.status_class === "in_progress" || done[`s${c.id}`] === "Started"} busy={!!busy} drafted={drafts.filter((d) => d.caseId === c.id).length} onStart={() => void start(c)}
          onNote={(t) => note(c, t)} onEvidence={(k, f, l) => evidence(c, k, f, l)} onVaccination={(v) => vaccination(c, v)} vaccDefaults={vaccDefaults} policies={policies} onOperation={(k, d, p, r) => operation(c.id, c.case_code, k, d, p, r)} route={route} />)}</ol></section> : null}

      {cases !== null && !failed && !stops ? <div className="fm-empty"><p>Cases you take become stops here.</p><Link className="fm-btn" href={unowned ? "/ngo/cases?view=unassigned" : "/ngo/cases"}>{unowned ? `See ${plural(unowned, "unassigned case", "unassigned cases")}` : "Open the cases"}</Link></div> : null}

      {waiting || synced.length ? <section className="fm-sec" aria-labelledby="fm-phone">
        <div className="fm-sec-h"><h2 id="fm-phone">On this phone</h2>{waiting ? <span className="fm-count">{plural(waiting, "record", "records")} not sent yet</span> : null}
          {waiting ? <button type="button" className={`fm-btn is-sm ${online ? "is-go" : ""}`} disabled={!online || syncing} onClick={() => void send()}>{syncing ? "Sending…" : online ? (waiting === 1 ? "Send it" : `Send all ${waiting}`) : "Waiting for signal"}</button> : null}</div>
        {waiting || arrived.length ? <div className="fm-list"><AnimatePresence initial={false}>{[...drafts.map((d) => ({ k: d.id, d, x: null })), ...arrived.map((x) => ({ k: x.id, d: null, x }))].map((row) => <motion.div key={row.k} className="fm-out" layout={calm ? false : "position"} initial={calm ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={calm ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24 }} transition={panelSpring}><Swap inline={false} k={row.d ? "d" : "x"}>{row.x ? <SentRow x={row.x} /> : (() => { const d = row.d!; return <Draft d={d} sending={syncing && sendingIds.has(d.id)} online={online} syncing={syncing} policies={policies} onSend={() => void send([d.id])} onChanged={readBox}
          onRemove={() => setAsk({ title: "Remove this copy from the phone?", body: d.status === "failed" ? "It was not confirmed by the server. Removing it loses what it holds unless you have copied it." : "It has not been sent. Removing it loses what it holds.", confirm: "Remove it", danger: true, go: async () => { await deleteDraft(d.id); await readBox(); } })}
          onReplace={async (text) => { await keep({ ...d, id: uuid(), note: text, status: "pending", error: undefined }); await deleteDraft(d.id); await readBox(); }}
          onOperation={(k, data, p, r) => operation(d.caseId, d.code, k, data, p, r, d.id)} />; })()}</Swap></motion.div>)}</AnimatePresence></div> : null}
        {synced.length ? <details className="fm-sent"><summary>Sent from this phone · {synced.length}<ChevronDown size={16} aria-hidden /></summary><ul>{[...synced].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 30).map((x) => <li key={x.id}><span><Link className="fm-link" href={`/ngo/cases/${x.caseId}`}>{x.label}</Link><small>Sent {dayTime(x.at)} · receipt {x.auditId}</small></span><span className="fm-dot" data-s="sent" aria-label="Sent" /></li>)}</ul></details> : null}
      </section> : null}
      {ask ? <Confirm title={ask.title} confirm={ask.confirm} danger={ask.danger} onClose={() => setAsk(null)} onConfirm={() => void ask.go().then(() => setAsk(null)).catch((e) => { setStorageError(errText(e)); setAsk(null); })}><p>{ask.body}</p></Confirm> : null}
    </div>
  );
}

/* One record waiting on the phone, with what went wrong and how to put it right. */
function Draft({ d, sending, online, syncing, policies, onSend, onRemove, onReplace, onOperation, onChanged }: { d: FieldDraft; sending: boolean; online: boolean; syncing: boolean; policies: WorkflowPolicy[]; onSend: () => void; onRemove: () => void; onReplace: (text: string) => Promise<void>; onOperation: (k: OperationKind, data: LifecycleData, p: string | null, r: string) => Promise<void>; onChanged: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(d.note);
  const [addOp, setAddOp] = useState(false);
  const plain = !d.intake && !d.kind && !d.vaccination && !d.lifecycle && !d.survey;
  const err = d.error ?? "";
  /* A refusal before the server saved anything can be corrected and sent as a new record. A record whose saved copy could not be
     checked may already be on the server, so it is retried as the same request instead, never copied. */
  const unverified = /verif|differs|audit|receipt/i.test(err);
  const fix = /sign in|session/i.test(err) ? <Link className="fm-link" href="/sign-in?next=/ngo/field">Sign in again</Link>
    : /intake first/i.test(err) ? <span>Send the animal&apos;s intake first; this one follows it.</span>
    : unverified ? <span>It may already be saved. Send this one again: the same request is checked, never saved twice.{d.caseId && !d.intake && !d.intakeRequest ? <> Or <Link className="fm-link" href={`/ngo/cases/${d.caseId}`}>open the case</Link> to look.</> : null}</span>
    : plain ? <span>Correct it and send it again.</span> : <span>Send it again, or remove it and record it once more.</span>;
  return (
    <details className="fm-draft" open={d.status === "failed" || undefined}>
      <summary data-photo={d.file && d.file.type.startsWith("image/") ? "" : undefined}><i className="fm-dot" data-s={sending ? "sending" : d.status === "failed" ? "failed" : "pending"} aria-hidden />{d.file && d.file.type.startsWith("image/") ? <Shot file={d.file} state={sending ? "sending" : d.status === "failed" ? "failed" : "pending"} /> : null}<span><b>{d.survey ? "Survey observation" : d.intake ? "Animal intake" : d.code ? shortCode(d.code) : "Field record"}</b><small>{dayTime(d.at)} · {sending ? "Sending…" : d.status === "failed" ? "Did not go" : "Saved on this phone, waiting to be sent"}</small></span><Swap k={sending ? "s" : d.status}><span className={`fm-tag ${sending ? "is-on" : d.status === "failed" ? "is-bad" : "is-wait"}`}>{sending ? "Sending" : d.status === "failed" ? "Failed" : "Waiting"}</span></Swap></summary>
      <div>
        <p style={{ whiteSpace: "pre-wrap" }}>{d.note}</p>
        {d.location ? <p className="fm-hint">{d.location}</p> : null}
        {d.vaccination ? <p className="fm-hint">{d.vaccination.eventDate} · vaccinator {d.vaccination.performedBy} · {d.vaccination.dose || "dose not recorded"} · {d.vaccination.route || "route not recorded"} · {d.vaccination.location}</p> : null}
        {d.status === "failed" ? <p className="fm-err" role="alert">{err || "It did not go."} {fix}</p> : null}
        {edit ? <form className="fm-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void onReplace(text.trim()).then(() => setEdit(false)); }}><F label="Correct the note"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} /></F><div className="fm-form-a"><button type="submit" className="fm-btn is-go" disabled={!text.trim()}>Keep the corrected note</button><button type="button" className="fm-btn" onClick={() => setEdit(false)}>Cancel</button></div></form> : null}
        <div className="fm-form-a">
          <button className="fm-btn is-sm" type="button" disabled={!online || syncing} onClick={onSend}>{d.status === "failed" ? "Try again" : "Send this one"}</button>
          {plain && d.status === "failed" && !unverified && !edit ? <button className="fm-btn is-sm" type="button" onClick={() => setEdit(true)}><PenLine size={16} aria-hidden />Correct it</button> : null}
          {d.file ? <button className="fm-btn is-sm" type="button" onClick={() => { const u = URL.createObjectURL(d.file!); const a = document.createElement("a"); a.href = u; a.download = `field-record-${d.id}.${ext(d.file!.type)}`; a.click(); window.setTimeout(() => URL.revokeObjectURL(u), 1000); }}>Download the file</button> : null}
          <button className="fm-btn is-sm" type="button" onClick={onRemove}><Trash2 size={16} aria-hidden />Remove from phone</button>
        </div>
        {d.intake ? (addOp ? <LifecycleForm policies={policies} submitLabel="Keep with this animal" onCancel={() => setAddOp(false)} onSave={async (k, data, p, r) => { await onOperation(k, data, p, r); await onChanged(); }} /> : <button type="button" className="fm-btn is-sm fm-start" onClick={() => setAddOp(true)}><Plus size={16} aria-hidden />Add what was done to this animal</button>) : null}
      </div>
    </details>
  );
}

/** A photo kept with a record, small, with where it is: on this phone, on its way, or failed. */
function Shot({ file, state }: { file: Blob; state: "pending" | "sending" | "failed" }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="fm-shot" data-s={state}>{url ? <img src={url} alt="" /> : null}{state === "sending" ? <span className="mo-bar" data-s="uploading" aria-hidden><i /></span> : null}</span>;
}

/** A record that has just been sent: its row stays a moment, with the check drawn, before it joins the sent list. */
function SentRow({ x }: { x: SyncedFieldRecord }) {
  return (
    <div className="fm-draft is-sent" role="status">
      <div className="fm-sent-now"><span className="fm-sent-ok" aria-hidden><CheckDraw size={12} stroke={2.6} /></span><span><b>{x.label}</b><small>Sent just now · the server&apos;s copy and audit were checked · receipt {x.auditId}</small></span><span className="fm-tag is-ok">Sent</span></div>
    </div>
  );
}

/** The words on a save button, by where the record goes. */
const keepLabel = (route: Route3, what: string) => (route === "keep" ? `Keep the ${what} on this phone` : `Save the ${what}`);
const keptToast = (route: Route3) => (route === "send" ? "Saved. Sending now." : route === "hold" ? "Saved on this phone. It is sent when the signal is back." : "Kept on this phone, encrypted. Send it when there is signal.");
/** What a save button turns into once the record is safely on the phone. */
const keptLabel = (route: Route3) => (route === "send" ? "Saved, sending" : route === "hold" ? "Saved on this phone" : "Kept on this phone");

type Tool = "note" | "evidence" | "vacc" | "care";
function CaseStop({ c, animal, online, started, busy, drafted, onStart, onNote, onEvidence, onVaccination, vaccDefaults, policies, onOperation, route }: { c: OpenCase; animal: string | null; online: boolean; started: boolean; busy: boolean; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void>; onEvidence: (k: EvidenceKind, f: File | null, l: string) => Promise<void>; onVaccination: (v: VaccinationData) => Promise<void>; vaccDefaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; policies: WorkflowPolicy[]; onOperation: (k: OperationKind, d: LifecycleData, p: string | null, r: string) => Promise<void>; route: Route3 }) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("capture_photo");
  const [file, setFile] = useState<File | null>(null);
  const [loc, setLoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const res = useResult();
  const calm = useCalm();
  const saving = res.state !== "idle";
  const shut = () => { setTool(null); setError(null); };
  const tools: [Tool, string, typeof PenLine, boolean][] = [["note", "Note", PenLine, true], ["evidence", "Photo or proof", Camera, true], ["vacc", "Vaccination", Syringe, !!c.dog_id], ["care", "Care or movement", Route, !!c.dog_id]];
  /* The save button itself says it worked ("Saved on this phone ✓") and the form folds away a moment later; the
     record's own row below then shows it waiting, sending and sent. */
  const save = async (fn: () => Promise<void>) => { setError(null); try { await res.run(fn); await settle(calm); shut(); res.reset(); } catch (e) { setError(errText(e)); } };
  const gps = () => navigator.geolocation?.getCurrentPosition((p) => setLoc(`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`), () => setError("Location is unavailable. Say where it was in words."));
  const place = [shortCode(c.case_code), animal, c.zone].filter(Boolean) as string[];
  return (
    <li className="fm-stop">
      <div className="fm-stop-t"><b><Link href={`/ngo/cases/${c.id}`}>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Case"}</Link></b>
        <span className="fm-meta"><Swap k={started ? "s" : "o"}><span className={`fm-tag ${started ? "is-on" : ""}`}>{started ? "Started" : "Open"}</span></Swap>{place.length ? place.map((x, i) => <span key={`${x}${i}`}>{x}</span>) : <span>Animal and place not recorded</span>}</span></div>
      <div className="fm-acts">
        {!started ? <button type="button" className="fm-btn" disabled={!online || busy} onClick={onStart}><Play size={16} aria-hidden />Start</button> : null}
        <button type="button" className="fm-btn" aria-expanded={open} onClick={() => { setOpen((v) => !v); shut(); }}><Plus size={16} aria-hidden />Record</button>
      </div>
      {!online && !started ? <p className="fm-hint fm-full">Starting work needs signal. Records can still be kept on this phone.</p> : null}
      {open ? <div className="fm-tools" role="group" aria-label="What to record on this case">
        {tools.filter((x) => x[3]).map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => setTool(tool === id ? null : id)}><Icon size={18} aria-hidden /><span>{label}</span></button>)}
        <Link href={`/ngo/cases/${c.id}`}><ArrowUpRight size={18} aria-hidden /><span>Open the case</span></Link>
      </div> : null}
      {error ? <p className="fm-err fm-full" role="alert">{error}</p> : null}
      {open && tool === "note" ? <form className="fm-form" onSubmit={(e) => { e.preventDefault(); if (t.trim()) void save(async () => { await onNote(t.trim()); setT(""); }); }}>
        <F label="Note"><textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="What you saw or did" maxLength={1500} autoFocus /></F>
        <div className="fm-form-a"><ResultButton type="submit" className="fm-btn is-go" state={res.state} done={keptLabel(route)} disabled={saving || !t.trim()}>{keepLabel(route, "note")}</ResultButton><button type="button" className="fm-btn" onClick={shut}>Cancel</button></div>
      </form> : null}
      {open && tool === "evidence" ? <form className="fm-form" onSubmit={(e) => { e.preventDefault(); void save(async () => { await onEvidence(kind, file, loc); setFile(null); setLoc(""); }); }}>
        <F label="What it shows"><select value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>{Object.entries(EVIDENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
        {kind !== "release_location" ? <PhotoTile file={file} onFile={setFile} accept="image/jpeg,image/png,image/webp,application/pdf" title="Take a photo" hint="Or choose a photo or PDF" label="Photo or file" /> : null}
        <F label={kind === "release_location" ? "Where it was released" : "Where (optional)"}><textarea value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={1500} required={kind === "release_location"} /></F>
        <div className="fm-form-a"><button type="button" className="fm-btn" onClick={gps}><MapPin size={16} aria-hidden />Use my location</button></div>
        <div className="fm-form-a"><ResultButton type="submit" className="fm-btn is-go" state={res.state} done={keptLabel(route)} disabled={saving}>{keepLabel(route, "proof")}</ResultButton><button type="button" className="fm-btn" onClick={shut}>Cancel</button></div>
      </form> : null}
      {open && tool === "vacc" && c.dog_id ? <VaccinationForm dogId={c.dog_id} defaults={vaccDefaults} route={route} state={res.state} onCancel={shut} onSave={(v) => save(() => onVaccination(v))} /> : null}
      {open && tool === "care" ? <LifecycleForm policies={policies} submitLabel={keepLabel(route, "record")} onCancel={shut} onSave={async (k, d, p, r) => { await onOperation(k, d, p, r); toast({ text: keptToast(route), tone: "ok" }); }} /> : null}
      {drafted ? <p className="fm-onphone fm-full"><i className="fm-dot" data-s="pending" aria-hidden />{plural(drafted, "record", "records")} on this phone, not sent</p> : null}
    </li>
  );
}

/** The camera, as one big target for a thumb: a photo shows itself once taken, with a way to take it again. */
function PhotoTile({ file, onFile, accept, title, hint, label }: { file: File | null; onFile: (f: File | null) => void; accept: string; title: string; hint: string; label: string }) {
  const [shot, setShot] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!file || !file.type.startsWith("image/")) { setShot(null); return; } const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u); }, [file]);
  return (
    <div className="fm-q">
      <label className={`fm-photo ${shot ? "has-shot" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shot ? <><img src={shot} alt="The photo you took" /><span className="fm-retake" aria-hidden><Camera size={16} />Take it again</span></>
          : file ? <><span className="fm-photo-i" aria-hidden><Tick size={24} /></span><b>{file.name}</b><small>Press to choose another</small></>
          : <><span className="fm-photo-i" aria-hidden><Camera size={24} /></span><b>{title}</b><small>{hint}</small></>}
        <input ref={ref} type="file" accept={accept} capture="environment" aria-label={file ? `${label}: choose another` : label} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>
      {file ? <button type="button" className="fm-link fm-start" onClick={() => { onFile(null); if (ref.current) ref.current.value = ""; }}>{shot ? "Remove the photo" : "Remove the file"}</button> : null}
    </div>
  );
}

/** What was given, as recorded in the field. Veterinary sign-off and municipal review stay separate. */
function VaccinationForm({ dogId, defaults, route, state, onSave, onCancel }: { dogId: string; defaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; route: Route3; state: ResultState; onSave: (v: VaccinationData) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<VaccinationData>({ template: "arv-field-v1", dogId, eventDate: isoDay(new Date()), vaccine: defaults?.vaccine ?? "", batch: defaults?.batch ?? "", performedBy: defaults?.performedBy ?? "", dose: "", route: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const f = (k: "vaccine" | "batch" | "performedBy" | "dose" | "route" | "location" | "notes", label: string, req = false, max = 100) => <F label={label}><input required={req} maxLength={max} value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} /></F>;
  return (
    <form className="fm-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave(v); } finally { setBusy(false); } }}>
      {defaults ? <p className="fm-hint">The last product and batch are filled in. Check them for this animal.</p> : null}
      <div className="nx-fields">
        <F label="Date given"><input type="date" required max={isoDay(new Date())} value={v.eventDate} onChange={(e) => setV((x) => ({ ...x, eventDate: e.target.value }))} /></F>
        {f("vaccine", "Vaccine product", true, 200)}{f("batch", "Batch or lot", true)}{f("performedBy", "Vaccinator", true)}{f("dose", "Dose (optional)", false, 50)}{f("route", "Route (optional)", false, 50)}
      </div>
      {f("location", "Where it was given", true, 300)}
      <div className="fm-form-a"><button type="button" className="fm-btn" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setV((x) => ({ ...x, location: `Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}` })))}><MapPin size={16} aria-hidden />Use my location</button></div>
      {f("notes", "Note (optional)", false, 500)}
      <p className="fm-hint">A field record of what was given. Veterinary sign-off and municipal review remain separate.</p>
      <div className="fm-form-a"><ResultButton type="submit" className="fm-btn is-go" state={state} done={keptLabel(route)} disabled={busy}>{keepLabel(route, "vaccination")}</ResultButton><button type="button" className="fm-btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

/* ── Record an animal: one screen, one Send ──────────────────────────
   Built for about twelve seconds with the phone in one hand: the camera opens with the screen (on a phone, when the
   tap that opened it allows), the place is found by the phone and named from it (the city from the phone's own list,
   the area from a map service when there is signal), why is one big chip (the last record's choice is kept), and one
   Send. Name, marks, sex and a note stay folded away. "Say it" (src/nx/data/capture.ts readField) reads one line on
   the phone and fills the choices; it sends nothing and never touches Send, the drafts or sending.

   The record is the same field-intake-v1 the register has always received (src/lib/operations IntakeData): the same
   keys and meaning, one request id for the life of each record, so a Send pressed twice or retried is still one animal.
   The area is optional here, as it always was on the server (operations_intake requires the city, the place and the
   note). After Send the screen says where the record is, from the outbox itself (saved on this phone, sending, sent,
   or why it did not go), and offers "Record another" for the next animal. */

const WHY: { id: IntakeData["category"]; label: string; note: string; icon: typeof Scissors; says: string; urgent?: boolean }[] = [
  { id: "sterilisation", label: "Sterilise", note: "Caught for the ABC programme.", icon: Scissors, says: "Caught for sterilisation" },
  { id: "vaccination", label: "Vaccinate", note: "For the anti-rabies vaccine.", icon: Syringe, says: "Recorded for vaccination" },
  { id: "injury", label: "Hurt or sick", note: "Needs treatment.", icon: HeartPulse, says: "Found hurt or sick", urgent: true },
  { id: "rescue", label: "Rescue", note: "In danger and needs moving.", icon: LifeBuoy, says: "Rescue needed", urgent: true },
  { id: "other", label: "Something else", note: "Recorded in the field. Say why under More about the dog.", icon: PawPrint, says: "Recorded in the field" },
];
const PLACE_KEY = "sp.field.place", WHY_KEY = "sp.field.why";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const SEX: [string, string][] = [["Female", "Female"], ["Male", "Male"], ["Unknown", "Not sure"]];
/** Where a record made on this screen is now, read from the outbox. */
type Whereabouts = "waiting" | "sending" | "sent" | "failed" | null;
const remembered = () => { try { return JSON.parse(localStorage.getItem(PLACE_KEY) ?? "null") as { city?: string; zone?: string } | null; } catch { return null; } };
const lastWhy = (): IntakeData["category"] | null => { try { const v = localStorage.getItem(WHY_KEY); return WHY.some((w) => w.id === v) ? (v as IntakeData["category"]) : null; } catch { return null; } };
const fresh = (keep?: Partial<IntakeData>): IntakeData => ({ template: "field-intake-v1", name: "", code: "", city: keep?.city ?? "", zone: keep?.zone ?? "", sex: "", identifiers: "", description: "", category: keep?.category ?? "sterilisation", lat: NaN, lng: NaN, accuracy: null, observedAt: new Date().toISOString() });

function RecordSheet({ known, route, file, onShoot, onDropShot, whereabouts, showing, onSave, onClose }: { known: KnownAnimal[]; route: Route3; file: File | null; onShoot: () => void; onDropShot: () => void; whereabouts: (id: string) => { at: Whereabouts; error?: string }; showing: React.MutableRefObject<string | null>; onSave: (d: IntakeData, f: File | null, id: string) => Promise<void>; onClose: () => void }) {
  const request = useRef(uuid()), saving = useRef(false), hand = useRef(false);
  /* Which place fields the person typed on this screen: those are never replaced by what the phone finds. */
  const typedPlace = useRef({ zone: false, city: false });
  const [d, setD] = useState<IntakeData>(() => fresh());
  const [chosen, setChosen] = useState(false), [whyFrom, setWhyFrom] = useState<"last" | null>(null);
  const [placeFrom, setPlaceFrom] = useState<"phone" | "last" | null>(null), [editPlace, setEditPlace] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [gps, setGps] = useState<"finding" | "found" | "refused" | "failed">("finding"), [slow, setSlow] = useState(false);
  const [byHand, setByHand] = useState(false);
  const [latText, setLatText] = useState(""), [lngText, setLngText] = useState("");
  const [search, setSearch] = useState(""), [error, setError] = useState<string | null>(null), [tried, setTried] = useState(false);
  const [done, setDone] = useState<{ id: string; route: Route3; label: string } | null>(null), [count, setCount] = useState(0);
  const res = useResult(), calm = useCalm(), morph = useSpring("morph");
  const box = useRef<HTMLElement>(null), whyRef = useRef<HTMLDivElement>(null), whereRef = useRef<HTMLDivElement>(null), cityRef = useRef<HTMLInputElement>(null), doneRef = useRef<HTMLHeadingElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const set = (p: Partial<IntakeData>) => setD((x) => ({ ...x, ...p }));
  const located = Number.isFinite(d.lat) && Number.isFinite(d.lng);

  /* What this phone remembers from the last record: the place (until the phone names a new one) and why. */
  const recall = useCallback(() => {
    const p = remembered(), w = lastWhy();
    if (p?.city || p?.zone) { setD((x) => ({ ...x, city: p.city ?? "", zone: p.zone ?? "" })); setPlaceFrom("last"); }
    if (w) { setD((x) => ({ ...x, category: w })); setChosen(true); setWhyFrom("last"); }
  }, []);
  useEffect(() => { recall(); }, [recall]);
  useEffect(() => { if (!file) { setShot(null); return; } const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u); }, [file]);
  /* Focus goes into the screen and comes back to the button that opened it (or, opened from a link, to Record an animal). */
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("h2")?.focus();
    return () => { const back = before && before !== document.body && before.isConnected ? before : document.querySelector<HTMLElement>(".fm-record"); back?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  /* The phone is asked where it is as the screen opens; nobody has to. A quick fix comes first and a precise one
     replaces it; a place typed by hand is never overwritten. The city (and, with signal, the area) is named from the
     point unless the person typed it here. */
  const stop = useRef<() => void>(() => {});
  const locate = useCallback(() => {
    stop.current(); setGps("finding"); setSlow(false);
    const slowT = window.setTimeout(() => setSlow(true), 6000);
    let named = false;
    stop.current = findPhone((f) => {
      window.clearTimeout(slowT);
      if (hand.current) return;
      setD((x) => ({ ...x, lat: f.lat, lng: f.lng, accuracy: f.accuracy, observedAt: f.at })); setGps("found"); setSlow(false);
      if (named) return; named = true;
      const city = cityNear(f.lat, f.lng);
      if (city && !typedPlace.current.city) { setD((x) => ({ ...x, city })); setPlaceFrom("phone"); }
      void areaNear(f.lat, f.lng).then((a) => {
        if (!a || hand.current) return;
        setD((x) => ({ ...x, zone: a.area && !typedPlace.current.zone ? a.area : x.zone, city: !city && a.city && !typedPlace.current.city ? a.city : x.city }));
        if (a.area && !typedPlace.current.zone) setPlaceFrom("phone");
      });
    }, (e) => { window.clearTimeout(slowT); setGps(e === "refused" ? "refused" : "failed"); setSlow(false); });
  }, []);
  useEffect(() => { locate(); return () => stop.current(); }, [locate]);
  const typeIt = () => { hand.current = true; stop.current(); setByHand(true); if (located) { setLatText(d.lat.toFixed(6)); setLngText(d.lng.toFixed(6)); } };
  const usePhone = () => { hand.current = false; setByHand(false); setLatText(""); setLngText(""); set({ lat: NaN, lng: NaN, accuracy: null }); locate(); };
  const typed = (a: string, b: string) => {
    const la = Number(a.trim()), lo = Number(b.trim());
    const ok = a.trim() !== "" && b.trim() !== "" && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
    set(ok ? { lat: la, lng: lo, accuracy: null, observedAt: new Date().toISOString() } : { lat: NaN, lng: NaN, accuracy: null });
  };

  const why = WHY.find((w) => w.id === d.category)!;
  const want = animalSearch(search).toLowerCase();
  const matches = want ? known.filter((a) => [a.name, a.code, a.straypaw_id, a.identifiers].filter(Boolean).join(" ").toLowerCase().includes(want)).slice(0, 5) : [];
  const linked = d.existingDogId ? known.find((a) => a.id === d.existingDogId) : undefined;
  const missing: null | "why" | "where" | "city" = !chosen ? "why" : !located ? "where" : !d.city.trim() ? "city" : null;
  const need = missing === "why" ? "Choose why you are recording it."
    : missing === "where" ? (byHand ? "Type both numbers of the location." : gps === "finding" ? "Finding where you are…" : "The location is needed. Try again, or type it.")
    : missing === "city" ? "Add the city." : null;
  const goes = route === "send" ? (d.existingDogId ? "Sends to your register now, as a new case on this dog's history." : "Sends to your register now: a new animal and its case.")
    : route === "hold" ? "No signal right now. It is saved on this phone and sent when the signal is back. Keep this page open."
    : "Saved on this phone, locked with your PIN, until you send it.";
  const details = [d.sex && (d.sex === "Unknown" ? "Sex not sure" : d.sex), linked ? `Seen before: ${animalLine(linked)}` : d.name, d.identifiers, d.description && "A note"].filter(Boolean).join(" · ");
  const place = [d.zone.trim(), d.city.trim()].filter(Boolean).join(", ");
  const showPlace = editPlace || !d.city.trim() || (tried && missing === "city");

  const save = async () => {
    if (saving.current) return;
    if (missing) {
      setTried(true);
      if (missing === "city") setEditPlace(true);
      window.setTimeout(() => (missing === "why" ? whyRef.current?.querySelector<HTMLElement>("button") : missing === "where" ? whereRef.current?.querySelector<HTMLElement>("input, button") : cityRef.current)?.focus(), 0);
      return;
    }
    saving.current = true; setError(null);
    try {
      try { localStorage.setItem(PLACE_KEY, JSON.stringify({ city: d.city.trim(), zone: d.zone.trim() })); localStorage.setItem(WHY_KEY, d.category); } catch { /* not remembered */ }
      const id = request.current;
      await res.run(() => onSave({ ...d, city: d.city.trim(), zone: d.zone.trim(), description: d.description.trim() || why.says }, file, id));
      setDone({ id, route, label: why.label }); setCount((n) => n + 1);
    } catch (x) { setError(`${errText(x)} Nothing was lost; try again.`); } finally { saving.current = false; }
  };
  useEffect(() => { showing.current = done?.id ?? null; if (done) doneRef.current?.focus(); return () => { showing.current = null; }; }, [done, showing]);
  /* The next animal: a new request id and a new fix; why and the place carry over, the photo and details do not. */
  const another = () => {
    request.current = uuid(); hand.current = false; typedPlace.current = { zone: false, city: false };
    setD(fresh({ city: d.city.trim(), zone: d.zone.trim(), category: d.category })); setChosen(true); setWhyFrom("last"); setPlaceFrom(d.city.trim() ? "last" : null);
    setByHand(false); setLatText(""); setLngText(""); setSearch(""); setTried(false); setEditPlace(false); setError(null); res.reset();
    if (moreRef.current) moreRef.current.open = false;
    onDropShot(); setDone(null); locate();
    onShoot();
  };
  /* Say it: the line is read here, on the phone, and only fills what it states. Choices take what was said; typed
     fields are only filled when empty. */
  const sayIt = (text: string): string[] => {
    const r = readField(text), filled: string[] = [], p: Partial<IntakeData> = {};
    const label = (id: string) => WHY.find((w) => w.id === id)?.label ?? id;
    if (r.category) { p.category = r.category; setChosen(true); setWhyFrom(null); filled.push(r.also.length ? `${label(r.category)} (you also said ${r.also.map((x) => label(x).toLowerCase()).join(" and ")}; change it above if that is the reason)` : label(r.category)); }
    if (r.sex) { p.sex = r.sex; filled.push(r.sex === "Unknown" ? "sex not sure" : r.sex); }
    if (r.marks && !d.identifiers.trim()) { p.identifiers = r.marks.slice(0, 500); filled.push(`marks: ${r.marks}`); }
    if (r.zone && (!d.zone.trim() || (!typedPlace.current.zone && placeFrom === "last"))) { p.zone = r.zone.slice(0, 120); typedPlace.current.zone = true; filled.push(`area: ${r.zone}`); }
    if (!d.description.includes(r.note)) { p.description = (d.description.trim() ? `${d.description.trim()}\n${r.note}` : r.note).slice(0, 3000); filled.push("the note"); }
    set(p);
    if ((p.sex || p.identifiers || p.description) && moreRef.current) moreRef.current.open = true;
    return filled;
  };
  /* Tab stays inside the screen while it is open (WCAG 2.4.3). */
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };

  const now = done ? whereabouts(done.id) : null;
  const sent = now?.at === "sent";
  const doneTitle = sent ? "Sent" : now?.at === "failed" ? "Saved on this phone, not sent yet" : "Saved on this phone";
  const doneBody = sent ? "In your register: a new animal and its case. The server's copy and its audit were checked."
    : now?.at === "failed" ? `It did not go: ${now.error ?? "no answer"}. It stays on this phone under On this phone, with Try again.`
    : done?.route === "send" ? "Sending it to your register now."
    : done?.route === "hold" ? "It is sent when the signal is back. Keep this page open."
    : "Locked with your PIN. Send it from On this phone when you have signal.";

  return (
    <div className="fm-scrim">
      <section ref={box} className="fm-sheet" role="dialog" aria-modal="true" aria-labelledby="fm-rec-h" onKeyDown={trap}>
        <header className="fm-sheet-h">
          <h2 id="fm-rec-h" tabIndex={-1}>Record an animal</h2>
          {count ? <span className="fm-count" aria-label={`${count} recorded on this screen`}>{count} recorded</span> : null}
          <button type="button" className="fm-x" onClick={onClose} aria-label={done ? "Close" : "Close without saving"}><X size={20} /></button>
        </header>
        {done ? (
          <div className="fm-sheet-b fm-done" data-s={sent ? "sent" : now?.at === "failed" ? "failed" : "kept"}>
            <motion.div className="fm-done-i" aria-hidden initial={calm ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={morph}><Swap k={sent ? "sent" : "kept"}>{sent ? <CheckDraw size={32} stroke={2} /> : now?.at === "failed" ? <WifiOff size={28} /> : <CheckDraw size={32} stroke={2} />}</Swap></motion.div>
            <h3 ref={doneRef} tabIndex={-1} className="fm-done-h">{doneTitle}</h3>
            <p className="fm-done-p">{done.label}{place ? ` · ${place}` : ""}. {doneBody}</p>
            <p className="mo-sr" role="status" aria-live="polite">{`${doneTitle}. ${doneBody}`}</p>
            <div className="fm-done-a">
              <button type="button" className="fm-btn is-go is-big" onClick={another}><Camera size={20} aria-hidden />Record another</button>
              <button type="button" className="fm-btn is-big" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div className="fm-sheet-b">
            <div className="fm-q">
              <button type="button" className={`fm-photo ${shot ? "has-shot" : ""}`} onClick={onShoot} aria-label={shot ? "Take the photo again" : "Take a photo of the dog"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {shot ? <><img src={shot} alt="" /><span className="fm-retake" aria-hidden><Camera size={16} />Take it again</span></>
                  : <><span className="fm-photo-i" aria-hidden><Camera size={24} /></span><b>Take a photo</b><small>Optional. The whole dog, from the side if you can.</small></>}
              </button>
              {shot ? <button type="button" className="fm-link fm-start" onClick={onDropShot}>Remove the photo</button> : null}
            </div>

            <div className="fm-q">
              <h3 id="fm-why">Why are you recording it?</h3>
              <div className="fm-chips is-grid" role="radiogroup" aria-labelledby="fm-why" ref={whyRef}>
                {WHY.map((w) => <button key={w.id} type="button" role="radio" aria-checked={chosen && d.category === w.id} className={`fm-chip ${w.urgent ? "is-urgent" : ""}`} onClick={() => { set({ category: w.id }); setChosen(true); setWhyFrom(null); }}><w.icon size={20} aria-hidden />{w.label}</button>)}
              </div>
              {chosen ? <p className="fm-q-note">{why.note}{whyFrom === "last" ? " Chosen as on your last record." : ""}</p> : null}
            </div>

            <div className="fm-q" ref={whereRef}>
              <h3 id="fm-where">Where is it?</h3>
              <div className={`fm-where is-${byHand ? (located ? "found" : "failed") : gps === "refused" ? "failed" : gps}`}>
                <MapPin size={20} aria-hidden />
                <span className="fm-where-t" role="status" aria-live="polite">
                  {byHand ? <><b>{located ? "Location typed in" : "Type the location"}</b><small>{located ? `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : "Two numbers, as a map app shows them"}</small></>
                    : gps === "found" ? <><b>{place || "Location found"}</b><small>{d.accuracy !== null ? `Found by this phone, within about ${Math.round(d.accuracy)} m` : "Found by this phone"}</small></>
                    : gps === "finding" ? <><b>Finding where you are…</b><small>{slow ? "Still looking. Step into the open, or type it." : "Keep the phone still for a moment."}</small></>
                    : gps === "refused" ? <><b>Location is off for this site</b><small>Allow location in the browser and try again, or type it.</small></>
                    : <><b>The phone could not find itself</b><small>Try again in the open, or type it.</small></>}
                </span>
                <span className="fm-where-a">
                  {byHand ? <button type="button" className="fm-btn is-sm" onClick={usePhone}><MapPin size={16} aria-hidden />Use this phone</button>
                    : <>{gps !== "finding" ? <button type="button" className="fm-btn is-sm" onClick={locate}>{gps === "found" ? "Find again" : "Try again"}</button> : null}<button type="button" className={`fm-btn is-sm ${gps === "refused" || gps === "failed" || slow ? "is-go" : ""}`} onClick={typeIt}>Type it</button></>}
                  {!byHand && !showPlace ? <button type="button" className="fm-btn is-sm" onClick={() => setEditPlace(true)} aria-label={`Change the area or city${place ? `, now ${place}` : ""}`}><PenLine size={16} aria-hidden />Change area</button> : null}
                </span>
              </div>
              {byHand ? <>
                <div className="fm-two is-pair">
                  <F label="Latitude"><input inputMode="decimal" autoComplete="off" value={latText} onChange={(e) => { setLatText(e.target.value); typed(e.target.value, lngText); }} /></F>
                  <F label="Longitude"><input inputMode="decimal" autoComplete="off" value={lngText} onChange={(e) => { setLngText(e.target.value); typed(latText, e.target.value); }} /></F>
                </div>
                <p className="fm-hint">In a map app, press and hold the place: it shows these two numbers.</p>
              </> : null}
              {showPlace || byHand ? <>
                <div className="fm-two">
                  <F label="Area or street (optional)"><input value={d.zone} maxLength={120} onChange={(e) => { typedPlace.current.zone = true; set({ zone: e.target.value }); }} autoComplete="off" /></F>
                  <F label="City"><input ref={cityRef} value={d.city} maxLength={120} onChange={(e) => { typedPlace.current.city = true; set({ city: e.target.value }); }} autoComplete="off" /></F>
                </div>
              </> : placeFrom ? <p className="fm-hint">{placeFrom === "phone" ? "Named from the location. Change area if it is wrong." : "The area of your last record. Change area if you have moved."}</p> : null}
            </div>

            <SayIt onRead={sayIt} placeholder="Or say it: brown female limping by the temple" />

            <details className="fm-more" ref={moreRef}>
              <summary><span><b>More about the dog</b><small>{details || "Optional: sex, name, marks, a note"}</small></span><ChevronDown size={20} aria-hidden /></summary>
              <div>
                <div className="nx-field"><span id="fm-sex">Sex</span><div className="fm-seg" role="radiogroup" aria-labelledby="fm-sex">{SEX.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={d.sex === v} onClick={() => set({ sex: d.sex === v ? "" : v })}>{l}</button>)}</div></div>
                <F label="Name or tag, if it has one"><input value={d.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></F>
                <F label="Marks that tell it apart"><input value={d.identifiers} maxLength={500} onChange={(e) => set({ identifiers: e.target.value })} autoComplete="off" /></F>
                {known.length ? <div className="fm-q">
                  <F label="Seen this dog before?"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your register" autoComplete="off" /></F>
                  {matches.length ? <div className="fm-pick">{matches.map((a) => <button key={a.id} type="button" onClick={() => { set({ existingDogId: a.id, name: a.name ?? "", code: a.code ?? a.straypaw_id ?? "" }); setSearch(""); }}><b><Search size={16} aria-hidden />{animalLine(a)}</b>{a.identifiers || a.code ? <small>{a.identifiers || a.code}</small> : null}</button>)}</div> : null}
                  {d.existingDogId ? <p className="fm-ok" role="status"><Tick size={16} aria-hidden />Added to this dog&apos;s history. <button type="button" className="fm-link" onClick={() => set({ existingDogId: undefined, code: "" })}>Undo</button></p> : null}
                </div> : null}
                <F label="Anything to add?"><textarea value={d.description} maxLength={3000} rows={3} onChange={(e) => set({ description: e.target.value })} /></F>
              </div>
            </details>
          </div>
        )}
        {done ? null : <footer className="fm-sheet-f">
          {error ? <p className="fm-err" role="alert">{error}</p> : null}
          <p className={`fm-note ${tried && need ? "is-bad" : ""}`} aria-live="polite">{need ?? <>{place ? <b>{place}. </b> : null}{goes}</>}</p>
          <ResultButton type="button" className="fm-btn is-go is-wide is-big fm-send" state={res.state} busy="Saving…" done="Saved on this phone" onClick={() => void save()}>{route === "keep" ? "Save on this phone" : "Send"}</ResultButton>
        </footer>}
      </section>
    </div>
  );
}

/* ── Sample: the same round, every action opening the live demo ──── */
function SampleField() {
  const due = [
    { id: "s1", t: "Recovery check · Black and white puppy", when: "Due today", place: ["CASE-0241", "Indiranagar"], late: false },
    { id: "s2", t: "Day 7 observation · Tan female", when: "Due 12 Nov", place: ["CASE-0214", "Ward 08"], late: true },
  ];
  const go = (quiet: boolean, children: ReactNode, cls = "") => <Link href={TRY.href} title={TRY.title} className={`fm-btn ${quiet ? "" : "is-go"} ${cls}`}>{children}</Link>;
  return (
    <Shell crumb={["Operations", "Field mode"]}>
      <div className="fm">
        <header className="fm-head">
          <p className="fm-eyebrow">Sample round<Sample /></p>
          <h1>Your round</h1>
          <p className="fm-sum"><b className="num">4 stops</b> · <b className="num is-late">1 late</b></p>
          <span className="fm-net" data-s="online"><i aria-hidden />Online</span>
          {go(false, <><Camera size={18} aria-hidden />Record an animal</>, "fm-record")}
        </header>
        <section className="fm-sec" aria-labelledby="fm-due"><div className="fm-sec-h"><h2 id="fm-due">Follow-ups due</h2><span className="fm-count">2</span></div>
          <ol className="fm-list">{due.map((x) => <li key={x.id} className="fm-stop"><div className="fm-stop-t"><b>{x.t}</b><span className="fm-meta">{x.late ? <span className="fm-tag is-late">Late</span> : null}<span>{x.when}</span>{x.place.map((p) => <span key={p}>{p}</span>)}</span></div><div className="fm-acts">{go(true, <><Tick size={16} aria-hidden />Done</>)}{go(true, "Missed")}</div></li>)}</ol></section>
        <section className="fm-sec" aria-labelledby="fm-mine"><div className="fm-sec-h"><h2 id="fm-mine">Your cases</h2><span className="fm-count">2</span></div>
          <ol className="fm-list">{[["Road accident", "CASE-0278", "Ward 12"], ["Limping grey dog, old injury", "CASE-0236", "Ward 12"]].map(([t, code, ward]) => <li key={t} className="fm-stop"><div className="fm-stop-t"><b>{t}</b><span className="fm-meta"><span className="fm-tag">Open</span><span>{code}</span><span>{ward}</span></span></div><div className="fm-acts">{go(true, <><Play size={16} aria-hidden />Start</>)}{go(true, <><Plus size={16} aria-hidden />Record</>)}</div></li>)}</ol></section>
        <p className="fm-hint">Offline, records are kept on the phone, locked with a PIN, and sent when there is signal.</p>
      </div>
    </Shell>
  );
}
