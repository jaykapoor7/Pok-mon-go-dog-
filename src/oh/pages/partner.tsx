"use client";

/* An NGO's programme work: follow-ups from hospitals, labs and coordinators,
   and the samples it has sent. A follow-up never carries patient details. */
import Link from "next/link";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent } from "react";
import { usePlaces, primaryProgramme } from "../places";
import { call, daysFrom, fmtDate, select, today, useNames, useRead, HANDOFF, HANDOFF_KIND, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Area, type Handoff, type Place, type Sample } from "../data";
import { Chip, Empty, Failed, Head, Loading, Page, Section, Seg, Sheet, useToast } from "../ui";

type Dog = { id: string; name: string | null; code: string | null; zone: string | null; vaccination_status: string | null };

export function PartnerRequests({ place }: { place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const id = place.organisation_id, prog = primaryProgramme(place);
  const hand = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { to_org: id }), `h:${id}`);
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { submitted_by: id }), `s:${id}`);
  const names = useNames();
  const [closing, setClosing] = useState<Handoff | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [allSamples, setAllSamples] = useState(false);
  const toast = useToast();
  const list = (hand.data ?? []).slice().sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9") || b.created_at.localeCompare(a.created_at));
  const open = list.filter((h) => h.status === "open" || h.status === "accepted"), closed = list.filter((h) => h.status === "done" || h.status === "declined").reverse();
  const overdue = open.filter((h) => h.due_on && h.due_on < new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const accept = async (h: Handoff) => { const r = await call("oh_handoff_act", { p_handoff: h.id, p_action: "accept" }); if (r.error) toast(r.error, "flame"); else { toast("Accepted. It is now in progress for your team."); hand.reload(); reloadPlaces(); } };
  const ngoId = place.ngo_id;

  return (
    <Page illustrative={place.illustrative}>
      <Head eyebrow={prog?.name} title="Requests" lede="Animals to find and observe after a bite, vaccination requests and laboratory results sent to your team. Patient details are never shared." />
      <Section title="Waiting for your team" id="work">
        <nav className="oh-tabs" aria-label="Show" style={{ marginTop: 0 }}>
          <a href="#work" aria-current={tab === "open" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("open"); }}>Open ({open.length}){overdue.length ? <span style={{ color: "var(--flame)" }}> · {overdue.length} overdue</span> : null}</a>
          <a href="#work" aria-current={tab === "closed" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("closed"); }}>Closed ({closed.length})</a>
        </nav>
        {hand.loading && !hand.data ? <Loading rows={4} /> : hand.error ? <Failed error={hand.error} retry={hand.reload} /> : !(tab === "open" ? open : closed).length ? <Empty title={tab === "open" ? "Nothing open" : "Nothing closed yet"} /> : (
          <div className="oh-rows">
            {(tab === "open" ? open : closed).slice(0, 40).map((h) => {
              const late = h.due_on && overdue.includes(h);
              return (
                <div className="oh-row" key={h.id}>
                  <span className="oh-row-mark" data-tone={late ? "flame" : h.kind === "result_notice" ? "amber" : HANDOFF[h.status].tone || undefined} aria-hidden />
                  <div className="oh-row-main">
                    <b>{h.title}</b>
                    <span className="wrap">{h.detail?.startsWith("Animal: ") ? `${h.detail.split("\n")[0].slice(8)} · ` : ""}{HANDOFF_KIND[h.kind]} from {h.from_org ? names.org(h.from_org) ?? "a partner" : "the programme"} · {names.area(h.area_id) ?? "Area not recorded"}{h.place ? ` · ${h.place}` : ""}{h.outcome && tab === "closed" ? ` · ${h.outcome}` : ""}</span>
                  </div>
                  <div className="oh-row-meta">
                    {h.due_on && tab === "open" ? <span style={{ color: late ? "var(--flame)" : undefined }}>{late ? `${-daysFrom(h.due_on)} day${daysFrom(h.due_on) === -1 ? "" : "s"} overdue` : `Due ${fmtDate(h.due_on)}`}</span> : null}
                    <Chip tone={HANDOFF[h.status].tone}>{HANDOFF[h.status].label}</Chip>
                    {h.status === "open" ? <button type="button" className="oh-btn small" onClick={() => void accept(h)}>Accept</button> : null}
                    {h.status === "open" || h.status === "accepted" ? <button type="button" className="oh-btn small primary" onClick={() => setClosing(h)}>Record what you found</button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Samples you sent" note="Most recent first" id="samples">
        {samples.loading && !samples.data ? <Loading rows={2} /> : samples.error ? <Failed error={samples.error} retry={samples.reload} /> : !samples.data?.length ? <Empty title="No samples sent">When an observed animal is sick or dies, send a sample from here.</Empty> : (
          <div className="oh-rows">
            {samples.data.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, allSamples ? undefined : 5).map((s) => (
              <Link className="oh-row" key={s.id} href={`/workspace/${id}/record/${s.id}`}>
                <div className="oh-row-main"><b>{s.code} · {SPECIES[s.species]}</b><span>{names.area(s.area_id) ?? "Area not recorded"} · collected {fmtDate(s.collected_on)}</span></div>
                <div className="oh-row-meta">{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}</div>
              </Link>
            ))}
          </div>
        )}
        {(samples.data?.length ?? 0) > 5 ? <button type="button" className="oh-more" aria-expanded={allSamples} onClick={() => setAllSamples((v) => !v)}>{allSamples ? "Show the most recent" : `Show all ${samples.data!.length}`}</button> : null}
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
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || outcome.trim().length < 3} onClick={() => void save()}>{busy ? "Saving…" : decline ? "Decline" : "Close follow-up"}</button></>}>
      {h.detail ? <p className="oh-note" style={{ whiteSpace: "pre-line" }}>{h.detail}</p> : null}
      <label className="oh-field"><span>{decline ? "Why you cannot do this" : "What you found"}</span><textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={600} placeholder={decline ? "For example: outside our ward" : "For example: dog found alive, observed for ten days, healthy"} /></label>
      {h.kind === "animal_followup" && !decline ? (
        <label className="oh-field"><span>The animal on your register</span>
          <select value={animal} onChange={(e) => setAnimal(e.target.value)}><option value="">Not on the register, or not found</option>{(dogs.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name ?? d.code}{d.code && d.name ? ` · ${d.code}` : ""}{d.vaccination_status === "vaccinated" ? " · vaccinated" : ""}</option>)}</select>
          <small>Linking the animal keeps its history in one place.</small>
        </label>
      ) : null}
      {h.kind === "animal_followup" && !decline ? <Link className="oh-btn" href={`/workspace/${institution}/sample?handoff=${h.id}&area=${h.area_id ?? ""}&place=${encodeURIComponent(h.place ?? "")}`}><FlaskConical size={16} aria-hidden />The animal is sick or died: send a sample</Link> : null}
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
    <Page illustrative={place.illustrative}>
      <Head eyebrow={place.short_name ?? place.name} title="Send a sample to the laboratory" lede="You will get a code to write on the container. The laboratory sees the sample arriving and reports the result back to you." />
      <form className="oh-form" onSubmit={submit}>
        <fieldset className="oh-fieldset">
          <legend>The sample</legend>
          <div className="oh-field"><span>Animal</span><Seg name="sp" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={(Object.entries(SPECIES) as [string, string][]).filter(([k]) => k !== "unknown")} /></div>
          <div className="oh-field"><span>Sample</span><Seg name="type" label="Sample" value={f.type} onChange={(v) => set("type", v)} options={Object.entries(SAMPLE_TYPE) as [string, string][]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>Collected on</span><input type="date" value={f.on} max={today()} onChange={(e) => set("on", e.target.value)} required /></label>
            <label className="oh-field"><span>Laboratory</span><select value={lab} onChange={(e) => set("lab", e.target.value)} required>{labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          </div>
          <p className="oh-note">Follow the laboratory&apos;s own collection, packaging and cold-chain instructions. Only trained, vaccinated staff should collect samples.</p>
        </fieldset>
        <fieldset className="oh-fieldset">
          <legend>Where and why</legend>
          <div className="oh-fields">
            <label className="oh-field"><span>Area</span><select value={f.area} onChange={(e) => set("area", e.target.value)}><option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="oh-field"><span>Place</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
            <label className="oh-field full"><span>What happened to the animal</span><textarea value={f.reason} maxLength={400} onChange={(e) => set("reason", e.target.value)} placeholder="Signs seen, when it died, whether it bit anyone" /></label>
          </div>
        </fieldset>
        {err ? <Failed error={err} /> : null}
        {!labs.length && names.orgs.length ? <Failed error="No laboratory is part of this programme yet." /> : null}
        <div className="oh-submit"><button className="oh-btn primary" type="submit" disabled={busy || !lab}>{busy ? "Sending…" : "Send sample"}</button><button type="button" className="oh-btn" onClick={() => router.back()}>Cancel</button></div>
      </form>
    </Page>
  );
}
