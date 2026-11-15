"use client";

/* Identity review, find by photo (AnimalID, flag animal_id). A photo is compared with the register by the AnimalID worker
   and a person decides: same animal, not this one, or a new animal. Similarity is shown as raw similarity, never as a
   probability. Nothing is merged and no history is edited; each decision is audited and can be reversed. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check as Tick, RotateCcw, X } from "lucide-react";
import { BAND_LABEL, datasetSummary, decide, photoLink, readCandidates, readDecisions, readJob, requestIndex, requestSearch, reverse, uploadSearchPhoto, type Candidate, type Decision, type Job, type Summary } from "@/lib/animalid";
import { getSupabase } from "@/lib/supabase";
import { Confirm, Field, Modal, Section, dayTime, errText, useAct, words } from "../../kit";
import { Chip } from "../../ui";
import { shortCode } from "../../data/ngo";

function Thumb({ uri, alt }: { uri: string | null | undefined; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; void photoLink(uri).then((s) => { if (live) setSrc(s); }).catch(() => {}); return () => { live = false; }; }, [uri]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} /> : <span aria-hidden style={{ width: 56, height: 56, borderRadius: 8, background: "var(--hover)", display: "inline-block" }} />;
}

export function PhotoSearch({ ngoId, admin }: { ngoId: string; admin: boolean }) {
  const [job, setJob] = useState<Job | null>(null);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [waited, setWaited] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [linkNew, setLinkNew] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; label: string }[]>([]);
  const [same, setSame] = useState<Candidate | null>(null);
  const [rev, setRev] = useState<Decision | null>(null);
  const [why, setWhy] = useState("");
  const timer = useRef<number | null>(null);
  const { busy, run } = useAct();

  const refresh = useCallback(async (id: string) => {
    const j = await readJob(id); setJob(j);
    if (j?.status === "done") { setCands(await readCandidates(id)); setDecisions(await readDecisions(id)); return true; }
    return j?.status === "failed" || j?.status === "rejected_quality";
  }, []);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { if (admin) void datasetSummary().then(setSummary).catch(() => setSummary(null)); }, [admin, decisions.length]);
  useEffect(() => {
    if (!linkNew || q.trim().length < 2) { setFound([]); return; }
    const t = window.setTimeout(async () => {
      const term = q.trim().replace(/[%_,()]/g, "").slice(0, 60);
      const { data } = await getSupabase()!.from("dogs").select("id,name,straypaw_id,code").eq("ngo_id", ngoId).or(`name.ilike.%${term}%,code.ilike.%${term}%,straypaw_id.ilike.%${term}%`).order("created_at", { ascending: false }).limit(6);
      setFound(((data ?? []) as { id: string; name: string | null; straypaw_id: string | null; code: string | null }[]).map((d) => ({ id: d.id, label: `${d.name || "Unnamed animal"} · ${shortCode(d.straypaw_id ?? d.code, "no code")}` })));
    }, 250);
    return () => window.clearTimeout(t);
  }, [linkNew, q, ngoId]);

  const start = (file: File) => run("upload", async () => {
    setJob(null); setCands(null); setDecisions([]); setWaited(0); setLinkNew(false);
    try {
      const uri = await uploadSearchPhoto(ngoId, file);
      const id = await requestSearch(uri);
      await refresh(id);
      let n = 0;
      if (timer.current) window.clearInterval(timer.current);
      timer.current = window.setInterval(async () => { n += 1; setWaited(n * 2); try { if (await refresh(id) || n > 150) { window.clearInterval(timer.current!); timer.current = null; } } catch { /* keep trying */ } }, 2000);
      return {};
    } catch (e) { return { error: errText(e) }; }
  }, { quiet: true });
  const act = (fn: () => Promise<unknown>, ok: string) => run("decide", async () => { if (!job) return { error: "Choose a photo first." }; try { await fn(); setDecisions(await readDecisions(job.id)); return {}; } catch (e) { return { error: errText(e) }; } }, { ok });

  const live = decisions.filter((d) => !d.reversed_at);
  const settled = live.find((d) => d.decision !== "not_this_animal");
  const rejected = new Set(live.filter((d) => d.decision === "not_this_animal").map((d) => d.dog_id));
  const waiting = job && (job.status === "queued" || job.status === "running");
  return (
    <div style={{ marginTop: 24 }}>
      <Section title="Find by photo" action={<label className="nx-btn is-quiet is-sm" style={{ cursor: "pointer" }}><Camera size={13} />{job ? "Another photo" : "Choose a photo"}<input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void start(f); }} /></label>}>
        <p className="nx-sub" style={{ marginTop: 0 }}>Compare a photo with your register. The comparison suggests; a person decides.</p>
        {busy === "upload" && !job ? <p className="nr-quiet" role="status">Uploading the photo…</p> : null}
        {waiting ? <div className="nr-acts" role="status"><Thumb uri={job!.photo_uri} alt="Photo being compared" /><span>{job!.status === "running" ? "Comparing with your register…" : "Queued for comparison…"}{waited >= 30 && job!.status === "queued" ? <small className="nr-hint" style={{ display: "block" }}>The identity service has not picked this up yet. Your photo is saved and is compared when it runs.</small> : null}</span></div> : null}
        {job?.status === "rejected_quality" ? <div className="nr-err"><b>This photo cannot be compared reliably.</b> {(job.quality?.reasons ?? [job.error ?? "Poor photo"]).join(" ")}</div> : null}
        {job?.status === "failed" ? <p className="nr-err" role="alert">The comparison failed: {job.error ?? "no reason given"}. Try again.</p> : null}
        {job?.status === "done" && cands ? <div style={{ display: "grid", gap: 10 }}>
          {settled ? <p className="nr-ok"><Tick size={13} /> Recorded as {settled.decision === "same_animal" ? "the same animal" : "a new animal"}. {settled.dog_id ? <Link className="nr-link" href={`/next/ngo/animals/${settled.dog_id}`}>Open the animal</Link> : null}</p>
            : cands.length ? <p className="nr-hint">Closest animals on your register. Similarity compares photo features; it is not a probability.</p> : <p className="nr-quiet">No animal on your register has an indexed photo yet.</p>}
          {cands.length ? <ul className="nr-items">{cands.map((c) => <li key={c.id} className="nr-item" style={rejected.has(c.dog_id) ? { opacity: .5 } : undefined}>
            <Thumb uri={c.matched_photo_uri} alt={c.dog?.name ?? "Candidate animal"} />
            <span className="nr-item-t"><b>{c.dog?.name || "Unnamed animal"}</b><small>{shortCode(c.dog?.straypaw_id ?? c.dog?.code, "no code")}{c.dog?.zone ? ` · ${c.dog.zone}` : ""}</small></span>
            <span className="nr-item-e"><span title="Raw similarity of photo features, not a probability"><Chip tone={c.band === "strong" ? "accent" : "plain"}>{BAND_LABEL[c.band]} · {c.similarity.toFixed(2)}</Chip></span>
              {!settled && !rejected.has(c.dog_id) ? <><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => setSame(c)}><Tick size={13} />Same animal</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void act(() => decide(job.id, "not_this_animal", c.dog_id), "Recorded: not this animal.")}><X size={13} />Not this one</button></> : null}</span>
          </li>)}</ul> : null}
          {!settled ? (linkNew ? <div className="nr-sheet"><Field label="Link the photo to the new animal's record"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code of the record you registered" /></Field>
            <div className="nr-pick">{found.map((f) => <button key={f.id} type="button" disabled={!!busy} onClick={() => void act(() => decide(job.id, "new_animal", f.id), "Recorded as a new animal.")}>{f.label}</button>)}</div>
            <p className="nr-hint">Not on the register yet? Record it first in <Link className="nr-link" href="/next/ngo/field">field mode</Link>.</p></div>
            : <p><button type="button" className="nr-link" onClick={() => setLinkNew(true)}>None of these: it is a new animal</button></p>) : null}
          {decisions.length ? <details className="nr-more-d"><summary>Decisions on this photo · {decisions.length}</summary><ul className="nr-items">{decisions.map((d) => <li key={d.id} className="nr-item"><span className="nr-item-t"><b>{words(d.decision)}</b><small>{dayTime(d.decided_at)}{d.reversed_at ? ` · reversed: ${d.reversal_reason}` : ""}</small></span>{!d.reversed_at ? <span className="nr-item-e"><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => { setRev(d); setWhy(""); }}><RotateCcw size={12} />Reverse</button></span> : null}</li>)}</ul></details> : null}
        </div> : null}
        {admin ? <details className="nr-more-d" style={{ marginTop: 12 }}><summary>Identity data for your organisation</summary>
          {summary ? <><dl className="nr-dl">{([["Indexed photos", summary.indexed_photos], ["Animals indexed", summary.indexed_animals], ["Confirmed identities", summary.confirmed_identities], ["Animals seen again", summary.repeat_encounter_animals], ["Reversed decisions", summary.reversals], ["Conflicts", summary.conflicts], ["Eligible for training", summary.training_eligible]] as [string, number][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
            <p className="nr-hint">Training use is {summary.training_allowed ? "allowed by your organisation" : "off"}. Photos are used for training only with your organisation&apos;s permission, and training is never automatic.</p>
            <div className="nr-acts"><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run("index", async () => { try { await requestIndex(); return {}; } catch (e) { return { error: errText(e) }; } }, { ok: "Indexing queued. Profile photos are compared once the identity service has indexed them." })}>Index profile photos</button></div></>
            : <p className="nr-quiet">Not read.</p>}
        </details> : null}
      </Section>
      {same && job ? <Confirm title="Record this photo as the same animal?" confirm="Same animal" busy={!!busy} onClose={() => setSame(null)} onConfirm={() => void act(() => decide(job.id, "same_animal", same.dog_id), "Recorded as the same animal.").then((r) => { if (r.ok) setSame(null); })}><p>Both records stay as they are. The decision is audited and can be reversed.</p></Confirm> : null}
      {rev ? <Modal title="Reverse this decision?" onClose={() => setRev(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setRev(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!why.trim() || !!busy} onClick={() => void act(() => reverse(rev.id, why.trim()), "Decision reversed.").then((r) => { if (r.ok) setRev(null); })}>Reverse</button></>}><Field label="Why is this decision wrong?"><textarea value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} /></Field></Modal> : null}
    </div>
  );
}
