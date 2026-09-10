"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { dogLabel, timeAgo } from "@/lib/utils";
import { formatPlace } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import { rateForPlace, UNIT_COSTS, inr } from "@/lib/platform/network";
import { logSeen } from "@/lib/actions";
import { celebrate } from "@/lib/celebrate";
import type { Dog } from "@/lib/types";

export function MapAnimalDetails({ dog, distance, onClose }: { dog: Dog; distance: string | null; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { close.current?.focus({ preventScroll: true }); }, []);
  const rate = rateForPlace(dog.city, dog.zone);
  const status = (value: string | undefined, yes: string, no: string) => value === yes ? "Yes" : value === no ? "No" : "Not recorded";
  async function sawToday() {
    setSaving(true); setError("");
    try {
      if (!await logSeen(dog.id)) throw new Error("not saved");
      setSaved(true); celebrate();
    } catch { setError("Your sighting wasn’t saved. Please try again."); }
    finally { setSaving(false); }
  }
  return <>
    <div className="sp-map-detail-photo">
      <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} fit="contain" className="sp-map-cover"/>
      <button ref={close} onClick={onClose} aria-label="Close animal details"><X size={18}/></button>
      <span className={dog.needs_help ? "needs-help" : ""}>{markerMetaFor(dog).label}</span>
    </div>
    <div className="sp-map-detail-body">
      {dog.code && <span className="sp-map-record-code">{dog.code}</span>}
      <h2>{dogLabel(dog)}</h2>
      <p className="sp-map-detail-place">{formatPlace(dog.zone, dog.city)}{distance && ` · ${distance} away`}</p>
      <p className="sp-map-last-seen">Last seen {timeAgo(dog.last_seen)}</p>
      <dl className="sp-map-facts">
        <div><dt>Sterilised</dt><dd>{status(dog.sterilisation_status, "sterilised", "not_sterilised")}</dd></div>
        <div><dt>Vaccinated</dt><dd>{status(dog.vaccination_status, "vaccinated", "not_vaccinated")}</dd></div>
        <div><dt>Sightings</dt><dd>{dog.sightings_count ?? 0}</dd></div>
        <div><dt>First recorded</dt><dd>{dog.first_seen ? new Date(dog.first_seen).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"}) : "Not recorded"}</dd></div>
      </dl>
      {!!dog.community_notes?.length && <section className="sp-map-notes"><h3>From the community</h3><p>{dog.community_notes[0]}</p></section>}
      <Link className="sp-map-profile-link" href={`/dog/${dog.id}`}>Open full record <ArrowUpRight size={17}/></Link>
      <details className="sp-map-cost"><summary>Sterilisation cost reference</summary>
        <b>{inr(rate?.value ?? UNIT_COSTS.sterilisation.value)} per animal</b>
        <p>{rate ? `${rate.source}, ${rate.year}. Published rate for ${rate.city}, not a StrayPaw estimate.` : `AWBI-notified ceiling, ${UNIT_COSTS.sterilisation.year}. No local rate is available; this is not a local quote.`}</p>
        <Link href="/what-would-it-take">Cost a programme <ArrowUpRight size={14}/></Link>
      </details>
    </div>
    <div className="sp-map-detail-actions">
      <button onClick={sawToday} disabled={saving || saved}>{saved ? <><Check size={17}/> Sighting recorded</> : saving ? "Saving sighting…" : "I saw this animal today"}</button>
      {error && <p role="alert">{error}</p>}
      <p>Adds a sighting, not a request for help. <Link href="/report">Report a problem</Link></p>
    </div>
  </>;
}
