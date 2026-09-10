"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, PawPrint } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { Constellation } from "@/components/site/vectors";
import type { Dog } from "@/lib/types";
import { formatPlace } from "@/lib/delhi";
import { dogLabel, timeAgo } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMySightings } from "@/lib/actions";

export function FollowingClient({ dogs }: { dogs: Dog[] }) {
  const { ids } = useFollows();
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  /* Null until the browser answers, and it may never: location is a
     permission, not a fact. Everything below works without it. */
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let live = true;
    navigator.geolocation.getCurrentPosition(
      (p) => live && setHere({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 600_000 }
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) { setReports([]); return; }
    let live = true;
    getMySightings(user.id).then((rows) => live && setReports(rows));
    return () => { live = false; };
  }, [user?.id]);

  // Follows are kept on-device, so the list is resolved client-side against
  // the animals passed in from the server.
  const followed = dogs.filter((d) => ids.includes(String(d.id)));
  const reportHistory = user && reports.length > 0 ? <section className="my-report-history">
    <div className="spa-panel-head"><b>Reports you filed</b><span>{reports.length} on your account</span></div>
    <div className="my-report-list">
      {reports.slice(0, 8).map((report) => {
        const href = report.dog_id ? `/dog/${report.dog_id}` : `/map?lat=${report.lat}&lng=${report.lng}`;
        return <Link key={report.id} href={href} className="my-report-row">
          <span className={report.status === "live" ? "my-report-status live" : "my-report-status"}>{report.status === "live" ? "On the map" : "In review"}</span>
          <span className="my-report-copy"><b>{report.nickname || "Street animal sighting"}</b><small>{report.zone || "Location saved"} · {timeAgo(report.created_at)}</small></span>
          <ArrowUpRight size={15} />
        </Link>;
      })}
    </div>
  </section> : null;

  if (ids.length === 0) {
    /* An empty page teaches nothing. Real animals from the same records,
       never invented.

       Nearest first when the browser will say where we are, because an
       animal three streets away is one you might actually check on, and one
       in another state is not. Without that permission it falls back to who
       needs attention and who has been seen most, which is the best answer
       available rather than a worse version of the same one.

       Three, not six: two rows of three left the second row half empty on
       most screens, and a short row of good suggestions reads better than a
       long one padded out. */
    const dist = (d: Dog) =>
      here && d.lat && d.lng
        ? Math.hypot(d.lat - here.lat, d.lng - here.lng)
        : Number.POSITIVE_INFINITY;

    const suggestions = [...dogs]
      .sort((a, b) => {
        if (here) {
          const da = dist(a);
          const db = dist(b);
          if (da !== db) return da - db;
        }
        if (a.needs_help !== b.needs_help) return a.needs_help ? -1 : 1;
        return (b.sightings_count ?? 0) - (a.sightings_count ?? 0);
      })
      .slice(0, 3);

    return (
      <>
        {reportHistory}
        <div className="spa-empty">
          <Constellation size={132} />
          <h2>No animals followed yet</h2>
          <p>
            Follow an animal and it lands here, so you can check on it without
            hunting through the map. Follows are stored on this device, no
            account needed.
          </p>
          <Link href="/map" className="spa-cta">
            Open the map <ArrowUpRight size={14} />
          </Link>
        </div>

        {suggestions.length > 0 && (
          <section className="fl-suggest">
            <div className="spa-panel-head">
              <b>{here ? "Animals near you" : "Animals you could follow"}</b>
              <Link href="/map">
                See all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="fl-grid">
              {suggestions.map((d) => (
                <Link key={d.id} href={`/dog/${d.id}`} className="fl-card">
                  {/* The photo is what makes these read as animals rather
                      than rows. It is the reason to follow one. */}
                  <span className="fl-photo">
                    {d.cover_photo ? (
                      <Image
                        src={d.cover_photo}
                        alt=""
                        width={220}
                        height={140}
                        className="fl-img"
                        unoptimized
                      />
                    ) : (
                      <span className="fl-noimg" aria-hidden="true">
                        <PawPrint size={20} strokeWidth={1.4} />
                      </span>
                    )}
                    {d.needs_help && <i className="fl-badge">Needs help</i>}
                  </span>
                  <b>{dogLabel(d)}</b>
                  <span className="fl-place">{formatPlace(d.zone, d.city)}</span>
                  <span className="fl-meta">
                    {(d.sightings_count ?? 0) > 0 && (
                      <i>
                        {d.sightings_count} sighting
                        {d.sightings_count === 1 ? "" : "s"}
                      </i>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  if (followed.length === 0) {
    return (
      <div className="spa-empty">
        <Constellation size={132} />
        <h2>Followed records aren&apos;t loading</h2>
        <p>
          You follow {ids.length} record{ids.length > 1 ? "s" : ""} on this device,
          but none of them came back from the server. They may have been removed.
        </p>
        <Link href="/map" className="spa-cta">
          Back to the map <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <>
      {reportHistory}
      <div className="follow-grid">
        {followed.map((dog) => {
        const place = formatPlace(dog.zone, dog.city);
        return (
          <Link href={`/dog/${dog.id}`} key={dog.id} className="follow-card">
            <div className="follow-photo">
              {dog.cover_photo ? (
                <Image
                  src={dog.cover_photo}
                  alt={dog.name ? `${dog.name}, in ${place}` : `A street dog in ${place}`}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              ) : (
                <span className="spa-mono dim">No photo</span>
              )}
            </div>
            <div className="follow-body">
              {dog.name && <b>{dog.name}</b>}
              <span className="spa-mono dim">
                <MapPin size={11} /> {place}
              </span>
              <div className="follow-tags">
                {dog.sterilised && <span className="chip-mini">Sterilised</span>}
                {dog.vaccinated && <span className="chip-mini">Vaccinated</span>}
                {dog.needs_help && <span className="chip-mini urgent">Needs help</span>}
              </div>
            </div>
          </Link>
        );
        })}
      </div>
    </>
  );
}
