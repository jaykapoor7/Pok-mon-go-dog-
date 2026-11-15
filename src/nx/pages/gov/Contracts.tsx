"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { myContext, orgNames, packages, type Office } from "@/lib/abc";
import { money, readContracts, type Contract, type ContractRate } from "@/lib/reconciliation";
import { Chip } from "../../ui";
import { Empty, Failed, Field, Modal, Props, Skeleton, errText, useAct } from "../../kit";
import { useLive } from "../../live";
import { createContract, indiaToday, type ContractDraft, type RateDraft } from "../../data/govhealth";
import { SAMPLE_CONTRACTS } from "../../data/govhealth-samples";
import { SignedConfirm, TryLink } from "../gh/parts";

/* The contract terms a reviewing office reviews claims against. A saved version never changes: a new version is
   saved instead. Terms are recorded as supplied; they are not a payment approval. */

const EVIDENCE: [string, string][] = [["capture_photo", "Capture photo"], ["surgery_record", "Surgery record"], ["ear_notch_photo", "Ear-notch photo"], ["release_photo", "Release photo"], ["release_location", "Release location"]];
const EVENTS = ["capture", "intake", "sterilisation", "vaccination", "recovery", "release", "transfer", "followup", "identification"];
const PROC: Record<RateDraft["code"], string> = { sterilisation: "Sterilisation", vaccination: "ARV vaccination", treatment: "Treatment", other: "Other recorded procedure" };
const human = (k: string) => (EVIDENCE.find(([x]) => x === k)?.[1] ?? k.replace(/_/g, " "));
const fmt = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "not set");
const blankRate = (code: RateDraft["code"] = "sterilisation"): RateDraft => code === "sterilisation"
  ? { code, label: "Sterilisation per animal", unit_rate: "", required_evidence: EVIDENCE.map(([k]) => k), required_events: [], vet_required: true }
  : { code, label: `${PROC[code]} per animal`, unit_rate: "", required_evidence: [], required_events: code === "vaccination" ? ["vaccination"] : [], vet_required: code !== "other" };

type Row = Contract & { operator: string; office: string };

export function ContractsTab() {
  const live = useLive();
  const sample = !live.org;
  const [data, setData] = useState<{ rows: Row[]; rates: ContractRate[]; offices: Office[]; operators: { id: string; name: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const load = useCallback(async () => {
    if (sample) { setData({ rows: SAMPLE_CONTRACTS.contracts, rates: SAMPLE_CONTRACTS.rates, offices: [{ id: "office-1", name: "East Zone office", city: null }], operators: [] }); return; }
    try {
      const [d, ctx, pk] = await Promise.all([readContracts(), myContext(), packages().catch(() => [])]);
      const ids = [...new Set([...d.contracts.map((c) => c.ngo_id), ...pk.filter((p) => ctx.offices.some((o) => o.id === p.office_id)).map((p) => p.ngo_id)].filter(Boolean))];
      const nm = await orgNames(ids).catch(() => ({} as Record<string, string>));
      setData({ rows: d.contracts.map((c) => ({ ...c, operator: nm[c.ngo_id] ?? "Operator organisation", office: ctx.offices.find((o) => o.id === c.office_id)?.name ?? "Reviewing office" })), rates: d.rates, offices: ctx.offices, operators: ids.map((id) => ({ id, name: nm[id] ?? "Operator organisation" })).sort((a, b) => a.name.localeCompare(b.name)) });
      setErr(null);
    } catch (e) { setErr(errText(e)); setData({ rows: [], rates: [], offices: [], operators: [] }); }
  }, [sample]);
  useEffect(() => { void load(); }, [load]);
  const today = indiaToday();
  const inForce = (c: Contract) => !c.ends_on || c.ends_on >= today;
  const allowed = !sample && !!data?.offices.length;
  const rows = data?.rows ?? [];
  return (
    <section className="nx-sec" aria-labelledby="ct-h" style={{ marginTop: 20 }}>
      <div className="nx-sec-h"><h2 id="ct-h">Contract versions</h2><span className="nx-count">{rows.length}</span>
        <span style={{ marginLeft: "auto" }}>{sample ? <TryLink sm><Plus size={13} />New contract version</TryLink> : allowed ? <button type="button" className="nx-btn is-sm" onClick={() => setComposing(true)}><Plus size={13} />New contract version</button> : null}</span></div>
      <p className="nx-sub" style={{ marginTop: 2 }}>{data ? <><b className="num">{rows.filter(inForce).length}</b> in force today. Amounts in a package come only from these terms; without a contract they stay unknown.</> : "Reading contracts…"}</p>
      {err ? <Failed error={err} retry={() => void load()} /> : !data ? <Skeleton rows={4} label="Reading contracts" /> : !rows.length ? (
        <Empty title="No contract yet" hint="Amounts stay unknown until the source terms are entered." action={allowed ? <button type="button" className="nx-btn" onClick={() => setComposing(true)}>Add the first version</button> : undefined} />
      ) : (
        <div className="nx-table" role="table" aria-label="Contract versions" style={{ marginTop: 10 }}>
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 190px 150px" }}><span>Contract</span><span className="nx-hide-s">Operator</span><span className="nx-hide-s">In force</span><span>Status</span></div>
          {rows.map((c) => { const rs = data.rates.filter((r) => r.contract_id === c.id); return (
            <div key={c.id}>
              <button type="button" role="row" className={`nx-tr ${open === c.id ? "is-sel" : ""}`} aria-expanded={open === c.id} style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 190px 150px" }} onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="nx-cell-main"><span><b>{c.name}</b><small>Version {c.version} · {rs.map((r) => `${money(r.unit_rate)} ${PROC[r.code]?.toLowerCase() ?? r.code}`).join(" · ") || "No rates"}<span className="nx-only-s"> · {c.operator}</span></small></span></span>
                <span className="nx-t2 nx-hide-s">{c.operator}</span>
                <span className="nx-t3 nx-hide-s">{fmt(c.starts_on)} – {fmt(c.ends_on)}</span>
                <span className="nx-chips">{c.illustrative ? <Chip tone="warn">Illustrative</Chip> : null}{inForce(c) ? <Chip tone="ok">In force</Chip> : <Chip>Ended</Chip>}</span>
              </button>
              {open === c.id ? <div className="gh-pane" style={{ margin: "8px 0 14px" }}>
                <Props items={[["Source", c.reference], ["Office", c.office], ...(c.illustrative ? [["Status", "Illustrative terms for training and testing only"] as [string, string]] : [])]} />
                <ul className="gh-list">{rs.map((r) => <li key={r.id}><div><b>{r.label}: {money(r.unit_rate)} per animal</b><small>Evidence: {r.required_evidence.map(human).join(", ") || "none set"} · Records: {r.required_events.join(", ") || "none set"} · Veterinary authorisation {r.vet_required ? "required" : "not required by these terms"}</small></div></li>)}</ul>
              </div> : null}
            </div>); })}
        </div>
      )}
      <p className="nx-foot">A saved version cannot be changed. To change terms, save a new version. Saving terms is not a payment approval.</p>
      {composing && data ? <NewContract offices={data.offices} operators={data.operators} onClose={() => setComposing(false)} onSaved={async () => { setComposing(false); await load(); }} /> : null}
    </section>
  );
}

function NewContract({ offices, operators, onClose, onSaved }: { offices: Office[]; operators: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const live = useLive();
  const [f, setF] = useState({ name: "", version: "1", reference: "", office: offices[0]?.id ?? "", operator: "", start: "", end: "", illustrative: false });
  const [rates, setRates] = useState<RateDraft[]>([blankRate()]);
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const setRate = (i: number, patch: Partial<RateDraft>) => setRates((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleIn = (i: number, key: "required_evidence" | "required_events", k: string, on: boolean) => setRates((v) => v.map((x, j) => (j === i ? { ...x, [key]: on ? [...x[key], k] : x[key].filter((y) => y !== k) } : x)));
  const payload = useMemo<ContractDraft>(() => ({ name: f.name.trim(), version: Number(f.version), reference: f.reference.trim(), office_id: f.office, ngo_id: f.operator.trim(), starts_on: f.start, ends_on: f.end, illustrative: f.illustrative, rates }), [f, rates]);
  const ready = payload.name.length >= 3 && payload.version >= 1 && !!payload.reference && !!payload.office_id && /^[0-9a-f-]{36}$/i.test(payload.ngo_id) && !!payload.starts_on && !!payload.ends_on && payload.ends_on >= payload.starts_on && rates.every((r) => r.label.trim() && r.unit_rate !== "" && Number(r.unit_rate) >= 0);
  const save = async () => {
    const r = await run("contract", () => createContract(live.userId!, payload), { ok: `${payload.name}, version ${payload.version}, saved. The saved record and its audit entry were checked.` });
    if (r.ok) onSaved(); else setAsking(false);
  };
  return (
    <>
      <Modal title="New contract version" wide onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ready || !!busy} onClick={() => setAsking(true)}>Save this version</button></>}>
        <p className="nx-sub" style={{ marginTop: 0 }}>Enter the terms exactly as in the signed source document. Saved versions cannot be changed.</p>
        <div className="nx-fields">
          <Field label="Contract name"><input value={f.name} maxLength={160} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="Version"><input type="number" inputMode="numeric" min={1} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
          <Field label="Source reference" wide hint="The work order, letter of award or agreement number."><input value={f.reference} maxLength={1000} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
          <Field label="Reviewing office"><select value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          {operators.length ? <Field label="Operator these terms cover"><select value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })}><option value="">Choose the operator</option>{operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            : <Field label="Operator organisation ID" hint="No operator has sent this office a package yet. The operator gives you their StrayPaw ID."><input value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })} pattern="[0-9a-fA-F-]{36}" /></Field>}
          <Field label="In force from"><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="In force until"><input type="date" min={f.start || undefined} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <label className="gh-tick"><input type="checkbox" checked={f.illustrative} onChange={(e) => setF({ ...f, illustrative: e.target.checked })} /><span>Illustrative terms, for training and testing only</span></label>
        {rates.map((r, i) => (
          <fieldset key={i} className="gh-pane" style={{ border: 0 }}>
            <legend className="nx-h3" style={{ margin: 0 }}>Rate {i + 1}</legend>
            <div className="nx-fields">
              <Field label="Procedure"><select value={r.code} onChange={(e) => setRate(i, blankRate(e.target.value as RateDraft["code"]))}>{(Object.keys(PROC) as RateDraft["code"][]).map((k) => <option key={k} value={k}>{PROC[k]}</option>)}</select></Field>
              <Field label="Rate per animal (INR)"><input type="number" inputMode="decimal" step="0.01" min={0} max={100000000} value={r.unit_rate} onChange={(e) => setRate(i, { unit_rate: e.target.value })} /></Field>
              <Field label="Label" wide><input value={r.label} maxLength={160} onChange={(e) => setRate(i, { label: e.target.value })} /></Field>
            </div>
            <label className="gh-tick"><input type="checkbox" checked={r.vet_required} onChange={(e) => setRate(i, { vet_required: e.target.checked })} /><span>Veterinary authorisation required by these terms</span></label>
            <p className="gh-hint">Evidence required</p>
            <div className="gh-acts">{EVIDENCE.map(([k, l]) => <label key={k} className="gh-tick" style={{ minHeight: 28 }}><input type="checkbox" checked={r.required_evidence.includes(k)} onChange={(e) => toggleIn(i, "required_evidence", k, e.target.checked)} /><span>{l}</span></label>)}</div>
            <p className="gh-hint">Records required</p>
            <div className="gh-acts">{EVENTS.map((k) => <label key={k} className="gh-tick" style={{ minHeight: 28 }}><input type="checkbox" checked={r.required_events.includes(k)} onChange={(e) => toggleIn(i, "required_events", k, e.target.checked)} /><span>{k}</span></label>)}</div>
            {rates.length > 1 ? <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRates((v) => v.filter((_, j) => j !== i))}><Trash2 size={13} />Remove this rate</button></div> : null}
          </fieldset>
        ))}
        {rates.length < 4 ? <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRates((v) => [...v, blankRate("vaccination")])}><Plus size={13} />Add a rate</button></div> : null}
      </Modal>
      {asking ? <SignedConfirm title="Save this contract version" who={live.userName} where={offices.find((o) => o.id === f.office)?.name} busy={busy === "contract"} confirm="Save version" onClose={() => setAsking(false)} onConfirm={() => void save()} tick="These terms match the signed source document.">
        <p>{payload.name}, version {payload.version}, in force {fmt(payload.starts_on)} to {fmt(payload.ends_on)}{payload.illustrative ? ", illustrative" : ""}.</p>
        <ul>{rates.map((r, i) => <li key={i}>{r.label}: {money(r.unit_rate || "0")}</li>)}</ul>
        <p className="gh-hint">It cannot be changed once saved, and it is not a payment approval.</p>
      </SignedConfirm> : null}
    </>
  );
}
