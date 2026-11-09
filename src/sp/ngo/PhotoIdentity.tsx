"use client";

/* Identity review → Find by photo (AnimalID, feature-flagged).
   Upload a photo, the AnimalID worker compares it with your register, and a
   person decides: same animal, not this one, or a new animal. Similarity is
   shown as raw similarity, never as a probability. Nothing is merged and no
   history is edited; every decision is audited and can be reversed. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RotateCcw, X } from "lucide-react";
import { BAND_LABEL, datasetSummary, decide, photoLink, readCandidates, readDecisions, readJob, requestIndex, requestSearch, reverse, uploadSearchPhoto, type Candidate, type Decision, type Job, type Summary } from "@/lib/animalid";
import { getSupabase } from "@/lib/supabase";
import { shortCode } from "@/lib/caseCode";
import { Reading } from "../ui/Reading";
import "./animalid.css";

type Found = { id: string; label: string };

function Thumb({ uri, alt }: { uri: string | null | undefined; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; void photoLink(uri).then((s) => live && setSrc(s)).catch(() => {}); return () => { live = false; }; }, [uri]);
  return src ? <img className="pid-thumb" src={src} alt={alt} /> : <span className="pid-thumb is-empty" aria-hidden />;
}

export function PhotoIdentity({ ngoId, admin }: { ngoId: string; admin: boolean }) {
  const [job, setJob] = useState<Job | null>(null);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [waited, setWaited] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [linkNew, setLinkNew] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async (id: string) => {
    const j = await readJob(id);
    setJob(j);
    if (j?.status === "done") { setCands(await readCandidates(id)); setDecisions(await readDecisions(id)); return true; }
    return j?.status === "failed" || j?.status === "rejected_quality";
  }, []);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { if (admin) void datasetSummary().then(setSummary).catch(() => setSummary(null)); }, [admin, decisions.length]);

  const start = async (file: File) => {
    setBusy(true); setErr(null); setJob(null); setCands(null); setDecisions([]); setWaited(0); setLinkNew(false);
    try {
      const uri = await uploadSearchPhoto(ngoId, file);
      const id = await requestSearch(uri);
      await refresh(id);
      let n = 0;
      if (timer.current) window.clearInterval(timer.current);
      timer.current = window.setInterval(async () => {
        n += 1; setWaited(n * 2);
        try { if (await refresh(id) || n > 150) { window.clearInterval(timer.current!); timer.current = null; } } catch { /* keep trying */ }
      }, 2000);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<unknown>) => {
    if (!job) return;
    setBusy(true); setErr(null);
    try { await fn(); setDecisions(await readDecisions(job.id)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!linkNew || q.trim().length < 2) { setFound([]); return; }
    const t = window.setTimeout(async () => {
      const term = q.trim().replace(/[%_,()]/g, "").slice(0, 60);
      const { data } = await getSupabase()!.from("dogs").select("id,name,straypaw_id,code").eq("ngo_id", ngoId).or(`name.ilike.%${term}%,code.ilike.%${term}%,straypaw_id.ilike.%${term}%`).order("created_at", { ascending: false }).limit(6);
      setFound(((data ?? []) as { id: string; name: string | null; straypaw_id: string | null; code: string | null }[]).map((d) => ({ id: d.id, label: `${d.name || "Unnamed animal"} · ${shortCode(d.straypaw_id ?? d.code, "no code")}` })));
    }, 250);
    return () => window.clearTimeout(t);
  }, [linkNew, q, ngoId]);

  const live = decisions.filter((d) => !d.reversed_at);
  const settled = live.find((d) => d.decision !== "not_this_animal");
  const rejected = new Set(live.filter((d) => d.decision === "not_this_animal").map((d) => d.dog_id));
  const waiting = job && (job.status === "queued" || job.status === "running");

  return (
    <section className="pid" aria-labelledby="pid-h">
      <header className="pid-head">
        <div><h2 id="pid-h">Find by photo</h2><p>Compare a photo with your register. Kaju suggests; you decide.</p></div>
        <label className={`btn is-ink is-s${busy ? " is-busy" : ""}`}>
          <Camera size={14} aria-hidden /> {job ? "Another photo" : "Choose a photo"}
          <input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void start(f); }} />
        </label>
      </header>

      {err && <p className="pid-err" role="alert">{err}</p>}
      {busy && !job && <p role="status"><Reading>Uploading the photo</Reading></p>}
      {waiting && (
        <div className="pid-wait" role="status">
          <Thumb uri={job!.photo_uri} alt="Photo being searched" />
          <div><Reading>{job!.status === "running" ? "Comparing with your register" : "Queued for comparison"}</Reading>
            {waited >= 30 && job!.status === "queued" && <small>The identity service has not picked this up yet. Your photo is saved and will be compared when it runs.</small>}</div>
        </div>
      )}
      {job?.status === "rejected_quality" && (
        <div className="pid-note"><b>This photo cannot be compared reliably</b><ul>{(job.quality?.reasons ?? [job.error ?? "Poor photo"]).map((r) => <li key={r}>{r}</li>)}</ul></div>
      )}
      {job?.status === "failed" && <p className="pid-err" role="alert">The comparison failed: {job.error ?? "unknown error"}. Try again.</p>}

      {job?.status === "done" && cands && (
        <div className="pid-result">
          <div className="pid-query"><Thumb uri={job.photo_uri} alt="Your photo" /><small>Your photo</small></div>
          <div className="pid-list">
            {settled ? (
              <p className="pid-done"><Check size={15} aria-hidden /> Recorded as {settled.decision === "same_animal" ? "the same animal" : "a new animal"}. <Link className="link" href={`/ngo/animals/${settled.dog_id}`}>Open the animal</Link></p>
            ) : cands.length ? <p className="pid-sub">Closest animals in your register. Similarity compares photo features; it is not a probability.</p>
              : <p className="pid-sub">No animal in your register has an indexed photo yet.</p>}
            <ul>{cands.map((c) => (
              <li key={c.id} className={rejected.has(c.dog_id) ? "is-out" : undefined}>
                <Thumb uri={c.matched_photo_uri} alt={c.dog?.name ?? "Candidate animal"} />
                <span className="pid-who"><b>{c.dog?.name || "Unnamed animal"}</b><small>{shortCode(c.dog?.straypaw_id ?? c.dog?.code, "no code")}{c.dog?.zone ? ` · ${c.dog.zone}` : ""}</small></span>
                <span className={`pid-band is-${c.band}`} title="Raw cosine similarity of photo features, not a probability">{BAND_LABEL[c.band]} · {c.similarity.toFixed(2)}</span>
                {!settled && !rejected.has(c.dog_id) && (
                  <span className="pid-act">
                    <button type="button" className="btn is-s" disabled={busy} onClick={() => { if (window.confirm(`Record this photo as ${c.dog?.name || "this animal"}? Both records stay as they are; this can be reversed.`)) void act(() => decide(job.id, "same_animal", c.dog_id)); }}><Check size={13} aria-hidden /> Same animal</button>
                    <button type="button" className="btn is-ghost is-s" disabled={busy} onClick={() => void act(() => decide(job.id, "not_this_animal", c.dog_id))}><X size={13} aria-hidden /> Not this one</button>
                  </span>
                )}
              </li>))}</ul>
            {!settled && (linkNew ? (
              <div className="pid-new">
                <label htmlFor="pid-q">Link the photo to the new animal&apos;s record</label>
                <input id="pid-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code of the record you registered" />
                <ul>{found.map((f) => <li key={f.id}><button type="button" className="link" disabled={busy} onClick={() => void act(() => decide(job.id, "new_animal", f.id))}>{f.label}</button></li>)}</ul>
                <small>Register it first in <Link className="link" href="/ngo/field">Field mode</Link> if it is not on the register yet.</small>
              </div>
            ) : <button type="button" className="link pid-none" onClick={() => setLinkNew(true)}>None of these: it is a new animal</button>)}
            {decisions.length > 0 && (
              <details className="pid-log"><summary>Decisions on this photo · {decisions.length}</summary><ul>{decisions.map((d) => (
                <li key={d.id}><span>{d.decision.replace(/_/g, " ")} · {new Date(d.decided_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{d.reversed_at ? ` · reversed: ${d.reversal_reason}` : ""}</span>
                  {!d.reversed_at && <button type="button" className="link" disabled={busy} onClick={() => { const why = window.prompt("Why is this decision wrong?"); if (why?.trim()) void act(() => reverse(d.id, why.trim())); }}><RotateCcw size={12} aria-hidden /> Reverse</button>}</li>))}</ul></details>
            )}
          </div>
        </div>
      )}

      {admin && (
        <details className="pid-admin">
          <summary>Identity data for your organisation</summary>
          {summary ? (
            <>
              <ul className="pid-stats">
                {([["Indexed photos", summary.indexed_photos], ["Animals indexed", summary.indexed_animals], ["Confirmed identities", summary.confirmed_identities], ["Animals seen again", summary.repeat_encounter_animals], ["Reversed decisions", summary.reversals], ["Conflicts", summary.conflicts], ["Eligible for training", summary.training_eligible]] as [string, number][]).map(([k, v]) => <li key={k}><b>{v}</b><span>{k}</span></li>)}
              </ul>
              <p className="pid-sub">Training use is {summary.training_allowed ? "allowed by your organisation" : "off"}. Photos are used for training only with your organisation&apos;s permission, and training is never automatic.</p>
              <button type="button" className="btn is-s" disabled={busy} onClick={() => void requestIndex().then(() => { setErr(null); setNote("Indexing queued. Profile photos are compared once the identity service has indexed them."); }).catch((e) => setErr((e as Error).message))}>Index profile photos</button>
              {note && <p className="pid-sub" role="status">{note}</p>}
            </>
          ) : <p className="pid-sub">Not read.</p>}
        </details>
      )}
    </section>
  );
}
