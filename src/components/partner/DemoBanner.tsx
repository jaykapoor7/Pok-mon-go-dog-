"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { myProfile } from "@/lib/programme";

/* While demo mode is on, every screen says so.

   This is the half of the feature that stops it doing harm. A switch on a
   settings page that somebody turned on three weeks ago is indistinguishable
   from a broken product: they file a real case, it never reaches the map,
   and the conclusion they draw is that StrayPaw does not work. So the state
   is carried on every page of the workspace, with the way out of it one
   click away. */
export function DemoBanner() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const supa = getSupabase();
      if (!supa) return;
      const profile = await myProfile();
      if (!live || !profile.ngo_id) return;
      /* A database without the column yet errors here, and the honest
         reading of that is "not in demo mode". */
      const { data } = await supa
        .from("ngos")
        .select("demo_mode")
        .eq("id", profile.ngo_id)
        .maybeSingle();
      if (live) setOn(Boolean(data?.demo_mode));
    })();
    return () => { live = false; };
  }, []);

  if (!on) return null;

  return (
    <div className="demo-banner" role="status">
      <FlaskConical size={15} aria-hidden />
      <p>
        <b>Demo mode is on.</b> Anything your team adds is practice data and
        stays out of the public record.
      </p>
      <Link href="/partner/settings">Turn it off</Link>
    </div>
  );
}
