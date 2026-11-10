"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { OhShell, useOh } from "../Shell";
import { call, select, today, useRead, SAMPLE_TYPE, SPECIES, type Institution, type Programme } from "../data";
import { Empty, Failed, Head, Seg, useToast } from "../ui";

export function SendSample() { return <OhShell><Suspense><Body /></Suspense></OhShell>; }

function Body() {
  const { place, reload } = useOh();
  const sp = useSearchParams(), router = useRouter(), toast = useToast();
  const inst = useRead<Institution[]>(() => select<Institution>("oh_institutions", { programme_id: place?.programme.id ?? "" }), `inst:${place?.programme.id}`, !!place);
  const prog = useRead<Programme[]>(() => select<Programme>("oh_programmes", { id: place?.programme.id ?? "" }), `prog:${place?.programme.id}`, !!place);
  const labs = (inst.data ?? []).filter((i) => i.kind === "laboratory");
  const [f, setF] = useState({ lab: "", species: "dog", type: "brain_tissue", on: today(), ward: sp.get("ward") ?? "", place: sp.get("place") ?? "", reason: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  if (!place) return <main className="oh-page"><Empty title="You are not part of this place" /></main>;
  const lab = f.lab || labs[0]?.id || "";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ id: string; code: string }>("oh_submit_sample", { p_from: place.institution_id, p_lab: lab, p_species: f.species, p_type: f.type, p_collected_on: f.on, p_ward: f.ward || null, p_place: f.place || null, p_reason: f.reason || null, p_handoff: sp.get("handoff") || null });
    setBusy(false);
    if (r.error || !r.data) { setErr(r.error ?? "Could not send."); return; }
    toast(`Sample ${r.data.code} is on its way. Write the code on the container.`); reload();
    router.push(`/workspace/${place.institution_id}/record/${r.data.id}`);
  };
  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place.short_name ?? place.name} title="Send a sample to the laboratory" lede="You will get a code to write on the container. The laboratory sees the sample arriving and reports the result back to you." />
      <form className="oh-form" onSubmit={submit}>
        <fieldset className="oh-fieldset">
          <legend>The sample</legend>
          <div className="oh-field"><span>Animal</span><Seg name="sp" value={f.species} onChange={(v) => set("species", v)} options={(Object.entries(SPECIES) as [string, string][]).filter(([k]) => k !== "unknown")} /></div>
          <div className="oh-field"><span>Sample</span><Seg name="type" value={f.type} onChange={(v) => set("type", v)} options={Object.entries(SAMPLE_TYPE) as [string, string][]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>Collected on</span><input type="date" value={f.on} max={today()} onChange={(e) => set("on", e.target.value)} required /></label>
            <label className="oh-field"><span>Laboratory</span><select value={lab} onChange={(e) => set("lab", e.target.value)} required>{labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          </div>
          <p className="oh-note">Follow the laboratory&apos;s own collection, packaging and cold-chain instructions. Only trained, vaccinated staff should collect samples.</p>
        </fieldset>
        <fieldset className="oh-fieldset">
          <legend>Where and why</legend>
          <div className="oh-fields">
            <label className="oh-field"><span>Ward</span><select value={f.ward} onChange={(e) => set("ward", e.target.value)}><option value="">Not known</option>{(prog.data?.[0]?.wards ?? []).map((w) => <option key={w}>{w}</option>)}</select></label>
            <label className="oh-field"><span>Place</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
            <label className="oh-field full"><span>What happened to the animal</span><textarea value={f.reason} maxLength={400} onChange={(e) => set("reason", e.target.value)} placeholder="Signs seen, when it died, whether it bit anyone" /></label>
          </div>
        </fieldset>
        {err ? <Failed error={err} /> : null}
        {!labs.length && !inst.loading ? <Failed error="No laboratory is part of this programme yet." /> : null}
        <div className="oh-submit"><button className="oh-btn primary" type="submit" disabled={busy || !lab}>{busy ? "Sending…" : "Send sample"}</button><button type="button" className="oh-btn" onClick={() => router.back()}>Cancel</button></div>
      </form>
    </main>
  );
}
