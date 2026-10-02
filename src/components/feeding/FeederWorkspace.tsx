"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyFeedingZones, type MyFeedingZone } from "@/lib/feeding-zones";
import { FeedingZoneCard } from "./FeedingZoneCard";
import "./feeder.css";
import { DeskHeader } from "@/components/app/DeskHeader";

/** The feeder's home: their route, and the two things they do on it. Not a
 * shadow version of the organisation dashboard. */
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
    <div className="fd">
      <DeskHeader
        kicker="Feeder · your route"
        title={<>Your patch, <em>on the record</em></>}
        lede="The places you feed and the animals you meet, connected to the same local record."
        figures={user ? [{ label: zones.length === 1 ? "feeding spot on your route" : "feeding spots on your route", value: loading ? null : zones.length }] : undefined}
        actions={<>
          <Link href="/report" className="dk-btn is-flame"><Radio size={16} /> Add a sighting</Link>
          <Link href="/feeding/new" className="dk-btn is-tint"><Plus size={16} /> Add a feeding spot</Link>
        </>}
      />

      {!user && ready && (
        <p className="fd-sign">
          Sign in to keep your route on every device.
          <button type="button" onClick={openSignIn}>Sign in</button>
        </p>
      )}

      <section className="fd-route" aria-labelledby="fd-route-title">
        <div className="fd-route-head">
          <h2 id="fd-route-title">{user ? "Your feeding spots" : "Feeding spots"}</h2>
          <Link href="/feeding">All spots <ArrowUpRight size={15} /></Link>
        </div>
        {loading ? <p className="fd-quiet">Reading your route…</p> : zones.length > 0 ? (
          <div className="fd-list">{zones.map((zone, index) => <FeedingZoneCard key={zone.id} zone={zone} index={index} />)}</div>
        ) : (
          <div className="fd-empty">
            <span>01 / Start your route</span>
            <b>No spots on your route yet.</b>
            <p>Add the place you already feed at. Each spot keeps the animals you see there.</p>
            <Link href="/feeding/new">Add a feeding spot <ArrowUpRight size={15} /></Link>
          </div>
        )}
      </section>
    </div>
  );
}
