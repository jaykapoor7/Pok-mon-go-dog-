"use client";

/* Recording a presentation, in the order it happens at the desk: what
   happened and where, who the patient is (by register number, not name),
   the animal, and, for a clinician, the category they assessed. */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { OhShell, isFacility, useOh } from "../Shell";
import { call, select, today, useRead, AGE, KIND_OF_EXPOSURE, SEX, SPECIES, type Programme } from "../data";
import { Empty, Failed, Head, Seg, useToast } from "../ui";

export function NewExposure() { return <OhShell><Suspense><Body /></Suspense></OhShell>; }

function Body() {
  const { place, reload } = useOh();
  const sp = useSearchParams(), router = useRouter(), toast = useToast();
  const prog = useRead<Programme[]>(() => select<Programme>("oh_programmes", { id: place?.programme.id ?? "" }), `prog:${place?.programme.id}`, !!place);
  const wards = prog.data?.[0]?.wards ?? [];
  const clinician = place?.role === "clinician";
  const [f, setF] = useState({
    exposure_on: sp.get("on") ?? today(), kind: "bite", ward: sp.get("ward") ?? "", age: "not_recorded", sex: "not_recorded", ref: "",
    phone: "", consent: false, species: sp.get("species") ?? "dog", ownership: "unknown", animal: sp.get("animal") ?? "", place: sp.get("place") ?? "",
    followup: true, category: "not_recorded",
  });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  if (!place || !isFacility(place.kind)) return <main className="oh-page"><Empty title="Bites are recorded by hospitals and health centres" /></main>;
  if (!["clinician", "nurse", "records", "lead"].includes(place.role)) return <main className="oh-page"><Empty title="Your role here cannot record bites" /></main>;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ id: string; code: string; handoff_id: string | null }>("oh_record_exposure", {
      p_facility: place.institution_id, p_exposure_on: f.exposure_on, p_kind: f.kind, p_ward: f.ward || null, p_age_band: f.age, p_sex: f.sex,
      p_patient_ref: f.ref || null, p_species: f.species, p_ownership: f.ownership, p_animal_description: f.animal || null, p_animal_place: f.place || null,
      p_category: clinician ? f.category : "not_recorded", p_source: sp.get("notice") ? "citizen_notice" : "walk_in", p_notice: sp.get("notice") || null,
      p_contact_phone: f.consent ? f.phone || null : null, p_reminder_consent: f.consent && !!f.phone, p_request_followup: f.followup,
    });
    setBusy(false);
    if (r.error || !r.data) { setErr(r.error ?? "Could not save."); return; }
    toast(r.data.handoff_id ? `Saved as ${r.data.code}. The animal team has been asked to follow up.` : `Saved as ${r.data.code}.`);
    reload();
    router.push(`/workspace/${place.institution_id}/record/${r.data.id}`);
  };

  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place.short_name ?? place.name} title="Record a bite" lede="Takes about a minute. The patient is identified by your own register number; no name is stored." />
      <form className="oh-form" onSubmit={submit}>
        <fieldset className="oh-fieldset">
          <legend>What happened</legend>
          <div className="oh-field full"><span>Type of exposure</span><Seg name="kind" value={f.kind} onChange={(v) => set("kind", v)} options={Object.entries(KIND_OF_EXPOSURE) as [string, string][]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>Date it happened</span><input type="date" required value={f.exposure_on} max={today()} onChange={(e) => set("exposure_on", e.target.value)} /></label>
            <label className="oh-field"><span>Ward or locality</span>
              <select value={f.ward} onChange={(e) => set("ward", e.target.value)}><option value="">Not known</option>{wards.map((w) => <option key={w}>{w}</option>)}</select>
              <small>Where the exposure happened, not where the patient lives.</small>
            </label>
          </div>
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>Patient</legend>
          <div className="oh-fields">
            <label className="oh-field"><span>Your register number</span><input value={f.ref} maxLength={40} onChange={(e) => set("ref", e.target.value)} placeholder="e.g. OPD number" autoComplete="off" /></label>
            <label className="oh-field"><span>Age</span><select value={f.age} onChange={(e) => set("age", e.target.value)}>{Object.entries(AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <div className="oh-field full"><span>Sex</span><Seg name="sex" value={f.sex} onChange={(v) => set("sex", v)} options={Object.entries(SEX) as [string, string][]} /></div>
            <label className="oh-check full" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>The patient agrees to be called about their next dose.</span></label>
            {f.consent ? <label className="oh-field"><span>Phone for reminders</span><input type="tel" inputMode="tel" value={f.phone} pattern="[0-9+ ]{8,16}" onChange={(e) => set("phone", e.target.value)} placeholder="98450 12345" /><small>Seen only by staff at this facility.</small></label> : null}
          </div>
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>The animal</legend>
          <div className="oh-field full"><span>Animal</span><Seg name="species" value={f.species} onChange={(v) => set("species", v)} options={Object.entries(SPECIES) as [string, string][]} /></div>
          <div className="oh-field full"><span>Whose animal</span><Seg name="own" value={f.ownership} onChange={(v) => set("ownership", v)} options={[["community", "Street or community"], ["owned", "Someone's pet"], ["unknown", "Not known"]]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>What it looked like</span><input value={f.animal} maxLength={300} onChange={(e) => set("animal", e.target.value)} placeholder="Colour, size, collar, marks" /></label>
            <label className="oh-field"><span>Where it can be found</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
          </div>
          {f.ownership !== "owned" ? (
            <label className="oh-check"><input type="checkbox" checked={f.followup} onChange={(e) => set("followup", e.target.checked)} /><span>Ask the ward&apos;s animal team to find and observe the animal. They receive the description and place only, never patient details.</span></label>
          ) : null}
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>Clinical assessment</legend>
          {clinician ? (
            <>
              <p>The category you assessed. StrayPaw records it; it does not assess.</p>
              <Seg name="category" value={f.category} onChange={(v) => set("category", v)} options={[["I", "Category I"], ["II", "Category II"], ["III", "Category III"], ["not_recorded", "Assess later"]]} />
            </>
          ) : <p className="oh-note">A clinician records the exposure category and any course. This presentation will wait for them on Today.</p>}
        </fieldset>

        {err ? <Failed error={err} /> : null}
        <div className="oh-submit"><button type="submit" className="oh-btn primary" disabled={busy}>{busy ? "Saving…" : "Save presentation"}</button><button type="button" className="oh-btn" onClick={() => router.back()}>Cancel</button></div>
      </form>
    </main>
  );
}
