"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { isOpen } from "@/lib/kaju/jobs";
import { getSupabase } from "@/lib/supabase";
import { KIND_WORD, handoffStarts, startIsReal, type HandoffStart, type RecordFacts, type RecordLink } from "@/lib/kaju/records";
import { Modal, Skeleton, toast } from "../kit";
import { Sheet } from "../Phone";
import { usePhone } from "../PhoneList";
import { MISSION, useKajuVocab, type MissionRow } from "./data";
import { plannedFrom } from "./work";
import { PlanCard } from "./Plan";
import { useKaju, type KajuSubject, type Planned } from "./state";
import { JobGroups, useOpenJob } from "./JobCard";
import "./workspace.css";
import "./rooms.css";
import "./jobs.css";

/* Handing a record to Kaju, and what Kaju is doing about it. From a case, an animal or a package the person picks one
   of the plans Kaju can make for it from its real tools, reviews it in the usual plan card (every step says who does it
   and what it changes), and starts it; the work carries a link to the record (nx_missions.request.record). The record
   then lists, briefly, what waits for the person and what Kaju is working on, each opening Kaju's card over the record.
   Kaju's work is private to the person who asked for it (row-level security), so this list is theirs alone; nothing
   here widens what anyone can see. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const istToday = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

/** The record the page names (Shell's `subject`), as a link Kaju's work can carry. */
export function subjectLink(s: KajuSubject | null | undefined): RecordLink | null {
  if (!s) return null;
  if (s.kind === "case" && s.caseId) return { kind: "case", id: s.caseId, label: s.label ?? "Case", ws: "ngo" };
  if (s.kind === "animal" && s.dogId) return { kind: "animal", id: s.dogId, label: s.label ?? "Animal", ws: "ngo" };
  if (s.kind === "package" && s.packageId) return { kind: "package", id: s.packageId, label: s.label ?? "Package", ws: s.ws === "gov" ? "gov" : "ngo" };
  return null;
}

/** What the starting points need to know about the record, read with the person's own access. */
function useFacts(link: RecordLink, orgId: string, channels: string[]): RecordFacts | null {
  const [f, setF] = useState<RecordFacts | null>(null);
  useEffect(() => {
    const db = getSupabase(); if (!db) { setF({}); return; }
    let alive = true;
    void (async () => {
      if (link.kind === "case") {
        const [c, t] = await Promise.all([
          db.from("cases").select("title,zone,city,due_at,follow_up_at,assignee_name").eq("id", link.id).maybeSingle(),
          db.from("nx_tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("record_kind", "case").eq("record_id", link.id).eq("state", "open"),
        ]);
        const r = (c.data ?? {}) as { title?: string | null; zone?: string | null; city?: string | null; due_at?: string | null; follow_up_at?: string | null; assignee_name?: string | null };
        if (alive) setF({ title: r.title ?? null, place: r.zone ?? null, due: r.due_at ?? r.follow_up_at ?? null, holder: r.assignee_name ?? null, openTasks: t.count ?? 0 });
      } else if (alive) setF({});
    })();
    return () => { alive = false; };
  }, [link.kind, link.id, orgId]);
  return useMemo(() => (f ? { ...f, channels } : null), [f, channels]);
}

/** The plans Kaju can make for this record, as choices. Choosing one opens it for review; nothing starts here. */
export function HandoffStarts({ link, orgId, onPick, busy }: { link: RecordLink; orgId: string; onPick: (s: HandoffStart) => void; busy?: string | null }) {
  const vocab = useKajuVocab(orgId, link.ws === "gov" ? "government" : "ngo");
  const facts = useFacts(link, orgId, vocab.channels);
  const calm = useReducedMotion();
  const starts = useMemo(() => (facts ? handoffStarts(link, facts, istToday()).filter(startIsReal) : null), [facts, link]);
  if (!starts) return <Skeleton rows={3} label="Reading the record" />;
  return (
    <ul className="kr-starts" aria-label={`What Kaju can do for ${link.label}`}>
      {starts.map((s, i) => (
        <motion.li key={s.id} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, ease: EASE, delay: calm ? 0 : i * .04 }}>
          <button type="button" className="kr-start" disabled={!!busy} aria-busy={busy === s.id} onClick={() => onPick(s)}>
            <span className="kr-start-t"><b>{s.name}</b><small>{s.line}</small></span>
            <ChevronRight size={16} aria-hidden />
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

/** A plan made from a starting point: the record goes with it. */
export async function plannedFor(orgId: string, link: RecordLink, s: HandoffStart): Promise<Planned> {
  const p = await plannedFrom(orgId, s.plan, `${s.name} · ${KIND_WORD[link.kind]} ${link.label}`);
  return { ...p, record: link };
}

/** A plan for review in a dialog (a sheet on a phone). Start goes through the same route as all of Kaju's work, then
    opens its card over the record, so the person never leaves the page they were on. */
export function PlanDialog({ title, orgId, planned, onClose, children }: { title: string; orgId: string; planned: Planned | null; onClose: () => void; children?: ReactNode }) {
  const phone = usePhone();
  const k = useKaju();
  const openJob = useOpenJob();
  const vocab = useKajuVocab(orgId, planned?.record?.ws === "gov" ? "government" : "ngo");
  const [busy, setBusy] = useState(false);
  const start = async (p: Planned) => {
    setBusy(true); const r = await k.start(orgId, p); setBusy(false);
    if (r.id) { onClose(); openJob(r.id); } else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };
  const body = <div className="kr-dlg">{planned ? <PlanCard key={planned.key} planned={planned} vocab={vocab} busy={busy} compact={phone} onStart={(p) => void start(p)} onDiscard={onClose} /> : children}</div>;
  return phone ? <Sheet open onClose={onClose} label={title} full>{body}</Sheet> : <Modal title={title} onClose={onClose} wide>{body}</Modal>;
}

/** "Hand to Kaju" for a record page: a trigger anyone can call (the head's button, the phone's More sheet) and the dialog,
    rendered once at page level so it survives the sheet that opened it closing. */
export function useHandoff(link: RecordLink | null, orgId: string | null) {
  const [open, setOpen] = useState(false);
  const [planned, setPlanned] = useState<Planned | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const close = useCallback(() => { setOpen(false); setPlanned(null); }, []);
  const pick = async (s: HandoffStart) => { if (!link || !orgId) return; setBusy(s.id); try { setPlanned(await plannedFor(orgId, link, s)); } finally { setBusy(null); } };
  const node = open && link && orgId ? (
    <PlanDialog title={planned ? "Review the plan" : `Hand ${link.label} to Kaju`} orgId={orgId} planned={planned} onClose={close}>
      <p className="kr-lede">Choose what Kaju should do. You see every step, and who does it, before anything starts. What it makes stays linked to this {link.kind === "animal" ? "animal" : link.kind}.</p>
      <HandoffStarts link={link} orgId={orgId} busy={busy} onPick={(s) => void pick(s)} />
      <p className="kj-quiet kr-foot">Only you see what you hand to Kaju. Steps that change several records or reach outside StrayPaw wait for your approval.</p>
    </PlanDialog>
  ) : null;
  return { open: () => setOpen(true), node, ready: !!link && !!orgId };
}

/** The button that opens it. `phone` styles it for the More sheet. */
export function HandoffButton({ onOpen, phone }: { onOpen: () => void; phone?: boolean }) {
  return <button type="button" data-close={phone ? "" : undefined} className={phone ? "nx-btn is-quiet" : "nx-btn is-quiet is-sm"} onClick={onOpen}><Sparkles size={phone ? 16 : 13} aria-hidden />Hand to Kaju</button>;
}

/* ── What Kaju is doing about a record ──────────────────────────────────────────────────────────────────────── */
/** The person's own work with Kaju about this record, kept current: at once on a change where the tables are published
    for live updates (migration 20261118090000), and by polling as the fallback. */
export function useRecordMissions(link: RecordLink | null, orgId: string | null) {
  const [rows, setRows] = useState<MissionRow[] | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const id = link?.id ?? null;
  useEffect(() => {
    const db = getSupabase(); if (!db || !id || !orgId) return;
    let alive = true;
    void db.from("nx_missions").select(MISSION).eq("org_id", orgId).eq("request->record->>id", id).order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => { if (alive) setRows(error ? [] : ((data ?? []) as unknown as MissionRow[])); });
    return () => { alive = false; };
  }, [id, orgId, tick]);
  const active = (rows ?? []).some((m) => ["ready", "running", "retrying"].includes(m.state));
  useEffect(() => { if (!rows?.length) return; const t = window.setInterval(() => { if (visible()) reload(); }, active ? 4000 : 30000); return () => window.clearInterval(t); }, [rows, active, reload]);
  const bump = useRef<number | null>(null);
  const mine = (rows ?? []).map((m) => m.id).join(",");
  useEffect(() => {
    const db = getSupabase(); if (!db || !id || !orgId) return;
    const soon = () => { if (bump.current) window.clearTimeout(bump.current); bump.current = window.setTimeout(reload, 300); };
    /* New work about this record arrives through the organisation's rows (only the person's own are delivered); step
       changes through the steps of the work already listed. */
    let ch = db.channel(`kaju:record:${id}:${Math.random().toString(36).slice(2, 10)}`).on("postgres_changes", { event: "*", schema: "public", table: "nx_missions", filter: `org_id=eq.${orgId}` }, soon);
    if (mine) ch = ch.on("postgres_changes", { event: "*", schema: "public", table: "nx_mission_steps", filter: `mission_id=in.(${mine})` }, soon);
    ch.subscribe();
    return () => { if (bump.current) window.clearTimeout(bump.current); void db.removeChannel(ch); };
  }, [id, orgId, mine, reload]);
  useEffect(() => { const f = () => { if (visible()) reload(); }; window.addEventListener("focus", f); return () => window.removeEventListener("focus", f); }, [reload]);
  return { rows, reload };
}

/** On a record: what waits for the person and what Kaju is working on about it, briefly. Each opens Kaju's card over the
    record. Finished work is counted, and kept in Kaju's History. (Named for the record pages that already use it.) */
export function RecordWorkrooms({ link, orgId, onHand }: { link: RecordLink; orgId: string; onHand?: () => void }) {
  const { rows } = useRecordMissions(link, orgId);
  const openJob = useOpenJob();
  const open = (rows ?? []).filter((m) => isOpen(m.state));
  const done = (rows ?? []).length - open.length;
  const thing = link.kind === "animal" ? "animal" : link.kind;
  return (
    <section className="kr-rooms" aria-labelledby={`kr-rooms-${link.id}`}>
      <div className="kr-rooms-h">
        <h3 className="nx-h3" id={`kr-rooms-${link.id}`}>With Kaju {open.length ? <span className="nx-count">{open.length}</span> : null}</h3>
        {onHand && rows?.length ? <button type="button" className="nx-link kr-rooms-add" onClick={onHand}><Sparkles size={13} aria-hidden />Hand to Kaju</button> : null}
      </div>
      {rows === null ? <Skeleton rows={2} label="Reading what Kaju is doing" />
        : !open.length ? <p className="nr-quiet">{rows.length ? `Nothing in progress about this ${thing}.` : `Nothing handed to Kaju about this ${thing} yet.`}{onHand && !rows.length ? <> <button type="button" className="nx-link" onClick={onHand}>Hand it to Kaju</button></> : null}</p>
        : <div className="kjb-list"><JobGroups rows={open.slice(0, 6)} onOpen={openJob} idBase={`kr-${link.id}`} /></div>}
      {done ? <p className="nr-hint">{done === 1 ? "1 finished" : `${done} finished`}, kept in <Link className="nr-link" href="/kaju/history">Kaju&apos;s History</Link>. Only you see what you hand to Kaju.</p>
        : rows?.length ? <p className="nr-hint">Only you see what you hand to Kaju.</p> : null}
    </section>
  );
}
