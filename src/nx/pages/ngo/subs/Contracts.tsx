"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { offices, type Office } from "@/lib/abc";
import { money, readContracts, type Contract, type ContractRate } from "@/lib/reconciliation";
import { useRead } from "@/oh/data";
import { leadOrCoord, read, requestFor } from "../../../data/ngo-setup";
import { createContract, type RateDraft } from "../../../data/ngo-submissions";
import { Confirm, Failed, Field, Modal, Props, Skeleton, day, errText, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import { Drawer, Grid, Tools, TryLink, type GCol, type Who } from "../frame";
import { S_CONTRACTS, S_OFFICES, S_RATES } from "../sample";

/* Contracts: the supplied terms a package is priced from, one immutable version at a time
   (operations_create_contract, the operator side). They record terms; they are not a payment approval. */

const EVIDENCE: [string, string][] = [["capture_photo", "Capture photo"], ["surgery_record", "Surgery record"], ["ear_notch_photo", "Ear-notch photo"], ["release_photo", "Release photo"], ["release_location", "Release location"]];
const EVENTS = ["capture", "intake", "sterilisation", "vaccination", "recovery", "release", "transfer", "followup", "identification"];
const PROC: Record<string, string> = { sterilisation: "Sterilisation", vaccination: "ARV vaccination", treatment: "Treatment", other: "Other recorded procedure" };
const human = (k: string) => k.replace(/_/g, " ");
type Data = { contracts: Contract[]; rates: ContractRate[]; offices: Office[] };

export function ContractsTab({ who }: { who: Who }) {
  const r = useRead<Data>(() => read(async () => { const [c, o] = await Promise.all([readContracts(), offices()]); return { ...c, offices: o }; }), "ns:contracts", !who.sample && !!who.ngo);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading contracts" />;
  if (!who.sample && r.error && !r.data) return <Failed error={errText(r.error)} retry={r.reload} />;
  const d: Data = who.sample ? { contracts: S_CONTRACTS, rates: S_RATES, offices: S_OFFICES } : r.data!;
  const today = new Date().toISOString().slice(0, 10);
  const inForce = (c: Contract) => !c.ends_on || c.ends_on >= today;
  const ratesOf = (c: Contract) => d.rates.filter((x) => x.contract_id === c.id);
  const can = who.sample || leadOrCoord(who.role);
  const open = d.contracts.find((c) => c.id === openId) ?? null;
  const cols: GCol<Contract>[] = [
    { label: "Contract", width: "minmax(0, 1.5fr)", render: (c) => <span className="nx-cell-main"><span><b>{c.name}</b><small>Version {c.version} · {day(c.starts_on)} – {day(c.ends_on)}</small></span></span> },
    { label: "Office", width: "minmax(0, 1fr)", render: (c) => <span className="nx-t2 ns-cell">{d.offices.find((o) => o.id === c.office_id)?.name ?? "Reviewing office"}</span> },
    { label: "Rates", width: "minmax(0, 1.3fr)", render: (c) => { const rs = ratesOf(c); return <span className="nx-t2 ns-cell">{rs.length ? rs.map((x) => `${money(x.unit_rate)} ${human(x.code)}`).join(" · ") : "No rates"}</span>; } },
    { label: "Status", width: "170px", keep: true, render: (c) => <span className="ns-row-acts" style={{ justifyContent: "flex-start" }}>{c.illustrative ? <Chip tone="warn">Illustrative</Chip> : null}{inForce(c) ? <Chip tone="ok">In force</Chip> : <Chip>Ended</Chip>}</span> },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />New contract version</TryLink> : can ? <button type="button" className="nx-btn is-sm" onClick={() => setComposing(true)}><Plus size={13} />New contract version</button> : null}>
        <span className="ns-sum"><b>{d.contracts.length}</b> {d.contracts.length === 1 ? "version" : "versions"}, <b>{d.contracts.filter(inForce).length}</b> in force today. Amounts come only from these terms.{!can ? " A lead or coordinator adds versions." : ""}</span>
      </Tools>
      <Grid label="Contract versions" cols={cols} rows={d.contracts} rowKey={(c) => c.id} rowLabel={(c) => `${c.name} version ${c.version}`} onOpen={(c) => setOpenId(c.id)} openKey={openId}
        empty={<><b>No contract yet</b><p>Amounts stay unknown until the source terms are entered.</p></>} />
      <AnimatePresence>{open ? <Drawer key={open.id} head="Contract version" title={`${open.name} · v${open.version}`} sub={<>{day(open.starts_on)} – {day(open.ends_on)} {inForce(open) ? <Chip tone="ok">In force</Chip> : <Chip>Ended</Chip>}</>} onClose={() => setOpenId(null)}>
        <Props items={[["Source", <span key="s" className="ns-wrap" style={{ fontWeight: 400 }}>{open.reference}</span>], ["Office", d.offices.find((o) => o.id === open.office_id)?.name ?? "Reviewing office"], ["Currency", open.currency], ...(open.illustrative ? [["Status", "Illustrative terms, for training and testing only"] as [string, string]] : [])]} />
        <h3 className="nx-h3">Rates</h3>
        {ratesOf(open).length ? <ul className="nx-feed">{ratesOf(open).map((x) => <li key={x.id}><span className="nx-feed-i">₹</span><div><b>{x.label}: {money(x.unit_rate)} per animal</b><p>Evidence: {x.required_evidence.map(human).join(", ") || "none configured"}</p><p>Records: {x.required_events.map(human).join(", ") || "none configured"}</p><p>Veterinary authorisation {x.vet_required ? "required" : "not required by these terms"}</p></div></li>)}</ul> : <p className="nx-sub">No rates in this version.</p>}
        <p className="nx-note" style={{ marginTop: 14 }}><span>Saved versions cannot be changed. A new version replaces it for later periods.</span></p>
      </Drawer> : null}</AnimatePresence>
      {composing && who.ngo ? <NewVersion ngoId={who.ngo.org_id} offs={d.offices} onClose={() => setComposing(false)} onDone={() => { setComposing(false); r.reload(); }} /> : null}
    </>
  );
}

const blankRate = (): RateDraft => ({ code: "sterilisation", label: "Sterilisation per animal", unit_rate: "", required_evidence: EVIDENCE.map(([k]) => k), required_events: [], vet_required: true });
function NewVersion({ ngoId, offs, onClose, onDone }: { ngoId: string; offs: Office[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const [f, setF] = useState({ name: "", version: "1", reference: "", office: offs.length === 1 ? offs[0].id : "", start: "", end: "", illustrative: false });
  const [rates, setRates] = useState<RateDraft[]>([blankRate()]);
  const [asking, setAsking] = useState(false);
  const setRate = (i: number, p: Partial<RateDraft>) => setRates((v) => v.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const toggle = (i: number, key: "required_evidence" | "required_events", k: string, on: boolean) => setRates((v) => v.map((x, j) => (j === i ? { ...x, [key]: on ? [...x[key], k] : x[key].filter((y) => y !== k) } : x)));
  const ok = f.name.trim().length >= 3 && Number(f.version) >= 1 && !!f.reference.trim() && !!f.office && !!f.start && !!f.end && f.end >= f.start && rates.every((x) => x.label.trim() && x.unit_rate !== "" && Number(x.unit_rate) >= 0);
  const payload = { name: f.name.trim(), version: Number(f.version), reference: f.reference.trim(), office_id: f.office, ngo_id: ngoId, starts_on: f.start, ends_on: f.end, illustrative: f.illustrative, rates };
  const save = () => void run("contract", () => createContract(requestFor(requests.current, payload), payload), { ok: "Contract version saved; the source and audit were checked." }).then((x) => { if (x.ok) onDone(); else setAsking(false); });
  if (asking) return <Confirm title="Save this contract version" confirm="Save contract version" busy={busy === "contract"} onClose={() => setAsking(false)} onConfirm={save}>
    <p>{payload.name}, version {payload.version}, {day(payload.starts_on)} to {day(payload.ends_on)}, with {rates.length} {rates.length === 1 ? "rate" : "rates"}{f.illustrative ? ", marked illustrative" : ""}.</p>
    <p>Saved versions cannot be changed. They record the supplied terms; they are not a government payment approval.</p>
  </Confirm>;
  return (
    <Modal wide title="New contract version" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok} onClick={() => setAsking(true)}>Review</button></>}>
      <div className="nx-fields">
        <Field label="Contract name" wide><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={160} autoFocus /></Field>
        <Field label="Version"><input type="number" min={1} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
        <Field label="Reviewing office"><select value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}><option value="">Choose the authorised office</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Source contract reference" wide hint="The signed document these terms come from."><input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} maxLength={1000} /></Field>
        <Field label="Effective from"><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Effective to"><input type="date" min={f.start} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <label className="ns-check"><input type="checkbox" checked={f.illustrative} onChange={(e) => setF({ ...f, illustrative: e.target.checked })} />Illustrative terms, for training and testing only</label>
      {rates.map((x, i) => (
        <fieldset key={i} className="ns-set"><legend>Procedure rate {i + 1}</legend>
          <div className="nx-fields">
            <Field label="Procedure"><select value={x.code} onChange={(e) => setRate(i, { code: e.target.value })}>{Object.entries(PROC).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Per-animal rate (INR)"><input type="number" step="0.01" min={0} max={100000000} value={x.unit_rate} onChange={(e) => setRate(i, { unit_rate: e.target.value })} /></Field>
            <Field label="Rate label" wide><input value={x.label} onChange={(e) => setRate(i, { label: e.target.value })} /></Field>
          </div>
          <label className="ns-check"><input type="checkbox" checked={x.vet_required} onChange={(e) => setRate(i, { vet_required: e.target.checked })} />Veterinary authorisation required by these terms</label>
          <p className="ns-small">Required evidence</p>
          <div className="ns-checks">{EVIDENCE.map(([k, l]) => <label key={k} className="ns-check"><input type="checkbox" checked={x.required_evidence.includes(k)} onChange={(e) => toggle(i, "required_evidence", k, e.target.checked)} />{l}</label>)}</div>
          <p className="ns-small">Required structured records</p>
          <div className="ns-checks">{EVENTS.map((k) => <label key={k} className="ns-check"><input type="checkbox" checked={x.required_events.includes(k)} onChange={(e) => toggle(i, "required_events", k, e.target.checked)} />{human(k)}</label>)}</div>
          {rates.length > 1 ? <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRates((v) => v.filter((_, j) => j !== i))}>Remove this rate</button></div> : null}
        </fieldset>
      ))}
      {rates.length < 4 ? <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRates((v) => [...v, { code: "vaccination", label: "ARV vaccination per animal", unit_rate: "", required_evidence: [], required_events: ["vaccination"], vet_required: true }])}><Plus size={12} />Add procedure rate</button></div> : null}
    </Modal>
  );
}
