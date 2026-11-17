"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ChevronDown, Info, Lock, Sparkles } from "lucide-react";
import { AGE, EXPOSURE_KIND, SEX, SPECIES, WASHED, call, useRead, type Area } from "@/oh/data";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Confirm, Denied, Field, toast, useAct } from "../../kit";
import { useLive } from "../../live";
import { can, indiaToday, isFacilityKind, placeOf, recordExposure, usePlaces } from "../../data/govhealth";
import { Block, Opening, Seg, TryLink } from "../gh/parts";
import { KajuCapture } from "../../KajuCapture";
import { exposureOf, readBite } from "../../data/capture";
import type { Proposal } from "@/sp3/ai/types";

/* Recording a bite, scratch or lick starts with telling Kaju what happened. Kaju reads it with the signed-in staff
   member's own access and prepares a bite-register entry (register_exposure, being added on the server); it is saved
   only on Confirm. Until Kaju prepares one, the words are carried into the desk form below, which stays complete under
   "Fill in by hand" (and Change fills it with what Kaju understood). Kaju never prescribes a dose, validates a result
   or decides eligibility: those stay explicit clinician actions on the record.

   The desk form: about a minute. The patient is identified by the facility's own register number; no name is stored.
   Only a clinician records the category; anyone else leaves it for them. When the person came on a referral, the
   referral goes with the record so the two stay linked. */

/** What Kaju understood, or what the words said, carried into the desk form. Only stated values are present. */
type BiteSeed = Partial<{ exposure_on: string; kind: string; area: string; areaName: string; age: string; sex: string; ref: string; phone: string; consent: boolean; species: string; ownership: string; animal: string; place: string; category: string; washed: string }>;
const seedOf = (x: { exposure_on?: string | null; kind?: string | null; area?: string | null; areaId?: string | null; age?: string | null; sex?: string | null; ref?: string | null; phone?: string | null; consent?: boolean | null; species?: string | null; ownership?: string | null; animal?: string | null; place?: string | null; category?: string | null; washed?: string | null }): BiteSeed => {
  const v: BiteSeed = {};
  if (x.exposure_on && /^\d{4}-\d{2}-\d{2}$/.test(x.exposure_on) && x.exposure_on <= indiaToday()) v.exposure_on = x.exposure_on;
  if (x.kind && EXPOSURE_KIND[x.kind]) v.kind = x.kind;
  if (x.areaId && /^[0-9a-f-]{36}$/i.test(x.areaId)) v.area = x.areaId;
  if (x.area) v.areaName = x.area;
  if (x.age && AGE[x.age]) v.age = x.age;
  if (x.sex && SEX[x.sex]) v.sex = x.sex;
  if (x.ref) v.ref = x.ref.slice(0, 40);
  if (x.consent && x.phone) { v.consent = true; v.phone = x.phone; }
  if (x.species && SPECIES[x.species]) v.species = x.species;
  if (x.ownership && ["community", "owned", "unknown"].includes(x.ownership)) v.ownership = x.ownership;
  if (x.animal) v.animal = x.animal.slice(0, 300);
  if (x.place) v.place = x.place.slice(0, 200);
  if (x.category && ["I", "II", "III"].includes(x.category)) v.category = x.category;
  if (x.washed && WASHED[x.washed]) v.washed = x.washed;
  return v;
};

export type BiteQuery = { notice?: string; referral?: string; from?: string; code?: string; species?: string; on?: string; area?: string; animal?: string; place?: string };

export function NewBite({ q }: { q: BiteQuery }) {
  const live = useLive();
  const org = live.orgFor("healthcare");
  const pl = usePlaces(live.ready && !!live.org);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Bite cases", "Record a bite"]} />;
  if (!live.org) return <BitePage sample q={q} orgId={null} orgName="Teaching Hospital Anti-Rabies Clinic" clinician />;
  const place = placeOf(pl.places, org?.org_id);
  if (!org || !isFacilityKind(org.kind) || !can(place, "record_exposure")) return (
    <Shell ws="health" crumb={["Bite cases", "Record a bite"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Record a bite</h1>
      <Denied what={org && isFacilityKind(org.kind) ? "Your role here cannot record bites" : "Bites are recorded by hospitals and health centres"} why={org && isFacilityKind(org.kind) ? `A clinician, nurse or records officer at ${org.name} can.` : "Your account is not part of a hospital or health centre. A partner who meets a bitten person refers them to one."} back={{ href: "/health/today", label: "Back to Today" }} /></div></Shell>
  );
  return <BitePage sample={false} q={q} orgId={org.org_id} orgName={org.name} clinician={can(place, "assess")} />;
}

function BitePage({ sample, q, orgId, orgName, clinician }: { sample: boolean; q: BiteQuery; orgId: string | null; orgName: string; clinician: boolean }) {
  const fromReferral = q.referral ?? null, fromNotice = q.notice ?? null;
  const filled = !!(fromNotice || fromReferral || q.on || q.species || q.area || q.animal || q.place);
  const [open, setOpen] = useState(filled);
  const [seed, setSeed] = useState<{ v: BiteSeed; n: number; from: "address" | "kaju" | "words"; aside: string | null }>({ v: {}, n: 0, from: "address", aside: null });
  const fold = useRef<HTMLDivElement>(null), banner = useRef<HTMLParagraphElement>(null);
  const handOver = (v: BiteSeed, from: "kaju" | "words", aside: string | null) => {
    setSeed((s) => ({ v, n: s.n + 1, from, aside })); setOpen(true);
    window.requestAnimationFrame(() => { const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; fold.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" }); banner.current?.focus({ preventScroll: true }); });
  };
  /* What has no field on the desk form is said, so it is kept in the facility's own register rather than lost. */
  const asideOf = (site: string | null, time: string | null) => (site || time ? `Kaju also noted ${[site ? `the wound on the ${site}` : null, time ? `the time, ${time}` : null].filter(Boolean).join(" and ")}. This form has no place for ${site && time ? "them" : "it"}; keep ${site && time ? "them" : "it"} in your register.` : null);
  const change = (p: Proposal) => { const x = exposureOf(p); handOver(seedOf(x), "kaju", asideOf(x.site, x.time)); };
  const words = (t: string) => { const r = readBite(t); handOver(seedOf({ ...r, area: null }), "words", asideOf(r.site, null)); };
  const said = seed.from === "kaju" ? "Filled with what Kaju understood. Check each detail with the patient; nothing is saved until you save it."
    : seed.from === "words" ? "Filled from what you wrote. Check each detail with the patient and add what is missing." : null;
  return (
    <Shell ws="health" crumb={["Bite cases", "Record a bite"]}>
      <div className="nx-page" style={{ maxWidth: 820 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{orgName}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Record a bite</h1><p className="nx-sub">Tell Kaju what happened. The patient is identified by your own register number; no name is stored.</p></div></div>
        {fromNotice ? <p className="nx-note" style={{ marginTop: 14 }}><Info size={13} /><span>Started from a notice the public left. Its details are filled in below; check them with the patient.</span></p> : null}
        {fromReferral ? <p className="nx-note" style={{ marginTop: 14 }}><Info size={13} /><span>Referred from {q.from ?? "another facility"}{q.code ? `, where the bite is ${q.code}` : ""}. The date and animal are filled in below; check them with the patient. The animal follow-up was asked for there, so it is off here. This record is linked to the referral.</span></p> : null}
        <div style={{ display: "grid", gap: 24, marginTop: 16 }}>
          <KajuCapture idBase="bite-kaju" sample={sample} context={{ path: "/health/bites/new", workspace: "healthcare", title: "Record a bite" }}
            placeholder="For example: dog bite on the left calf this morning, 34 F, OPD 4521, washed at home, brown stray near the bus stand"
            hint={<>Type, paste, or use your keyboard&apos;s microphone. Use the register number, never the patient&apos;s name. Kaju reads it with your access and prepares the entry; nothing is saved until you confirm. Kaju never assesses, prescribes or decides eligibility{clinician ? "; the category is yours" : ""}.</>}
            reading={(t) => readBite(t).facts} byHand={(t) => [{ label: "Fill in by hand", go: () => words(t) }]}
            kinds={["register_exposure"]} onChange={change} changes={["register_exposure"]} />
          <section className="kc-fold" aria-label="Fill in by hand">
            <div className="kc-fold-h">
              <button type="button" className="nx-btn is-quiet" aria-expanded={open} aria-controls="bite-hand" onClick={() => setOpen((v) => !v)}>Fill in by hand<ChevronDown size={14} aria-hidden /></button>
              <p>The full desk form, about a minute.</p>
            </div>
            <div id="bite-hand" ref={fold} hidden={!open} className="kc-fold">
              {said ? <p ref={banner} tabIndex={-1} className="kc-from"><Sparkles size={14} aria-hidden /><span>{said}{seed.aside ? ` ${seed.aside}` : ""}</span></p> : null}
              <BiteForm key={seed.n} seed={seed.v} sample={sample} q={q} orgId={orgId} orgName={orgName} clinician={clinician} />
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function BiteForm({ sample, q, orgId, orgName, clinician, seed }: { sample: boolean; q: BiteQuery; orgId: string | null; orgName: string; clinician: boolean; seed: BiteSeed }) {
  const router = useRouter();
  const areas = useRead<Area[]>(() => call("oh_org_areas", { p_org: orgId }), `nx-areas:${orgId}`, !sample && !!orgId);
  const fromReferral = q.referral ?? null, fromNotice = q.notice ?? null;
  const [f, setF] = useState({
    exposure_on: q.on && /^\d{4}-\d{2}-\d{2}$/.test(q.on) ? q.on : indiaToday(), kind: "bite", area: "", areaName: q.area ?? "", age: "not_recorded", sex: "not_recorded", ref: "",
    phone: "", consent: false, species: q.species && SPECIES[q.species] ? q.species : "dog", ownership: "unknown", animal: q.animal ?? "", place: q.place ?? "",
    followup: !fromReferral, category: "not_recorded", washed: "not_recorded",
    ...seed, ...(clinician ? {} : { category: "not_recorded" }),
  });
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const areaId = f.area || areas.data?.find((a) => a.name === f.areaName)?.id || "";
  const minDay = new Date(Date.parse(`${indiaToday()}T00:00:00Z`) - 365 * 864e5).toISOString().slice(0, 10);
  const phoneOk = !f.consent || /^[0-9+ ]{8,16}$/.test(f.phone.trim());
  const ready = !!f.exposure_on && f.exposure_on <= indiaToday() && f.exposure_on >= minDay && phoneOk;
  const submit = (e: FormEvent) => { e.preventDefault(); if (ready) setAsking(true); };
  const save = async () => {
    const r = await run("bite", async () => {
      const res = await recordExposure({
        p_facility: orgId!, p_exposure_on: f.exposure_on, p_kind: f.kind, p_area: areaId || null, p_age_band: f.age, p_sex: f.sex, p_patient_ref: f.ref.trim() || null,
        p_species: f.species, p_ownership: f.ownership, p_animal_description: f.animal.trim() || null, p_animal_place: f.place.trim() || null,
        p_category: clinician ? f.category : "not_recorded", p_source: fromNotice ? "citizen_notice" : fromReferral ? "referral" : "walk_in", p_notice: fromNotice,
        p_contact_phone: f.consent ? f.phone.trim() || null : null, p_reminder_consent: f.consent && !!f.phone.trim(), p_request_followup: f.followup && f.ownership !== "owned", p_wound_washed: f.washed,
      }, fromReferral);
      if (res.error || !res.data) return { error: res.error ?? "Could not save." };
      return res;
    }, { quiet: true });
    setAsking(false);
    if (!r.ok || !r.result) return;
    const res = r.result as { data: { id: string; code: string; handoff_id: string | null }; linked: boolean };
    toast({ tone: "ok", text: `Saved as ${res.data.code}.${res.data.handoff_id ? " The area's animal team has been asked to follow up." : ""}${fromReferral && !res.linked ? " This database cannot link it to the referral yet; the referral itself is marked arrived." : ""}` });
    router.push(`/health/bites/${res.data.id}`);
  };
  const summary = `${SPECIES[f.species] ?? f.species} ${(EXPOSURE_KIND[f.kind] ?? f.kind).toLowerCase()} on ${f.exposure_on}${areaId ? ` in ${areas.data?.find((a) => a.id === areaId)?.name ?? "the chosen area"}` : ""}, register number ${f.ref.trim() || "not given"}${clinician && f.category !== "not_recorded" ? `, category ${f.category}` : ""}.`;
  return (
      <div>
        <form onSubmit={submit} noValidate>
          <Block title="What happened">
            <div className="nx-fields gh-fields">
              <div className="nx-field is-wide"><span>Type of exposure</span><Seg name="kind" label="Type of exposure" value={f.kind} onChange={(v) => set("kind", v)} options={Object.entries(EXPOSURE_KIND) as [string, string][]} /></div>
              <Field label="Date it happened" hint="Not in the future, and within the last year."><input type="date" required value={f.exposure_on} min={minDay} max={indiaToday()} onChange={(e) => set("exposure_on", e.target.value)} /></Field>
              <Field label="Area" hint="Where it happened, not where the patient lives."><select value={areaId} onChange={(e) => set("area", e.target.value)} disabled={!sample && !areas.data}><option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <div className="nx-field is-wide"><span>Wound washing</span><Seg name="washed" label="Wound washing" value={f.washed} onChange={(v) => set("washed", v)} options={Object.entries(WASHED) as [string, string][]} /></div>
            </div>
          </Block>
          <Block title="Patient">
            <div className="nx-fields gh-fields">
              <Field label="Your register number"><input value={f.ref} maxLength={40} onChange={(e) => set("ref", e.target.value)} placeholder="For example the OPD number" autoComplete="off" /></Field>
              <Field label="Age"><select value={f.age} onChange={(e) => set("age", e.target.value)}>{Object.entries(AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <div className="nx-field is-wide"><span>Sex</span><Seg name="sex" label="Sex" value={f.sex} onChange={(v) => set("sex", v)} options={Object.entries(SEX) as [string, string][]} /></div>
              <label className="gh-tick is-wide" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>The patient agrees to be called about their doses.</span></label>
              {f.consent ? <Field label="Phone for reminders" hint={phoneOk ? "Seen only by staff at this facility." : "Use 8 to 16 digits."}><input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field> : null}
            </div>
          </Block>
          <Block title="The animal">
            <div className="nx-fields gh-fields">
              <div className="nx-field is-wide"><span>Animal</span><Seg name="species" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={Object.entries(SPECIES) as [string, string][]} /></div>
              <div className="nx-field is-wide"><span>Whose animal</span><Seg name="own" label="Whose animal" value={f.ownership} onChange={(v) => set("ownership", v)} options={[["community", "Street or community"], ["owned", "Someone's pet"], ["unknown", "Not known"]]} /></div>
              <Field label="What it looked like"><input value={f.animal} maxLength={300} onChange={(e) => set("animal", e.target.value)} placeholder="Colour, size, collar, marks" /></Field>
              <Field label="Where it can be found"><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></Field>
              {f.ownership !== "owned" ? <label className="gh-tick" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={f.followup} onChange={(e) => set("followup", e.target.checked)} /><span>Ask the area&apos;s animal team to find and observe the animal. They receive the description and place only, never patient details.</span></label> : null}
            </div>
          </Block>
          <Block title="Clinical assessment">
            {clinician ? <div className="nx-field"><span>Exposure category <small>The category you assessed. StrayPaw records it; it does not assess.</small></span><Seg name="category" label="Exposure category" value={f.category} onChange={(v) => set("category", v)} options={[["I", "Category I"], ["II", "Category II"], ["III", "Category III"], ["not_recorded", "Assess later"]]} /></div>
              : <p className="nx-note"><Lock size={13} /><span>A clinician records the category and any course. This presentation waits for them on Today.</span></p>}
          </Block>
          <div className="gh-acts" style={{ marginTop: 22 }}>{sample ? <TryLink>Save presentation</TryLink> : <button type="submit" className="nx-btn" disabled={!!busy || !ready}>Save presentation</button>}<Link href="/health/bites" className="nx-btn is-quiet">Cancel</Link>{!ready ? <span className="gh-hint">Check the date{f.consent ? " and phone number" : ""}.</span> : null}</div>
        </form>
        {asking ? <Confirm title="Save this presentation" busy={busy === "bite"} confirm="Save" onClose={() => setAsking(false)} onConfirm={() => void save()}><p>{summary}</p><p className="gh-hint">It goes into {orgName}&apos;s bite register in your name.</p></Confirm> : null}
      </div>
  );
}
