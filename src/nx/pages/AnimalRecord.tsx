"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ClipboardPlus, Info, Lock, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample, TrustChip, initials } from "../ui";
import { Failed, Field, Props, RecordHead, Section, Skeleton, TabBar, Timeline, day, errText, useAct, words, type TItem } from "../kit";
import { ANIMALS, RELATED } from "../fixtures";
import { useLive, type Workspace } from "../live";
import { careNote } from "@/lib/care-note";
import { publicFlagOn } from "@/lib/flags";
import { MEDICAL_KINDS } from "@/lib/types";
import { ID_KINDS, addIdentifier, identifierProblem, readAnimal, readIdentifiers, realName, retireIdentifier, setNeedsHelp, shortCode, statusLabel, STATUS_TONE, type AnimalFile, type IdKind, type Identifier } from "../data/ngo";
import { CareForm, DeleteRecord, FollowupList, OpsEvents, Partial, TryLink, undoWith } from "./ngo/parts";
import { QrScan, SampleBody } from "./Animals";

/* One animal at the organisation's depth: what the register holds, care with who recorded it, follow-ups that survive a
   case closing, the reported operations on its cases, its earlier source timeline and its cases. Clinical records say
   what they are: recorded by the organisation, not a clinician's sign-off. */

type Tab = "Summary" | "Care" | "Cases" | "History";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kindLabel = (k: string) => MEDICAL_KINDS.find((x) => x.id === k)?.label ?? words(k);
const factTone = (v: string | null) => (v === "sterilised" || v === "vaccinated" ? "ok" : v === "not_sterilised" || v === "not_vaccinated" ? "warn" : "plain") as "ok" | "warn" | "plain";
const fact = (v: string | null, yes: string, no: string, none: string) => (v === "sterilised" || v === "vaccinated" ? yes : v === "not_sterilised" || v === "not_vaccinated" ? no : none);

export function AnimalRecord({ id }: { id: string }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Animals", "…"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!live.org || !UUID.test(id)) return <SampleRecord id={id} />;
  const org = live.orgFor("ngo");
  if (!org) return <Shell crumb={["Animals", "Animal"]}><div className="nx-page"><h1 className="nx-h1">Animal</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it has no animal register of its own.</p></div></Shell>;
  return <LiveRecord id={id} org={org} />;
}

function LiveRecord({ id, org }: { id: string; org: Workspace }) {
  const live = useLive();
  const [file, setFile] = useState<AnimalFile | null | "loading" | { error: string }>("loading");
  const [tab, setTab] = useState<Tab>("Summary");
  const [caring, setCaring] = useState(false);
  const { busy, run } = useAct();
  const read = useCallback(async () => { const r = await readAnimal(org.org_id, id); setFile(r.error ? { error: errText(r.error) } : r.data ?? null); }, [org.org_id, id]);
  useEffect(() => { void read(); }, [read]);
  if (file === "loading") return <Shell crumb={["Animals", "…"]}><div className="nx-page"><Skeleton rows={8} label="Reading the record" /></div></Shell>;
  if (file && "error" in file) return <Shell crumb={["Animals", "Animal"]}><div className="nx-page"><Failed error={file.error} retry={() => void read()} /></div></Shell>;
  if (!file) return <Shell crumb={["Animals", "Not found"]}><div className="nx-page"><h1 className="nx-h1">No animal with this ID on {org.name}&apos;s register</h1><p className="nx-sub">It may belong to another organisation, have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/animals" className="nx-btn is-quiet">Back to Animals</Link></p></div></Shell>;

  const { dog: d, cases, followups, care, timeline, partial } = file;
  const code = d.code ?? (d.straypaw_id ? shortCode(d.straypaw_id) : d.id.slice(0, 8).toUpperCase());
  const imported = d.provenance === "imported_historical_record";
  const liveCase = cases.find((c) => (c.status_class === "open" || c.status_class === "in_progress") && c.provenance !== "imported_historical_record") ?? null;
  const flip = () => { const to = !d.needs_help; void run("help", () => setNeedsHelp(d.id, to), { ok: to ? "Flagged as needing help." : "Needs-help flag cleared.", undo: () => undoWith(() => setNeedsHelp(d.id, !to), read)() }).then((r) => { if (r.ok) void read(); }); };
  const careItems: TItem[] = care.map((m) => ({ id: m.id, when: day(m.event_date), who: m.performed_by, tone: "ok", title: kindLabel(m.kind), body: careNote(m.notes) || undefined, action: <DeleteRecord kind="care" id={m.id} what="this care record" onDone={read} /> }));
  const history: TItem[] = timeline.map((t) => ({ id: t.id, when: day(t.occurred_at), who: t.actor_name, title: t.title || words(t.event_type, "Event"), body: t.details ? careNote(t.details) : undefined, tone: /vaccin|sterili|surgery|treat|medical/i.test(`${t.event_type} ${t.title}`) ? "ok" : undefined,
    action: <span className="nr-tl-act"><Chip>{t.provenance && /import/i.test(t.provenance) ? "Imported" : words(t.provenance, "Recorded")}</Chip><DeleteRecord kind="timeline" id={t.id} what="this history entry" onDone={read} /></span> }));
  const fus = followups.map((f) => ({ id: f.id, due_at: f.due_at, status: f.status, kind: f.kind, note: f.note, completed_at: null as string | null, case_id: f.case_id }));
  const caseList = cases.length ? <div className="nx-rel">{cases.map((c) => <Link key={c.id} href={`/next/ngo/cases/${c.id}`}><ArrowUpRight size={13} /><span className="num">{shortCode(c.case_code)}</span><span style={{ color: "var(--ink-3)" }}>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Request"}</span><small><Chip tone={STATUS_TONE[c.status_class ?? "unknown"] ?? "plain"}>{statusLabel(c.status_class)}</Chip></small></Link>)}</div> : <p className="nr-quiet">This animal is not part of any case.</p>;
  const tabs: [Tab, number | undefined][] = [["Summary", undefined], ["Care", care.length || undefined], ["Cases", cases.length || undefined], ["History", timeline.length || undefined]];

  return (
    <Shell crumb={["Animals", code]}>
      <RecordHead av={initials(d.species ?? "Dog")} title={<><span className="num">{code}</span> · {realName(d.name) ?? "Unnamed"}</>}
        sub={<><Lock size={11} style={{ verticalAlign: "-1px" }} /> Private to {org.name} · {[d.zone, d.city].filter(Boolean).join(", ") || "Place not recorded"} · last seen {d.last_seen ? day(d.last_seen) : "not recorded"}</>}
        chips={<><Chip tone={factTone(d.sterilisation_status)}>{fact(d.sterilisation_status, "Sterilised", "Not sterilised", "Sterilisation not recorded")}</Chip><Chip tone={factTone(d.vaccination_status)}>{fact(d.vaccination_status, "Vaccinated", "Not vaccinated", "Vaccination not recorded")}</Chip>{d.needs_help ? <Chip tone="bad">Needs help</Chip> : null}<TrustChip trust={imported ? "Imported" : "Recorded"} /></>}
        actions={<>
          <button type="button" className="nx-btn is-sm" onClick={() => { setTab("Care"); setCaring(true); }}><Plus size={13} />Record care</button>
          {liveCase ? <Link href={`/next/ngo/cases/${liveCase.id}`} className="nx-btn is-quiet is-sm">Open its case</Link> : null}
          <Link href={`/next/ngo/cases/new?dog=${d.id}`} className="nx-btn is-quiet is-sm"><ClipboardPlus size={13} />{liveCase ? "Open another case" : "Start a case"}</Link>
          <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={flip}>{d.needs_help ? "Clear needs help" : "Flag as needing help"}</button>
        </>} />
      <TabBar id="animal" tabs={tabs} value={tab} onChange={setTab} label="Record sections" />
      <div style={{ padding: "12px 32px 0" }}><Partial parts={partial} /></div>
      {tab === "Summary" ? (
        <div className="nx-rec">
          <section aria-label="Details">
            <h3 className="nx-h3">Details</h3>
            <Props items={[["Animal ID", <span key="i" className="num">{code}</span>], ["StrayPaw ID", d.straypaw_id ? <span key="s" className="num" title={d.straypaw_id}>{shortCode(d.straypaw_id)}</span> : "Pending"], ["Species", words(d.species)], ["Sex", words(d.sex)], ["Colour", d.color ?? "Not recorded"],
              ["Place", `${[d.zone, d.city].filter(Boolean).join(", ") || "Not recorded"}${d.lat != null && d.lng != null ? " (exact point held privately)" : ""}`], ["Marks", d.identifiers ?? "Not recorded"],
              ["Identity", <Chip key="d" tone={d.identity_state === "confirmed" || d.identity_state === "verified" ? "ok" : d.identity_state ? "warn" : "plain"}>{words(d.identity_state)}</Chip>], ...(d.owner_name ? [["Carer", `${d.owner_name} (contact private)`] as [string, string]] : [])]} />
            {d.intake_notes ? <><h3 className="nx-h3">Intake note</h3><p className="nx-sub" style={{ whiteSpace: "pre-wrap" }}>{d.intake_notes}</p></> : null}
          </section>
          <div>
            <p className="nx-note" style={{ marginBottom: 18 }}><Info size={13} /><span>{liveCase ? <><b style={{ color: "var(--ink)" }}>In the line now:</b> {liveCase.condition_class && liveCase.condition_class !== "Not recorded" ? liveCase.condition_class : "an open case"}, {statusLabel(liveCase.status_class).toLowerCase()}{liveCase.assignee_name ? `, held by ${liveCase.assignee_name}` : ""}. <Link className="nr-link" href={`/next/ngo/cases/${liveCase.id}`}>Open its case</Link></> : <><b style={{ color: "var(--ink)" }}>Not in the line.</b> No open case on this animal. <Link className="nr-link" href={`/next/ngo/cases/new?dog=${d.id}`}>Start one</Link></>}</span></p>
            <Section title="Care on record" count={care.length} action={<button type="button" className="nx-btn is-quiet is-sm" aria-expanded={caring} onClick={() => setCaring((v) => !v)}>{caring ? "Close" : "Record care"}</button>}>
              {caring ? <CareForm dogId={d.id} onSaved={read} onCancel={() => setCaring(false)} /> : null}
              <Timeline items={careItems.slice(0, 6)} empty="No care recorded yet. Vaccination, sterilisation, treatment and check-ups recorded here, or on its cases, appear with who recorded them." />
              {care.length > 6 ? <button type="button" className="nr-link" onClick={() => setTab("Care")}>See all {care.length}</button> : null}
            </Section>
            <Section title="Follow-ups" count={fus.length}><FollowupList items={fus} onChanged={read} markable={(f) => !!fus.find((x) => x.id === f.id)?.case_id} />{fus.some((f) => !f.case_id) ? <p className="nr-hint">A follow-up that is not on a case is marked done from field mode or the case it belongs to; it can be deleted here.</p> : null}</Section>
          </div>
          <aside aria-label="Identifiers, operations and cases">
            {publicFlagOn("animal_identifiers") ? <Identifiers dogId={d.id} canRetire={["admin", "coordinator", "veterinarian"].includes(org.role)} /> : null}
            <OpsEvents dogId={d.id} readOnly role={org.role} userId={live.userId} title="Reported on its cases" />
            <Section title="Cases" count={cases.length}>{caseList}</Section>
          </aside>
        </div>
      ) : tab === "Care" ? (
        <div className="nx-page" style={{ maxWidth: 860 }}>
          <Section title="Record care">{caring ? <CareForm dogId={d.id} onSaved={read} onCancel={() => setCaring(false)} /> : <button type="button" className="nx-btn is-sm" onClick={() => setCaring(true)}><Plus size={13} />Record care</button>}</Section>
          <Section title="Care on record" count={care.length}><Timeline items={careItems} empty="No care recorded yet." /></Section>
          <p className="nr-hint">Recorded by the organisation, not clinician-signed. A veterinary sign-off is a separate step on the case.</p>
        </div>
      ) : tab === "Cases" ? <div className="nx-page" style={{ maxWidth: 860 }}><Section title="Cases" count={cases.length}>{caseList}</Section></div>
        : <div className="nx-page" style={{ maxWidth: 860 }}><Section title="Earlier source timeline" count={timeline.length}><Timeline items={history} empty="No earlier timeline entries. Structured operations are shown on the summary." /></Section><p className="nr-hint">Deleting moves an entry to removed records for 30 days; Undo brings it back.</p></div>}
    </Shell>
  );
}

/** Microchips, RFID tags, QR codes and printed tags (flag animal_identifiers). A keyboard-mode reader types the number and Enter. */
function Identifiers({ dogId, canRetire }: { dogId: string; canRetire: boolean }) {
  const [rows, setRows] = useState<Identifier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<IdKind>("microchip");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [scan, setScan] = useState(false);
  const { busy, run } = useAct();
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
  const load = useCallback(async () => { const r = await readIdentifiers(dogId); if (r.error) setError(errText(r.error)); else { setError(null); setRows(r.data ?? []); } }, [dogId]);
  useEffect(() => { void load(); }, [load]);
  const problem = value.trim() ? identifierProblem(kind, value) : null;
  return (
    <Section title="Identifiers" count={rows?.length} action={!adding ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAdding(true)}>Add</button> : undefined}>
      {error ? <p className="nr-err" role="alert">{error} <button type="button" className="nr-link" onClick={() => void load()}>Read again</button></p> : rows === null ? <p className="nr-quiet">Reading identifiers…</p>
        : rows.length ? <ul className="nr-items">{rows.map((r) => <li key={r.id} className="nr-item is-col"><div className="nr-item-row"><span className="nr-item-t"><b className="num">{r.value}</b><small>{ID_KINDS[r.kind] ?? r.kind}{r.note ? ` · ${r.note}` : ""}</small></span>{canRetire && retiring !== r.id ? <span className="nr-item-e"><button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setRetiring(r.id); setReason(""); }}>Retire</button></span> : null}</div>
          {retiring === r.id ? <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); void run("retire", () => retireIdentifier(r.id, reason), { ok: "Identifier retired. It stays in the audit history." }).then((x) => { if (x.ok) { setRetiring(null); void load(); } }); }}><Field label="Why retire it?"><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Lost tag, misread chip" required /></Field><div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!!busy || !reason.trim()}>Retire</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRetiring(null)}>Cancel</button></div></form> : null}</li>)}</ul>
        : <p className="nr-quiet">No microchip, tag or QR code yet.</p>}
      {adding ? <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (identifierProblem(kind, value)) return; void run("add-id", () => addIdentifier(dogId, kind, value, note), { ok: `${ID_KINDS[kind]} added.` }).then((x) => { if (x.ok) { setValue(""); setNote(""); setAdding(false); void load(); } }); }}>
        <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as IdKind)}>{Object.entries(ID_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Number" hint={problem ?? undefined}><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "microchip" ? "985 141 000 123 456" : "Scan or type"} inputMode={kind === "microchip" ? "numeric" : "text"} autoComplete="off" spellCheck={false} maxLength={80} required aria-invalid={!!problem} /></Field>
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Left shoulder, implanted at sterilisation" maxLength={200} /></Field>
        <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!!busy || !value.trim() || !!problem}>Add identifier</button>{canScan ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setKind("qr"); setScan(true); }}>Scan QR</button> : null}<button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAdding(false)}>Cancel</button></div>
        {scan ? <QrScan onClose={() => setScan(false)} onRead={(t) => { setScan(false); setValue(t.slice(0, 64)); }} /> : null}
      </form> : null}
    </Section>
  );
}

function SampleRecord({ id }: { id: string }) {
  const a = ANIMALS.find((x) => x.id === id);
  const [tab, setTab] = useState<"Summary" | "Cases" | "Activity">("Summary");
  if (!a) return <Shell crumb={["Animals", id]}><div className="nx-page"><h1 className="nx-h1">No animal with this ID</h1><p className="nx-sub">It may have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/animals" className="nx-btn is-quiet">Back to Animals</Link></p></div></Shell>;
  return (
    <Shell crumb={["Animals", a.id]}>
      <RecordHead av={initials(a.species)} title={<><span className="num">{a.id}</span> · {a.name}<Sample /></>} sub={<>{a.ward} · Last seen {a.last}</>} chips={<TrustChip trust={a.trust} />}
        actions={<><TryLink sm><Plus size={13} />Record care</TryLink><TryLink sm quiet><ClipboardPlus size={13} />Start a case</TryLink><TryLink sm quiet>Flag as needing help</TryLink></>} />
      <TabBar id="animal" tabs={["Summary", "Cases", "Activity"]} value={tab} onChange={setTab} label="Record sections" />
      {tab === "Summary" ? <div className="nx-page" style={{ maxWidth: 860 }}><SampleBody a={a} /></div>
        : tab === "Cases" ? <div className="nx-page"><Section title="Cases and work" count={RELATED.length}><div className="nx-rel">{RELATED.map((r) => <span key={r.ref} className="nx-rel-i"><ArrowUpRight size={13} /><span className="num">{r.ref}</span><span style={{ color: "var(--ink-3)" }}>{r.what}</span><small>{r.state}</small></span>)}</div></Section></div>
        : <div className="nx-page" style={{ maxWidth: 720 }}><p className="nx-sub">In the live demo, every care event and earlier history entry appears here with who recorded it, and each can be deleted with a reason and undone.</p><p style={{ marginTop: 12 }}><TryLink sm quiet>Open the live demo</TryLink></p></div>}
    </Shell>
  );
}
