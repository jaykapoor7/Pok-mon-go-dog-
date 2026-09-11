"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crosshair, MapPin, Plus } from "lucide-react";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { RecentSightings } from "@/components/app/RecentSightings";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { cityForPoints } from "@/lib/geo/cities";
import { densestCell, located } from "@/lib/geo/cluster";
import { markerMetaFor } from "@/lib/marker-state";
import { dogLabel } from "@/lib/utils";
import type { Dog, Sighting } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The neighbourhood home.

   This screen used to be gated on a location permission. Before somebody
   granted it there were no counts, no animals, a map labelled "India" with
   nothing on it, and a column of advice. A first visit to the product
   showed an empty product.

   Nothing here waits for permission now. Without a location the screen
   frames the busiest place on the register, counts THAT, and puts those
   animals on the map and in a row of records you can open. Granting a
   location does not turn the page on, it moves it to your street.
   ════════════════════════════════════════════════════════════════════ */

const RADIUS_KM = 12;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function CommunityHome({ dogs, sightings }: { dogs: Dog[]; sightings: Sighting[] }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const nearby = Boolean(location);

  /* What the screen is about: your 12 km, or the busiest place on the
     register while nobody has said where you are. */
  const inView = useMemo(() => {
    const there = located(dogs);
    if (location) return there.filter((dog) => distanceKm(location, dog) <= RADIUS_KM);
    return densestCell(there);
  }, [dogs, location]);

  const place = useMemo(
    () => (location ? null : cityForPoints(inView)),
    [location, inView]
  );

  const nearbySightings = useMemo(
    () =>
      location
        ? sightings.filter((s) => distanceKm(location, s) <= RADIUS_KM)
        : sightings,
    [sightings, location]
  );

  const stats = useMemo(
    () => ({
      recorded: inView.length,
      needsHelp: inView.filter((d) => d.needs_help).length,
      careKnown: inView.filter(
        (d) => d.sterilisation_status === "sterilised" || d.vaccination_status === "vaccinated"
      ).length,
    }),
    [inView]
  );

  function findMe() {
    if (!navigator.geolocation) {
      setLocationError(
        "This browser cannot share a location. The map below still works, and you can report a sighting from anywhere."
      );
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
        setLocationError(
          "We could not get your location. Check the browser permission, or carry on with the map below."
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  /* Where the screen says it is looking. Never "India": that is a country,
     not a place somebody walks a dog in. */
  const where = nearby ? "around you" : place ? `in ${place}` : "on the register";

  return (
    <div className="community-home">
      <header className="product-page-heading community-heading">
        <div>
          <span className="product-kicker">Community map</span>
          <h1>
            {nearby ? (
              <>
                Your street, <em>on the record.</em>
              </>
            ) : place ? (
              <>
                What is known <em>in {place}.</em>
              </>
            ) : (
              <>
                Start with <em>your street.</em>
              </>
            )}
          </h1>
          <p>
            {nearby
              ? `Every public record within about ${RADIUS_KM} km of you. Public pins are deliberately approximate.`
              : place
                ? `The part of the map with the most records on it. Use your location to swap this for your own street.`
                : "Add the first record and this becomes a map of somewhere real."}
          </p>
        </div>
        <Link className="product-primary" href="/report">
          <Plus size={18} />
          Report a sighting
        </Link>
      </header>

      {/* One band of real numbers, counted from whatever is in view. It is
          the same three figures before and after a location is shared, so
          granting one changes the subject rather than unlocking the page. */}
      <section className="community-counts" aria-label={`Animal records ${where}`}>
        <div>
          <b>{stats.recorded}</b>
          <span>Animals recorded {where}</span>
        </div>
        <div>
          <b>{stats.needsHelp}</b>
          <span>Marked as needing help</span>
        </div>
        <div>
          <b>{stats.careKnown}</b>
          <span>With a care status recorded</span>
        </div>
        <button type="button" onClick={findMe} disabled={locating} className="community-relocate">
          <Crosshair size={14} />
          {locating ? "Finding you" : nearby ? "Refresh my location" : "Use my location"}
        </button>
      </section>

      {locationError && (
        <p role="status" className="community-location-error">
          {locationError}
        </p>
      )}

      <div className="community-workspace">
        <section className="community-map">
          <div className="product-section-heading">
            <div>
              <h2>{nearby ? "Animals near you" : place ? `Animals in ${place}` : "The map"}</h2>
              <p>
                {inView.length > 0
                  ? `${inView.length} public record${inView.length === 1 ? "" : "s"}. Tap one to open it.`
                  : "Nothing here yet. The first careful sighting makes this useful for the next person."}
              </p>
            </div>
            <Link href="/map">
              Open the full map <ArrowUpRight size={16} />
            </Link>
          </div>

          <FieldMapPreview
            dogs={inView}
            center={location}
            place={nearby ? "Around you" : place ?? undefined}
          />

          {inView.length === 0 && (
            <div className="community-local-empty">
              <MapPin size={17} />
              <span>
                <b>No record here yet.</b> A photograph and a place are enough.
              </span>
              <Link href="/report">
                Report one <ArrowUpRight size={14} />
              </Link>
            </div>
          )}

          {/* The animals themselves, not just their pins. This is the row
              that makes the map a register of individuals: every card opens
              that animal's own page. */}
          {inView.length > 0 && (
            <div className="community-animals">
              <div className="product-section-heading">
                <div>
                  <h2>Who is on this map</h2>
                  <p>Open a record to see its sightings, its care status and what is missing.</p>
                </div>
              </div>
              <ul className="community-animal-row">
                {inView.slice(0, 12).map((dog) => {
                  const meta = markerMetaFor(dog);
                  return (
                    <li key={dog.id}>
                      <Link href={`/dog/${dog.id}`}>
                        <DogPhoto
                          src={dog.cover_photo}
                          alt=""
                          seed={dog.id}
                          className="community-animal-photo"
                        />
                        <b>{dogLabel(dog)}</b>
                        <span>{dog.zone || "Location on the record"}</span>
                        <i style={{ background: meta.color }} aria-hidden />
                        <small>{meta.label}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="community-recent">
          <div className="product-section-heading">
            <div>
              <h2>Reported recently</h2>
              <p>
                {nearby
                  ? "The newest public sightings around you."
                  : "The newest public sightings anywhere on the register."}
              </p>
            </div>
            <Link href="/feed">
              All activity <ArrowUpRight size={16} />
            </Link>
          </div>
          <RecentSightings sightings={nearbySightings.slice(0, 6)} />

          <div className="community-next-step">
            <p>
              <b>Report what you see.</b> A photograph and a place become a record
              people can return to.
            </p>
            <p>
              <b>Keeping track of one animal?</b> Save it with your email code and
              its care updates arrive in one place.
            </p>
            <Link href="/following">
              Open saved animals <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
