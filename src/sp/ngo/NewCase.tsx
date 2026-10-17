"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · open a case (decision 021).

   A member records a request their organisation will act on: what is
   wrong, how urgent, where (a pin the member places, kept privately;
   public views only ever show its area), and the animal if it is known.
   The case exists only when the database returns its id; until then the
   form says "sending", and a failure keeps everything typed.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import { getSupabase } from "@/lib/supabase";
import { animalTitle } from "@/lib/animal-name";
import type { CaseCategory, CaseSeverity } from "@/lib/types";
import { PlacePicker } from "../atlas/PlacePicker";
import { Ack } from "../ui";
import { openCase, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

const CATS: { id: CaseCategory; label: string; note: string }[] = [
  { id: "injury", label: "Injury or illness", note: "Wound, accident, disease" },
  { id: "rescue", label: "Rescue", note: "Trapped, abandoned, in danger" },
  { id: "sterilisation", label: "Sterilisation", note: "Animal birth control" },
  { id: "vaccination", label: "Vaccination", note: "Anti-rabies or booster" },
  { id: "other", label: "Something else", note: "Describe it below" },
];
const SEV: { id: CaseSeverity; label: string }[] = [{ id: "critical", label: "Critical, act today" }, { id: "high", label: "High" }, { id: "normal", label: "Normal" }, { id: "low", label: "Low" }];

export type Prefill = { dog: string | null; lat: number | null; lng: number | null; zone: string | null; title: string | null; note: string | null };

export function NewCase({ pre }: { pre: Prefill }) {
  const dogId = pre.dog;
  const { user } = useAuth();
  const router = useRouter();
  const [cat, setCat] = useState<CaseCategory>("injury");
  const [sev, setSev] = useState<CaseSeverity>("normal");
  const [title, setTitle] = useState(pre.title ?? "");
  const [desc, setDesc] = useState(pre.note ?? "");
  const [city, setCity] = useState("");
  const [where, setWhere] = useState<{ lat: number; lng: number; zone: string } | null>(pre.lat !== null && pre.lng !== null ? { lat: pre.lat, lng: pre.lng, zone: pre.zone ?? "" } : null);
  const [informer, setInformer] = useState("");
  const [animal, setAnimal] = useState<{ id: string; label: string; zone: string | null; lat: number | null; lng: number | null } | null>(null);
  const [state, setState] = useState<"idle" | "pending">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const sent = useRef(false);

  useEffect(() => { getMyOrg().then((o) => { if (o?.city) setCity((c) => c || o.city!); }).catch(() => {}); }, []);
  useEffect(() => {
    const supa = getSupabase(); if (!dogId || !supa) return;
    supa.from("dogs").select("id,name,straypaw_id,zone,city,lat,lng").eq("id", dogId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setAnimal({ id: data.id, label: animalTitle({ name: data.name, straypaw_id: data.straypaw_id, id: data.id }), zone: data.zone, lat: data.lat, lng: data.lng });
      if (data.city) setCity(data.city);
      if (data.lat && data.lng) setWhere({ lat: data.lat, lng: data.lng, zone: data.zone ?? "" });
    });
  }, [dogId]);

  const ready = title.trim().length >= 3 && city.trim().length >= 2;
  const submit = async () => {
    if (!user || !ready || sent.current) return;
    sent.current = true; setState("pending"); setReceipt(null);
    const r = await openCase({ title: title.trim(), description: desc.trim() || undefined, category: cat, severity: sev, city: city.trim(), zone: where?.zone || animal?.zone || null, lat: where?.lat ?? null, lng: where?.lng ?? null, dogId: animal?.id ?? null, informerContact: informer.trim() || null }, { id: user.id, name: user.name });
    setState("idle"); setReceipt(r); sent.current = false;
    if (r.ok && r.id) router.push(`/ngo/cases/${r.id}`);
  };

  return (
    <NgoGate title="New case" lede="Record a request your organisation will act on.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">NGO · new case</p><h1 className="serif">Open a case</h1></div>
          <p className="ngo-sum">It joins your queue the moment the record answers. The exact pin stays private to your organisation; public pages show only its area.</p>
          <div className="row"><Link className="btn is-ghost is-s" href="/ngo">Cancel</Link></div>
        </header>
        <form className="nc" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="nc-col">
            <fieldset className="choice nc-cats"><legend>What kind of request</legend>
              {CATS.map((k) => <label key={k.id}><input type="radio" name="cat" checked={cat === k.id} onChange={() => setCat(k.id)} /><span><b>{k.label}</b><small>{k.note}</small></span></label>)}
            </fieldset>
            <div className="field"><label htmlFor="nc-t">In a few words</label><input id="nc-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Limping, deep wound on the left hind leg" required minLength={3} /></div>
            <div className="field"><label htmlFor="nc-d">What you know <span className="small">optional</span></label><textarea id="nc-d" className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What was seen, by whom, and when. Say what is not known." /></div>
            <fieldset className="field"><legend>How urgent</legend>
              <div className="seg nc-sev" role="group" aria-label="How urgent">{SEV.map((s) => <button key={s.id} type="button" aria-pressed={sev === s.id} onClick={() => setSev(s.id)}>{s.label}</button>)}</div>
            </fieldset>
            <div className="field"><label htmlFor="nc-i">Informer&rsquo;s contact <span className="small">optional, private to your organisation</span></label><input id="nc-i" className="input" value={informer} onChange={(e) => setInformer(e.target.value)} inputMode="tel" /></div>
          </div>
          <div className="nc-col">
            <div className="field"><span className="label">The animal</span>{animal ? <p className="nc-animal"><b>{animal.label}</b> <Link className="link" href={`/ngo/animals/${animal.id}`}>casefile</Link> <button type="button" className="link" onClick={() => setAnimal(null)}>unlink</button></p> : <p className="small">Not linked. Open a case from an animal&rsquo;s casefile to link it, or link it later once it is identified.</p>}</div>
            <div className="field"><label htmlFor="nc-c">City</label><input id="nc-c" className="input" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
            <div className="field"><span className="label">Where</span><PlacePicker value={where ? { lat: where.lat, lng: where.lng } : null} onChange={(p) => setWhere(p)} />
              <p className="small">{where ? <>Pinned{where.zone ? <> near <b>{where.zone}</b></> : null}. <button type="button" className="link" onClick={() => setWhere(null)}>Clear the pin</button></> : "No pin: the case keeps its city and stays in the queue, but is not drawn on the map."}</p></div>
            <div className="nc-send">
              <button type="submit" className="btn is-flame" disabled={!ready || state === "pending" || !user}>{state === "pending" ? "Sending…" : "Open the case"}</button>
              <div aria-live="polite">{state === "pending" ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">Case opened. Opening its file…</Ack> : <Ack state="failed">Not opened: {receipt.error} Everything you typed is kept.</Ack>) : !ready ? <span className="small">A few words and a city are needed.</span> : null}</div>
            </div>
          </div>
        </form>
      </div>
    </NgoGate>
  );
}
