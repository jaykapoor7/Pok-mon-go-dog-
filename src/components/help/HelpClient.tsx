"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartHandshake, MapPin, HandHelping, Utensils, ArrowRight } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { HelpMap } from "@/components/help/HelpMap";
import "./help.css";
import { HelperForm, type HelperTarget } from "@/components/help/HelperForm";
import { needsFor, latestNote, placeLabel } from "@/lib/help-needs";
import { distanceMeters, dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

export function HelpClient({ dogs }: { dogs: Dog[] }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [target, setTarget] = useState<HelperTarget | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  // Dogs that need help, nearest first (or most recent if no location).
  const needy = useMemo(() => {
    const list = dogs.filter((d) => d.needs_help);
    if (coords) {
      return [...list].sort(
        (a, b) => distanceMeters(coords, a) - distanceMeters(coords, b)
      );
    }
    return [...list].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
  }, [dogs, coords]);

  function helpDog(dog: Dog) {
    setTarget({ dogId: dog.id, zone: dog.zone, label: dogLabel(dog) });
    setFormOpen(true);
  }
  function helpGeneral() {
    setTarget(null);
    setFormOpen(true);
  }

  const ask = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { timeout: 8000 });
  };
  const km = (dog: Dog) => (coords ? distanceMeters(coords, dog) / 1000 : null);
  const daysSince = (iso: string | null | undefined) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : null);

  return (
    <main className="hp">
      <header className="hp-head">
        <div>
          <p className="sys-eyebrow">Help</p>
          <h1>{needy.length ? <>{needy.length} animals need someone{coords ? " near you" : ""}.</> : "Nobody is flagged as needing help right now."}</h1>
          <p className="hp-lede">
            Each was flagged by a resident or a field team: injured, hungry, or in trouble. Pick one you can reach — feeding it, getting it to a vet, or just
            checking on it and saying what you saw all count. {coords ? "Nearest first." : null}
          </p>
          <div className="hp-acts">
            {!coords && <button type="button" className="sys-btn" onClick={ask}><MapPin size={16} /> Show the nearest first</button>}
            <button type="button" className="sys-btn is-quiet" onClick={helpGeneral}><HandHelping size={16} /> Be on call as a volunteer</button>
            <Link href="/feeding" className="hp-link"><Utensils size={15} /> Feeding points <ArrowRight size={14} /></Link>
            <Link href="/for-ngos" className="hp-link"><HeartHandshake size={15} /> For organisations <ArrowRight size={14} /></Link>
          </div>
        </div>
        {needy.length > 0 && <HelpMap points={needy.map((d) => ({ id: d.id, lng: d.lng, lat: d.lat }))} me={coords} />}
      </header>

      {needy.length > 0 && (
        <ol className="hp-list">
          {needy.map((dog) => {
            const needs = needsFor(dog).filter((n) => !/not checked/i.test(n.label));
            const note = latestNote(dog);
            const d = km(dog);
            const flagged = daysSince(dog.last_seen);
            return (
              <li key={dog.id} className="hp-row">
                <Link href={`/dog/${dog.id}`} className="hp-ph"><DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} tone="urgent" className="h-full w-full" /></Link>
                <div className="hp-what">
                  <Link href={`/dog/${dog.id}`} className="hp-name">{dogLabel(dog)}</Link>
                  <p className="hp-where"><MapPin size={12} /> {placeLabel(dog.zone)}{d != null ? <b> · {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`} away</b> : null}{flagged != null ? <> · last seen {flagged === 0 ? "today" : `${flagged} days ago`}</> : null}</p>
                  {note && <p className="hp-note">{note}</p>}
                  {needs.length > 0 && <p className="hp-needs">{needs.map((n) => <span key={n.label} className={n.urgent ? "is-urgent" : ""}>{n.label}</span>)}</p>}
                </div>
                <div className="hp-do">
                  <button type="button" className="hp-help" onClick={() => helpDog(dog)}>I can help</button>
                  <a className="hp-dir" href={`https://www.google.com/maps/dir/?api=1&destination=${dog.lat},${dog.lng}`} target="_blank" rel="noopener noreferrer">Directions to the area</a>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <HelperForm open={formOpen} target={target} onClose={() => setFormOpen(false)} />
    </main>
  );
}
