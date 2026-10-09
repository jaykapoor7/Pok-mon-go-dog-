"use client";

import { useEffect, useState } from "react";
import { usePartnerAccess, PartnerWrite } from "@/components/partner/PartnerGate";
import { getSupabase } from "@/lib/supabase";
import { mapDog } from "@/lib/data";
import type { Dog } from "@/lib/types";
import type { Living } from "@/lib/animal/living";
import { LivingRecord } from "./LivingRecord";
import { OrgTools } from "./OrgTools";
import { dogLabel } from "@/lib/utils";
import { DeskHeader } from "@/components/app/DeskHeader";

export function PartnerAnimalRecord({ id, published }: { id: string; published: Living | null }) {
  const { ready, member } = usePartnerAccess();
  const [dog, setDog] = useState<Dog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [openCases, setOpenCases] = useState(0);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [place, setPlace] = useState<Living["place"]>(null);
  useEffect(() => {
    if (!ready || !member) return;
    let live = true;
    setError(null);
    const load = async () => {
      const supa = getSupabase();
      if (!supa) throw new Error("The record service is unavailable.");
      const { data: org, error: orgError } = await supa.rpc("my_ngo");
      if (orgError || !org) throw new Error("Organisation access required.");
      const [{ data, error }, count] = await Promise.all([
        supa.from("dogs").select("id,straypaw_id,h3_r8,name,species,zone,city,lat,lng,status,cover_photo,external_image_url,size,color,is_friendly,needs_help,sterilised,vaccinated,sterilisation_status,vaccination_status,ear_notch,trust_score,sightings_count,feed_count,first_seen,last_seen,last_fed_at,created_at,ngo_id,provenance,code,intake_notes,owner_name,owner_contact,assignee_id,assignee_name").eq("id", id).eq("ngo_id", org).maybeSingle(),
        supa.from("org_case_facts").select("id", { count: "exact", head: true }).eq("dog_id", id).in("status_class", ["open", "in_progress"]),
      ]);
      if (error) throw error;
      if (count.error) throw count.error;
      if (!data) throw new Error("This dog is not in your organisation’s register.");
      let ownedPlace: Living["place"] = null;
      if (data.h3_r8) {
        const { isValidCell, cellToBoundary, cellToLatLng } = await import("h3-js");
        const { roundRing } = await import("@/lib/spatial/round");
        if (isValidCell(data.h3_r8)) {
          const boundary = roundRing(cellToBoundary(data.h3_r8, true) as [number, number][]);
          const [lat, lng] = cellToLatLng(data.h3_r8);
          ownedPlace = { cell: data.h3_r8, center: [lng, lat],
            box: [Math.min(...boundary.map(p => p[0])), Math.min(...boundary.map(p => p[1])), Math.max(...boundary.map(p => p[0])), Math.max(...boundary.map(p => p[1]))],
            cells: [{ key: data.h3_r8, ring: boundary.flat(), n: 0, self: true }], here: 0 };
        }
      }
      if (live) { setPlace(ownedPlace); setOpenCases(count.count ?? 0); setRecordId(data.straypaw_id ?? null); setDog(mapDog(data)); }
    };
    load().catch(e => { if (live) setError(e.message || "The record could not be loaded."); });
    return () => { live = false; };
  }, [id, ready, member, revision]);
  if (!ready || (member && (!dog || dog.id !== id) && !error)) return <DeskHeader kicker="Records · animal" title="Opening the record…" lede="Your organisation’s private record of this animal." />;
  if (!member) return <div className="dk-page"><DeskHeader kicker="Records · animal" title="Your organisation’s record of this animal" lede="Private to the organisation that keeps it." /><PartnerWrite what="open the private record"><span /></PartnerWrite></div>;
  if (error || !dog) return <div className="dk-page"><DeskHeader kicker="Records · animal" title="This record could not be opened" lede={error || "It may belong to another organisation, or the link may be incomplete."} /></div>;
  const record: Living = published ?? {
    id, label: dogLabel(dog), straypawId: null, sourceCode: dog.code ?? null,
    species: "dog", sex: null, colour: dog.color, locality: dog.zone, city: dog.city ?? null, state: null,
    keeper: "Your organisation", source: "field", firstSeen: dog.first_seen, lastSeen: dog.last_seen,
    photo: dog.cover_photo || null, photos: dog.photos, photoAttribution: dog.photo_attribution ?? null, photoSourceUrl: dog.photo_source_url ?? null,
    known: { ster: dog.sterilised ? "yes" : "unknown", sterAt: null, vacc: dog.vaccinated ? "yes" : "unknown", vaccAt: null, boosterDue: false, health: dog.needs_help ? "needs_help" : "none", earNotch: !!dog.ear_notch },
    cases: [], events: [], comments: [], place: null, open: { cases: 0, followupsMissed: 0, followupsDue: 0 },
  };
  const current: Living = { ...record, label: dogLabel(dog), locality: dog.zone, city: dog.city ?? record.city, straypawId: recordId ?? record.straypawId,
    place: record.place?.cell === place?.cell ? record.place : place ?? record.place,
    photo: dog.cover_photo || null, photos: dog.photos, firstSeen: dog.first_seen, lastSeen: dog.last_seen,
    open: { ...record.open, cases: openCases },
    known: { ...record.known, ster: dog.sterilisation_status === "sterilised" ? "yes" : record.known.ster, vacc: dog.vaccination_status === "vaccinated" ? "yes" : record.known.vacc,
      health: dog.needs_help ? "needs_help" : dog.status === "injured" ? "injured" : "none", earNotch: !!dog.ear_notch },
  };
  return <LivingRecord r={current} scope="org" org={<OrgTools dog={dog} photos={current.photos} onChanged={() => setRevision(v => v + 1)} />} />;
}
