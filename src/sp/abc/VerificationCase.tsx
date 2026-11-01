"use client";

/* NGO · Verification · one case. The five evidence items, who signed what,
   and the history. Actions appear only for the role that may take them,
   and the database checks every one again: a veterinarian authorises, a
   coordinator or admin approves or returns, nobody reviews their own
   sign-off, and a record in a submitted package is locked here. */

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check } from "lucide-react";
import {
  EVIDENCE_KINDS, EVIDENCE_LABEL, HISTORY_LABEL, NotEnabled, addEvidence, caseAttestations, caseChecklist, caseEvidence, caseHead, caseHistory,
  myContext, returnEvidence, reviewEvidence, uploadEvidenceFile, vetAuthorise, withdrawSignOff,
  type AbcContext, type Attestation, type Checklist, type Evidence, type EvidenceKind, type HistoryRow,
} from "@/lib/abc";
import { useAuth } from "@/components/auth/AuthProvider";
import { NgoGate } from "../ngo/Gate";
import { Reading } from "../ui/Reading";
import { EvidenceLink } from "./EvidenceLink";
import "../ngo/ngo.css";
import "./abc.css";

type Data = { head: Awaited<ReturnType<typeof caseHead>>; chk: Checklist; ev: Evidence[]; att: Attestation[]; hist: HistoryRow[]; ctx: AbcContext };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function VerificationCase({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [head, chk, ev, att, hist, ctx] = await Promise.all([caseHead(id), caseChecklist(id), caseEvidence(id), caseAttestations(id), caseHistory(id), myContext()]);
      setD({ head, chk, ev, att, hist, ctx }); setErr(null);
    } catch (e) { if (e instanceof NotEnabled) setOff(true); else setErr((e as Error).message); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  return (
    <NgoGate title="Verification" lede="Every ABC procedure with its evidence, veterinary sign-off and review.">
      <div className="ngo-page abc">
        <Link href="/ngo/verification" className="abc-back"><ArrowLeft size={14} aria-hidden />Verification</Link>
        {off ? <div className="abc-empty"><b>Verification is not switched on here yet.</b></div>
          : err ? <p className="abc-err" role="alert">{err}</p>
          : !d ? <div className="abc-empty"><Reading>Reading this procedure</Reading></div>
          : <Body d={d} busy={busy} msg={msg} act={act} id={id} />}
      </div>
    </NgoGate>
  );
}

function Body({ d, busy, msg, act, id }: { d: Data; busy: boolean; msg: { ok: boolean; text: string } | null; act: (fn: () => Promise<unknown>, done: string) => Promise<void>; id: string }) {
  const live = (k: Attestation["kind"]) => d.att.find((a) => a.kind === k && !a.revoked_at) ?? null;
  const vet = live("vet_authorised"), rev = live("evidence_reviewed"), ret = live("evidence_returned");
  const role = d.ctx.role;
  const canSign = role === "veterinarian";
  const canReview = role === "coordinator" || role === "admin";
  const { user } = useAuth();
  const me = user?.id ?? null;
  const selfSigned = !!vet && vet.actor_id === me;
  const locked = d.chk.government_accepted || d.hist.some((h) => h.kind === "package:submitted") && !d.hist.some((h) => h.kind === "package:returned");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [why, setWhy] = useState("");
  const [allHist, setAllHist] = useState(false);

  return (
    <>
      <header className="ngo-head abc-head">
        <div><h1>{d.head?.title || d.head?.case_code || "ABC procedure"}</h1></div>
        <p className="ngo-sum">{[d.head?.zone || d.head?.city, d.head ? `opened ${when(d.head.created_at)}` : null].filter(Boolean).join(" · ")}{d.head?.case_code && <span className="abc-code" title={d.head.case_code}>{d.head.case_code.length > 16 ? `${d.head.case_code.slice(0, 13)}…` : d.head.case_code}</span>}</p>
      </header>
      {msg && <p className={msg.ok ? "abc-ok" : "abc-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <div className="abc-grid">
        <div>
          <section className="abc-sec" aria-labelledby="ev-h">
            <h2 id="ev-h">Evidence · {5 - d.chk.missing.length} of 5</h2>
            <ul className="abc-check">{EVIDENCE_KINDS.map((k) => { const e = [...d.ev].reverse().find((x) => x.kind === k); return (
              <li key={k}>
                <span className={`ck${e ? " is-on" : ""}`} aria-hidden>{e && <Check size={11} strokeWidth={3} />}</span>
                <span>{EVIDENCE_LABEL[k]}<small>{e ? [e.location_text, when(e.created_at)].filter(Boolean).join(" · ") : "Missing"}</small></span>
                {e?.url ? <EvidenceLink url={e.url} /> : <span />}
              </li>
            ); })}</ul>
            {!locked && d.chk.missing.length > 0 && <AddEvidence missing={d.chk.missing} busy={busy} onAdd={(k, v) => act(async () => {
              const url = v.file ? await uploadEvidenceFile(d.ctx.ngo_id ?? "", id, k, v.file) : v.url;
              return addEvidence(id, k, { url, location: v.location });
            }, `${EVIDENCE_LABEL[k]} added.`)} />}
          </section>

          <section className="abc-sec" aria-labelledby="hist-h">
            <h2 id="hist-h">History</h2>
            {d.hist.length ? <ol className="abc-hist">{(allHist ? d.hist : d.hist.slice(-5)).map((h, i) => (
              <li key={i}><time dateTime={h.at}>{when(h.at)}</time><span><b>{HISTORY_LABEL(h.kind)}</b>{h.actor ? ` · ${h.actor}` : ""}{h.detail && <small>{h.detail}</small>}</span></li>
            ))}</ol> : <p className="abc-hint">Nothing recorded yet</p>}
            {d.hist.length > 5 && <button type="button" className="abc-more" onClick={() => setAllHist((v) => !v)}>{allHist ? "Show latest" : `Show all ${d.hist.length}`}</button>}
          </section>
        </div>

        <aside className="abc-side" aria-label="Sign-offs">
          <div className="abc-sign">
            <b>Veterinary authorisation</b>
            <p>{vet ? `${vet.actor_name} · ${when(vet.created_at)}` : d.chk.items.surgery_record ? "Waiting for a veterinarian" : "Needs the surgery record"}</p>
            {!locked && !vet && canSign && d.chk.items.surgery_record && (
              <>
                <textarea className="textarea" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Authorisation note" />
                <div className="acts"><button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => act(() => vetAuthorise(id, note), "Procedure authorised in your name.").then(() => setNote(""))}>Authorise procedure</button></div>
              </>
            )}
            {!locked && vet && (vet.actor_id === me || role === "admin") && (
              <>
                <textarea className="textarea" placeholder="Why it is withdrawn" value={why} onChange={(e) => setWhy(e.target.value)} aria-label="Why the authorisation is withdrawn" />
                <div className="acts"><button type="button" className="btn is-s" disabled={busy || !why.trim()} onClick={() => act(() => withdrawSignOff(vet.id, why), "Authorisation withdrawn. Any approval that relied on it was withdrawn too.").then(() => setWhy(""))}>Withdraw authorisation</button></div>
              </>
            )}
          </div>

          <div className="abc-sign">
            <b>Evidence review</b>
            <p>{rev ? `Approved · ${rev.actor_name} · ${when(rev.created_at)}` : ret ? `Returned · ${ret.actor_name}: ${ret.note}` : "Not reviewed yet"}</p>
            {!locked && canReview && !rev && (
              selfSigned ? <p className="abc-note">You signed this procedure. Someone else reviews it.</p> : (
                <>
                  <textarea className="textarea" placeholder="Note (required to return)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Review note or return reason" />
                  <div className="acts">
                    <button type="button" className="btn is-ink is-s" disabled={busy || d.chk.missing.length > 0 || !vet} onClick={() => act(() => reviewEvidence(id, reason), "Evidence approved for reporting.").then(() => setReason(""))}>Approve for reporting</button>
                    <button type="button" className="btn is-s" disabled={busy || !reason.trim()} onClick={() => act(() => returnEvidence(id, reason), "Returned with your reason.").then(() => setReason(""))}>Return</button>
                  </div>
                  {(d.chk.missing.length > 0 || !vet) && <p className="abc-hint">{d.chk.missing.length > 0 ? "Approve after all five items" : "Approve after the vet signs"}</p>}
                </>
              )
            )}
            {!locked && rev && (rev.actor_id === me || role === "admin") && (
              <>
                <textarea className="textarea" placeholder="Why it is withdrawn" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Withdrawal reason" />
                <div className="acts"><button type="button" className="btn is-s" disabled={busy || !reason.trim()} onClick={() => act(() => withdrawSignOff(rev.id, reason), "Approval withdrawn.").then(() => setReason(""))}>Withdraw approval</button></div>
              </>
            )}
          </div>

          <div className="abc-sign">
            <b>Reviewing office</b>
            <p>{d.chk.government_accepted ? "Accepted" : locked ? "Submitted · locked" : rev ? <>Ready for a <Link href="/ngo/packages">package</Link></> : "After approval"}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function AddEvidence({ missing, busy, onAdd }: { missing: EvidenceKind[]; busy: boolean; onAdd: (k: EvidenceKind, v: { url?: string; location?: string; file?: File }) => Promise<void> }) {
  const [kind, setKind] = useState<EvidenceKind>(missing[0]);
  const [val, setVal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [byLink, setByLink] = useState(false);
  const [key, setKey] = useState(0);
  useEffect(() => { if (!missing.includes(kind)) setKind(missing[0]); }, [missing, kind]);
  const isPlace = kind === "release_location";
  const useFile = !isPlace && !byLink;
  const ready = useFile ? !!file : !!val.trim();
  const reset = () => { setVal(""); setFile(null); setKey((k) => k + 1); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!ready) return;
    await onAdd(kind, isPlace ? { location: val } : useFile ? { file: file! } : { url: val });
    reset();
  };
  return (
    <form className="abc-form" onSubmit={submit}>
      <div className="row2">
        <select className="select" value={kind} onChange={(e) => { setKind(e.target.value as EvidenceKind); reset(); }} aria-label="Evidence to add">{missing.map((k) => <option key={k} value={k}>{EVIDENCE_LABEL[k]}</option>)}</select>
        {isPlace ? <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Where the animal was released" aria-label="Release location" />
          : useFile ? (
            <label className="abc-file">
              <input key={key} type="file" accept={kind === "surgery_record" ? "image/*,application/pdf" : "image/*"} capture={kind === "surgery_record" ? undefined : "environment"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label={`${EVIDENCE_LABEL[kind]} file`} />
              <span>{file ? file.name : kind === "surgery_record" ? "Take a photo or choose a PDF" : "Take or choose a photo"}</span>
            </label>
          ) : <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Link to the file" aria-label="File link" inputMode="url" />}
        <button type="submit" className="btn is-s" disabled={busy || !ready}>{busy ? "Saving" : "Add"}</button>
      </div>
      {!isPlace && <button type="button" className="abc-more" onClick={() => { setByLink((v) => !v); reset(); }}>{byLink ? "Upload a file instead" : "Use a link instead"}</button>}
      {useFile && <p className="abc-hint">Kept private to your organisation and, once submitted, the reviewing office.</p>}
    </form>
  );
}
