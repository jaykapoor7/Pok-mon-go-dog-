"use client";

/* Confirming what a facility can offer this week. A confirmation expires,
   and the public finder then says "not verified" rather than guessing. */
import { useState } from "react";
import { OhShell, isFacility, useOh } from "../Shell";
import { call, fmtTime, relDay, select, useRead, SERVICE_LABEL, SERVICE_STATUS, type Service } from "../data";
import { Chip, Empty, Failed, Head, Loading, Seg, Sheet, useToast } from "../ui";

export function Services() { return <OhShell><Body /></OhShell>; }

function Body() {
  const { place, reload: reloadPlaces } = useOh();
  const id = place?.institution_id ?? "";
  const rows = useRead<Service[]>(() => select<Service>("oh_service_status", { institution_id: id }), `svc:${id}`, !!place);
  const [edit, setEdit] = useState<string | null>(null);
  const toast = useToast();
  if (!place) return <main className="oh-page"><Empty title="You are not part of this place" /></main>;
  const offered = isFacility(place.kind) ? ["arv", "rig", "wound_care"] : place.kind === "laboratory" ? ["rabies_testing"] : ["dog_vaccination"];
  const latest = (svc: string) => (rows.data ?? []).filter((r) => r.service === svc).sort((a, b) => b.verified_at.localeCompare(a.verified_at))[0];
  const now = new Date().toISOString();
  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place.short_name ?? place.name} title="Services this week" lede="Confirm what you can offer. Patients and partners see it; each confirmation lasts up to seven days, after which it shows as not verified. Stock quantities are never published." />
      {rows.loading && !rows.data ? <Loading rows={3} /> : rows.error ? <Failed error={rows.error} retry={rows.reload} /> : (
        <div className="oh-rows">
          {offered.map((svc) => {
            const l = latest(svc), stale = l && l.valid_until < now, st = !l || stale ? "not_verified" : l.status;
            return (
              <div className="oh-row" key={svc}>
                <span className="oh-row-mark" data-tone={st === "available" ? "green" : st === "limited" ? "amber" : st === "unavailable" ? "flame" : undefined} aria-hidden />
                <div className="oh-row-main"><b>{SERVICE_LABEL[svc]}</b><span>{l ? `${stale ? "Expired" : "Confirmed"} ${fmtTime(l.verified_at)} by ${l.verified_by_name ?? "staff"}${stale ? "" : ` · valid ${relDay(l.valid_until).toLowerCase()}`}${l.note ? ` · ${l.note}` : ""}` : "Never confirmed"}</span></div>
                <div className="oh-row-meta"><Chip tone={SERVICE_STATUS[st].tone}>{SERVICE_STATUS[st].label}</Chip><button type="button" className={`oh-btn small${st === "not_verified" ? " primary" : ""}`} onClick={() => setEdit(svc)}>Confirm</button></div>
              </div>
            );
          })}
        </div>
      )}
      {edit ? <Confirm institution={id} service={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); toast(`${SERVICE_LABEL[edit]} confirmed for seven days.`); rows.reload(); reloadPlaces(); }} /> : null}
    </main>
  );
}

function Confirm({ institution, service, onClose, onDone }: { institution: string; service: string; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<"available" | "limited" | "unavailable">("available"), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_verify_service", { p_institution: institution, p_service: service, p_status: status, p_note: note || null, p_valid_days: 7 }); setBusy(false); if (r.error) setErr(r.error); else onDone(); };
  return (
    <Sheet title={SERVICE_LABEL[service]} note="Valid for seven days from now" onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Confirm"}</button></>}>
      <Seg name="status" value={status} onChange={setStatus} options={[["available", "Available"], ["limited", "Limited"], ["unavailable", "Not available"]]} />
      <label className="oh-field"><span>Note for patients and partners (optional)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={status === "unavailable" ? "Where to go instead" : "For example: mornings only"} /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
