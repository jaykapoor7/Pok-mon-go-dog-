"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crosshair, MapPin, Plus } from "lucide-react";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ByLocality, CoverageBar, ReportsOverTime } from "./ConsoleCharts";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { located } from "@/lib/geo/cluster";
import { markerMetaFor } from "@/lib/marker-state";
import { dogLabel, timeAgo } from "@/lib/utils";
import type { Dog, Sighting } from "@/lib/types";
import type { PublicProgramme } from "@/lib/public-programmes";
import { PublicProgrammes } from "./PublicProgrammes";

/* ════════════════════════════════════════════════════════════════════
   The neighbourhood home.

   This screen used to be gated on a location permission. Before somebody
   granted it there were no counts, no animals, a map labelled "India" with
   nothing on it, and a column of advice. A first visit to the product
   showed an empty product.

   Nothing here waits for permission now. Without a location the screen
   stays explicitly national. Granting a location does not turn the page
   on; it moves the same shared register to the person's own street.
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

export function CommunityHome({ dogs, sightings, programmes }: { dogs: Dog[]; sightings: Sighting[]; programmes: PublicProgramme[] }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const nearby = Boolean(location);

  /* The old fallback picked the densest seeded cluster and opened a person
     in a Delhi-looking dashboard before they had told us where they were.
     The default is now the shared national register; location turns it into
     their street, rather than pretending a seed cluster is their home. */
  const inView = useMemo(() => {
    const there = located(dogs);
    if (location) return there.filter((dog) => distanceKm(location, dog) <= RADIUS_KM);
    return there;
  }, [dogs, location]);

  const nearbySightings = useMemo(
    () =>
      location
        ? sightings.filter((s) => distanceKm(location, s) <= RADIUS_KM)
        : sightings,
    [sightings, location]
  );

  /* ONE LIST, NOT TWO.

     This screen used to carry a "Live field journal" of recent sightings
     beside the map and then, immediately underneath, a "local register"
     row of the same animals. Two headings, two lists, one dataset: the
     journal listed sightings, the strip listed the animals those
     sightings belong to, and in a young register they are very nearly
     the same rows twice.

     They are one list now, ordered by when the animal was last seen, so
     the recency the journal carried survives as a column on the register
     rather than as a second section. The per-sighting stream still
     exists in full at /feed, which is where an event log belongs. */
  const register = useMemo(
    () => [...inView].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen)),
    [inView]
  );

  /* COUNT THE RECORD, NOT THE MAP.

     This counted inView, which is located(dogs): every animal whose
     coordinates are finite and not exactly 0,0. An organisation that
     registers an animal without a location gets 0,0 from the database
     (register_org_animal coalesces a missing lat/lng to zero), so the
     record existed, was listed nowhere, and was counted nowhere — the
     headline read lower than the number of animals actually on file, with
     nothing on screen to say why.

     The headline is now every record. The map still draws only what it can
     place, and when those two numbers differ the screen says so rather
     than quietly using the smaller one. */
  const stats = useMemo(() => {
    const scope = location ? inView : dogs;
    return {
      recorded: scope.length,
      needsHelp: scope.filter((d) => d.needs_help).length,
      unplaced: location ? 0 : dogs.length - inView.length,
    };
  }, [dogs, inView, location]);

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

  const where = nearby ? "around you" : "on the shared register";

  return (
    <div className="community-home">
      <header className="community-command-header">
        <div>
          <span className="product-kicker">Community field desk</span>
          <h1>
            {nearby ? (
              <>
                Your street, <em>on the record.</em>
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
              : "Start with the shared national record, or use your location to make this your own street."}
          </p>
        </div>
        <div className="community-command-actions">
          <button type="button" onClick={findMe} disabled={locating} className="community-relocate">
            <Crosshair size={15} />
            {locating ? "Finding you" : nearby ? "Refresh location" : "Use my location"}
          </button>
          <Link className="product-primary" href="/report"><Plus size={18} /> Report a sighting</Link>
        </div>
      </header>

      {locationError && (
        <p role="status" className="community-location-error">
          {locationError}
        </p>
      )}

      <section className="community-field-surface" aria-label={`Animal records ${where}`}>
        <div className="community-map">
          {/* Without a location this map is the whole national register, so
              it says so. Left to work the place out for itself it printed
              whichever city the records happen to cluster in, which put
              "Delhi" over a map of India for everybody. */}
          <FieldMapPreview
            dogs={inView}
            center={location}
            place={nearby ? "Around you" : "Across India"}
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
        </div>

        <aside className="community-journal">
          <div className="community-signal-line">
            <div>
              <b>{stats.recorded}</b>
              <span>
                animals recorded {where}
                {stats.unplaced > 0 && (
                  <>
                    <br />
                    {stats.unplaced} without a location yet, so not on the map
                  </>
                )}
              </span>
            </div>
            <div><b className={stats.needsHelp > 0 ? "urgent" : undefined}>{stats.needsHelp}</b><span>need attention</span></div>
          </div>
          <div className="community-journal-heading">
            <div>
              <span className="product-kicker">The local register</span>
              <h2>Who is on this map</h2>
            </div>
            <Link href="/map">
              Open the map <ArrowUpRight size={16} />
            </Link>
          </div>

          {register.length > 0 ? (
            <ul className="community-register">
              {register.slice(0, 8).map((dog) => {
                const meta = markerMetaFor(dog);
                return (
                  <li key={dog.id}>
                    <Link href={`/dog/${dog.id}`}>
                      <DogPhoto
                        src={dog.cover_photo}
                        alt=""
                        seed={dog.id}
                        className="community-register-photo"
                      />
                      <span className="community-register-who">
                        <b>{dogLabel(dog)}</b>
                        <small>{dog.zone || "Location on the record"}</small>
                      </span>
                      <span className="community-register-state">
                        <span>
                          <i style={{ background: meta.color }} aria-hidden />
                          {meta.label}
                        </span>
                        {/* The status beside it can itself read "Seen",
                            so this column is the figure alone rather than
                            "Seen · Seen 2d ago". */}
                        <em aria-label={`Last seen ${timeAgo(dog.last_seen)}`}>
                          {timeAgo(dog.last_seen)}
                        </em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="community-register-empty">
              No animal is on this part of the register yet. The first report
              starts it.
            </p>
          )}

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
        </aside>
      </section>

      <section className="community-analysis" aria-label="Local record patterns">
        <div className="community-analysis-heading"><span className="product-kicker">Patterns in the record</span><p>Coverage, reporting pace and place, read together.</p></div>
        <div className="console-charts">
          <CoverageBar dogs={inView} />
          <ReportsOverTime sightings={nearbySightings} />
          {/* Locality rankings only mean something after the person has
              chosen a geography. Showing a seed-heavy city as “busiest”
              is not a national signal. */}
          {nearby && <ByLocality dogs={inView} />}
        </div>
      </section>

      <PublicProgrammes programmes={programmes} />

      {/* The console's side rail is hidden on a phone, and a phone is
          where most of this gets used, so the way to report a problem
          cannot be desktop-only.

          The copy here used to explain who builds StrayPaw and invite
          corrections on that basis. Whatever is true about the size of a
          team is not the user's business and does not belong in product
          copy: it asks them to lower their expectations at the exact
          moment they have hit a problem. The tone across the product is
          an organisation's, not a person's. */}
      <div className="community-feedback">
        <p>
          <b>Something not working, or missing?</b> Report it and we will
          look into it.
        </p>
        <FeedbackButton label="Send feedback" />
      </div>
    </div>
  );
}
