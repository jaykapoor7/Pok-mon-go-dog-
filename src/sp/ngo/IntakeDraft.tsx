"use client";

/* ════════════════════════════════════════════════════════════════════
   Field · Record a dog.

   One question on the screen at a time, each answered with a tap:
   why you are recording it, a photo, where you are (found for you), and
   the dog. Nothing to type unless you want to. The last screen shows what
   will be saved and one button saves it.

   What is saved, and how (straight to the register when there is signal,
   kept on this phone when there is not), is unchanged: the same record
   goes to the same `onSave` the page already uses.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, HeartPulse, LifeBuoy, MapPin, Scissors, Search, Syringe, X } from "lucide-react";
import type { IntakeData } from "@/lib/operations";
import "./record.k.css";

export type KnownAnimal = { id: string; name: string | null; code: string | null; straypaw_id: string | null; identifiers: string | null };

const WHY: { id: IntakeData["category"]; label: string; note: string; icon: typeof Scissors; says: string }[] = [
  { id: "sterilisation", label: "Sterilise", note: "Caught for the ABC programme", icon: Scissors, says: "Caught for sterilisation" },
  { id: "vaccination", label: "Vaccinate", note: "Anti-rabies vaccine", icon: Syringe, says: "Recorded for vaccination" },
  { id: "injury", label: "Hurt or sick", note: "Needs treatment", icon: HeartPulse, says: "Found hurt or sick" },
  { id: "rescue", label: "Rescue", note: "In danger, needs moving", icon: LifeBuoy, says: "Rescue needed" },
];
const STEPS = ["Why", "Photo", "Where", "The dog", "Save"] as const;
const PLACE_KEY = "sp.field.place";

export function IntakeDraft({ known, onSave, onCancel }: { known: KnownAnimal[]; onSave: (data: IntakeData, file: File | null, requestId: string) => Promise<void>; onCancel: () => void }) {
  const request = useRef(crypto.randomUUID()), saving = useRef(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>({ template: "field-intake-v1", name: "", code: "", city: "", zone: "", sex: "", identifiers: "", description: "", category: "sterilisation", lat: NaN, lng: NaN, accuracy: null, observedAt: new Date().toISOString() });
  const [chosen, setChosen] = useState(false);
  const [file, setFile] = useState<File | null>(null), [shot, setShot] = useState<string | null>(null);
  const [gps, setGps] = useState<"idle" | "finding" | "found" | "failed">("idle");
  const [search, setSearch] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const set = (p: Partial<IntakeData>) => setData((d) => ({ ...d, ...p }));
  const located = Number.isFinite(data.lat) && Number.isFinite(data.lng);

  /* The place typed last time is offered again: a team works the same streets for days. */
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? "null") as { city?: string; zone?: string } | null; if (p) setData((d) => ({ ...d, city: p.city ?? "", zone: p.zone ?? "" })); } catch { /* nothing remembered */ } }, []);
  useEffect(() => { if (!file) { setShot(null); return; } const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u); }, [file]);

  const locate = () => {
    if (!navigator.geolocation) { setGps("failed"); return; }
    setGps("finding");
    navigator.geolocation.getCurrentPosition((p) => { set({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, observedAt: new Date(p.timestamp).toISOString() }); setGps("found"); }, () => setGps("failed"), { enableHighAccuracy: true, timeout: 15000 });
  };
  /* Arriving at "Where" asks the phone once; the person never has to. */
  useEffect(() => { if (step === 2 && gps === "idle" && !located) locate(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const why = WHY.find((w) => w.id === data.category)!;
  const matches = search.trim() ? known.filter((a) => [a.name, a.code, a.straypaw_id, a.identifiers].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).slice(0, 5) : [];
  const canNext = step === 0 ? chosen : step === 2 ? located && !!data.city.trim() && !!data.zone.trim() : true;
  const save = async () => {
    if (saving.current) return; saving.current = true; setBusy(true); setError(null);
    try {
      if (!located) throw Error("We still need where you are. Go back to Where.");
      try { localStorage.setItem(PLACE_KEY, JSON.stringify({ city: data.city.trim(), zone: data.zone.trim() })); } catch { /* not remembered */ }
      await onSave({ ...data, city: data.city.trim(), zone: data.zone.trim(), description: data.description.trim() || why.says }, file, request.current);
      onCancel();
    } catch (x) { setError(x instanceof Error ? x.message : "This phone could not keep the record. Try again."); }
    finally { saving.current = false; setBusy(false); }
  };

  return (
    <section className="rd" aria-label="Record a dog">
      <header className="rd-top">
        {step > 0 ? <button type="button" className="rd-ib" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft size={20} aria-hidden /></button> : <span className="rd-ib" aria-hidden />}
        <ol className="rd-dots" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>{STEPS.map((s, i) => <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : undefined} aria-hidden />)}</ol>
        <button type="button" className="rd-ib" onClick={onCancel} aria-label="Close without saving"><X size={20} aria-hidden /></button>
      </header>

      <div className="rd-body" key={step}>
        {step === 0 ? <>
          <h2>Why are you recording this dog?</h2>
          <div className="rd-tiles" role="radiogroup" aria-label="Why">
            {WHY.map((w) => <button key={w.id} type="button" role="radio" aria-checked={chosen && data.category === w.id} className="rd-tile" onClick={() => { set({ category: w.id }); setChosen(true); setStep(1); }}><span aria-hidden><w.icon size={28} /></span><b>{w.label}</b><small>{w.note}</small></button>)}
          </div>
        </> : step === 1 ? <>
          <h2>Take a photo</h2>
          <label className={`rd-photo${shot ? " has" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shot ? <img src={shot} alt="The photo you took" /> : <><Camera size={40} aria-hidden /><b>Open the camera</b><small>Whole dog, side on if you can</small></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Photo of the dog" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {shot ? <p className="rd-hint">Tap the photo to take it again.</p> : null}
        </> : step === 2 ? <>
          <h2>Where are you?</h2>
          <div className={`rd-gps is-${gps}`} role="status">
            <MapPin size={24} aria-hidden />
            {located ? <span><b>Location found</b><small>{data.accuracy !== null ? `Within about ${Math.round(data.accuracy)} m` : "Entered by hand"}</small></span>
              : gps === "finding" ? <span><b>Finding you…</b><small>Keep the phone still for a moment</small></span>
              : <span><b>Location is off</b><small>Allow location for this site, then try again</small></span>}
            {gps !== "finding" ? <button type="button" className="rd-quiet" onClick={locate}>{located ? "Refresh" : "Try again"}</button> : null}
          </div>
          <label className="rd-f"><span>Area or street</span><input value={data.zone} maxLength={120} onChange={(e) => set({ zone: e.target.value })} placeholder="e.g. HSR Layout, 14th Main" autoComplete="off" /></label>
          <label className="rd-f"><span>City</span><input value={data.city} maxLength={120} onChange={(e) => set({ city: e.target.value })} placeholder="e.g. Bengaluru" autoComplete="off" /></label>
        </> : step === 3 ? <>
          <h2>About the dog</h2>
          <p className="rd-k">Sex</p>
          <div className="rd-chips" role="radiogroup" aria-label="Sex">{[["Female", "Female"], ["Male", "Male"], ["Unknown", "Not sure"]].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={data.sex === v} onClick={() => set({ sex: data.sex === v ? "" : v })}>{l}</button>)}</div>
          <label className="rd-f"><span>Name or tag, if it has one</span><input value={data.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></label>
          <label className="rd-f"><span>Marks that tell it apart</span><input value={data.identifiers} maxLength={500} onChange={(e) => set({ identifiers: e.target.value })} placeholder="e.g. white patch on left ear" autoComplete="off" /></label>
          {known.length ? <>
            <label className="rd-f"><span><Search size={14} aria-hidden /> Seen this dog before?</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your register" autoComplete="off" /></label>
            {matches.length ? <ul className="rd-match">{matches.map((a) => <li key={a.id}><button type="button" onClick={() => { set({ existingDogId: a.id, name: a.name ?? "", code: a.code ?? a.straypaw_id ?? "" }); setSearch(""); }}><b>{a.name || a.straypaw_id || a.code}</b><small>{a.identifiers || a.code || ""}</small></button></li>)}</ul> : null}
            {data.existingDogId ? <p className="rd-linked" role="status"><Check size={16} aria-hidden />Added to this dog&apos;s history.<button type="button" className="rd-quiet" onClick={() => set({ existingDogId: undefined, code: "" })}>Undo</button></p> : null}
          </> : null}
        </> : <>
          <h2>Save this record?</h2>
          <dl className="rd-sum">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shot ? <img src={shot} alt="" /> : null}
            <div><dt>Why</dt><dd>{why.label}</dd></div>
            <div><dt>Where</dt><dd>{[data.zone, data.city].filter(Boolean).join(", ") || "Not given"}</dd></div>
            <div><dt>Dog</dt><dd>{[data.name, data.sex && (data.sex === "Unknown" ? "sex not sure" : data.sex.toLowerCase()), data.identifiers].filter(Boolean).join(" · ") || "No details added"}</dd></div>
            <div><dt>Photo</dt><dd>{file ? "Attached" : "None"}</dd></div>
          </dl>
          <label className="rd-f"><span>Anything to add?</span><input value={data.description} maxLength={3000} onChange={(e) => set({ description: e.target.value })} placeholder="Optional" autoComplete="off" /></label>
          {error ? <p className="rd-err" role="alert">{error}</p> : null}
        </>}
      </div>

      {step > 0 ? <footer className="rd-foot">
        {step < 4 ? <button type="button" className="rd-go" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 1 && !file ? "Skip the photo" : "Next"}</button>
          : <button type="button" className="rd-go" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>}
        {step === 2 && !canNext ? <p className="rd-hint">{!located ? "Waiting for your location." : "Add the area and the city."}</p> : null}
      </footer> : null}
    </section>
  );
}
