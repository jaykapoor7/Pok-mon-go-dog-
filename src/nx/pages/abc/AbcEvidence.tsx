"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check as Tick, Lock, Trash2 } from "lucide-react";
import {
  EVIDENCE_KINDS, EVIDENCE_LABEL, HISTORY_LABEL, NotEnabled, addEvidence, caseAttestations, caseChecklist, caseEvidence, caseHead, caseHistory,
  myContext, returnEvidence, reviewEvidence, uploadEvidenceFile, vetAuthorise, withdrawSignOff,
  type AbcContext, type Attestation, type Checklist, type Evidence, type EvidenceKind, type HistoryRow,
} from "@/lib/abc";
import { Chip } from "../../ui";
import { Confirm, Failed, Field, FilePick, Modal, Skeleton, Timeline, dayTime, errText, toast, useAct } from "../../kit";
import { useLive } from "../../live";
import { removeRecord, restoreRecord } from "../../data/govhealth";
import { sampleProcedure } from "../../data/govhealth-samples";
import { Block, OpenFile, SignedConfirm, TryLink } from "../gh/parts";

/* The evidence and sign-offs of one ABC case, for any role. Everyone sees the same checklist, files, signatures and
   history; each person sees only the actions their role has, and the database checks every one again. A
   veterinarian authorises the procedure (with Undo straight after); a coordinator or admin approves or returns the
   evidence, never their own sign-off; nobody changes a record that is in a submitted or accepted package. */

export type AbcHead = Awaited<ReturnType<typeof caseHead>>;
type Data = { head: AbcHead; chk: Checklist; ev: Evidence[]; att: Attestation[]; hist: HistoryRow[]; ctx: AbcContext };

/** Reads a case's evidence for the page that shows it. `sample` gives the illustrative case. */
export function useAbcCase(caseId: string, sample: boolean) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const load = useCallback(async () => {
    if (sample) { const s = sampleProcedure(caseId); setD({ ...s, head: s.head as AbcHead, ctx: { ngo_id: "ngo-1", role: "veterinarian", name: "Dr. Arun K.", offices: [] } }); return; }
    try {
      const [head, chk, ev, att, hist, ctx] = await Promise.all([caseHead(caseId), caseChecklist(caseId), caseEvidence(caseId), caseAttestations(caseId), caseHistory(caseId), myContext()]);
      setD({ head, chk, ev, att, hist, ctx }); setErr(null);
    } catch (e) { if (e instanceof NotEnabled) setOff(true); else setErr(errText(e)); }
  }, [caseId, sample]);
  useEffect(() => { void load(); }, [load]);
  return { d, err, off, reload: load };
}

export function AbcEvidence({ caseId, sample = false, data }: { caseId: string; sample?: boolean; data?: ReturnType<typeof useAbcCase> }) {
  const own = useAbcCase(caseId, sample);
  const c = data ?? own;
  if (c.off) return <p className="nx-sub">Evidence and sign-offs are not switched on for this organisation yet.</p>;
  if (c.err) return <Failed error={c.err} retry={() => void c.reload()} />;
  if (!c.d) return <Skeleton rows={6} label="Reading the evidence" />;
  return <Body caseId={caseId} sample={sample} d={c.d} reload={c.reload} />;
}

function Body({ caseId, sample, d, reload }: { caseId: string; sample: boolean; d: Data; reload: () => Promise<void> }) {
  const live = useLive();
  const me = sample ? "vet-1-not-me" : live.userId;
  const role = d.ctx.role;
  const active = (k: Attestation["kind"]) => d.att.find((a) => a.kind === k && !a.revoked_at) ?? null;
  const vet = active("vet_authorised"), rev = active("evidence_reviewed"), ret = active("evidence_returned");
  const required = (d.chk.required ?? [...EVIDENCE_KINDS]) as EvidenceKind[];
  const clinicalReady = d.chk.clinical_ready ?? d.chk.items.surgery_record;
  const locked = d.chk.amendable !== undefined ? !d.chk.amendable : d.chk.government_accepted || (d.hist.some((h) => h.kind === "package:submitted") && !d.hist.some((h) => h.kind === "package:returned"));
  const canSign = role === "veterinarian";
  const canReview = role === "coordinator" || role === "admin";
  const canAdd = !!d.ctx.ngo_id && !locked;
  const selfSigned = !!vet && vet.actor_id === me;
  const { busy, run } = useAct();
  const [dlg, setDlg] = useState<null | "authorise" | "approve" | "return" | { withdraw: Attestation } | { remove: Evidence }>(null);
  const [note, setNote] = useState(""), [reason, setReason] = useState("");

  const signed = async (fn: () => Promise<string>, done: string) => {
    const r = await run("sign", fn, { ok: done, undo: (id) => (typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? withdrawSignOff(id, "Undone straight after signing: pressed by mistake.").then(() => { toast({ text: "Sign-off withdrawn. The history notes it.", tone: "ok" }); return reload(); }).catch((e) => toast({ text: `Not undone. ${errText(e)}`, tone: "bad" })) : undefined) });
    setDlg(null); if (r.ok) { setNote(""); setReason(""); await reload(); }
  };
  const doReturn = async () => { const r = await run("return", () => returnEvidence(caseId, reason.trim()), { ok: "Returned with your reason. The team fixes it and the vet and coordinator sign again." }); setDlg(null); if (r.ok) { setReason(""); await reload(); } };
  const doWithdraw = async (a: Attestation) => { const r = await run("withdraw", () => withdrawSignOff(a.id, reason.trim()), { ok: a.kind === "vet_authorised" ? "Authorisation withdrawn. Any approval that relied on it was withdrawn too." : "Approval withdrawn." }); setDlg(null); if (r.ok) { setReason(""); await reload(); } };
  const doRemove = async (e: Evidence) => {
    const r = await run("remove", () => removeRecord("evidence", e.id, reason.trim() || null), { ok: `Deleted the ${(EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind).toLowerCase()}. A coordinator can restore it for 30 days.`, undo: (rid) => restoreRecord(String(rid)).then(() => { toast({ text: "Restored.", tone: "ok" }); return reload(); }).catch((x) => toast({ text: `Not restored. ${errText(x)}`, tone: "bad" })) });
    setDlg(null); if (r.ok) { setReason(""); await reload(); }
  };

  const missing = d.chk.missing.map((k) => (EVIDENCE_LABEL[k] ?? k).toLowerCase());
  const next = locked ? "This record is in a submitted or accepted package. It can no longer change here."
    : ret ? `Returned: ${(ret.note ?? "see the note in the history").replace(/[.\s]+$/, "")}. Fix it, then the vet and coordinator sign again.`
    : !clinicalReady ? `The surgery record is needed${canSign ? ". Add it, then authorise." : ". The veterinarian adds it and authorises."}`
    : !vet ? (canSign ? "Your veterinary authorisation." : "Veterinary authorisation by the veterinarian.")
    : missing.length ? `Missing: ${missing.join(", ")}.`
    : !rev ? (canReview ? (selfSigned ? "A coordinator other than you reviews the evidence." : "Your evidence review. Everything required is present.") : "A coordinator reviews the evidence.")
    : "Complete. It can go in the month's package.";

  return (
    <div className="gh-abc">
      <p className={`nx-note ${locked ? "" : ""}`} role="status" style={{ marginBottom: 16 }}>{locked ? <Lock size={13} /> : <Tick size={13} />}<span><b>{locked ? "Locked" : rev && !missing.length ? "Done" : ret ? "Returned" : "Next step"}:</b> {next}</span></p>
      <div className="nx-cols" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 28 }}>
        <div>
          <Block title={`Evidence · ${required.length - d.chk.missing.length} of ${required.length}`}>
            <ul className="gh-ev">{required.map((k) => { const e = [...d.ev].reverse().find((x) => x.kind === k); return (
              <li key={k}><span className={`gh-ck ${e ? "is-on" : "is-bad"}`} aria-hidden>{e ? <Tick size={10} strokeWidth={3} /> : null}</span>
                <span>{EVIDENCE_LABEL[k]}<small>{e ? [e.location_text, dayTime(e.created_at)].filter(Boolean).join(" · ") : "Missing"}</small></span>
                <span className="gh-acts">{e?.url ? <OpenFile url={e.url}>Open</OpenFile> : null}{e && canAdd ? (sample ? <TryLink sm quiet><Trash2 size={13} /></TryLink> : <button type="button" className="nx-ib" aria-label={`Delete the ${EVIDENCE_LABEL[k].toLowerCase()}`} onClick={() => { setReason(""); setDlg({ remove: e }); }}><Trash2 size={14} /></button>) : null}</span></li>); })}</ul>
            {canAdd ? <AddEvidence sample={sample} kinds={d.chk.missing.length ? d.chk.missing as EvidenceKind[] : required} onAdd={async (k, v) => {
              const r = await run("add", async () => { const url = v.file ? await uploadEvidenceFile(d.ctx.ngo_id!, caseId, k, v.file) : undefined; return addEvidence(caseId, k, { url, location: v.location }); }, { ok: `${EVIDENCE_LABEL[k]} added.` });
              if (r.ok) await reload(); return r.ok;
            }} busy={busy === "add"} /> : null}
          </Block>
          <Block title="History">
            <Timeline items={[...d.hist].reverse().slice(0, 30).map((h, i) => ({ id: `${h.at}${i}`, when: dayTime(h.at), title: HISTORY_LABEL(h.kind), who: h.actor || null, body: h.detail || undefined, tone: h.kind === "vet_authorised" || h.kind === "evidence_reviewed" || h.kind === "package:accepted" ? "ok" : h.kind.includes("returned") || h.kind.startsWith("withdrawn") ? "bad" : undefined }))} empty="Nothing recorded yet." />
          </Block>
        </div>
        <aside aria-label="Sign-offs">
          <Block title="Veterinary authorisation">
            <p className="nx-sub" style={{ marginTop: 0 }}>{vet ? <>{vet.actor_name} · {dayTime(vet.created_at)}{vet.note ? ` · ${vet.note}` : ""}</> : clinicalReady ? "Waiting for a veterinarian." : "Needs the surgery record first."}</p>
            {!locked && !vet && canSign && clinicalReady ? <div className="gh-form"><Field label="Note (optional)"><textarea value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} /></Field><div className="gh-acts">{sample ? <TryLink sm>Authorise the procedure</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => setDlg("authorise")}>Authorise the procedure</button>}</div></div> : null}
            {!locked && vet && (vet.actor_id === me || role === "admin") ? <div className="gh-acts" style={{ marginTop: 8 }}>{sample ? <TryLink sm quiet>Withdraw authorisation</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => { setReason(""); setDlg({ withdraw: vet }); }}>Withdraw authorisation</button>}</div> : null}
          </Block>
          <Block title="Evidence review">
            <p className="nx-sub" style={{ marginTop: 0 }}>{rev ? <>Approved · {rev.actor_name} · {dayTime(rev.created_at)}</> : ret ? <>Returned · {ret.actor_name}: {ret.note}</> : "Not reviewed yet."}</p>
            {!locked && canReview && !rev ? (selfSigned ? <p className="gh-hint">You signed this procedure. Someone else reviews it.</p> : (
              <div className="gh-form">
                <Field label="Note" hint="Required to return."><textarea value={reason} maxLength={600} onChange={(e) => setReason(e.target.value)} /></Field>
                <div className="gh-acts">{sample ? <><TryLink sm>Approve for reporting</TryLink><TryLink sm quiet>Return</TryLink></> : <>
                  <button type="button" className="nx-btn is-sm" disabled={!!busy || d.chk.missing.length > 0 || !vet} onClick={() => setDlg("approve")}>Approve for reporting</button>
                  <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy || !reason.trim()} onClick={() => setDlg("return")}>Return</button></>}</div>
                {d.chk.missing.length > 0 || !vet ? <p className="gh-hint">{d.chk.missing.length > 0 ? "Approval waits for the required evidence." : "Approval waits for the veterinarian's authorisation."}</p> : null}
              </div>)) : null}
            {!locked && rev && (rev.actor_id === me || role === "admin") ? <div className="gh-acts" style={{ marginTop: 8 }}>{sample ? <TryLink sm quiet>Withdraw approval</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => { setReason(""); setDlg({ withdraw: rev }); }}>Withdraw approval</button>}</div> : null}
          </Block>
          <Block title="Reviewing office">
            <p className="nx-sub" style={{ marginTop: 0 }}>{d.chk.government_accepted ? <Chip tone="ok">Accepted</Chip> : locked ? "In a submitted package. The office decides it." : rev ? "Ready for the month's package." : "After the evidence is approved."}</p>
          </Block>
          <p className="nx-note"><Lock size={13} /><span>A signature is the signer&apos;s own and names them. It is never made for anyone, and Kaju never signs or approves.</span></p>
        </aside>
      </div>
      {dlg === "authorise" ? <SignedConfirm title="Authorise this procedure" who={live.userName} busy={busy === "sign"} confirm="Authorise" onClose={() => setDlg(null)} onConfirm={() => void signed(() => vetAuthorise(caseId, note.trim() || undefined), "Procedure authorised in your name.")} tick="I performed or supervised this procedure and the surgery record is mine.">
        <p>Your authorisation is recorded with your name and the time. You can undo it straight after.</p></SignedConfirm> : null}
      {dlg === "approve" ? <SignedConfirm title="Approve the evidence for reporting" who={live.userName} busy={busy === "sign"} confirm="Approve" onClose={() => setDlg(null)} onConfirm={() => void signed(() => reviewEvidence(caseId, reason.trim() || undefined), "Evidence approved for reporting.")} tick="I checked each item of evidence against the record.">
        <p>All {required.length} items are present and the veterinarian has signed. The record can go in the month&apos;s package.</p></SignedConfirm> : null}
      {dlg === "return" ? <Confirm title="Return the evidence" busy={busy === "return"} confirm="Return" onClose={() => setDlg(null)} onConfirm={() => void doReturn()}><p>The team sees your reason: “{reason.trim()}”.</p></Confirm> : null}
      {dlg && typeof dlg === "object" && "withdraw" in dlg ? <Modal title={dlg.withdraw.kind === "vet_authorised" ? "Withdraw the authorisation" : "Withdraw the approval"} onClose={() => setDlg(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setDlg(null)}>Cancel</button><button type="button" className="nx-btn is-danger" disabled={!!busy || !reason.trim()} onClick={() => void doWithdraw(dlg.withdraw)}>Withdraw</button></>}>
        <p className="nx-sub" style={{ marginTop: 0 }}>{dlg.withdraw.kind === "vet_authorised" ? "Any evidence approval that relied on it is withdrawn too." : "The record goes back to waiting for review."} The withdrawal stays in the history.</p>
        <Field label="Why it is withdrawn"><textarea value={reason} maxLength={600} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
      </Modal> : null}
      {dlg && typeof dlg === "object" && "remove" in dlg ? <Modal title={`Delete the ${(EVIDENCE_LABEL[dlg.remove.kind as EvidenceKind] ?? dlg.remove.kind).toLowerCase()}`} onClose={() => setDlg(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setDlg(null)}>Cancel</button><button type="button" className="nx-btn is-danger" disabled={!!busy} onClick={() => void doRemove(dlg.remove)}>Delete</button></>}>
        <p className="nx-sub" style={{ marginTop: 0 }}>It moves to removed records. A coordinator can restore it for 30 days, and you can undo it straight after.</p>
        <Field label="Reason (optional)"><textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="For example: entered twice" /></Field>
      </Modal> : null}
    </div>
  );
}

function AddEvidence({ sample, kinds, onAdd, busy }: { sample: boolean; kinds: EvidenceKind[]; onAdd: (k: EvidenceKind, v: { location?: string; file?: File }) => Promise<boolean>; busy: boolean }) {
  const [kind, setKind] = useState<EvidenceKind>(kinds[0]);
  const [file, setFile] = useState<File | null>(null);
  const [place, setPlace] = useState("");
  useEffect(() => { if (!kinds.includes(kind)) setKind(kinds[0]); }, [kinds, kind]);
  const isPlace = kind === "release_location";
  const ready = isPlace ? place.trim().length >= 3 : !!file;
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!ready) return; const ok = await onAdd(kind, isPlace ? { location: place.trim() } : { file: file! }); if (ok) { setFile(null); setPlace(""); } };
  return (
    <form className="gh-form" onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="nx-fields">
        <Field label="Add"><select value={kind} disabled={busy} onChange={(e) => { setKind(e.target.value as EvidenceKind); setFile(null); setPlace(""); }}>{kinds.map((k) => <option key={k} value={k}>{EVIDENCE_LABEL[k]}</option>)}</select></Field>
        {isPlace ? <Field label="Where the animal was released"><input value={place} maxLength={300} onChange={(e) => setPlace(e.target.value)} placeholder="Ward, landmark or street" /></Field>
          : <div className="nx-field"><span>{kind === "surgery_record" ? "Photo or PDF of the record" : "Photo"}</span><span className="gh-acts">{sample ? <TryLink sm quiet>Choose a file</TryLink> : <FilePick label={file ? file.name : kind === "surgery_record" ? "Choose a photo or PDF" : "Take or choose a photo"} accept={kind === "surgery_record" ? "image/*,application/pdf" : "image/*"} onFiles={(f) => setFile(f[0] ?? null)} disabled={busy} />}</span></div>}
      </div>
      <div className="gh-acts">{sample ? <TryLink sm>Add evidence</TryLink> : <button type="submit" className="nx-btn is-sm" disabled={busy || !ready}>{busy ? "Saving…" : "Add evidence"}</button>}<span className="gh-hint">Files are private to your organisation and open through a link that expires in five minutes. Up to 15 MB.</span></div>
    </form>
  );
}
