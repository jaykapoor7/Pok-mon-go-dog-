"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crosshair, MapPin, Plus } from "lucide-react";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { RecentSightings } from "@/components/app/RecentSightings";
import type { Dog, Sighting } from "@/lib/types";

const RADIUS_KM = 12;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function CommunityHome({ dogs, sightings }: { dogs: Dog[]; sightings: Sighting[] }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const nearbyDogs = useMemo(() => location ? dogs.filter((dog) => distanceKm(location, dog) <= RADIUS_KM) : [], [dogs, location]);
  const nearbySightings = useMemo(() => location ? sightings.filter((sighting) => distanceKm(location, sighting) <= RADIUS_KM) : [], [sightings, location]);
  const localStats = useMemo(() => ({
    recorded: nearbyDogs.length,
    needsHelp: nearbyDogs.filter((dog) => dog.needs_help).length,
    careKnown: nearbyDogs.filter((dog) => dog.sterilisation_status === "sterilised" || dog.vaccination_status === "vaccinated").length,
  }), [nearbyDogs]);

  function findMe() {
    if (!navigator.geolocation) {
      setLocationError("This browser cannot share a location. You can still explore the map or report a sighting.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("We could not get your location. Check browser permission, or explore the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const nearby = Boolean(location);
  return (
    <div className="community-home">
      <header className="product-page-heading community-heading">
        <div>
          <span className="product-kicker">Community map</span>
          <h1>{nearby ? "Your local record." : "Start with your street."}</h1>
          <p>{nearby ? `Records within roughly ${RADIUS_KM} km of you. Public pins are intentionally approximate.` : "Choose your location to see what is known nearby, or add the first useful record."}</p>
        </div>
        <Link className="product-primary" href="/report"><Plus size={18} />Report a sighting</Link>
      </header>

      {nearby ? (
        <section className="community-counts" aria-label="Nearby animal records">
          <div><b>{localStats.recorded}</b><span>Animals recorded nearby</span></div>
          <div><b>{localStats.needsHelp}</b><span>Marked as needing help</span></div>
          <div><b>{localStats.careKnown}</b><span>With care status recorded</span></div>
        </section>
      ) : (
        <section className="community-location-callout" aria-label="Set your local map">
          <div><Crosshair size={19} /><div><b>Make the map local</b><span>Location is used in this view only. Your exact point is never shown publicly.</span></div></div>
          <button type="button" onClick={findMe} disabled={locating}>{locating ? "Finding you…" : "Use my location"}</button>
        </section>
      )}

      {locationError && <p role="status" className="community-location-error">{locationError}</p>}

      <div className="community-workspace">
        <section className="community-map">
          <div className="product-section-heading">
            <div><h2>{nearby ? "Nearby animals" : "Your map is ready"}</h2><p>{nearby ? `${nearbyDogs.length} public record${nearbyDogs.length === 1 ? "" : "s"} in this local view.` : "Start locally; the full public map is always one tap away."}</p></div>
            {nearby ? <button type="button" className="community-relocate" onClick={findMe} disabled={locating}><Crosshair size={14} />Refresh location</button> : <Link href="/map">Explore India <ArrowUpRight size={16} /></Link>}
          </div>
          <FieldMapPreview dogs={nearbyDogs} center={location} place={nearby ? "Around you" : "India"} />
          {nearby && nearbyDogs.length === 0 && <div className="community-local-empty"><MapPin size={17} /><span><b>No nearby record yet.</b> A careful sighting can make this map useful for the next person.</span><Link href="/report">Report one <ArrowUpRight size={14} /></Link></div>}
        </section>
        <section className="community-recent">
          <div className="product-section-heading"><div><h2>{nearby ? "Recently reported nearby" : "What changes after a report"}</h2><p>{nearby ? "The newest public sightings around your selected area." : "Save a sighting, then return to follow its record as it develops."}</p></div>{nearby && <Link href="/feed">All activity <ArrowUpRight size={16} /></Link>}</div>
          {nearby ? <RecentSightings sightings={nearbySightings.slice(0, 6)} /> : <div className="community-next-step"><span>01</span><p><b>Report what you see.</b> A photo and a place become a record people can return to.</p><span>02</span><p><b>Follow the animal.</b> Care updates stay with the same record—not in a separate feed.</p><Link href="/following">Open saved animals <ArrowUpRight size={15} /></Link></div>}
        </section>
      </div>
    </div>
  );
}
