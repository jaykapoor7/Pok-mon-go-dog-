"use client";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { describesInjury } from "@/lib/sensitive-photo";

/* ════════════════════════════════════════════════════════════════════
   Moderation: one report at a time.

   The photo large, what the reporter said beside it, the automatic
   approval checks as a short list, and three answers: approve, reject,
   skip (A, R, →). Reports that pass every check can be approved together
   in one press. Everything else lives at /admin.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock, MapPin, ShieldCheck, X } from "lucide-react";
import { FolkVignette } from "@/components/art/Folk";
import { animalTag } from "@/lib/animal-name";
import { haptic } from "@/lib/haptics";

const KEY = "straypaw.admin_secret";

type CheckRow = { id: string; label: string; ok: boolean };
type Pending = {
  id: string; reporter_name: string | null; zone: string | null; nickname: string | null; photo_url: string | null; notes: string | null;
  mood_tags: string[] | null; created_at: string; lat: number | null; lng: number | null; claimed_dog_id: string | null; trust_score: number | null;
  volunteer_name: string | null; reporter_kind: "organisation" | "signed-in" | "guest"; checks: CheckRow[]; passes: boolean;
  sterilisation_status: string | null; vaccination_status: string | null;
};

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

export function ModerationQueue() {
  const [secret, setSecret] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [items, setItems] = useState<Pending[] | null>(null);
  const [auto, setAuto] = useState(true);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [photoCheck, setPhotoCheck] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<string, { ok: boolean; reason: string } | "checking">>({});

  const load = useCallback(async (s: string) => {
    setMsg(null);
    const res = await fetch("/api/admin/sightings", { headers: { Authorization: `Bearer ${s}` }, cache: "no-store" }).catch(() => null);
    if (!res) { setMsg("Network error."); return; }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j.error ?? "Could not load."); if (res.status === 401) { setSecret(null); try { localStorage.removeItem(KEY); } catch { /* ok */ } } return; }
    setSecret(s); setItems(j.pending ?? []); setAuto(j.autoApproval !== false); setPhotoCheck(!!j.photoCheck); setAt(0);
    try { localStorage.setItem(KEY, s); } catch { /* ok */ }
  }, []);

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) void load(s); } catch { /* ok */ } }, [load]);

  const cur = items?.[at] ?? null;
  const passing = useMemo(() => (items ?? []).filter((x) => x.passes).length, [items]);

  const act = useCallback(async (action: "approve" | "reject", dogId?: string) => {
    if (!cur || !secret || busy) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/sightings", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, id: cur.id, ...(dogId ? { dogId } : {}) }) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) { const j = await res?.json().catch(() => ({})); setMsg(j?.error ?? "That did not go through."); haptic("error"); return; }
    haptic(action === "approve" ? "success" : "light");
    setDone((n) => n + 1);
    setItems((xs) => (xs ?? []).filter((x) => x.id !== cur.id));
    setAt((i) => Math.max(0, Math.min(i, (items?.length ?? 1) - 2)));
  }, [cur, secret, busy, items]);

  /* The photo check for the report on screen, once per report. */
  useEffect(() => {
    if (!cur || !secret || !photoCheck || verdicts[cur.id] || !cur.photo_url) return;
    setVerdicts((v) => ({ ...v, [cur.id]: "checking" }));
    fetch("/api/admin/sightings", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "photo_check", id: cur.id }) })
      .then((r) => r.json()).then((j) => setVerdicts((v) => ({ ...v, [cur.id]: j.verdict ?? { ok: false, reason: "Photo check unavailable" } })))
      .catch(() => setVerdicts((v) => ({ ...v, [cur.id]: { ok: false, reason: "Photo check failed" } })));
  }, [cur, secret, photoCheck, verdicts]);

  const skip = useCallback(() => setAt((i) => ((items?.length ?? 0) ? (i + 1) % items!.length : 0)), [items]);

  const approvePassing = async () => {
    if (!secret || !passing) return;
    setBusy(true);
    const res = await fetch("/api/admin/sightings", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve_passing" }) }).catch(() => null);
    setBusy(false);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) { setMsg(j?.error ?? "That did not go through."); return; }
    const ids = new Set<string>(j.approved ?? []);
    setDone((n) => n + ids.size);
    setItems((xs) => (xs ?? []).filter((x) => !ids.has(x.id)));
    setAt(0);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!cur || (e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "a" || e.key === "A") void act("approve");
      else if (e.key === "r" || e.key === "R") void act("reject");
      else if (e.key === "ArrowRight") skip();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [cur, act, skip]);

  if (!secret) return (
    <div className="mq">
      <form className="mq-gate" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) void load(typed.trim()); }}>
        <FolkVignette className="mq-gate-art" />
        <h1>Moderation</h1>
        <p>Enter the moderation password to review new sightings.</p>
        <input type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Password" aria-label="Moderation password" autoComplete="current-password" />
        <button type="submit" className="x-btn is-flame">Open the queue</button>
        {msg && <p className="mq-err" role="alert">{msg}</p>}
      </form>
    </div>
  );

  return (
    <div className="mq">
      <header className="mq-head">
        <div>
          <h1>Sightings to review</h1>
          <p>{items === null ? "Loading…" : `${items.length} waiting${done ? ` · ${done} handled this session` : ""}`}</p>
        </div>
        <div className="mq-head-c">
          <span className={`mq-auto${auto ? " is-on" : ""}`}><ShieldCheck size={15} aria-hidden /> Auto-approval {auto ? "on" : "off"}{auto && photoCheck ? " · photo check on" : ""}</span>
          {passing > 0 && <button type="button" className="x-btn is-ink" disabled={busy} onClick={approvePassing}>Approve {passing} that pass every check</button>}
          <Link href="/admin" className="mq-more">Other admin tools <ArrowRight size={14} aria-hidden /></Link>
        </div>
      </header>

      {msg && <p className="mq-err" role="alert">{msg}</p>}

      {items && items.length === 0 && (
        <div className="mq-empty">
          <FolkVignette className="mq-empty-art" />
          <h2>All caught up</h2>
          <p>New reports that pass every check go live on their own. Anything else will wait here.</p>
        </div>
      )}

      {cur && (
        <article className="mq-card" aria-label="Report under review">
          <figure className="mq-photo">
            {cur.photo_url ? <SensitiveVeil sensitive={describesInjury(cur.notes, cur.mood_tags) || (verdicts[cur.id] !== "checking" && !!verdicts[cur.id] && (verdicts[cur.id] as { injury?: boolean }).injury === true)} id={cur.photo_url} className="h-full w-full"><img src={cur.photo_url} alt="The reported animal" /></SensitiveVeil> : <div className="mq-nophoto">No photograph</div>}
          </figure>
          <div className="mq-body">
            <p className="mq-pos">{at + 1} of {items!.length}</p>
            <h2>{cur.nickname?.trim() || "New animal"}</h2>
            <p className="mq-meta"><MapPin size={14} aria-hidden /> {cur.zone || "Place not given"}{cur.lat != null && cur.lng != null && <> · <a href={`/map?lat=${cur.lat}&lng=${cur.lng}`} target="_blank" rel="noreferrer">see the area</a></>}</p>
            <p className="mq-meta"><Clock size={14} aria-hidden /> {ago(cur.created_at)} · {cur.reporter_kind === "organisation" ? `${cur.volunteer_name || "Volunteer"} for an organisation` : cur.reporter_kind === "signed-in" ? (cur.reporter_name || "Signed-in reporter") : (cur.reporter_name || "Guest")}</p>
            {cur.notes && <blockquote className="mq-notes">{cur.notes}</blockquote>}
            {!!cur.mood_tags?.length && <p className="mq-tags">{cur.mood_tags.map((t) => <span key={t}>{t}</span>)}</p>}
            <ul className="mq-checks" aria-label="Automatic approval checks">
              {cur.checks.map((c) => <li key={c.id} className={c.ok ? "is-ok" : "is-no"}>{c.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}{c.label}</li>)}
              {photoCheck && (() => { const v = verdicts[cur.id]; return v === "checking" || !v ? <li className="is-wait"><Clock size={14} aria-hidden />Checking the photo…</li> : <li className={v.ok ? "is-ok" : "is-no"}>{v.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}Photo: {v.reason}</li>; })()}
            </ul>
            {cur.claimed_dog_id && (
              <p className="mq-claim">The reporter says this is <Link href={`/dog/${cur.claimed_dog_id}`} target="_blank">{animalTag({ id: cur.claimed_dog_id })}</Link>. Check the record before linking.</p>
            )}
            <div className="mq-do">
              <button type="button" className="x-btn is-flame" disabled={busy} onClick={() => act("approve")}>Approve as new <kbd>A</kbd></button>
              {cur.claimed_dog_id && <button type="button" className="x-btn is-ink" disabled={busy} onClick={() => act("approve", cur.claimed_dog_id!)}>Approve as that animal</button>}
              <button type="button" className="x-btn" disabled={busy} onClick={() => act("reject")}>Reject <kbd>R</kbd></button>
              <button type="button" className="x-btn is-ghost" disabled={busy || (items?.length ?? 0) < 2} onClick={skip}>Skip <kbd>→</kbd></button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
