"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Field, GeoField, RecordHead, useAct } from "../../kit";
import { useLive } from "../../live";
import { parseINRAmount } from "@/lib/case-actions";
import type { CaseCategory, CaseSeverity } from "@/lib/types";
import { createCase, findDogs, orgCity, readDog, realName, removeRecord, shortCode, type DogBrief } from "../../data/ngo";
import { TryLink, undoWith } from "./parts";

/* Open a case: what is wrong, how urgent, where (coordinates kept privately; shared views only ever show the area), and
   the animal if it is known. The case exists only when the database returns its id; until then the form says it is
   sending, and a failure keeps everything typed. Arriving from a report, an animal or field mode, the form starts
   filled from the address (?dog, lat, lng, zone, title, note) and the person confirms it. */

export type Prefill = { dog: string | null; lat: number | null; lng: number | null; zone: string | null; title: string | null; note: string | null };
const CATS: { id: CaseCategory; label: string; note: string }[] = [
  { id: "injury", label: "Injury or illness", note: "Wound, accident, disease" },
  { id: "rescue", label: "Rescue", note: "Trapped, abandoned, in danger" },
  { id: "sterilisation", label: "Sterilisation", note: "Animal birth control" },
  { id: "vaccination", label: "Vaccination", note: "Anti-rabies or booster" },
  { id: "other", label: "Something else", note: "Describe it below" },
];
const SEV: { id: CaseSeverity; label: string }[] = [{ id: "critical", label: "Critical, act today" }, { id: "high", label: "High" }, { id: "normal", label: "Normal" }, { id: "low", label: "Low" }];
const label = (d: DogBrief) => realName(d.name) ?? (d.straypaw_id ? shortCode(d.straypaw_id) : d.code ?? "Unnamed animal");

export function NewCase({ pre }: { pre: Prefill }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Cases", "New case"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (live.org && !org) return <Shell crumb={["Cases", "New case"]}><div className="nx-page"><h1 className="nx-h1">New case</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it does not open cases.</p></div></Shell>;
  return <Form pre={pre} ngoId={org?.org_id ?? null} sample={!live.org} />;
}

function Form({ pre, ngoId, sample }: { pre: Prefill; ngoId: string | null; sample: boolean }) {
  const live = useLive();
  const router = useRouter();
  const [cat, setCat] = useState<CaseCategory>(/steril/i.test(pre.title ?? "") ? "sterilisation" : /vaccin/i.test(pre.title ?? "") ? "vaccination" : "injury");
  const [sev, setSev] = useState<CaseSeverity>("normal");
  const [title, setTitle] = useState(pre.title ?? "");
  const [desc, setDesc] = useState(pre.note ?? "");
  const [city, setCity] = useState("");
  const [zone, setZone] = useState(pre.zone ?? "");
  const [lat, setLat] = useState<number | null>(pre.lat);
  const [lng, setLng] = useState<number | null>(pre.lng);
  const [informer, setInformer] = useState("");
  const [hospital, setHospital] = useState("");
  const [est, setEst] = useState("");
  const [spent, setSpent] = useState("");
  const [animal, setAnimal] = useState<DogBrief | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<DogBrief[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const { busy, run } = useAct();
  const sent = useRef(false);

  useEffect(() => { if (!ngoId) return; void orgCity(ngoId).then((c) => { if (c) setCity((x) => x || c); }); }, [ngoId]);
  useEffect(() => {
    if (!ngoId || !pre.dog) return;
    void readDog(ngoId, pre.dog).then((r) => {
      const d = r.data; if (!d) { if (r.error || r.data === null) setProblem("The animal in the link is not on your register, so the case is not linked to it."); return; }
      setAnimal(d); if (d.city) setCity(d.city); if (d.zone) setZone((z) => z || d.zone!);
      if (d.lat != null && d.lng != null && pre.lat == null) { setLat(d.lat); setLng(d.lng); }
    });
  }, [ngoId, pre.dog, pre.lat]);
  useEffect(() => { if (!ngoId || q.trim().length < 2) { setFound([]); return; } const t = window.setTimeout(() => { void findDogs(ngoId, q).then(setFound); }, 250); return () => window.clearTimeout(t); }, [ngoId, q]);

  const estN = est.trim() ? parseINRAmount(est) : null, spentN = spent.trim() ? parseINRAmount(spent) : null;
  const geoOk = (lat === null) === (lng === null);
  const ready = title.trim().length >= 3 && city.trim().length >= 2 && geoOk && (!est.trim() || estN !== null) && (!spent.trim() || spentN !== null);
  const submit = async () => {
    if (!ready || sent.current || !live.userId) return;
    sent.current = true;
    const actor = { id: live.userId, name: live.userName ?? "Team member" };
    const r = await run("new", () => createCase({ title: title.trim(), description: desc.trim() || undefined, category: cat, severity: sev, city: city.trim(), zone: zone.trim() || animal?.zone || null, lat, lng, dogId: animal?.id ?? null, informerContact: informer.trim() || null, hospital: hospital.trim() || null, costEstimate: estN, costSpent: spentN }, actor),
      { ok: "Case opened. It is in your queue.", undo: (x) => undoWith(() => removeRecord("case", String(x.data), "Undo: opened by mistake"), () => router.push("/next/ngo/cases"), "The new case was removed.")() });
    sent.current = false;
    if (r.ok && r.result?.data) router.push(`/next/ngo/cases/${r.result.data}`);
  };

  return (
    <Shell crumb={["Cases", "New case"]}>
      <RecordHead title={<>Open a case{sample ? <Sample /> : null}</>} sub={sample ? "Sample form. In the live demo the case joins your queue as soon as it is saved." : "It joins your queue as soon as it is saved."} actions={<Link href="/next/ngo/cases" className="nx-btn is-quiet is-sm">Cancel</Link>} />
      <form className="nr-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <section aria-label="What and how urgent">
          <fieldset className="nr-radios is-col"><legend>What kind of request</legend>
            {CATS.map((k) => <label key={k.id}><input type="radio" name="cat" checked={cat === k.id} onChange={() => setCat(k.id)} /><span><b>{k.label}</b><small>{k.note}</small></span></label>)}
          </fieldset>
          <Field label="In a few words"><input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} placeholder="Limping, deep wound on the left hind leg" /></Field>
          <Field label="What you know (optional)" hint="What was seen, by whom and when. Say what is not known."><textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={4000} /></Field>
          <div className="nx-field"><span>How urgent</span><div className="nr-seg" role="group" aria-label="How urgent">{SEV.map((s) => <button key={s.id} type="button" aria-pressed={sev === s.id} onClick={() => setSev(s.id)}>{s.label}</button>)}</div></div>
          <Field label="Informer's contact (optional)" hint="Private to your organisation."><input value={informer} onChange={(e) => setInformer(e.target.value)} inputMode="tel" maxLength={120} /></Field>
          <div className="nx-fields">
            <Field label="Clinic or hospital (optional)" wide><input value={hospital} onChange={(e) => setHospital(e.target.value)} maxLength={200} /></Field>
            <Field label="Estimated cost, ₹ (optional)" hint={est.trim() && estN === null ? "Use a number, for example 1500 or 1,500.50." : undefined}><input value={est} onChange={(e) => setEst(e.target.value)} inputMode="decimal" aria-invalid={!!est.trim() && estN === null} /></Field>
            <Field label="Spent so far, ₹ (optional)" hint={spent.trim() && spentN === null ? "Use a number, for example 800." : undefined}><input value={spent} onChange={(e) => setSpent(e.target.value)} inputMode="decimal" aria-invalid={!!spent.trim() && spentN === null} /></Field>
          </div>
        </section>
        <section aria-label="Where and which animal">
          <div className="nx-field"><span>The animal</span>
            {animal ? <p className="nr-acts"><b>{label(animal)}</b>{animal.code ? <span className="nx-t3">{animal.code}</span> : null}<Link className="nr-link" href={`/next/ngo/animals/${animal.id}`}>Open its record</Link><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAnimal(null)}><X size={13} />Unlink</button></p>
              : sample ? <p className="nr-hint">In the live demo you can link an animal from your register.</p>
              : <><label className="nx-find" style={{ marginLeft: 0, height: 34, display: "flex" }}><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find it on your register: name, code, marks" aria-label="Find an animal to link" /></label>
                {found.length ? <div className="nr-pick">{found.map((d) => <button key={d.id} type="button" onClick={() => { setAnimal(d); setQ(""); if (d.zone && !zone) setZone(d.zone); if (d.city) setCity(d.city); if (d.lat != null && d.lng != null && lat === null) { setLat(d.lat); setLng(d.lng); } }}><b>{label(d)}</b><small>{[d.code, d.zone].filter(Boolean).join(" · ") || "No code or place recorded"}</small></button>)}</div> : q.trim().length >= 2 ? <p className="nr-hint">No animal on your register matches. Open the case without one and link it later.</p> : <p className="nr-hint">Not linked. Open the case without an animal and link it later, once it is identified.</p>}</>}
            {problem ? <p className="nr-err" role="alert">{problem}</p> : null}
          </div>
          <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} required minLength={2} maxLength={120} /></Field>
          <Field label="Area, street or landmark (optional)"><input value={zone} onChange={(e) => setZone(e.target.value)} maxLength={200} placeholder="HSR Layout, 14th Main" /></Field>
          <GeoField lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }} />
          <p className="nr-hint">{lat !== null && lng !== null ? "The exact point stays private to your organisation; shared views only show its area." : !geoOk ? "Enter both latitude and longitude, or neither." : "No point: the case keeps its city and stays in the queue, but is not drawn on a map."}</p>
          <div className="nr-send">
            {sample ? <TryLink>Open the case</TryLink> : <button type="submit" className="nx-btn" disabled={!ready || !!busy}>{busy ? <><Loader2 size={13} className="nx-spin" />Sending…</> : "Open the case"}</button>}
            {!ready && !sample ? <span className="nr-hint">{title.trim().length < 3 ? "A few words about the case are needed." : city.trim().length < 2 ? "The city is needed." : !geoOk ? "Enter both coordinates, or neither." : "Check the costs: use numbers only."}</span> : null}
          </div>
        </section>
      </form>
    </Shell>
  );
}
