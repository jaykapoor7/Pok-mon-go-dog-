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
      <header className="feeder-command-header">
        <div>
          <span className="product-kicker">Feeder route book</span>
          <h1>Your patch,<br /><em>on the record.</em></h1>
          <p>Keep the places and animals you know connected to the wider care network.</p>
        </div>
        <div className="feeder-command-actions">
          <Link href="/feeding/new" className="feeder-quiet-link"><Plus size={16} /> Add a zone</Link>
          <Link className="product-primary" href="/report"><Radio size={18} /> Add a sighting</Link>
        </div>
      </header>

      <section className="feeder-route-brief" aria-label="Feeder route status">
        <div className="feeder-route-count"><b>{user ? (loading ? "…" : zones.length) : "Your"}</b><span>{user ? "places on the route" : "route, remembered"}</span></div>
        <div className="feeder-route-copy"><span className="product-kicker">{user ? "Route status" : "A personal field record"}</span><h2>{user ? "The places you return to, together." : "Keep your route across devices."}</h2><p>{user ? "Mark the places you cover, return to a known animal, and add the next careful sighting when something changes." : "Sign in to see the zones you cover, mark a visit, and return to the dogs you have recorded."}</p></div>
        {!user && ready && <button type="button" className="product-primary" onClick={openSignIn}>Sign in <ArrowUpRight size={17} /></button>}
      </section>

      <section className="feeder-action-line" aria-label="Feeder actions">
        <Link href="/feeding/new"><span className="feeder-action-icon"><Plus size={18} /></span><span><b>Add a feeding zone</b><small>Give your regular stop a home on the map.</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/map"><span className="feeder-action-icon"><MapPin size={18} /></span><span><b>Find a dog on the map</b><small>Open a known record or locate a new one.</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/following"><span className="feeder-action-icon"><Bookmark size={18} /></span><span><b>Return to saved dogs</b><small>Follow sightings and care updates in one place.</small></span><ArrowUpRight size={16} /></Link>
      </section>

      <section className="feeder-zones">
        <div className="feeder-zones-heading">
          <div>
            <span className="product-kicker">Route register</span>
            <h2>{user ? "Your feeding zones" : "Start with a place you already know."}</h2>
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
