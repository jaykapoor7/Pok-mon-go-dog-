"use client";

/* An NGO's programme work: follow-ups from hospitals, labs and coordinators,
   and the samples it has sent. A follow-up never carries patient details. */
import { useState } from "react";
import { ArrowRightLeft, FlaskConical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent } from "react";
import { Btn, Lanes, More, Note, Panel, Tools, type Lane } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { usePlaces } from "../places";
import { call, daysFrom, fmtDate, select, today, useNames, useRead, HANDOFF, HANDOFF_KIND, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Area, type Handoff, type Place, type Sample } from "../data";
import { Chip, Empty, Failed, Head, Loading, Page, Row, Rows, Section, Seg, Sheet, useToast } from "../ui";

type Dog = { id: string; name: string | null; code: string | null; zone: string | null; vaccination_status: string | null };
type ReqLane = "open" | "accepted" | "closed";

export function PartnerRequests({ place }: { place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const id = place.organisation_id;
  const hand = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { to_org: id }), `h:${id}`);
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { submitted_by: id }), `s:${id}`);
  const names = useNames();
  const [closing, setClosing] = useState<Handoff | null>(null);
  const [tab, setTab] = usePageState<ReqLane>("lane", "open");
  const toast = useToast();
  const list = (hand.data ?? []).slice().sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9") || b.created_at.localeCompare(a.created_at));
  const fresh = list.filter((h) => h.status === "open"), accepted = list.filter((h) => h.status === "accepted"), closed = list.filter((h) => h.status === "done" || h.status === "declined").reverse();
  const now = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isLate = (h: Handoff) => (h.status === "open" || h.status === "accepted") && !!h.due_on && h.due_on < now;
  const overdue = [...fresh, ...accepted].filter(isLate);
  const accept = async (h: Handoff) => { const r = await call("oh_handoff_act", { p_handoff: h.id, p_action: "accept" }); if (r.error) toast(r.error, "flame"); else { toast("Accepted. It is now in progress for your team."); hand.reload(); reloadPlaces(); } };
  const ngoId = place.ngo_id;
  const lanes: Lane<ReqLane>[] = [
    { id: "open", label: "Open", count: fresh.length, tone: fresh.some(isLate) ? "flame" : fresh.length ? "blue" : undefined },
    { id: "accepted", label: "Accepted", count: accepted.length, tone: accepted.some(isLate) ? "flame" : undefined },
    { id: "closed", label: "Done", count: closed.length },
  ];
  const shownList = tab === "open" ? fresh : tab === "accepted" ? accepted : closed;
  const sent = (samples.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <Page illustrative={place.illustrative}>
      <Head title="Requests" lede={hand.error ? "The requests could not be read." : !hand.data ? "Reading the requests…" : <>{fresh.length + accepted.length ? <><b>{fresh.length + accepted.length}</b> {fresh.length + accepted.length === 1 ? "request is" : "requests are"} waiting for your team{overdue.length ? <>, <span className="is-hot">{overdue.length} overdue</span></> : null}. </> : "Nothing is waiting for your team. "}Patient details are never shared.</>} />
      <Tools><Lanes label="Show" lanes={lanes} value={tab} onChange={setTab} /></Tools>
      {hand.loading && !hand.data ? <Loading rows={4} /> : hand.error ? <Failed error={hand.error} retry={hand.reload} /> : (
        <Panel id="work">
          {!shownList.length ? <Empty title={tab === "open" ? "Nothing open" : tab === "accepted" ? "Nothing in progress" : "Nothing closed yet"} /> : (
            <More items={shownList.slice(0, 40)} cap={8} noun="requests">{(shown) => (
              <Rows label="Requests">
                {shown.map((h) => {
                  const late = isLate(h);
                  return (
                    <Row key={h.id} icon={<ArrowRightLeft size={14} />} tone={late ? "flame" : h.kind === "result_notice" ? "amber" : h.status === "open" ? "blue" : h.status === "done" ? "green" : "plain"} title={h.title}
                      meta={`${h.detail?.startsWith("Animal: ") ? `${h.detail.split("\n")[0].slice(8)} · ` : ""}${HANDOFF_KIND[h.kind]} from ${h.from_org ? names.org(h.from_org) ?? "a partner" : "the programme"} · ${names.area(h.area_id) ?? "Area not recorded"}${h.place ? ` · ${h.place}` : ""}${h.outcome && tab === "closed" ? ` · ${h.outcome}` : ""}`}
                      end={<>
                        {h.due_on && tab !== "closed" ? <span className={late ? "oh-hot" : undefined}>{late ? `${-daysFrom(h.due_on)} day${daysFrom(h.due_on) === -1 ? "" : "s"} overdue` : `Due ${fmtDate(h.due_on)}`}</span> : null}
                        {tab === "closed" ? <Chip tone={HANDOFF[h.status].tone}>{HANDOFF[h.status].label}</Chip> : null}
                        {h.status === "open" ? <Btn small variant="quiet" onClick={() => void accept(h)}>Accept</Btn> : null}
                        {h.status === "open" || h.status === "accepted" ? <Btn small onClick={() => setClosing(h)}>Record what you found</Btn> : null}
                      </>} />
                  );
                })}
              </Rows>
            )}</More>
          )}
        </Panel>
      )}
      <Section title="Samples you sent" id="samples" count={samples.data ? sent.length : null} note="Most recent first">
        {samples.loading && !samples.data ? <Loading rows={2} /> : samples.error ? <Failed error={samples.error} retry={samples.reload} /> : !sent.length ? <Empty title="No samples sent">When an observed animal is sick or dies, send a sample from here.</Empty> : (
          <Panel><More items={sent} cap={4} noun="samples">{(shown) => (
            <Rows label="Samples you sent">
              {shown.map((s) => <Row key={s.id} href={`/workspace/${id}/record/${s.id}`} icon={<FlaskConical size={14} />} title={<><span className="oh-code">{s.code}</span> · {SPECIES[s.species]}</>} meta={`${names.area(s.area_id) ?? "Area not recorded"} · collected ${fmtDate(s.collected_on)}`}
                end={s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>} />)}
            </Rows>
          )}</More></Panel>
        )}
      </Section>
      {closing ? <Outcome h={closing} area={names.area(closing.area_id)} ngoId={ngoId} institution={id} onClose={() => setClosing(null)} onDone={(m) => { setClosing(null); toast(m); hand.reload(); reloadPlaces(); }} /> : null}
    </Page>
  );
}

function Outcome({ h, area, ngoId, institution, onClose, onDone }: { h: Handoff; area: string | null; ngoId: string | null; institution: string; onClose: () => void; onDone: (m: string) => void }) {
  const dogs = useRead<Dog[]>(() => select<Dog>("dogs", ngoId && area ? { ngo_id: ngoId, zone: area } : { ngo_id: ngoId ?? "" }, "id,name,code,zone,vaccination_status", 100), `dogs:${ngoId}:${area}`, !!ngoId && h.kind === "animal_followup");
  const [outcome, setOutcome] = useState(""), [animal, setAnimal] = useState(""), [decline, setDecline] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_handoff_act", { p_handoff: h.id, p_action: decline ? "decline" : "done", p_outcome: outcome, p_animal: animal || null });
    setBusy(false); if (r.error) setErr(r.error); else onDone(decline ? "Declined. The sender can see your reason." : "Saved. The sender can see what you found.");
  };
  return (
    <Sheet title="Record what you found" note={h.title} onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || outcome.trim().length < 3} onClick={() => void save()}>{busy ? "Saving…" : decline ? "Decline" : "Close follow-up"}</Btn></>}>
      {h.detail ? <Note><span style={{ whiteSpace: "pre-line" }}>{h.detail}</span></Note> : null}
      <label className="oh-field"><span>{decline ? "Why you cannot do this" : "What you found"}</span><textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={600} placeholder={decline ? "For example: outside our ward" : "For example: dog found alive, observed for ten days, healthy"} /></label>
      {h.kind === "animal_followup" && !decline ? (
        <label className="oh-field"><span>The animal on your register</span>
          <select value={animal} onChange={(e) => setAnimal(e.target.value)}><option value="">Not on the register, or not found</option>{(dogs.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name ?? d.code}{d.code && d.name ? ` · ${d.code}` : ""}{d.vaccination_status === "vaccinated" ? " · vaccinated" : ""}</option>)}</select>
          <small>Linking the animal keeps its history in one place.</small>
        </label>
      ) : null}
      {h.kind === "animal_followup" && !decline ? <div><Btn icon={<FlaskConical size={14} />} href={`/workspace/${institution}/sample?handoff=${h.id}&area=${h.area_id ?? ""}&place=${encodeURIComponent(h.place ?? "")}`}>The animal is sick or died: send a sample</Btn></div> : null}
      <label className="oh-check"><input type="checkbox" checked={decline} onChange={(e) => setDecline(e.target.checked)} /><span>My team cannot take this on</span></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

export function SendSample({ place }: { place: Place }) { return <Suspense><SendSampleBody place={place} /></Suspense>; }

function SendSampleBody({ place }: { place: Place }) {
  const { reload } = usePlaces();
  const sp = useSearchParams(), router = useRouter(), toast = useToast();
  const names = useNames();
  const areas = useRead<Area[]>(() => call("oh_org_areas", { p_org: place.organisation_id }), `areas:${place.organisation_id}`);
  const labs = names.orgs.filter((i) => i.kind === "laboratory");
  const [f, setF] = useState({ lab: "", species: "dog", type: "brain_tissue", on: today(), area: sp.get("area") ?? "", place: sp.get("place") ?? "", reason: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  if (!place.capabilities.includes("send_sample")) return <Page><Empty title="Your role here cannot send samples" /></Page>;
  const lab = f.lab || labs[0]?.id || "";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ id: string; code: string }>("oh_submit_sample", { p_from: place.organisation_id, p_lab: lab, p_species: f.species, p_type: f.type, p_collected_on: f.on, p_area: f.area || null, p_place: f.place || null, p_reason: f.reason || null, p_handoff: sp.get("handoff") || null });
    setBusy(false);
    if (r.error || !r.data) { setErr(r.error ?? "Could not send."); return; }
    toast(`Sample ${r.data.code} is on its way. Write the code on the container.`); reload();
    router.push(`/workspace/${place.organisation_id}/record/${r.data.id}`);
  };
  return (
    <Page illustrative={place.illustrative} narrow>
      <Head title="Send a sample" lede="You will get a code to write on the container. The laboratory sees the sample arriving and reports the result back to you." />
      <form className="oh-form" onSubmit={submit}>
        <Section title="The sample">
          <div className="oh-fields">
            <div className="oh-field"><span>Animal</span><Seg name="sp" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={(Object.entries(SPECIES) as [string, string][]).filter(([k]) => k !== "unknown")} /></div>
            <div className="oh-field"><span>Sample</span><Seg name="type" label="Sample" value={f.type} onChange={(v) => set("type", v)} options={Object.entries(SAMPLE_TYPE) as [string, string][]} /></div>
            <label className="oh-field"><span>Collected on</span><input type="date" value={f.on} max={today()} onChange={(e) => set("on", e.target.value)} required /></label>
            <label className="oh-field"><span>Laboratory</span><select value={lab} onChange={(e) => set("lab", e.target.value)} required>{labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <Note>Follow the laboratory&apos;s own collection, packaging and cold-chain instructions. Only trained, vaccinated staff should collect samples.</Note>
          </div>
        </Section>
        <Section title="Where and why">
          <div className="oh-fields">
            <label className="oh-field"><span>Area</span><select value={f.area} onChange={(e) => set("area", e.target.value)}><option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="oh-field"><span>Place</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
            <label className="oh-field"><span>What happened to the animal</span><textarea value={f.reason} maxLength={400} onChange={(e) => set("reason", e.target.value)} placeholder="Signs seen, when it died, whether it bit anyone" /></label>
          </div>
        </Section>
        {err ? <Failed error={err} /> : null}
        {!labs.length && names.orgs.length ? <Failed error="No laboratory is part of this programme yet." /> : null}
        <div className="oh-submit"><Btn variant="primary" type="submit" disabled={busy || !lab}>{busy ? "Sending…" : "Send sample"}</Btn><Btn onClick={() => router.back()}>Cancel</Btn></div>
      </form>
    </Page>
  );
}
