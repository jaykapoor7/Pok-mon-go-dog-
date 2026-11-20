"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { HANDOFF, HANDOFF_KIND, SERVICE_LABEL, TRANSFER, call, fmtDate, select, useNames, useRead, type ClinicTransfers, type Handoff, type Network, type Place } from "@/oh/data";
import { ListPage, type Col } from "../../ListPage";
import { Shell } from "../../Shell";
import { Chip } from "../../ui";
import { Confirm, Props, useAct } from "../../kit";
import { useLive } from "../../live";
import { REFERRALS, type Tone } from "../../fixtures";
import { can, placeOf, usePlaces } from "../../data/govhealth";
import { OutcomeModal } from "../gov/Programme";
import { NotHealth, isLab, useClinic, word } from "../Health";
import { About, GhMark, Opening, TryLink } from "../gh/parts";

/* People referred between facilities, the requests partners sent this facility, and where it sends people for a
   service it does not offer. A referral carries the case code, category and need; names and phone numbers stay with
   the sending facility. The receiving facility marks an arrival; the referring clinician can withdraw. */

type Kind = "in" | "out" | "request" | "pathway";
type Row = { id: string; kind: Kind; code: string; other: string; service: string; category: string; species: string; exposure: string; sent: string; by: string; status: string; note: string | null; closed: string | null; raw?: { transfer?: ClinicTransfers["incoming"][number] | ClinicTransfers["outgoing"][number]; handoff?: Handoff; path?: Network["referrals"][number] } };
const TONE: Record<string, Tone> = { Referred: "accent", Arrived: "ok", "Did not arrive": "bad", Withdrawn: "plain", New: "accent", "In progress": "warn", Done: "ok", Declined: "plain", Pathway: "plain" };
const svc = (s: string) => word(s === "arv" ? "anti-rabies vaccine" : s === "rig" ? "rabies immunoglobulin" : s);
const cols: Col<Row>[] = [
  { label: "Referral", width: "minmax(0, 1.3fr)", render: (r) => <span className="nx-cell-main"><span><b className={r.kind === "in" || r.kind === "out" ? "num" : undefined}>{r.code}</b><small>{r.kind === "in" ? `From ${r.other}` : r.kind === "out" ? `To ${r.other}` : r.kind === "request" ? `From ${r.other}` : `Send to ${r.other}`}<span className="nx-only-s"> · {r.service}</span></small></span></span> },
  { label: "Needs", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.service}{r.category !== "—" ? ` · Category ${r.category}` : ""}</span> },
  { label: "Sent", width: "110px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.sent}</span> },
  { label: "Status", width: "130px", render: (r) => <Chip tone={TONE[r.status] ?? "plain"}>{r.status}</Chip> },
];
const SAMPLE_EXTRA: Row[] = [
  { id: "rq1", kind: "request", code: "Vaccine stock gap at the Ward 08 centre", other: "Programme coordination", service: "Service gap", category: "—", species: "—", exposure: "—", sent: "Yesterday", by: "Programme lead", status: "New", note: "Confirm when stock is back, or agree a referral pathway.", closed: null },
  { id: "pw1", kind: "pathway", code: "Rabies immunoglobulin", other: "District hospital", service: "Rabies immunoglobulin", category: "—", species: "—", exposure: "—", sent: "—", by: "—", status: "Pathway", note: "Category III exposures", closed: null },
];

export function Referrals() {
  const live = useLive(); const org = useClinic();
  const clinic = !!org && !isLab(org);
  const pl = usePlaces(live.ready && !!live.org);
  const place = placeOf(pl.places, org?.org_id);
  const prog = place?.programmes[0] ?? null;
  const tr = useRead<ClinicTransfers>(() => call("oh_clinic_transfers", { p_facility: org!.org_id }), `nx-tr:${org?.org_id}`, clinic);
  const ho = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { to_org: org!.org_id }, "*", 200), `nx-rho:${org?.org_id}`, clinic);
  const net = useRead<Network>(() => call("oh_programme_network", { p_programme: prog!.id }), `nx-net:${prog?.id}`, clinic && !!prog);
  const names = useNames(clinic);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const t of tr.data?.incoming ?? []) out.push({ id: t.id, kind: "in", code: t.code, other: t.from_short ?? t.from, service: svc(t.service), category: t.category === "not_recorded" ? "not recorded" : t.category, species: word(t.animal_species), exposure: fmtDate(t.exposure_on), sent: fmtDate(t.sent_at), by: t.sent_by ?? "—", status: TRANSFER[t.status]?.label ?? word(t.status), note: t.note, closed: t.closed_at ? `${fmtDate(t.closed_at)}${t.closed_by ? `, ${t.closed_by}` : ""}` : null, raw: { transfer: t } });
    for (const t of tr.data?.outgoing ?? []) out.push({ id: t.id, kind: "out", code: t.code ?? "—", other: t.to_short ?? t.to, service: svc(t.service), category: "—", species: "—", exposure: "—", sent: fmtDate(t.sent_at), by: t.sent_by ?? "—", status: TRANSFER[t.status]?.label ?? word(t.status), note: t.note ?? null, closed: t.closed_at ? `${fmtDate(t.closed_at)}${t.closed_by ? `, ${t.closed_by}` : ""}` : null, raw: { transfer: t } });
    /* A laboratory's result for a sample this place sent arrives as a result notice: it is listed here with a link to the
       result, so the sender sees it (it used to be left out, and the result could only be reached by its address). */
    for (const h of ho.data ?? []) out.push({ id: h.id, kind: "request", code: h.title, other: names.org(h.from_org) ?? "Programme", service: HANDOFF_KIND[h.kind] ?? word(h.kind), category: "—", species: "—", exposure: "—", sent: fmtDate(h.created_at), by: "—", status: HANDOFF[h.status]?.label ?? word(h.status), note: h.detail, closed: h.closed_at ? `${fmtDate(h.closed_at)}${h.closed_by_name ? `, ${h.closed_by_name}` : ""}` : null, raw: { handoff: h } });
    for (const r of net.data?.referrals ?? []) if (r.from === org?.org_id) { const to = net.data!.facilities.find((f) => f.id === r.to); out.push({ id: `${r.from}${r.to}${r.service}`, kind: "pathway", code: SERVICE_LABEL[r.service] ?? r.service, other: to?.short_name ?? to?.name ?? "A partner", service: SERVICE_LABEL[r.service] ?? r.service, category: "—", species: "—", exposure: "—", sent: "—", by: "—", status: "Pathway", note: r.note, closed: null, raw: { path: r } }); }
    return out;
  }, [tr.data, ho.data, net.data, names, org?.org_id]);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Healthcare", "Referrals"]} />;
  const sample = !live.org;
  if (!sample && !org) return <NotHealth crumb="Referrals" />;
  if (!sample && isLab(org)) return <Shell ws="health" crumb={["Healthcare", "Referrals"]}><div className="nx-page"><h1 className="nx-h1">Referrals</h1><p className="nx-sub" style={{ maxWidth: "62ch" }}>Referrals carry people between clinics. {org!.name} is a laboratory; samples it receives are on the Samples page.</p></div></Shell>;
  const data: Row[] = sample ? [...REFERRALS.map((r) => ({ ...r, kind: r.dir as Kind })), ...SAMPLE_EXTRA] : rows;
  const waiting = data.filter((r) => r.kind === "in" && r.status === "Referred").length;
  const reload = () => { tr.reload(); ho.reload(); net.reload(); };
  return <ListPage ws="health" crumb={["Healthcare", "Referrals"]} title="Referrals" sample={sample} eyebrow={<>{sample ? "District hospital" : org!.name}<GhMark /></>}
    sub={sample || tr.data ? <><b className="num">{waiting}</b> {waiting === 1 ? "person is" : "people are"} on the way here. <About>A referral carries the case code, category and service needed; names and phone numbers stay with the sending facility.</About></> : "Reading referrals…"}
    views={[
      { id: "in", label: "On the way here", test: (r: Row) => r.kind === "in" && r.status === "Referred" },
      { id: "out", label: "Sent by us", test: (r: Row) => r.kind === "out" },
      { id: "all", label: "All", test: (r: Row) => r.kind === "in" || r.kind === "out" },
      { id: "req", label: "Requests to us", test: (r: Row) => r.kind === "request" },
      { id: "path", label: "Where we send people", test: (r: Row) => r.kind === "pathway" },
    ]}
    columns={cols} rows={data} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.other} ${r.service}`}
    preview={(r) => ({ title: <span className={r.kind === "in" || r.kind === "out" ? "num" : undefined}>{r.code}</span>, sub: <>{r.kind === "in" || r.kind === "request" ? `From ${r.other}` : `To ${r.other}`} <Chip tone={TONE[r.status] ?? "plain"}>{r.status}</Chip></>, body: <>
      <Props items={[["Needs", r.service], ...(r.category !== "—" ? [["Category", r.category] as [string, string]] : []), ...(r.species !== "—" ? [["Animal", r.species] as [string, string]] : []), ...(r.exposure !== "—" ? [["Exposure", r.exposure] as [string, string]] : []), ...(r.sent !== "—" ? [["Sent", `${r.sent}${r.by !== "—" ? ` · ${r.by}` : ""}`] as [string, string]] : []), ...(r.note ? [["Note", r.note] as [string, string]] : []), ...(r.closed ? [["Closed", r.closed] as [string, string]] : [])]} />
      <RowActions r={r} sample={sample} place={place} canConfigure={!!net.data?.can_configure} progId={prog?.id ?? null} onDone={reload} />
      <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>{r.kind === "request" || r.kind === "pathway" ? "Requests and pathways never carry patient details." : "Only the case code and the incident facts travel with a referral."} Kaju reads them only for people allowed to open them. Clinical decisions stay with clinicians.</span></p></> })}
    loading={!sample && !tr.data && !tr.error} error={tr.error} empty={{ none: "No referrals yet", hint: "People referred to or from this facility appear here." }} />;
}

function RowActions({ r, sample, place, canConfigure, progId, onDone }: { r: Row; sample: boolean; place: Place | null; canConfigure: boolean; progId: string | null; onDone: () => void }) {
  const router = useRouter();
  const [ask, setAsk] = useState<null | "not_arrived" | "withdrawn" | "remove">(null);
  const [outcome, setOutcome] = useState<"done" | "decline" | null>(null);
  const { busy, run } = useAct();
  const t = r.raw?.transfer, h = r.raw?.handoff;
  const act = async (action: "arrived" | "not_arrived" | "withdrawn") => {
    const res = await run(`x:${r.id}`, () => call("oh_transfer_act", { p_transfer: r.id, p_action: action }), { ok: action === "arrived" ? "Marked as arrived. Record the bite here so the course is followed." : action === "not_arrived" ? `Marked as not arrived. ${r.other} can see it.` : "Referral withdrawn." });
    setAsk(null);
    if (!res.ok) return;
    onDone();
    if (action === "arrived" && t && "from" in t) router.push(`/health/bites/new?referral=${t.id}&from=${encodeURIComponent(t.from_short ?? t.from)}&code=${encodeURIComponent(t.code)}&species=${t.animal_species}&on=${t.exposure_on}`);
  };
  const markRead = async () => { const res = await run(`h:${r.id}`, () => call("oh_handoff_act", { p_handoff: r.id, p_action: "accept" }), { ok: "Marked as read. The laboratory sees that it was opened." }); if (res.ok) onDone(); };
  const accept = async () => { const res = await run(`h:${r.id}`, () => call("oh_handoff_act", { p_handoff: r.id, p_action: "accept" }), { ok: "Accepted. The programme sees it as in progress." }); if (res.ok) onDone(); };
  const removePath = async () => { const p = r.raw!.path!; const res = await run("rm", () => call("oh_set_referral", { p_programme: progId, p_from: p.from, p_to: p.to, p_service: p.service, p_note: null, p_remove: true }), { ok: "Pathway removed.", undo: () => call("oh_set_referral", { p_programme: progId, p_from: p.from, p_to: p.to, p_service: p.service, p_note: p.note, p_remove: false }).then(() => onDone()) }); setAsk(null); if (res.ok) onDone(); };
  let buttons = null;
  if (r.kind === "in" && r.status === "Referred" && (sample || can(place, "view_register"))) buttons = sample ? <><TryLink sm>Arrived: record the bite</TryLink><TryLink sm quiet>Did not arrive</TryLink></> : <><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void act("arrived")}>Arrived: record the bite</button><button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setAsk("not_arrived")}>Did not arrive</button></>;
  else if (r.kind === "in" && r.status === "Arrived" && t && "from" in t && !sample && can(place, "record_exposure")) buttons = <><Link className="nx-btn is-sm is-quiet" href={`/health/bites/new?referral=${t.id}&from=${encodeURIComponent(t.from_short ?? t.from)}&code=${encodeURIComponent(t.code)}&species=${t.animal_species}&on=${t.exposure_on}`}>Record the bite</Link><span className="gh-hint">Only if it is not in the register yet.</span></>;
  else if (r.kind === "out" && r.status === "Referred" && (sample || can(place, "assess"))) buttons = sample ? <TryLink sm quiet>Withdraw</TryLink> : <>{t && "exposure_id" in t && t.exposure_id ? <Link className="nx-btn is-sm is-quiet" href={`/health/bites/${t.exposure_id}`}>Open the record</Link> : null}<button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setAsk("withdrawn")}>Withdraw</button></>;
  else if (r.kind === "out" && t && "exposure_id" in t && t.exposure_id && !sample) buttons = <Link className="nx-btn is-sm is-quiet" href={`/health/bites/${t.exposure_id}`}>Open the record</Link>;
  else if (r.kind === "request" && h?.kind === "result_notice" && !sample) buttons = <>{h.sample_id ? <Link className="nx-btn is-sm" href={`/health/samples/${h.sample_id}`}>Open the result</Link> : null}{h.status === "open" && can(place, "act_handoff") ? <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => void markRead()}>Mark as read</button> : null}</>;
  else if (r.kind === "request" && (r.status === "New" || r.status === "In progress") && (sample || can(place, "act_handoff"))) buttons = sample ? <><TryLink sm>Accept</TryLink><TryLink sm quiet>Record outcome</TryLink></> : <>{h?.status === "open" ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void accept()}>Accept</button> : null}<button type="button" className="nx-btn is-sm is-quiet" onClick={() => setOutcome("done")}>Record outcome</button><button type="button" className="nx-btn is-sm is-quiet" onClick={() => setOutcome("decline")}>Decline</button></>;
  else if (r.kind === "pathway" && canConfigure && progId && !sample) buttons = <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setAsk("remove")}>Remove pathway</button>;
  return <>
    {buttons ? <div className="gh-steps" style={{ marginTop: 14 }}>{buttons}</div> : r.kind === "pathway" ? <p className="nx-foot">Pathways are set by the programme&apos;s coordinators.</p> : null}
    {ask === "not_arrived" ? <Confirm title="Did not arrive" busy={!!busy} confirm="Mark not arrived" onClose={() => setAsk(null)} onConfirm={() => void act("not_arrived")}><p>{r.other} sees that {r.code} did not arrive, so they can follow up with the person.</p></Confirm> : null}
    {ask === "withdrawn" ? <Confirm title="Withdraw this referral" danger busy={!!busy} confirm="Withdraw" onClose={() => setAsk(null)} onConfirm={() => void act("withdrawn")}><p>{r.other} will no longer expect the person. The withdrawal is recorded in the history.</p></Confirm> : null}
    {ask === "remove" ? <Confirm title="Remove this pathway" danger busy={!!busy} confirm="Remove" onClose={() => setAsk(null)} onConfirm={() => void removePath()}><p>This facility will no longer show {r.other} as where to send people for {r.service.toLowerCase()}. You can undo it straight after.</p></Confirm> : null}
    {outcome && h ? <OutcomeModal h={h} action={outcome} onClose={() => setOutcome(null)} onDone={() => { setOutcome(null); onDone(); }} /> : null}
  </>;
}
