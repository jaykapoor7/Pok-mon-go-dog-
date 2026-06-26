"use client";

import { useEffect, useState } from "react";
import { MapPin, ShieldCheck, Navigation } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/**
 * Location block on a dog profile. Everyone sees the GENERAL area only. Verified
 * partner NGOs additionally get the EXACT coordinates, fetched through the
 * get_precise_locations RPC (which returns nothing for non-members), so precise
 * locations are never exposed to the public.
 */
export function DogLocation({ dogId, zone }: { dogId: string; zone: string }) {
  const [exact, setExact] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return;
    let alive = true;
    supa
      .rpc("get_precise_locations", { p_ids: [dogId] })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (alive && row) setExact({ lat: row.lat, lng: row.lng });
      });
    return () => {
      alive = false;
    };
  }, [dogId]);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-paw-500" />
        <p className="text-sm font-semibold">General area · {zone}</p>
      </div>

      {exact ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${exact.lat},${exact.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between rounded-2xl bg-status-sterilised/10 px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-2 font-medium text-status-sterilised">
            <ShieldCheck className="h-4 w-4" /> Exact location (partner NGO)
            <span className="font-normal text-bark-500">
              {exact.lat.toFixed(5)}, {exact.lng.toFixed(5)}
            </span>
          </span>
          <Navigation className="h-4 w-4 text-status-sterilised" />
        </a>
      ) : (
        <p className="mt-2 text-xs text-bark-400">
          Exact location is shared only with verified partner NGOs to protect the
          dog.
        </p>
      )}
    </div>
  );
}
