"use client";

import { EditSightingSheet } from "@/components/sighting/EditSightingSheet";
import { DeleteSightingButton } from "@/components/sighting/DeleteSightingButton";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { AnimalSeal } from "@/components/system/AnimalSeal";
import { useFollows } from "@/lib/follows";
import type { Dog } from "@/lib/types";
import { formatPlace } from "@/lib/delhi";
import { dogLabel, timeAgo } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDeviceSightings, getMySightings, type DeviceSighting } from "@/lib/actions";
import { getDogsByIds } from "@/lib/data";

export function FollowingClient({ suggestions: dogs }: { suggestions: Dog[] }) {
  const { ids } = useFollows();
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [deviceReports, setDeviceReports] = useState<DeviceSighting[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
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

  /* Guests still have a way back: the device holds the report secret and the
     server returns a timeline only when that secret matches its stored hash. */
  useEffect(() => {
    let live = true;
    getDeviceSightings().then((rows) => { if (live) setDeviceReports(rows); });
    return () => { live = false; };
  }, []);

  // Follows are kept on-device, so the followed animals are read by id from
  // here — never by sending the whole register to the page.
  const [followedRows, setFollowedRows] = useState<Dog[]>([]);
  const [loadedIdKey, setLoadedIdKey] = useState<string | null>(null);
  const [followError, setFollowError] = useState(false);
  const idKey = ids.join(",");
  useEffect(() => {
    if (!idKey) { setFollowedRows([]); setLoadedIdKey(idKey); return; }
    let live = true;
    setFollowError(false);
    getDogsByIds(idKey.split(",")).then((rows) => { if (live) { setFollowedRows(rows); setLoadedIdKey(idKey); } }).catch(() => { if (live) { setFollowError(true); setLoadedIdKey(idKey); } });
    return () => { live = false; };
  }, [idKey]);
  /* Most recently seen first. Somebody opens this page to find out what has
     happened since they last looked, and the order the follow ids happen to
     be stored in does not answer that. */
  const followed = [...followedRows]
    .sort((a, b) => +new Date(b.last_seen ?? 0) - +new Date(a.last_seen ?? 0));
  const timeline = [...reports, ...deviceReports.filter((d) => !reports.some((r) => r.id === d.id))]
    .sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0));
  const reportHistory = timeline.length > 0 ? <section className="my-report-history">
    <div className="spa-panel-head"><b>Your report trail</b><span>{timeline.length} report{timeline.length === 1 ? "" : "s"} from this device{user && reports.length ? " and your account" : ""}</span></div>
    <div className="my-report-list">
      {timeline.slice(0, 8).map((report) => {
        const href = report.dog_id ? `/dog/${report.dog_id}` : report.lat && report.lng ? `/map?lat=${report.lat}&lng=${report.lng}` : "/following";
        const careRequest = Array.isArray(report.mood_tags) && report.mood_tags.some((tag: string) => ["injured", "hungry", "puppies"].includes(tag));
        const state = report.status === "live" ? "Shared on the map" : report.status === "pending" ? "Awaiting review" : "Status updated";
        return <div key={report.id} className="my-report-item">
          <Link href={href} className="my-report-row">
            <span className={report.status === "live" ? "my-report-status live" : careRequest ? "my-report-status urgent" : "my-report-status"}>{state}</span>
            <span className="my-report-copy"><b>{report.nickname || "Street animal sighting"}</b><small>{report.zone || "Location saved"} · {timeAgo(report.created_at)}{careRequest ? " · Care requested" : ""}</small></span>
            <ArrowUpRight size={15} />
          </Link>
          <span className="my-report-acts">
            <button type="button" onClick={() => setEditing(report)}>Edit</button>
            <DeleteSightingButton sightingId={report.id} ownerUserId={report.user_id ?? user?.id} variant="text" onDeleted={() => setReports((r) => r.filter((x) => x.id !== report.id))} />
          </span>
        </div>;
      })}
    </div>
    {editing && <EditSightingSheet open sightingId={editing.id} initial={{ nickname: editing.nickname ?? null, mood_tags: editing.mood_tags ?? [], notes: editing.notes ?? null }}
      onClose={() => setEditing(null)} onSaved={(v) => { setReports((r) => r.map((x) => (x.id === editing.id ? { ...x, ...v } : x))); setEditing(null); }} />}
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
        <div className="spa-empty follow-empty">
          <div className="follow-empty-copy">
            <span className="follow-eyebrow">01 / YOUR ANIMALS</span>
            <h2>No animals followed yet.</h2>
            <p>Find an animal on the map and save its record. Its sightings and care will be here when you come back. Follows stay on this device and need no account.</p>
            <Link href="/map" className="spa-cta">Explore the map <ArrowUpRight size={14} /></Link>
          </div>
          <nav className="follow-wayfinding" aria-label="Start your follow-up trail"><p>Build your own care trail</p><Link href="/map">01 / Discover an identity <ArrowUpRight size={15} /></Link><Link href="/report">02 / Add what you observed <ArrowUpRight size={15} /></Link><Link href="/app">03 / Read your local patch <ArrowUpRight size={15} /></Link><small>Follows are saved on this device. No account is required to explore.</small></nav>
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
                        <AnimalSeal seed={d.id} name={d.name} />
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

  if (loadedIdKey !== idKey) return <p className="cp-state" role="status">Loading your followed records…</p>;

  if (followed.length === 0 || followError) {
    return (
      <div className="spa-empty follow-empty follow-empty-error">
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
              {/* Every card gets a title. An unnamed animal used to render
                  with no heading at all, leaving a photograph and a locality
                  that read as a broken card; dogLabel is what the rest of the
                  product already uses to name one. */}
              <b>{dogLabel(dog)}</b>
              <span className="spa-mono dim">
                <MapPin size={11} /> {place}
              </span>
              {dog.last_seen && (
                <span className="spa-mono dim">Seen {timeAgo(dog.last_seen)}</span>
              )}
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
