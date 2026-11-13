"use client";

/* /workspace/[id]/…: the screens of one place, chosen by what the place is.
   A hospital's home is its day; a laboratory's is its samples; an NGO's is
   the requests partners sent it. Overseeing places live on the programme. */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isFacility, oversees, placeHome } from "../places";
import { call, fmtTime, relDay, select, useRead, SERVICE_LABEL, SERVICE_STATUS, type Place, type ServiceNow } from "../data";
import { Btn, Note, Panel, Tag } from "@/ws/kit";
import { Chip, Empty, Failed, Head, Loading, Page, Row, Rows, Seg, Sheet, useToast } from "../ui";
import { ClinicToday, NewExposure, NotHere, Register, usePlaceParam } from "./facility";
import { ExposureRecord } from "./ExposureRecord";
import { LabQueue, SampleRecord } from "./lab";
import { PartnerRequests, SendSample } from "./partner";

function useHere(): Place | "loading" | null {
  const { place, ready } = usePlaceParam();
  if (!ready) return "loading";
  return place;
}

function Gate({ children }: { children: (p: Place) => React.ReactNode }) {
  const p = useHere();
  if (p === "loading") return <Page><Loading rows={4} /></Page>;
  if (!p) return <NotHere ready />;
  return <>{children(p)}</>;
}

export function WorkspaceHome() {
  const router = useRouter();
  const p = useHere();
  useEffect(() => { if (p && p !== "loading" && oversees(p.kind)) router.replace(placeHome(p)); }, [p, router]);
  return <Gate>{(place) => isFacility(place.kind) ? <ClinicToday place={place} /> : place.kind === "laboratory" ? <LabQueue place={place} /> : place.kind === "ngo" ? <PartnerRequests place={place} /> : <Page><Loading /></Page>}</Gate>;
}
export function WorkspaceRegister() { return <Gate>{(p) => isFacility(p.kind) ? <Register place={p} /> : <Page><Empty title="Only hospitals and health centres keep a bite register" /></Page>}</Gate>; }
export function WorkspaceNew() { return <Gate>{(p) => <NewExposure place={p} />}</Gate>; }
export function WorkspaceSample() { return <Gate>{(p) => <SendSample place={p} />}</Gate>; }
export function WorkspaceRecord() {
  const { rid } = useParams<{ rid: string }>();
  return <Gate>{(p) => isFacility(p.kind) ? <ExposureRecord id={rid} place={p} /> : <SampleRecord id={rid} place={p} />}</Gate>;
}
export function WorkspaceServices() { return <Gate>{(p) => <Services place={p} />}</Gate>; }

const OFFERED: Record<string, string[]> = { hospital: ["arv", "rig", "wound_care"], clinic: ["arv", "rig", "wound_care"], laboratory: ["rabies_testing"], ngo: ["dog_vaccination"], municipal: ["dog_vaccination"] };

/** What this place can offer today, confirmed by a person for a few days at a
    time. The public finder and the programme read these confirmations; an
    expired one is shown as "not confirmed recently", never as available. */
function Services({ place }: { place: Place }) {
  const id = place.organisation_id;
  const rows = useRead<(ServiceNow & { organisation_id: string; verified_by_name: string | null })[]>(() => select("oh_service_status", { organisation_id: id }, "organisation_id,service,status,note,verified_at,valid_until,verified_by_name", 200), `svc:${id}`);
  const [edit, setEdit] = useState<string | null>(null);
  const toast = useToast();
  const offered = OFFERED[place.kind] ?? [];
  const can = place.capabilities.includes("confirm_service");
  const latest = (svc: string) => (rows.data ?? []).filter((r) => r.service === svc).sort((a, b) => b.verified_at.localeCompare(a.verified_at))[0];
  const state = (svc: string) => { const r = latest(svc); const expired = !!r && new Date(r.valid_until) < new Date(); return { r, expired, st: !r ? null : expired ? "not_verified" : r.status }; };
  const stale = offered.filter((svc) => { const x = state(svc); return !x.st || x.st === "not_verified"; }).length;
  return (
    <Page illustrative={place.illustrative}>
      <Head title="Vaccine and services" lede={rows.data && offered.length ? <>{stale ? <><b>{stale}</b> of {offered.length} {stale === 1 ? "needs" : "need"} confirming. </> : "Every service is confirmed. "}Patients, referring centres and the programme see each confirmation and its date. One lasts up to a week.</> : "Confirm what you can provide today. A confirmation lasts up to a week."} />
      {rows.loading && !rows.data ? <Loading rows={3} /> : rows.error ? <Failed error={rows.error} retry={rows.reload} /> : !offered.length ? <Empty title="This kind of place does not confirm services" /> : (
        <Panel>
          <Rows label="Services">
            {offered.map((svc) => {
              const { r, expired, st } = state(svc);
              return (
                <Row key={svc} title={SERVICE_LABEL[svc]}
                  meta={`${!r ? "Never confirmed" : expired ? `Last confirmed ${relDay(r.verified_at).toLowerCase()}; expired ${relDay(r.valid_until).toLowerCase()}` : `Confirmed ${fmtTime(r.verified_at)}${r.verified_by_name ? ` by ${r.verified_by_name}` : ""}; valid ${relDay(r.valid_until).toLowerCase()}`}${r?.note && !expired ? ` · ${r.note}` : ""}`}
                  end={<>{st ? <Chip tone={SERVICE_STATUS[st]?.tone}>{SERVICE_STATUS[st]?.label}</Chip> : <Tag tone="amber">Not confirmed</Tag>}{can ? <Btn small onClick={() => setEdit(svc)}>Confirm today</Btn> : null}</>} />
              );
            })}
          </Rows>
        </Panel>
      )}
      <p className="oh-foot">Confirmations are what a person at this place says is available. StrayPaw is <b>not connected</b> to any stock or supply system.</p>
      {edit ? <ConfirmService org={id} service={edit} onClose={() => setEdit(null)} onDone={(m) => { setEdit(null); toast(m); rows.reload(); }} /> : null}
    </Page>
  );
}

function ConfirmService({ org, service, onClose, onDone }: { org: string; service: string; onClose: () => void; onDone: (m: string) => void }) {
  const [status, setStatus] = useState<"available" | "limited" | "unavailable">("available");
  const [note, setNote] = useState(""), [days, setDays] = useState("7"), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call<{ alerted: number }>("oh_verify_service", { p_org: org, p_service: service, p_status: status, p_note: note || null, p_valid_days: Number(days) });
    setBusy(false);
    if (r.error) setErr(r.error); else onDone(r.data?.alerted ? "Confirmed. Programme coordination has been told about the gap." : "Confirmed. The public finder shows it now.");
  };
  return (
    <Sheet title={SERVICE_LABEL[service]} note="What can you provide today?" onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Confirm"}</Btn></>}>
      <Seg name="svc" label="Availability" value={status} onChange={setStatus} options={[["available", "Available"], ["limited", "Limited"], ["unavailable", "Not available"]]} />
      <label className="oh-field"><span>Note (optional)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={status === "available" ? "For example: mornings only" : "For example: supply expected Thursday"} /></label>
      <div className="oh-field"><span>Valid for</span><Seg name="days" label="Valid for" value={days} onChange={setDays} options={[["1", "Today"], ["3", "3 days"], ["7", "A week"]]} /></div>
      {status !== "available" ? <Note>Programme coordination is told when a service is limited or not available, so patients can be referred.</Note> : null}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
