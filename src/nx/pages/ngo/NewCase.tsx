"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, Sparkles, X } from "lucide-react";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Field, GeoField, RecordHead, useAct } from "../../kit";
import { useLive } from "../../live";
import { KajuCapture } from "../../KajuCapture";
import { parseINRAmount } from "@/lib/case-actions";
import type { CaseCategory, CaseSeverity } from "@/lib/types";
import type { Proposal } from "@/sp3/ai/types";
import { createCase, findDogs, orgCity, readDog, removeRecord, type DogBrief } from "../../data/ngo";
import { readCase } from "../../data/capture";
import { animalLine, animalSearch } from "../../animalLabel";
import { TryLink, undoWith } from "./parts";

/* Open a case by telling Kaju what happened: the page opens on one box, Kaju prepares the case, and it is saved only
   when the person presses Confirm. The full form stays complete under "Fill in by hand": Change fills it with what Kaju
   understood, and when Kaju prepares nothing the person's own words are carried into it. The case exists only when the
   database returns its id; until then the form says it is sending, and a failure keeps everything typed. Arriving from
   a report, an animal or field mode, the form starts filled from the address (?dog, lat, lng, zone, title, note, and
   cat, sev, city from Kaju's Change elsewhere) and the person confirms it. */

export type Prefill = { dog: string | null; lat: number | null; lng: number | null; zone: string | null; title: string | null; note: string | null; cat?: CaseCategory | null; sev?: CaseSeverity | null; city?: string | null };
const CATS: { id: CaseCategory; label: string; note: string }[] = [
  { id: "injury", label: "Injury or illness", note: "Wound, accident, disease" },
  { id: "rescue", label: "Rescue", note: "Trapped, abandoned, in danger" },
  { id: "sterilisation", label: "Sterilisation", note: "Animal birth control" },
  { id: "vaccination", label: "Vaccination", note: "Anti-rabies or booster" },
  { id: "other", label: "Something else", note: "Describe it below" },
];
const SEV: { id: CaseSeverity; label: string }[] = [{ id: "critical", label: "Critical, act today" }, { id: "high", label: "High" }, { id: "normal", label: "Normal" }, { id: "low", label: "Low" }];
const CAT_IDS = new Set<string>(CATS.map((c) => c.id)), SEV_IDS = new Set<string>(SEV.map((s) => s.id));
/** The animal as the register names it: "Tiger (132)" or "Dog 128". */
const label = (d: DogBrief) => animalLine(d);

export function NewCase({ pre }: { pre: Prefill }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Cases", "New case"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (live.org && !org) return <Shell crumb={["Cases", "New case"]}><div className="nx-page"><h1 className="nx-h1">New case</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it does not open cases.</p></div></Shell>;
  return <Page pre={pre} ngoId={org?.org_id ?? null} sample={!live.org} />;
}

type Seed = { pre: Prefill; n: number; from: "address" | "kaju" | "words" };

function Page({ pre: address, ngoId, sample }: { pre: Prefill; ngoId: string | null; sample: boolean }) {
  const q = useSearchParams();
  /* Change on a case Kaju prepared elsewhere (the inbox) arrives with its kind, urgency and city too. */
  const pre: Prefill = { ...address, cat: CAT_IDS.has(q.get("cat") ?? "") ? (q.get("cat") as CaseCategory) : null, sev: SEV_IDS.has(q.get("sev") ?? "") ? (q.get("sev") as CaseSeverity) : null, city: q.get("city")?.slice(0, 120) || null };
  const fromKaju = q.get("from") === "kaju";
  const filled = !!(pre.title || pre.note || pre.zone || pre.lat !== null);
  const [open, setOpen] = useState(filled);
  const [seed, setSeed] = useState<Seed>({ pre, n: 0, from: fromKaju ? "kaju" : "address" });
  const [home, setHome] = useState<string | null>(null);
  const fold = useRef<HTMLDivElement>(null), banner = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!ngoId) return; void orgCity(ngoId).then((c) => setHome(c)); }, [ngoId]);

  const handOver = (p: Prefill, from: Seed["from"]) => {
    setSeed((s) => ({ pre: { ...p, dog: p.dog ?? address.dog, lat: p.lat ?? address.lat, lng: p.lng ?? address.lng }, n: s.n + 1, from }));
    setOpen(true);
    window.requestAnimationFrame(() => {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      fold.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
      banner.current?.focus({ preventScroll: true });
    });
  };
  /* Change: what Kaju prepared. A place Kaju left empty is taken from the person's own words when they name one ("near
     the bus stop"). */
  const fromProposal = (p: Proposal, words: string) => {
    if (p.kind !== "open_case") return;
    handOver({ dog: p.dogId, lat: null, lng: null, zone: p.zone ?? readCase(words).zone, title: p.title, note: p.description || null, cat: p.category, sev: p.severity, city: p.city }, "kaju");
  };
  const fromWords = (t: string) => { const r = readCase(t); handOver({ dog: null, lat: null, lng: null, zone: r.zone, title: r.title, note: r.description || null, cat: r.category, sev: r.severity, city: r.city }, "words"); };
  const said = seed.from === "kaju" ? "Filled with what Kaju understood. Check each detail; nothing is saved until you open the case."
    : seed.from === "words" ? "Filled from what you wrote. Check each detail and add what is missing."
    : filled ? "Started from the report or record you came from. Check each detail with what you know." : null;

  return (
    <Shell crumb={["Cases", "New case"]}>
      <RecordHead title={<>Open a case{sample ? <Sample /> : null}</>} sub={sample ? "Sample. In the live demo, Kaju prepares the case and it joins your queue when you confirm it." : "Tell Kaju what happened. Kaju prepares the case; it joins your queue when you confirm it."} actions={<Link href="/ngo/cases" className="nx-btn is-quiet is-sm">Cancel</Link>} />
      <div className="kc-page">
        <KajuCapture idBase="nc-kaju" sample={sample} context={{ path: "/ngo/cases/new", workspace: "ngo", dogId: address.dog, title: "New case" }}
          placeholder="For example: brown female dog limping near the HSR Layout bus stop, needs a vet today"
          hint={<>Type, paste, or use your keyboard&apos;s microphone. Say what you saw, where, and how urgent it is.{home ? <> If you name no city, Kaju uses {home}, your organisation&apos;s city.</> : null} Nothing is saved until you confirm.</>}
          reading={(t) => readCase(t).facts}
          byHand={(t) => [{ label: "Fill in by hand", go: () => fromWords(t) }]}
          onChange={fromProposal} changes={["open_case"]} />
        <section className="kc-fold" aria-label="Fill in by hand">
          <div className="kc-fold-h">
            <button type="button" className="nx-btn is-quiet" aria-expanded={open} aria-controls="nc-hand" onClick={() => setOpen((v) => !v)}>Fill in by hand<ChevronDown size={14} aria-hidden /></button>
            <p>The full form, for when you would rather enter each detail yourself.</p>
          </div>
          <div id="nc-hand" ref={fold} hidden={!open} className="kc-fold">
            {said ? <p ref={banner} tabIndex={-1} className="kc-from"><Sparkles size={14} aria-hidden />{said}</p> : null}
            <Form key={seed.n} pre={seed.pre} ngoId={ngoId} sample={sample} home={home} />
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Form({ pre, ngoId, sample, home }: { pre: Prefill; ngoId: string | null; sample: boolean; home: string | null }) {
  const live = useLive();
  const router = useRouter();
  const [cat, setCat] = useState<CaseCategory>(pre.cat ?? (/steril/i.test(pre.title ?? "") ? "sterilisation" : /vaccin/i.test(pre.title ?? "") ? "vaccination" : "injury"));
  const [sev, setSev] = useState<CaseSeverity>(pre.sev ?? "normal");
  const [title, setTitle] = useState(pre.title ?? "");
  const [desc, setDesc] = useState(pre.note ?? "");
  const [city, setCity] = useState(pre.city ?? "");
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

  useEffect(() => { if (home) setCity((x) => x || home); }, [home]);
  useEffect(() => {
    if (!ngoId || !pre.dog) return;
    void readDog(ngoId, pre.dog).then((r) => {
      const d = r.data; if (!d) { if (r.error || r.data === null) setProblem("The animal in the link is not on your register, so the case is not linked to it."); return; }
      setAnimal(d); if (d.city) setCity(d.city); if (d.zone) setZone((z) => z || d.zone!);
      if (d.lat != null && d.lng != null && pre.lat == null) { setLat(d.lat); setLng(d.lng); }
    });
  }, [ngoId, pre.dog, pre.lat]);
  useEffect(() => { if (!ngoId || q.trim().length < 2) { setFound([]); return; } const t = window.setTimeout(() => { void findDogs(ngoId, animalSearch(q)).then(setFound); }, 250); return () => window.clearTimeout(t); }, [ngoId, q]);

  const estN = est.trim() ? parseINRAmount(est) : null, spentN = spent.trim() ? parseINRAmount(spent) : null;
  const geoOk = (lat === null) === (lng === null);
  const ready = title.trim().length >= 3 && city.trim().length >= 2 && geoOk && (!est.trim() || estN !== null) && (!spent.trim() || spentN !== null);
  const submit = async () => {
    if (!ready || sent.current || !live.userId) return;
    sent.current = true;
    const actor = { id: live.userId, name: live.userName ?? "Team member" };
    const r = await run("new", () => createCase({ title: title.trim(), description: desc.trim() || undefined, category: cat, severity: sev, city: city.trim(), zone: zone.trim() || animal?.zone || null, lat, lng, dogId: animal?.id ?? null, informerContact: informer.trim() || null, hospital: hospital.trim() || null, costEstimate: estN, costSpent: spentN }, actor),
      { ok: "Case opened. It is in your queue.", undo: (x) => undoWith(() => removeRecord("case", String(x.data), "Undo: opened by mistake"), () => router.push("/ngo/cases"), "The new case was removed.")() });
    sent.current = false;
    if (r.ok && r.result?.data) router.push(`/ngo/cases/${r.result.data}`);
  };

  return (
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
          {animal ? <p className="nr-acts"><b>{label(animal)}</b>{animal.code ? <span className="nx-t3">{animal.code}</span> : null}<Link className="nr-link" href={`/ngo/animals/${animal.id}`}>Open its record</Link><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAnimal(null)}><X size={13} />Unlink</button></p>
            : sample ? <p className="nr-hint">In the live demo you can link an animal from your register.</p>
            : <><label className="nx-find" style={{ marginLeft: 0, height: 34, display: "flex" }}><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find it on your register: name, code, marks" aria-label="Find an animal to link" /></label>
              {found.length ? <div className="nr-pick">{found.map((d) => <button key={d.id} type="button" onClick={() => { setAnimal(d); setQ(""); if (d.zone && !zone) setZone(d.zone); if (d.city) setCity(d.city); if (d.lat != null && d.lng != null && lat === null) { setLat(d.lat); setLng(d.lng); } }}><b>{label(d)}</b><small>{[d.zone, d.code ? `code ${d.code}` : null].filter(Boolean).join(" · ") || "No code or place recorded"}</small></button>)}</div> : q.trim().length >= 2 ? <p className="nr-hint">No animal on your register matches. Open the case without one and link it later.</p> : <p className="nr-hint">Not linked. Open the case without an animal and link it later, once it is identified.</p>}</>}
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
  );
}
