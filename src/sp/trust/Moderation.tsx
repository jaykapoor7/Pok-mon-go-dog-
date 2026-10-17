"use client";

/* ════════════════════════════════════════════════════════════════════
   Trust · moderation (decision 041). One report at a time: the photo
   (covered when it may show injury), what the reporter said, the
   automatic approval checks, and three answers: approve, reject, skip
   (A, R, →). Reports that pass every check can be approved together.
   Talks to the existing /api/admin/sightings service with the
   moderation password; the server decides, the page shows its answer.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock, MapPin, ShieldCheck, X } from "lucide-react";
import { animalTag } from "@/lib/animal-name";
import { describesInjury } from "@/lib/sensitive-photo";
import { Portrait } from "../ui/Portrait";
import { publicLocality } from "../ui/place";
import { Ack, ArtSlot, since } from "../ui";
import "./trust.css";

const KEY = "straypaw.admin_secret";
type CheckRow = { id: string; label: string; ok: boolean };
type Pending = {
  id: string; reporter_name: string | null; zone: string | null; nickname: string | null; photo_url: string | null; notes: string | null;
  mood_tags: string[] | null; created_at: string; lat: number | null; lng: number | null; claimed_dog_id: string | null;
  volunteer_name: string | null; reporter_kind: "organisation" | "signed-in" | "guest"; checks: CheckRow[]; passes: boolean;
};
type Verdict = { ok: boolean; reason: string; injury?: boolean };

export function Moderation() {
  const [secret, setSecret] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [items, setItems] = useState<Pending[] | null>(null);
  const [auto, setAuto] = useState(true);
  const [photoCheck, setPhotoCheck] = useState(false);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [done, setDone] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | "checking">>({});

  const call = useCallback((s: string, body?: object) => fetch("/api/admin/sightings", body ? { method: "POST", headers: { Authorization: `Bearer ${s}`, "Content-Type": "application/json" }, body: JSON.stringify(body) } : { headers: { Authorization: `Bearer ${s}` }, cache: "no-store" }).catch(() => null), []);
  const load = useCallback(async (s: string) => {
    setMsg(null);
    const res = await call(s);
    if (!res) { setMsg({ ok: false, t: "The moderation service could not be reached." }); return; }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ ok: false, t: j.error ?? "Not loaded." }); if (res.status === 401) { setSecret(null); try { localStorage.removeItem(KEY); } catch {} } return; }
    setSecret(s); setItems(j.pending ?? []); setAuto(j.autoApproval !== false); setPhotoCheck(!!j.photoCheck); setAt(0);
    try { localStorage.setItem(KEY, s); } catch {}
  }, [call]);
  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) void load(s); } catch {} }, [load]);

  const cur = items?.[at] ?? null;
  const passing = useMemo(() => (items ?? []).filter((x) => x.passes).length, [items]);
  const act = useCallback(async (action: "approve" | "reject", dogId?: string) => {
    if (!cur || !secret || busy) return;
    setBusy(true); setMsg(null);
    const res = await call(secret, { action, id: cur.id, ...(dogId ? { dogId } : {}) });
    setBusy(false);
    if (!res?.ok) { const j = await res?.json().catch(() => ({})); setMsg({ ok: false, t: j?.error ?? "That did not go through. Nothing changed." }); return; }
    setMsg({ ok: true, t: action === "approve" ? (dogId ? "Approved as that animal's sighting" : "Approved as a new animal") : "Rejected" });
    setDone((n) => n + 1);
    setItems((xs) => (xs ?? []).filter((x) => x.id !== cur.id));
    setAt((i) => Math.max(0, Math.min(i, (items?.length ?? 1) - 2)));
  }, [cur, secret, busy, items, call]);
  const skip = useCallback(() => setAt((i) => ((items?.length ?? 0) ? (i + 1) % items!.length : 0)), [items]);
  const approvePassing = async () => {
    if (!secret || !passing) return;
    setBusy(true);
    const res = await call(secret, { action: "approve_passing" });
    setBusy(false);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) { setMsg({ ok: false, t: j?.error ?? "That did not go through." }); return; }
    const ids = new Set<string>(j.approved ?? []);
    setDone((n) => n + ids.size); setMsg({ ok: true, t: `${ids.size} approved` });
    setItems((xs) => (xs ?? []).filter((x) => !ids.has(x.id))); setAt(0);
  };
  useEffect(() => {
    if (!cur || !secret || !photoCheck || verdicts[cur.id] || !cur.photo_url) return;
    setVerdicts((v) => ({ ...v, [cur.id]: "checking" }));
    call(secret, { action: "photo_check", id: cur.id }).then((r) => r?.json()).then((j) => setVerdicts((v) => ({ ...v, [cur.id]: j?.verdict ?? { ok: false, reason: "Photo check unavailable" } }))).catch(() => setVerdicts((v) => ({ ...v, [cur.id]: { ok: false, reason: "Photo check failed" } })));
  }, [cur, secret, photoCheck, verdicts, call]);
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
    <div className="tr">
      <form className="tr-gate" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) void load(typed.trim()); }}>
        <p className="k">Trust · moderation</p>
        <h1 className="display">Review new reports</h1>
        <p className="body">For StrayPaw moderators. The password is checked by the server on every action.</p>
        <input className="input" type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Moderation password" aria-label="Moderation password" autoComplete="current-password" />
        <button type="submit" className="btn is-ink">Open the queue</button>
        {msg && <Ack state="failed">{msg.t}</Ack>}
      </form>
    </div>
  );

  const v = cur ? verdicts[cur.id] : undefined;
  return (
    <div className="tr">
      <header className="tr-head">
        <div><p className="k">Trust · moderation</p><h1 className="serif">Reports to review</h1><p className="small">{items === null ? "Reading…" : `${items.length} waiting${done ? ` · ${done} handled this session` : ""}`}</p></div>
        <div className="row">
          <span className={`pill ${auto ? "is-care" : "is-plain"}`}><ShieldCheck size={13} aria-hidden /> Auto-approval {auto ? "on" : "off"}{auto && photoCheck ? " · photo check on" : ""}</span>
          {passing > 0 && <button type="button" className="btn is-ink is-s" disabled={busy} onClick={approvePassing}>Approve {passing} that pass every check</button>}
          <Link className="btn is-ghost is-s" href="/trust/console">Other tools</Link>
        </div>
      </header>
      <div aria-live="polite" className="tr-msg">{msg && <Ack state={msg.ok ? "saved" : "failed"}>{msg.t}</Ack>}</div>
      {items && !items.length && <div className="tr-empty"><ArtSlot id="ngo-empty" /><h2 className="serif">All caught up</h2><p className="body">Reports that pass every check go live on their own. Anything else waits here.</p></div>}
      {cur && (
        <article className="tr-card" aria-label="Report under review">
          <div className="tr-photo"><Portrait src={cur.photo_url} tag={cur.nickname ?? "Report"} sensitive={describesInjury(cur.notes, cur.mood_tags) || (v !== undefined && v !== "checking" && v.injury === true)} size="l" alt="The reported animal" /></div>
          <div className="tr-body">
            <p className="mono small">{at + 1} of {items!.length}</p>
            <h2 className="display">{cur.nickname?.trim() || "New animal"}</h2>
            <p className="tr-meta"><MapPin size={14} aria-hidden /> {publicLocality(cur.zone) ?? cur.zone ?? "Place not given"}</p>
            <p className="tr-meta"><Clock size={14} aria-hidden /> {since(cur.created_at)} · {cur.reporter_kind === "organisation" ? `${cur.volunteer_name || "Volunteer"} for an organisation` : cur.reporter_kind === "signed-in" ? (cur.reporter_name || "Signed-in reporter") : (cur.reporter_name || "Guest")}</p>
            {cur.notes && <blockquote className="tr-notes">{cur.notes}</blockquote>}
            {!!cur.mood_tags?.length && <p className="row" style={{ ["--g" as string]: "6px" }}>{cur.mood_tags.map((t) => <span key={t} className={`pill ${t === "injured" || t === "sick" ? "is-urgent" : "is-plain"}`}>{t}</span>)}</p>}
            <ul className="tr-checks" aria-label="Automatic approval checks">
              {cur.checks.map((c) => <li key={c.id} className={c.ok ? "is-ok" : "is-no"}>{c.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}{c.label}</li>)}
              {photoCheck && cur.photo_url && (v === "checking" || !v ? <li className="is-wait"><Clock size={14} aria-hidden />Checking the photo…</li> : <li className={v.ok ? "is-ok" : "is-no"}>{v.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}Photo: {v.reason}</li>)}
            </ul>
            {cur.claimed_dog_id && <p className="tr-claim">The reporter says this is <Link className="link" href={`/animal/${cur.claimed_dog_id}`} target="_blank">{animalTag({ id: cur.claimed_dog_id })}</Link>. Compare the record before linking: a likeness alone never makes two animals one.</p>}
            <div className="tr-do">
              <button type="button" className="btn is-flame" disabled={busy} onClick={() => act("approve")}>Approve as new <kbd>A</kbd></button>
              {cur.claimed_dog_id && <button type="button" className="btn is-ink" disabled={busy} onClick={() => act("approve", cur.claimed_dog_id!)}>Approve as that animal</button>}
              <button type="button" className="btn" disabled={busy} onClick={() => act("reject")}>Reject <kbd>R</kbd></button>
              <button type="button" className="btn is-ghost" disabled={busy || (items?.length ?? 0) < 2} onClick={skip}>Skip <kbd>→</kbd></button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
