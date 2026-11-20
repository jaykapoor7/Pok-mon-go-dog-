"use client";

/* The field home: a field worker's day, with Kaju (the Field Team's home, src/nx/nav.ts isFieldTeam; field mode for
   everyone else). Four things, top to bottom: who and when, with the connection; Kaju, where the worker says what they
   are doing ("I'm about to start vaccinations") and Kaju answers from their own records and opens the screen that does
   it (src/nx/data/fieldKaju.ts; anything else goes to Kaju itself); three shortcuts; their work, one short list whose
   rows open the tools a case already had (note, photo or proof, vaccination, care or movement) or mark a follow-up.
   The record screen is one sheet: a photo, why, where, optional details, one Save. /ngo/field?record=1 opens it.

   Records are saved on this phone first, encrypted with a key kept on this device (no PIN, the owner's choice, 20 Nov
   2026), and send by themselves whenever there is signal: straight away online, or when the signal is back. Sending is
   idempotent: every record carries its own request id (src/lib/field), so sending twice never saves twice, and nothing
   is called sent until the server's copy and its audit row are checked. "On this phone" lists what is waiting, what
   was sent and what failed, with a way to correct each failure. Records kept with the earlier PIN are brought across
   once, with that PIN. The styles are src/nx/field.css (fm-) and src/nx/css/fieldhome.css (fh-). */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, CalendarClock, Camera, Check as Tick, ChevronDown, ChevronRight, ClipboardList, FileCheck2, HeartPulse, LifeBuoy, ListChecks, Loader2, Lock, MapPin, PawPrint, PenLine, Play, Plus, Route, Scissors, Search, Syringe, Trash2, Users, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Confirm, Field as F, day, dayTime, errText, toast, useAct, words } from "../../kit";
import { useLive, type Workspace } from "../../live";
import { useKaju } from "../../kaju/state";
import { Reply } from "../../AtKaju";
import { isFieldTeam } from "../../nav";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { compressForUpload } from "@/lib/photo/compress";
import { EVIDENCE_LABEL, caseChecklist, type Checklist, type EvidenceKind } from "@/lib/abc";
import { orgCampaigns } from "@/lib/campaigns";
import type { IntakeData, LifecycleData, OperationKind, WorkflowPolicy } from "@/lib/operations";
import { archiveDraft, deleteDraft, fieldCache, keptCount, moveRecords, offlineVaultExists, openDevice, putDraft, readDrafts, readSynced, unlockOffline, type FieldDraft, type SyncedFieldRecord, type VaccinationData } from "@/lib/field/outbox";
import { submitFieldDraft } from "@/lib/field/sync";
import { backToAssigned, ensureVolunteer, isoDay, setFollowup, shortCode, startWork, type Actor } from "../../data/ngo";
import { answerField, daySummary, quickAsks, type Act, type Answer, type Drive, type Go, type Stop, type World } from "../../data/fieldKaju";
import { LifecycleForm, TRY, undoWith } from "./parts";
import { animalLine, animalName, animalSearch } from "@/nx/animalLabel";
import { SayIt } from "../../KajuCapture";
import { readField } from "../../data/capture";
import "../../css/ngo-records.css";
import "../../field.css";
import "../../css/fieldhome.css";

type KnownAnimal = { id: string; name: string | null; code: string | null; straypaw_id: string | null; identifiers: string | null };
/** What the home reads beside the round: the animals' recorded status, the organisation's drives and each ABC case's
    evidence checklist. Each may be missing (null) when it could not be read; it is then never shown as empty. */
type Extras = { status: Record<string, { vacc: boolean | null; ster: boolean | null }> | null; drives: Drive[] | null; checklists: Record<string, Checklist> };
type Cached = { cases: OpenCase[]; fus: DueFollowup[]; assignedIds: string[]; known?: KnownAnimal[]; policies?: WorkflowPolicy[]; extras?: Extras };
/** Where a record goes from this screen: straight to the register, or kept on this phone until there is signal. */
type Route2 = "send" | "hold";
type Crumb = [string, string?];
type Preset = { key: string; tool?: Tool; evidence?: EvidenceKind; op?: OperationKind; n: number };
type Capture = { category?: IntakeData["category"]; say?: string };
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ext = (t: string) => (t === "application/pdf" ? "pdf" : t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg");
const today = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const isAbc = (c: OpenCase) => /steril|\babc\b/i.test(`${c.condition_class ?? ""} ${c.title ?? ""}`);
const status = (v: string | null | undefined) => (v === "vaccinated" || v === "sterilised" ? true : v === "not_vaccinated" || v === "not_sterilised" ? false : null);
/** A failure of the connection, not a refusal: the record waits and is tried again, never marked as failed. */
const isNetwork = (e: unknown) => e instanceof TypeError || /failed to fetch|fetch failed|networkerror|network request|load failed|timed? ?out|aborted|offline|ERR_INTERNET|ERR_NETWORK/i.test(errText(e));
const scrollTo = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
/** The record type a Kaju action opens: always a field the form already has. */
const QUICK_ICON = { vacc: Syringe, release: MapPin, followup: CalendarClock, ster: Scissors, status: ListChecks } as const;

export function Field() {
  const live = useLive();
  const crumb: Crumb = isFieldTeam(live.orgFor("ngo")) ? ["My day"] : ["Operations", "Field mode"];
  if (!live.ready) return <Shell crumb={crumb}><div className="fm fh"><p className="fm-quiet">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (!live.org) return <SampleField />;
  if (!org || !live.userId) return <Shell crumb={crumb}><div className="fm fh"><header className="fh-head"><h1>Field mode</h1><p className="fm-sum">{live.org.name} is not an NGO workspace, so it has no field round.</p></header></div></Shell>;
  return <LiveField org={org} actor={{ id: live.userId, name: live.userName ?? "Team member" }} crumb={crumb} />;
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

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => { const s = () => setOnline(navigator.onLine); s(); window.addEventListener("online", s); window.addEventListener("offline", s); return () => { window.removeEventListener("online", s); window.removeEventListener("offline", s); }; }, []);
  return online;
}

type Head = (waiting: number, sum: ReactNode) => ReactNode;

/* Who and when, and the connection: a quiet pill that says what happens to a record now. */
function useHead(org: { name: string }, first: string | null, online: boolean, sample?: boolean): Head {
  const [open, setOpen] = useState(false);
  const ready = useWarmShell();
  return function head(waiting, sum) {
    return <>
      <header className="fh-head">
        <p className="fm-eyebrow" suppressHydrationWarning>{today()} · {org.name}{sample ? <Sample /> : null}</p>
        <button type="button" className="fm-net" data-s={online ? "online" : "nosignal"} aria-expanded={open} aria-controls="fm-netp" onClick={() => setOpen((v) => !v)}><i aria-hidden />{online ? "Online" : "No signal"}{waiting ? <span className="fm-tag is-wait">{waiting} to send</span> : null}</button>
        <h1 suppressHydrationWarning>{greeting()}{first ? `, ${first}` : ""}</h1>
        <p className="fm-sum" aria-live="polite">{sum}</p>
      </header>
      {open ? <div id="fm-netp" className="fm-netp" role="group" aria-label="Connection">
        <p>{online ? "What you record is saved on this phone first and sends straight away." : "No signal right now. What you record stays on this phone and sends by itself when StrayPaw is open with signal again."}</p>
        {ready ? <p className="fm-quiet">This phone is ready to work without signal.</p> : null}
      </div> : null}
    </>;
  };
}

function LiveField({ org, actor, crumb }: { org: Workspace; actor: Actor; crumb: Crumb }) {
  const base = `${actor.id}:${org.org_id}`;
  const [scope, setScope] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const online = useOnline();
  const first = actor.name && actor.name !== "Team member" ? actor.name.split(/\s+/)[0] : null;
  const head = useHead(org, first, online);
  /* This phone's field storage opens without a PIN. Signing out clears keys from memory; it opens again on return. */
  useEffect(() => {
    let live = true;
    const begin = () => void openDevice(base).then((s) => { if (live) { setScope(s); setStorageError(null); } }, () => { if (live) setStorageError("This browser cannot keep field records. Use the case pages while you have signal."); });
    begin();
    const again = () => { if (live) { setScope(null); begin(); } };
    window.addEventListener("straypaw-offline-locked", again);
    return () => { live = false; window.removeEventListener("straypaw-offline-locked", again); };
  }, [base]);
  return <Shell crumb={crumb}>{scope ? <Round key={scope} org={org} actor={actor} scope={scope} base={base} online={online} head={head} storageError={storageError} setStorageError={setStorageError} /> : <div className="fm fh">{head(0, storageError ?? "Getting this phone ready…")}</div>}</Shell>;
}

/* Records kept before this update are locked with the earlier PIN. Entered once, they move to this phone's field
   storage and send by themselves. Survey observations stay with their survey, which still asks for the PIN. */
function OlderRecords({ base, device, onMoved }: { base: string; device: string; onMoved: (n: number) => void }) {
  const [pin, setPin] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  return (
    <section className="fh-legacy" aria-labelledby="fh-legacy-h">
      <span className="fm-lock" aria-hidden><Lock size={20} /></span>
      <div>
        <h2 id="fh-legacy-h">Older records are locked</h2>
        <p>Some records on this phone were saved before this update, with your old PIN. Enter it once and they send by themselves.</p>
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setError(null);
          try { await unlockOffline(base, pin); const n = await moveRecords(base, device, (d) => !d.survey); setPin(""); onMoved(n); }
          catch (x) { setError(x instanceof Error && /did not unlock|decrypt|operation/i.test(x.message) ? "That PIN is not right. Nothing was removed." : errText(x)); }
          finally { setBusy(false); }
        }}>
          <label className="nx-field"><span>Old PIN</span><input type="password" inputMode="numeric" autoComplete="current-password" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))} /></label>
          <button className="fm-btn is-go" disabled={busy || pin.length < 6}>{busy ? "Unlocking…" : "Unlock"}</button>
        </form>
        {error ? <p role="alert" className="fm-err">{error}</p> : null}
      </div>
    </section>
  );
}

/** The home's reads beside the round. Each part fails on its own and is then left unread, never empty. */
async function readExtras(mine: OpenCase[]): Promise<Extras> {
  const db = getSupabase(); if (!db) throw new Error("Workspace unavailable");
  const dogIds = [...new Set(mine.map((c) => c.dog_id).filter(Boolean))] as string[];
  const abc = mine.filter(isAbc).slice(0, 12).map((c) => c.id);
  const [st, drives, ...cls] = await Promise.all([
    dogIds.length ? db.from("dogs").select("id,vaccination_status,sterilisation_status").in("id", dogIds).then((r) => (r.error ? null : (r.data ?? []) as { id: string; vaccination_status: string | null; sterilisation_status: string | null }[])) : Promise.resolve([]),
    orgCampaigns(false).then((d) => d.filter((x) => !x.archived) as Drive[], () => null),
    ...abc.map((id) => caseChecklist(id).then((c) => [id, c] as const, () => [id, null] as const)),
  ]);
  return {
    status: st ? Object.fromEntries(st.map((d) => [d.id, { vacc: status(d.vaccination_status), ster: status(d.sterilisation_status) }])) : null,
    drives,
    checklists: Object.fromEntries(cls.filter((x): x is readonly [string, Checklist] => !!x[1])),
  };
}

function Round({ org, actor, scope, base, online, head, storageError, setStorageError }: { org: Workspace; actor: Actor; scope: string; base: string; online: boolean; head: Head; storageError: string | null; setStorageError: (s: string | null) => void }) {
  const [cases, setCases] = useState<OpenCase[] | null>(null);
  const [fus, setFus] = useState<DueFollowup[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [known, setKnown] = useState<KnownAnimal[]>([]);
  const [extras, setExtras] = useState<Extras>({ status: null, drives: null, checklists: {} });
  /* An animal is named the way the register names it: "Tiger (132)" or "Dog 128", never "Unnamed". */
  const dogLine = useCallback((id: string | null, name: string | null) => { const k = id ? known.find((a) => a.id === id) : undefined; return k ? animalLine(k) : animalName(name); }, [known]);
  const [policies, setPolicies] = useState<WorkflowPolicy[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [synced, setSynced] = useState<SyncedFieldRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<null | { title: string; body: string; confirm: string; danger?: boolean; go: () => Promise<void> }>(null);
  const [vaccDefaults, setVaccDefaults] = useState<Pick<VaccinationData, "vaccine" | "batch" | "performedBy"> | undefined>();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [all, setAll] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const k = useKaju();
  const lock = useRef(false);
  const { busy, run } = useAct();
  /* /ngo/field?record=1 (from Today, Operations or the command bar, even while field mode is open) opens the record
     screen once; the address then drops it, so a reload or Back does not open it again. */
  const wantRecord = useSearchParams().get("record") === "1";
  useEffect(() => {
    if (!wantRecord) return;
    setCapture({});
    try { const u = new URL(window.location.href); u.searchParams.delete("record"); window.history.replaceState(null, "", u); } catch { /* the address stays as it was */ }
  }, [wantRecord]);

  const fromCache = useCallback(async () => {
    const c = await fieldCache<Cached>(scope).catch(() => undefined);
    setCases(c?.value.cases ?? null); setFus(c?.value.fus ?? []); setAssigned(c?.value.assignedIds ?? []); setKnown(c?.value.known ?? []); setPolicies(c?.value.policies ?? []); setCachedAt(c?.at ?? null);
    if (c?.value.extras) setExtras(c.value.extras);
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
      const x = await readExtras(c.filter((y) => ids.includes(y.id) && y.provenance !== "imported_historical_record")).catch((): Extras => ({ status: null, drives: null, checklists: {} }));
      setCases(c); setFus(f); setAssigned(ids); setKnown((k.data ?? []) as KnownAnimal[]); setPolicies((p.data ?? []) as WorkflowPolicy[]); setExtras(x); setCachedAt(null);
      await fieldCache<Cached>(scope, { cases: c, fus: f, assignedIds: ids, known: (k.data ?? []) as KnownAnimal[], policies: (p.data ?? []) as WorkflowPolicy[], extras: x }).catch(() => setStorageError("Your work could not be kept on this phone. Keep this page open if you lose signal."));
    } catch { setFailed(true); await fromCache(); }
  }, [scope, org.org_id, actor.id, fromCache, setStorageError]);
  const readBox = useCallback(async () => { try { setDrafts(await readDrafts(scope)); setSynced(await readSynced(scope)); } catch { setStorageError("The records on this phone could not be read. Nothing was discarded; reload the page."); } }, [scope, setStorageError]);
  useEffect(() => { void load(); void readBox(); void fieldCache<Pick<VaccinationData, "vaccine" | "batch" | "performedBy">>(`vaccination-settings:${scope}`).then((c) => setVaccDefaults(c?.value)).catch(() => {}); }, [load, readBox, scope]);
  /* Records kept with the earlier PIN are offered once, until they have been brought across. */
  useEffect(() => {
    let live = true;
    try { if (localStorage.getItem(`sp.field.moved:${base}`)) return; } catch { /* asked again next time */ }
    void offlineVaultExists(base).then((v) => (v ? keptCount(base) : 0)).then((n) => { if (live) setLegacy(n > 0); }, () => {});
    return () => { live = false; };
  }, [base]);

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

  /* Send in order: intakes first (later records on a new animal need its case), then oldest first. Each is idempotent.
     A lost connection is not a refusal: the record stays waiting and is tried again, without anyone pressing Send. */
  const tried = useRef(new Set<string>()), held = useRef(new Set<string>());
  const send = useCallback(async (only?: string[]) => {
    if (lock.current) return; lock.current = true; setSyncing(true);
    let sent = 0, bad = 0;
    try {
      const queued = (await readDrafts(scope)).filter((d) => !only || only.includes(d.id)).sort((a, b) => Number(!!b.intake) - Number(!!a.intake) || Date.parse(a.at) - Date.parse(b.at));
      // An intake opens a case assigned to this person, which needs their volunteer row; someone whose first record is
      // made in the field has none yet, and the server would refuse the case.
      if (queued.some((d) => d.intake)) await ensureVolunteer(actor);
      for (const d of queued) {
        try { const saved = await submitFieldDraft(d, actor.id, org.org_id); await archiveDraft(d, { id: d.id, scope, at: saved.confirmedAt, caseId: saved.caseId, dogId: saved.dogId, auditId: saved.audit_id, label: d.note.slice(0, 120) }); held.current.delete(d.id); sent++; }
        catch (e) { if (isNetwork(e)) { held.current.add(d.id); continue; } bad++; await putDraft({ ...d, status: "failed", error: errText(e) }).catch(() => {}); }
      }
      if (sent) toast({ text: `${sent} ${sent === 1 ? "record" : "records"} sent and checked.`, tone: "ok" });
      if (bad) toast({ text: `${bad} ${bad === 1 ? "record" : "records"} did not go. ${bad === 1 ? "It stays" : "They stay"} on this phone with the reason.`, tone: "bad" });
      if (sent) await load();
    } catch (e) { if (isNetwork(e)) (only ?? []).forEach((id) => held.current.add(id)); else setStorageError(`${errText(e)} The records stay on this phone.`); }
    finally { lock.current = false; setSyncing(false); await readBox(); }
  }, [scope, actor, org.org_id, load, readBox, setStorageError]);
  /* Signal back: everything waiting goes again. The pass below then sends it. */
  useEffect(() => { if (online) { held.current.forEach((id) => tried.current.delete(id)); held.current.clear(); } }, [online]);
  /* Whenever there is signal, a waiting record is sent by itself, once; one the server refused waits for a person, so a
     refusal never loops. */
  useEffect(() => {
    if (!online || syncing) return;
    const fresh = drafts.filter((d) => d.status === "pending" && !tried.current.has(d.id));
    if (!fresh.length) return;
    fresh.forEach((d) => tried.current.add(d.id));
    void send(fresh.map((d) => d.id));
  }, [online, syncing, drafts, send]);
  /* The phone may say it is online while nothing gets through: records held by the connection are tried again. */
  useEffect(() => {
    if (!online) return;
    const t = window.setInterval(() => { if (held.current.size && !lock.current) { const ids = [...held.current]; held.current.clear(); void send(ids); } }, 30_000);
    return () => window.clearInterval(t);
  }, [online, send]);

  const route: Route2 = online ? "send" : "hold";
  const waiting = drafts.length;
  const fu = (f: DueFollowup, s: "done" | "missed") => run(`f${f.id}`, () => setFollowup(f.id, s), { ok: s === "done" ? "Follow-up marked done." : "Follow-up marked missed.", undo: () => undoWith(() => setFollowup(f.id, "upcoming"), async () => { setDone((m) => { const x = { ...m }; delete x[`f${f.id}`]; return x; }); await load(); }, "Follow-up reopened.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`f${f.id}`]: s === "done" ? "Done" : "Missed" })); });
  const start = (c: OpenCase) => run(`s${c.id}`, () => startWork(c.id, actor), { ok: "Marked in progress.", undo: () => undoWith(() => backToAssigned(c.id, actor), async () => { setDone((m) => { const x = { ...m }; delete x[`s${c.id}`]; return x; }); await load(); }, "Back to assigned.")() }).then((r) => { if (r.ok) setDone((m) => ({ ...m, [`s${c.id}`]: "Started" })); });

  /* The day as Kaju reads it: the same stops the list shows, in the same order. */
  const world: World = useMemo(() => {
    const st = extras.status;
    const stops: Stop[] = [
      ...myFus.map((f): Stop => ({ key: `f:${f.id}`, kind: "followup", caseId: f.case_id, title: words(f.kind, "Recheck"), animal: dogLine(f.dog_id, f.animal_name), dogId: f.dog_id, place: f.zone, due: f.due_at, late: Date.parse(f.due_at) < Date.now() })),
      ...mine.map((c): Stop => {
        const cl = extras.checklists[c.id];
        return { key: `c:${c.id}`, kind: "case", caseId: c.id, title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Case", animal: c.dog_id ? dogLine(c.dog_id, c.animal_name) : null, dogId: c.dog_id, place: c.zone,
          started: c.status_class === "in_progress" || done[`s${c.id}`] === "Started",
          vaccinated: c.dog_id ? (st ? st[c.dog_id]?.vacc ?? null : undefined) : undefined, sterilised: c.dog_id ? (st ? st[c.dog_id]?.ster ?? null : undefined) : undefined,
          abc: cl ? { missing: cl.missing, required: cl.required ?? [], vetOk: cl.vet_authorised, reviewed: cl.evidence_reviewed } : null };
      }),
    ];
    return { stops, drives: extras.drives, waiting: drafts.filter((d) => d.status !== "failed").length, failed: drafts.filter((d) => d.status === "failed").length, sentToday: synced.filter((x) => x.at.slice(0, 10) === localDay()).map((x) => x.label), today: localDay(), online };
  }, [myFus, mine, extras, drafts, synced, online, done, dogLine]);

  /* Kaju: field work is answered here from the records above, and keeps up with them as they change; anything else is
     asked of Kaju itself. Without signal, Kaju itself cannot be reached, so the answer says what can be done here. */
  const tell = (text: string) => {
    const t = text.trim(); if (!t) return;
    const local = answerField(t, world) !== null || !online;
    setSaid({ text: t, local, from: k.turns.length });
    if (!local) void k.ask(t);
  };
  const answer = said?.local ? answerField(said.text, world) ?? offline(world) : null;
  const go = (g: Go) => {
    if (g.to === "record") setCapture({ category: g.category, say: g.say });
    else if (g.to === "phone") scrollTo("fm-phone");
    else if (g.to === "stop") {
      if (world.stops.findIndex((s) => s.key === g.key) >= LIMIT) setAll(true);
      setOpenKey(g.key); setPreset({ key: g.key, tool: g.tool, evidence: g.evidence, op: g.op, n: Date.now() }); scrollTo(`stop-${g.key}`);
    }
  };
  const quick = quickAsks(world);
  const sum = cases === null ? (failed ? "Your work could not be read." : "Reading your day…") : daySummary(world);
  const chip = (s: Stop) => chipOf(s, done);
  const caseOf = (key: string) => mine.find((c) => `c:${c.id}` === key);
  const fuOf = (key: string) => myFus.find((f) => `f:${f.id}` === key);
  const shown = all ? world.stops : world.stops.slice(0, LIMIT);

  return (
    <div className="fm fh">
      {head(waiting, sum)}
      <FieldKaju said={said} answer={answer} online={online} onTell={tell} onClear={() => setSaid(null)} act={(a) => <ActButton key={a.label} a={a} go={go} />} />
      <div className="fh-quick" role="group" aria-label="Quick actions">
        <button type="button" className="fh-tile fh-record" onClick={() => setCapture({})}><Camera size={24} aria-hidden /><span>Record an animal</span></button>
        {quick.map((q) => { const I = QUICK_ICON[q.icon]; return <button key={q.label} type="button" className="fh-tile" onClick={() => tell(q.say)}><I size={24} aria-hidden /><span>{q.label}</span></button>; })}
      </div>
      {capture ? <RecordSheet known={known} route={route} initial={capture} onSave={intake} onClose={() => setCapture(null)} /> : null}
      {storageError ? <p className="fm-err" role="alert">{storageError}</p> : null}
      {cachedAt ? <p className="fm-hint" role="status">Showing your work as it was at {dayTime(cachedAt)}. It may have changed since; sending checks your current access.</p> : null}
      {failed ? <div className="fm-err" role="alert">Records you make are still kept on this phone. <button type="button" className="fm-link" onClick={() => void load()}>Read your work again</button></div> : null}
      {legacy ? <OlderRecords base={base} device={scope} onMoved={(n) => { setLegacy(false); try { localStorage.setItem(`sp.field.moved:${base}`, "1"); } catch { /* asked again next time */ } toast({ text: n ? `${plural(n, "older record", "older records")} unlocked. ${online ? "Sending now." : "They send when there is signal."}` : "No older field records were waiting.", tone: "ok" }); void readBox(); }} /> : null}

      <section className="fh-work" aria-labelledby="fh-work-h">
        <div className="fm-sec-h"><h2 id="fh-work-h">Your work</h2>{world.stops.length ? <span className="fm-count">{world.stops.length}</span> : null}<Link className="fh-more" href="/ngo/cases?view=mine">My cases<ChevronRight size={16} aria-hidden /></Link></div>
        {cases === null && !failed ? <div className="fh-skel" aria-hidden><i /><i /></div> : null}
        {shown.length ? <ul className="fh-list">{shown.map((s) => {
          const toggle = () => { setOpenKey((o) => (o === s.key ? null : s.key)); setPreset(null); };
          if (s.kind === "followup") { const f = fuOf(s.key)!; return <FollowStop key={s.key} s={s} f={f} chip={chip(s)} open={openKey === s.key} onToggle={toggle} done={done[`f${f.id}`]} online={online} busy={!!busy} onMark={(m) => void fu(f, m)} />; }
          const c = caseOf(s.key)!;
          return <CaseStop key={s.key} s={s} c={c} chip={chip(s)} open={openKey === s.key} onToggle={toggle} preset={preset?.key === s.key ? preset : null} online={online} started={!!s.started} busy={!!busy} drafted={drafts.filter((d) => d.caseId === c.id).length} onStart={() => void start(c)}
            onNote={(t) => note(c, t)} onEvidence={(k, f, l) => evidence(c, k, f, l)} onVaccination={(v) => vaccination(c, v)} vaccDefaults={vaccDefaults} policies={policies} onOperation={(k, d, p, r) => operation(c.id, c.case_code, k, d, p, r)} route={route} />;
        })}</ul> : null}
        {world.stops.length > LIMIT ? <button type="button" className="fh-all" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${world.stops.length}`}</button> : null}
        {cases !== null && !failed && !world.stops.length ? <div className="fm-empty"><p>Nothing is assigned to you right now. Cases you take show here.</p><Link className="fm-btn" href={unowned ? "/ngo/cases?view=unassigned" : "/ngo/cases"}>{unowned ? `See ${plural(unowned, "unassigned case", "unassigned cases")}` : "Open the cases"}</Link></div> : null}
      </section>

      {waiting || synced.length ? <section className="fm-sec" aria-labelledby="fm-phone-h" id="fm-phone">
        <div className="fm-sec-h"><h2 id="fm-phone-h">On this phone</h2>{waiting ? <span className="fm-count">{plural(waiting, "record", "records")} not sent yet</span> : null}
          {waiting ? <button type="button" className={`fm-btn is-sm ${online ? "is-go" : ""}`} disabled={!online || syncing} onClick={() => { held.current.clear(); void send(); }}>{syncing ? "Sending…" : online ? "Send now" : "Sends when there's signal"}</button> : null}</div>
        {waiting ? <div className="fm-list">{drafts.map((d) => <Draft key={d.id} d={d} online={online} syncing={syncing} policies={policies} onSend={() => void send([d.id])} onChanged={readBox}
          onRemove={() => setAsk({ title: "Remove this copy from the phone?", body: d.status === "failed" ? "It was not confirmed by the server. Removing it loses what it holds unless you have copied it." : "It has not been sent. Removing it loses what it holds.", confirm: "Remove it", danger: true, go: async () => { await deleteDraft(d.id); await readBox(); } })}
          onReplace={async (text) => { await keep({ ...d, id: uuid(), note: text, status: "pending", error: undefined }); await deleteDraft(d.id); await readBox(); }}
          onOperation={(k, data, p, r) => operation(d.caseId, d.code, k, data, p, r, d.id)} />)}</div> : null}
        {synced.length ? <details className="fm-sent"><summary>Sent from this phone · {synced.length}<ChevronDown size={16} aria-hidden /></summary><ul>{[...synced].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 30).map((x) => <li key={x.id}><span><Link className="fm-link" href={`/ngo/cases/${x.caseId}`}>{x.label}</Link><small title={`Receipt ${x.auditId}`}>Sent and checked {dayTime(x.at)}</small></span><span className="fm-dot" data-s="sent" aria-label="Sent" /></li>)}</ul></details> : null}
      </section> : null}

      <Places />
      {ask ? <Confirm title={ask.title} confirm={ask.confirm} danger={ask.danger} onClose={() => setAsk(null)} onConfirm={() => void ask.go().then(() => setAsk(null)).catch((e) => { setStorageError(errText(e)); setAsk(null); })}><p>{ask.body}</p></Confirm> : null}
    </div>
  );
}

const LIMIT = 4;
type Chip = { text: string; cls: string };
/** One status per row, from the records: late or due for a follow-up; for an ABC case, where its evidence stands. */
function chipOf(s: Stop, done: Record<string, string>): Chip {
  if (s.kind === "followup") {
    const d = done[`f${s.key.slice(2)}`]; if (d) return { text: d, cls: "is-ok" };
    return s.late ? { text: "Late", cls: "is-late" } : s.due && s.due.slice(0, 10) === localDay() ? { text: "Today", cls: "is-on" } : { text: s.due ? `Due ${new Date(s.due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Due", cls: "" };
  }
  if (s.abc) return s.abc.missing.length ? { text: `${s.abc.missing.length} to add`, cls: "is-wait" } : !s.abc.vetOk ? { text: "With the vet", cls: "" } : !s.abc.reviewed ? { text: "In review", cls: "" } : { text: "Reviewed", cls: "is-ok" };
  return s.started ? { text: "Started", cls: "is-on" } : { text: "Open", cls: "" };
}

/* ── Kaju ─────────────────────────────────────────────────────────── */

type Said = { text: string; local: boolean; from: number };
function offline(w: World): Answer {
  const h = answerField("what can you do", w)!;
  return { ...h, text: `Kaju can't be reached without signal, so I can only help with your own work on this phone. ${h.text}` };
}

function ActButton({ a, go, sample }: { a: Act; go: (g: Go) => void; sample?: boolean }) {
  const cls = `fm-btn ${a.primary ? "is-go" : ""}`;
  if (sample) return <Link className={cls} href={TRY.href} title={TRY.title}>{a.label}</Link>;
  if (a.go.to === "href") return <Link className={cls} href={a.go.href}>{a.label}<ArrowUpRight size={16} aria-hidden /></Link>;
  const g = a.go;
  return <button type="button" className={cls} onClick={() => go(g)}>{a.label}</button>;
}

/** Kaju, first on the page: one box to say what you are doing, and the answer under it. */
function FieldKaju({ said, answer, online, onTell, onClear, act }: { said: Said | null; answer: Answer | null; online: boolean; onTell: (t: string) => void; onClear: () => void; act: (a: Act) => ReactNode }) {
  const k = useKaju();
  const live = useLive();
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null), out = useRef<HTMLDivElement>(null);
  /* The exchange this box started: its question and Kaju's turn straight after it. */
  let turn: (typeof k.turns)[number] | undefined;
  if (said && !said.local) for (let i = k.turns.length - 1; i >= Math.max(0, said.from - 2); i--) { const t = k.turns[i]; if (t.role === "user" && t.text === said.text) { turn = k.turns[i + 1]; break; } }
  const send = () => { const t = text.trim(); if (!t || k.busy) return; setText(""); onTell(t); };
  /* The answer arrives under the box; on a phone with the keyboard up it may be off screen, so bring it into view. */
  const at = said ? `${said.text}${said.from}` : "";
  useEffect(() => { if (!at || !out.current) return; const r = out.current.getBoundingClientRect(); if (r.top > window.innerHeight - 120) out.current.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [at]);
  return (
    <section className={`fh-kaju ${said ? "has-reply" : ""}`} aria-labelledby="fh-kaju-h">
      <div className="fh-kaju-h"><KajuFace size={32} /><h2 id="fh-kaju-h">What are you working on?</h2></div>
      <form className="fh-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label className="fh-sr" htmlFor="fh-say">Tell Kaju what you are doing</label>
        <textarea id="fh-say" ref={box} rows={2} value={text} maxLength={500} enterKeyHint="send" autoComplete="off" placeholder="For example: I'm about to start vaccinations" aria-describedby="fh-say-hint"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } else if (e.key === "Escape" && said) { e.stopPropagation(); onClear(); } }} />
        <button type="submit" className="fh-send" aria-label="Tell Kaju" disabled={!text.trim() || k.busy}>{k.busy && said && !said.local ? <Loader2 size={20} className="nx-spin" aria-hidden /> : <ArrowUp size={22} strokeWidth={2.4} aria-hidden />}</button>
      </form>
      <p className="fh-hint" id="fh-say-hint">Type, or use the microphone on your keyboard.</p>
      <div className="fh-out" ref={out} aria-live="polite">
        {said ? <div className="fh-reply">
          <p className="fh-you"><span className="fh-sr">You said: </span><span>{said.text}</span><button type="button" className="fh-x" aria-label="Close Kaju's answer" onClick={onClear}><X size={16} aria-hidden /></button></p>
          {said.local && answer ? <div className="fh-ans">
            <p className="fh-ans-t">{answer.text}</p>
            {answer.acts.length ? <div className="fh-acts">{answer.acts.map(act)}</div> : null}
            <p className="fh-src">{online ? "From your work and your organisation's drives." : "From what is on this phone."} Nothing is saved until you press Save.</p>
          </div>
            : turn ? <div className="fh-ans is-kaju ak"><Reply t={turn} signedIn={live.signedIn} onClose={onClear} onFill={(t) => { setText(t); box.current?.focus(); }} /></div>
            : <div className="fh-ans is-kaju ak"><p className="ak-wait" role="status"><Loader2 size={14} className="nx-spin" aria-hidden />Asking Kaju…</p></div>}
        </div> : null}
      </div>
    </section>
  );
}

/** The records a field worker opens most, one tap each. Everything else is in the menu. */
function Places() {
  const items = [
    { href: "/ngo/cases?view=mine", label: "My cases", icon: ClipboardList },
    { href: "/ngo/animals", label: "Animals", icon: PawPrint },
    { href: "/ngo/submissions?tab=evidence", label: "Evidence and reports", icon: FileCheck2 },
    { href: "/ngo/today", label: "Team today", icon: Users },
  ];
  return (
    <nav className="fh-places" aria-labelledby="fh-places-h">
      <h2 id="fh-places-h">Records</h2>
      <ul>{items.map((i) => <li key={i.href}><Link href={i.href}><i.icon size={20} aria-hidden /><span>{i.label}</span><ChevronRight size={16} aria-hidden /></Link></li>)}</ul>
    </nav>
  );
}

/* ── Your work: one row per stop, opening the tools the case already had ── */

function Row({ s, chip, open, onToggle, icon }: { s: Stop; chip: Chip; open: boolean; onToggle: () => void; icon: ReactNode }) {
  const sub = s.kind === "followup" ? [s.animal ? s.title : null, s.place].filter(Boolean) : [s.animal ? s.title : null, s.place].filter(Boolean);
  return (
    <button type="button" className="fh-row" aria-expanded={open} aria-controls={`stop-${s.key}-b`} onClick={onToggle}>
      <span className={`fh-row-i ${s.late ? "is-late" : ""}`} aria-hidden>{icon}</span>
      <span className="fh-row-t"><b>{s.animal ?? s.title}</b>{sub.length ? <small>{sub.join(" · ")}</small> : null}</span>
      <span className={`fm-tag ${chip.cls}`}>{chip.text}</span>
      <ChevronDown size={20} className="fh-row-c" aria-hidden />
    </button>
  );
}

function FollowStop({ s, f, chip, open, onToggle, done, online, busy, onMark }: { s: Stop; f: DueFollowup; chip: Chip; open: boolean; onToggle: () => void; done?: string; online: boolean; busy: boolean; onMark: (m: "done" | "missed") => void }) {
  return (
    <li className={`fh-stop ${open ? "is-open" : ""}`} id={`stop-${s.key}`}>
      <Row s={s} chip={chip} open={open} onToggle={onToggle} icon={<CalendarClock size={20} />} />
      {open ? <div className="fh-stop-b" id={`stop-${s.key}-b`}>
        <p className="fm-meta"><span>Due {day(f.due_at)}</span>{[shortCode(f.case_code, "follow-up")].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</p>
        {f.note ? <p>{f.note}</p> : null}
        {done ? <p className="fm-ok"><Tick size={16} aria-hidden />{done}</p> : <div className="fm-acts"><button type="button" className="fm-btn is-go" disabled={!online || busy} onClick={() => onMark("done")}><Tick size={16} aria-hidden />Done</button><button type="button" className="fm-btn" disabled={!online || busy} onClick={() => onMark("missed")}>Missed</button>{f.case_id ? <Link className="fm-btn" href={`/ngo/cases/${f.case_id}`}>Open the case</Link> : null}</div>}
        {!online && !done ? <p className="fm-hint">Marking a follow-up needs signal.</p> : null}
      </div> : null}
    </li>
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
  const fix = /sign in|session/i.test(err) ? <Link className="fm-link" href="/sign-in?next=/ngo/field">Sign in again</Link>
    : /intake first/i.test(err) ? <span>Send the animal&apos;s intake first; this one follows it.</span>
    : unverified ? <span>It may already be saved. Send this one again: the same request is checked, never saved twice.{d.caseId && !d.intake && !d.intakeRequest ? <> Or <Link className="fm-link" href={`/ngo/cases/${d.caseId}`}>open the case</Link> to look.</> : null}</span>
    : plain ? <span>Correct it and send it again.</span> : <span>Send it again, or remove it and record it once more.</span>;
  return (
    <details className="fm-draft" open={d.status === "failed" || undefined}>
      <summary><i className="fm-dot" data-s={d.status === "failed" ? "failed" : "pending"} aria-hidden /><span><b>{d.survey ? "Survey observation" : d.intake ? "Animal intake" : d.code ? shortCode(d.code) : "Field record"}</b><small>{dayTime(d.at)} · {d.status === "failed" ? "Did not go" : online ? "Sending" : "Sends when there's signal"}</small></span><span className={`fm-tag ${d.status === "failed" ? "is-bad" : "is-wait"}`}>{d.status === "failed" ? "Failed" : "Waiting"}</span></summary>
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

/** The words on a save button. */
const keepLabel = (_route: Route2, what: string) => `Save the ${what}`;
const keptToast = (route: Route2) => (route === "send" ? "Saved. Sending now." : "Saved on this phone. It sends by itself when the signal is back.");

type Tool = "note" | "evidence" | "vacc" | "care";
function CaseStop({ s, c, chip, open, onToggle, preset, online, started, busy, drafted, onStart, onNote, onEvidence, onVaccination, vaccDefaults, policies, onOperation, route }: { s: Stop; c: OpenCase; chip: Chip; open: boolean; onToggle: () => void; preset: Preset | null; online: boolean; started: boolean; busy: boolean; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void>; onEvidence: (k: EvidenceKind, f: File | null, l: string) => Promise<void>; onVaccination: (v: VaccinationData) => Promise<void>; vaccDefaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; policies: WorkflowPolicy[]; onOperation: (k: OperationKind, d: LifecycleData, p: string | null, r: string) => Promise<void>; route: Route2 }) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [t, setT] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("capture_photo");
  const [op, setOp] = useState<OperationKind | undefined>();
  const [file, setFile] = useState<File | null>(null);
  const [loc, setLoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* Kaju opened this stop for one thing ("Add the release photo"): that form, with that choice, is open. */
  useEffect(() => { if (!preset) return; setTool(preset.tool ?? null); if (preset.evidence) setKind(preset.evidence); setOp(preset.op); setError(null); }, [preset]);
  const shut = () => { setTool(null); setError(null); setOp(undefined); };
  const tools: [Tool, string, typeof PenLine, boolean][] = [["note", "Note", PenLine, true], ["evidence", "Photo or proof", Camera, true], ["vacc", "Vaccination", Syringe, !!c.dog_id], ["care", "Care or movement", Route, !!c.dog_id]];
  const save = async (fn: () => Promise<void>) => { setSaving(true); setError(null); try { await fn(); shut(); toast({ text: keptToast(route), tone: "ok" }); } catch (e) { setError(errText(e)); } finally { setSaving(false); } };
  const gps = () => navigator.geolocation?.getCurrentPosition((p) => setLoc(`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`), () => setError("Location is unavailable. Say where it was in words."));
  return (
    <li className={`fh-stop ${open ? "is-open" : ""}`} id={`stop-${s.key}`}>
      <Row s={s} chip={chip} open={open} onToggle={onToggle} icon={<PawPrint size={20} />} />
      {open ? <div className="fh-stop-b" id={`stop-${s.key}-b`}>
        <p className="fm-meta"><span className={`fm-tag ${started ? "is-on" : ""}`}>{started ? "Started" : "Open"}</span><span>{shortCode(c.case_code)}</span>{drafted ? <span>{plural(drafted, "record", "records")} on this phone, not sent</span> : null}</p>
        {!started ? <div className="fm-acts"><button type="button" className="fm-btn" disabled={!online || busy} onClick={onStart}><Play size={16} aria-hidden />Start</button></div> : null}
        {!online && !started ? <p className="fm-hint">Starting work needs signal. Records can still be kept on this phone.</p> : null}
        <div className="fm-tools" role="group" aria-label="What to record on this case">
          {tools.filter((x) => x[3]).map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => { setTool(tool === id ? null : id); setOp(undefined); }}><Icon size={18} aria-hidden /><span>{label}</span></button>)}
          <Link href={`/ngo/cases/${c.id}`}><ArrowUpRight size={18} aria-hidden /><span>Open the case</span></Link>
        </div>
        {error ? <p className="fm-err" role="alert">{error}</p> : null}
        {tool === "note" ? <form className="fm-form" onSubmit={(e) => { e.preventDefault(); if (t.trim()) void save(async () => { await onNote(t.trim()); setT(""); }); }}>
          <F label="Note"><textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="What you saw or did" maxLength={1500} autoFocus /></F>
          <div className="fm-form-a"><button type="submit" className="fm-btn is-go" disabled={saving || !t.trim()}>{saving ? "Saving…" : keepLabel(route, "note")}</button><button type="button" className="fm-btn" onClick={shut}>Cancel</button></div>
        </form> : null}
        {tool === "evidence" ? <form className="fm-form" onSubmit={(e) => { e.preventDefault(); void save(async () => { await onEvidence(kind, file, loc); setFile(null); setLoc(""); }); }}>
          <F label="What it shows"><select value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>{Object.entries(EVIDENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
          {kind !== "release_location" ? <F label="Photo or file"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></F> : null}
          <F label={kind === "release_location" ? "Where it was released" : "Where (optional)"}><textarea value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={1500} required={kind === "release_location"} /></F>
          <div className="fm-form-a"><button type="button" className="fm-btn" onClick={gps}><MapPin size={16} aria-hidden />Use my location</button></div>
          <div className="fm-form-a"><button type="submit" className="fm-btn is-go" disabled={saving}>{saving ? "Saving…" : keepLabel(route, "proof")}</button><button type="button" className="fm-btn" onClick={shut}>Cancel</button></div>
        </form> : null}
        {tool === "vacc" && c.dog_id ? <VaccinationForm dogId={c.dog_id} defaults={vaccDefaults} route={route} onCancel={shut} onSave={(v) => save(() => onVaccination(v))} /> : null}
        {tool === "care" ? <LifecycleForm key={op ?? "capture"} initialKind={op} policies={policies} submitLabel={keepLabel(route, "record")} onCancel={shut} onSave={async (k, d, p, r) => { await onOperation(k, d, p, r); toast({ text: keptToast(route), tone: "ok" }); }} /> : null}
      </div> : null}
    </li>
  );
}

/** What was given, as recorded in the field. Veterinary sign-off and municipal review stay separate. */
function VaccinationForm({ dogId, defaults, route, onSave, onCancel }: { dogId: string; defaults?: Pick<VaccinationData, "vaccine" | "batch" | "performedBy">; route: Route2; onSave: (v: VaccinationData) => Promise<void>; onCancel: () => void }) {
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
      <div className="fm-form-a"><button type="submit" className="fm-btn is-go" disabled={busy}>{busy ? "Saving…" : keepLabel(route, "vaccination")}</button><button type="button" className="fm-btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

/* ── Record an animal: one screen, one Save ──────────────────────────
   A photo, why, where, and optional details. The record is the same field-intake-v1 the register has always received
   (src/lib/operations IntakeData): the same fields, the same request id kept for the life of the screen, so a Save that
   is pressed twice or retried is still one animal. "Say it" at the top reads one line on the phone ("brown female
   limping by the temple, needs a vet") and fills the choices below: why, sex, marks, the note, and the area when it is
   empty. It works offline, sends nothing, and never touches Save, the drafts or sending. Opened by Kaju, the screen
   starts with the reason chosen ("Record an animal to vaccinate") or with what the person told Kaju already read. */

const WHY: { id: IntakeData["category"]; label: string; note: string; icon: typeof Scissors; says: string; urgent?: boolean }[] = [
  { id: "sterilisation", label: "Sterilise", note: "Caught for the ABC programme.", icon: Scissors, says: "Caught for sterilisation" },
  { id: "vaccination", label: "Vaccinate", note: "For the anti-rabies vaccine.", icon: Syringe, says: "Recorded for vaccination" },
  { id: "injury", label: "Hurt or sick", note: "Needs treatment.", icon: HeartPulse, says: "Found hurt or sick", urgent: true },
  { id: "rescue", label: "Rescue", note: "In danger and needs moving.", icon: LifeBuoy, says: "Rescue needed", urgent: true },
  { id: "other", label: "Something else", note: "Recorded in the field. Say why under More about the dog.", icon: PawPrint, says: "Recorded in the field" },
];
const PLACE_KEY = "sp.field.place";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const SEX: [string, string][] = [["Female", "Female"], ["Male", "Male"], ["Unknown", "Not sure"]];

function RecordSheet({ known, route, initial, onSave, onClose }: { known: KnownAnimal[]; route: Route2; initial?: Capture; onSave: (d: IntakeData, f: File | null, id: string) => Promise<void>; onClose: () => void }) {
  const request = useRef(uuid()), saving = useRef(false), hand = useRef(false);
  const [d, setD] = useState<IntakeData>({ template: "field-intake-v1", name: "", code: "", city: "", zone: "", sex: "", identifiers: "", description: "", category: initial?.category ?? "sterilisation", lat: NaN, lng: NaN, accuracy: null, observedAt: new Date().toISOString() });
  const [chosen, setChosen] = useState(!!initial?.category);
  const [file, setFile] = useState<File | null>(null), [shot, setShot] = useState<string | null>(null);
  const [gps, setGps] = useState<"finding" | "found" | "failed">("finding");
  const [byHand, setByHand] = useState(false);
  const [latText, setLatText] = useState(""), [lngText, setLngText] = useState("");
  const [search, setSearch] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [tried, setTried] = useState(false);
  const [told, setTold] = useState<string[] | null>(null);
  const box = useRef<HTMLElement>(null), whyRef = useRef<HTMLDivElement>(null), whereRef = useRef<HTMLDivElement>(null), zoneRef = useRef<HTMLInputElement>(null), cityRef = useRef<HTMLInputElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const set = (p: Partial<IntakeData>) => setD((x) => ({ ...x, ...p }));
  const located = Number.isFinite(d.lat) && Number.isFinite(d.lng);

  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? "null") as { city?: string; zone?: string } | null; if (p) setD((x) => ({ ...x, city: p.city ?? "", zone: x.zone || (p.zone ?? "") })); } catch { /* nothing remembered */ } }, []);
  useEffect(() => { if (!file) { setShot(null); return; } const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u); }, [file]);
  /* Focus goes into the screen and comes back to the button that opened it (or, opened from a link, to Record an animal). */
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("h2")?.focus();
    return () => { const back = before && before !== document.body && before.isConnected ? before : document.querySelector<HTMLElement>(".fh-record, .fm-record"); back?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  /* The phone is asked where it is as the screen opens; nobody has to. A place typed by hand is never overwritten. */
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setGps("failed"); return; }
    setGps("finding");
    navigator.geolocation.getCurrentPosition((p) => { if (hand.current) return; setD((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, observedAt: new Date(p.timestamp).toISOString() })); setGps("found"); }, () => setGps("failed"), { enableHighAccuracy: true, timeout: 15000 });
  }, []);
  useEffect(() => { locate(); }, [locate]);
  const typeIt = () => { hand.current = true; setByHand(true); if (located) { setLatText(d.lat.toFixed(6)); setLngText(d.lng.toFixed(6)); } };
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
  const missing: null | "why" | "where" | "place" = !chosen ? "why" : !located ? "where" : !d.zone.trim() || !d.city.trim() ? "place" : null;
  const need = missing === "why" ? "Choose why you are recording it."
    : missing === "where" ? (byHand ? "Type both numbers of the location." : gps === "finding" ? "Finding where you are…" : "The location is needed. Try again, or type it.")
    : missing === "place" ? (!d.zone.trim() && !d.city.trim() ? "Add the area and the city." : !d.zone.trim() ? "Add the area or street." : "Add the city.") : null;
  const goes = route === "send" ? (d.existingDogId ? "Saves to your register now, as a new case on this dog's history." : "Saves to your register now: a new animal and its case.")
    : "No signal right now. It stays on this phone and sends by itself when the signal is back.";
  const details = [d.sex && (d.sex === "Unknown" ? "Sex not sure" : d.sex), linked ? `Seen before: ${animalLine(linked)}` : d.name, d.identifiers, d.description && "A note"].filter(Boolean).join(" · ");

  const save = async () => {
    if (saving.current) return;
    if (missing) {
      setTried(true);
      (missing === "why" ? whyRef.current?.querySelector<HTMLElement>("button") : missing === "where" ? whereRef.current?.querySelector<HTMLElement>("input, button") : !d.zone.trim() ? zoneRef.current : cityRef.current)?.focus();
      return;
    }
    saving.current = true; setBusy(true); setError(null);
    try {
      try { localStorage.setItem(PLACE_KEY, JSON.stringify({ city: d.city.trim(), zone: d.zone.trim() })); } catch { /* not remembered */ }
      await onSave({ ...d, city: d.city.trim(), zone: d.zone.trim(), description: d.description.trim() || why.says }, file, request.current);
      toast({ text: route === "send" ? "Animal recorded. Sending now." : "Animal recorded on this phone. It sends by itself when the signal is back.", tone: "ok" });
      onClose();
    } catch (x) { setError(`${errText(x)} Nothing was lost; try again.`); } finally { saving.current = false; setBusy(false); }
  };
  /* Say it: the line is read here, on the phone (src/nx/data/capture.ts readField), and only fills what it states.
     Choices take what was said; typed fields are only filled when empty. Save, the drafts and sending are untouched:
     the record is whatever the screen holds when the person presses Save. */
  const sayIt = (text: string): string[] => {
    const r = readField(text), filled: string[] = [], p: Partial<IntakeData> = {};
    const label = (id: string) => WHY.find((w) => w.id === id)?.label ?? id;
    if (r.category) { p.category = r.category; setChosen(true); filled.push(r.also.length ? `${label(r.category)} (you also said ${r.also.map((x) => label(x).toLowerCase()).join(" and ")}; change it below if that is the reason)` : label(r.category)); }
    if (r.sex) { p.sex = r.sex; filled.push(r.sex === "Unknown" ? "sex not sure" : r.sex); }
    if (r.marks && !d.identifiers.trim()) { p.identifiers = r.marks.slice(0, 500); filled.push(`marks: ${r.marks}`); }
    if (r.zone && !d.zone.trim()) { p.zone = r.zone.slice(0, 120); filled.push(`area: ${r.zone}`); }
    if (!d.description.includes(r.note)) { p.description = (d.description.trim() ? `${d.description.trim()}\n${r.note}` : r.note).slice(0, 3000); filled.push("the note"); }
    set(p);
    if ((p.sex || p.identifiers || p.description) && moreRef.current) moreRef.current.open = true;
    return filled;
  };
  /* What the person told Kaju is read once, as Say it would read it, and said back so they can check it. */
  const toldOnce = useRef(false);
  useEffect(() => { if (toldOnce.current || !initial?.say) return; toldOnce.current = true; setTold(sayIt(initial.say)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* Tab stays inside the screen while it is open (WCAG 2.4.3). */
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };

  return (
    <div className="fm-scrim">
      <section ref={box} className="fm-sheet" role="dialog" aria-modal="true" aria-labelledby="fm-rec-h" onKeyDown={trap}>
        <header className="fm-sheet-h">
          <h2 id="fm-rec-h" tabIndex={-1}>Record an animal</h2>
          <button type="button" className="fm-x" onClick={onClose} aria-label="Close without saving"><X size={20} /></button>
        </header>
        <div className="fm-sheet-b">
          {told ? <p className="kc-say-o fh-told" role="status"><KajuFace size={20} />{told.length ? <>From what you told Kaju: {told.join(" · ")}. Check each one.</> : "Choose below what fits what you told Kaju."}</p> : <SayIt onRead={sayIt} placeholder="For example: brown female limping by the temple" />}
          <div className="fm-q">
            <label className={`fm-photo ${shot ? "has-shot" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {shot ? <><img src={shot} alt="The photo you took" /><span className="fm-retake" aria-hidden><Camera size={16} />Take it again</span></>
                : <><span className="fm-photo-i" aria-hidden><Camera size={24} /></span><b>Take a photo</b><small>Optional. The whole dog, from the side if you can.</small></>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={shot ? "Take the photo again" : "Photo of the dog"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {shot ? <button type="button" className="fm-link fm-start" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove the photo</button> : null}
          </div>

          <div className="fm-q">
            <h3 id="fm-why">Why are you recording it?</h3>
            <div className="fm-chips" role="radiogroup" aria-labelledby="fm-why" ref={whyRef}>
              {WHY.map((w) => <button key={w.id} type="button" role="radio" aria-checked={chosen && d.category === w.id} className={`fm-chip ${w.urgent ? "is-urgent" : ""}`} onClick={() => { set({ category: w.id }); setChosen(true); }}><w.icon size={16} aria-hidden />{w.label}</button>)}
            </div>
            {chosen ? <p className="fm-q-note">{why.note}</p> : null}
          </div>

          <div className="fm-q" ref={whereRef}>
            <h3 id="fm-where">Where is it?</h3>
            <div className={`fm-where is-${byHand ? (located ? "found" : "failed") : gps}`}>
              <MapPin size={20} aria-hidden />
              <span className="fm-where-t" role="status" aria-live="polite">
                {byHand ? <><b>{located ? "Location typed in" : "Type the location"}</b><small>{located ? `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : "Two numbers, as a map app shows them"}</small></>
                  : gps === "found" ? <><b>Location found</b><small>{d.accuracy !== null ? `Within about ${Math.round(d.accuracy)} m of this phone` : "From this phone"}</small></>
                  : gps === "finding" ? <><b>Finding where you are…</b><small>Keep the phone still for a moment.</small></>
                  : <><b>Location is off</b><small>Allow location for this site and try again, or type it.</small></>}
              </span>
              <span className="fm-where-a">
                {byHand ? <button type="button" className="fm-btn is-sm" onClick={usePhone}><MapPin size={16} aria-hidden />Use this phone</button>
                  : <>{gps !== "finding" ? <button type="button" className="fm-btn is-sm" onClick={locate}>{gps === "found" ? "Find again" : "Try again"}</button> : null}<button type="button" className="fm-btn is-sm" onClick={typeIt}>{gps === "found" ? "Adjust" : "Type it"}</button></>}
              </span>
            </div>
            {byHand ? <>
              <div className="fm-two is-pair">
                <F label="Latitude"><input inputMode="decimal" autoComplete="off" value={latText} onChange={(e) => { setLatText(e.target.value); typed(e.target.value, lngText); }} /></F>
                <F label="Longitude"><input inputMode="decimal" autoComplete="off" value={lngText} onChange={(e) => { setLngText(e.target.value); typed(latText, e.target.value); }} /></F>
              </div>
              <p className="fm-hint">In a map app, press and hold the place: it shows these two numbers.</p>
            </> : null}
            <div className="fm-two">
              <F label="Area or street"><input ref={zoneRef} value={d.zone} maxLength={120} onChange={(e) => set({ zone: e.target.value })} autoComplete="off" /></F>
              <F label="City"><input ref={cityRef} value={d.city} maxLength={120} onChange={(e) => set({ city: e.target.value })} autoComplete="off" /></F>
            </div>
          </div>

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
        <footer className="fm-sheet-f">
          {error ? <p className="fm-err" role="alert">{error}</p> : null}
          <p className={`fm-note ${tried && need ? "is-bad" : ""}`} aria-live="polite">{need ?? goes}</p>
          <button type="button" className="fm-btn is-go is-wide" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>
        </footer>
      </section>
    </div>
  );
}

/* ── Sample: the same home, every action opening the live demo ──── */
function SampleField() {
  const head = useHead({ name: "Sample organisation" }, null, true, true);
  const k = useKaju();
  const [said, setSaid] = useState<Said | null>(null);
  const world = useMemo((): World => {
    const at = (days: number) => { const d = new Date(Date.now() + days * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    return { stops: [
      { key: "f:s2", kind: "followup", caseId: null, title: "Day 7 observation", animal: "Tan female", dogId: null, place: "Ward 08", due: at(-8), late: true },
      { key: "f:s1", kind: "followup", caseId: null, title: "Recovery check", animal: "Black and white puppy", dogId: null, place: "Indiranagar", due: at(0), late: false },
      { key: "c:s3", kind: "case", caseId: null, title: "Road accident", animal: null, dogId: null, place: "Ward 12" },
      { key: "c:s4", kind: "case", caseId: null, title: "Limping grey dog, old injury", animal: null, dogId: null, place: "Ward 12" },
    ], drives: [], waiting: 0, failed: 0, sentToday: [], today: at(0), online: true };
  }, []);
  const tell = (text: string) => { const t = text.trim(); if (!t) return; const local = answerField(t, world) !== null; setSaid({ text: t, local, from: k.turns.length }); if (!local) void k.ask(t); };
  const answer = said?.local ? answerField(said.text, world) : null;
  return (
    <Shell crumb={["Operations", "Field mode"]}>
      <div className="fm fh">
        {head(0, daySummary(world))}
        <FieldKaju said={said} answer={answer} online onTell={tell} onClear={() => setSaid(null)} act={(a) => <ActButton key={a.label} a={a} go={() => {}} sample />} />
        <div className="fh-quick" role="group" aria-label="Quick actions">
          <Link href={TRY.href} title={TRY.title} className="fh-tile fh-record"><Camera size={24} aria-hidden /><span>Record an animal</span></Link>
          {quickAsks(world).map((q) => { const I = QUICK_ICON[q.icon]; return <button key={q.label} type="button" className="fh-tile" onClick={() => tell(q.say)}><I size={24} aria-hidden /><span>{q.label}</span></button>; })}
        </div>
        <section className="fh-work" aria-labelledby="fh-work-h">
          <div className="fm-sec-h"><h2 id="fh-work-h">Your work</h2><span className="fm-count">{world.stops.length}</span></div>
          <ul className="fh-list">{world.stops.map((s) => { const c = chipOf(s, {}); return (
            <li key={s.key} className="fh-stop"><Link href={TRY.href} title={TRY.title} className="fh-row"><span className={`fh-row-i ${s.late ? "is-late" : ""}`} aria-hidden>{s.kind === "followup" ? <CalendarClock size={20} /> : <PawPrint size={20} />}</span><span className="fh-row-t"><b>{s.animal ?? s.title}</b><small>{[s.animal ? s.title : null, s.place].filter(Boolean).join(" · ")}</small></span><span className={`fm-tag ${c.cls}`}>{c.text}</span><ChevronRight size={20} className="fh-row-c" aria-hidden /></Link></li>); })}</ul>
        </section>
        <Places />
      </div>
    </Shell>
  );
}
