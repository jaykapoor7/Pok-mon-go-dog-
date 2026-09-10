"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bookmark, MapPin, Plus, Radio, Utensils } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyFeedingZones, type MyFeedingZone } from "@/lib/feeding-zones";
import { FeedingZoneCard } from "./FeedingZoneCard";

/** The feeder view is deliberately a small field desk: one place to return
 * to their patch, not a shadow version of the organisation dashboard. */
export function FeederWorkspace() {
  const { user, ready, openSignIn } = useAuth();
  const [zones, setZones] = useState<MyFeedingZone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setZones([]); return; }
    let active = true;
    setLoading(true);
    getMyFeedingZones()
      .then((items) => active && setZones(items))
      .catch(() => active && setZones([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  return (
    <div className="community-home feeder-home">
      <header className="product-page-heading">
        <div>
          <span className="product-kicker">Feeder workspace</span>
          <h1>Your patch,<br />on the record.</h1>
          <p>Keep the places and animals you know connected to the wider care network.</p>
        </div>
        <Link className="product-primary" href="/report"><Radio size={18} /> Add a sighting</Link>
      </header>

      {!user && ready && (
        <section className="feeder-signin" aria-label="Sign in to your feeder workspace">
          <div>
            <span className="product-kicker">Your own field record</span>
            <h2>Keep your route across devices.</h2>
            <p>Sign in to see the zones you cover, mark a visit, and return to the dogs you have recorded.</p>
          </div>
          <button type="button" className="product-primary" onClick={openSignIn}>Sign in <ArrowUpRight size={17} /></button>
        </section>
      )}

      <section className="feeder-actions" aria-label="Feeder actions">
        <Link href="/feeding/new"><Plus size={18} /><span><b>Add a feeding zone</b><small>Give your regular stop a home on the map.</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/map"><MapPin size={18} /><span><b>Find a dog on the map</b><small>Open a known record or locate a new one.</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/following"><Bookmark size={18} /><span><b>Return to saved dogs</b><small>Follow sightings and care updates in one place.</small></span><ArrowUpRight size={16} /></Link>
      </section>

      <section className="feeder-zones">
        <div className="product-section-heading">
          <div>
            <h2>{user ? "Your feeding zones" : "How feeders contribute"}</h2>
            <p>{user ? "Places you created or have committed to cover." : "A good record starts with a place, a photo, and what you know."}</p>
          </div>
          <Link href="/feeding">All feeding zones <ArrowUpRight size={16} /></Link>
        </div>
        {loading ? <p className="spa-empty">Loading your zones…</p> : zones.length > 0 ? (
          <div className="feeder-zone-list">{zones.map((zone) => <FeedingZoneCard key={zone.id} zone={zone} />)}</div>
        ) : (
          <div className="feeder-empty">
            <Utensils size={22} />
            <div><b>{user ? "No zones on your route yet." : "Start with a place you already know."}</b><p>Add a feeding point or join an existing rotation. When you recognise a dog, use a sighting to record the visible ear-notch, sterilisation, or vaccination status.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}
