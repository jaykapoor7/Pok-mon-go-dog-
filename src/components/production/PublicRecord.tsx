import Link from "next/link";
import { getAnimalRegister } from "@/lib/landing/story";
import { sized } from "@/lib/photo/src";
export async function PublicRecord() {
 const register=await getAnimalRegister().catch(()=>null);const a=register?.cards[0];
 if(!a)return <p>Animal records are unavailable right now. <Link href="/explore">Open the map</Link> to try again.</p>;
 return <figure className="audience-record"><Link href={`/animal/${a.id}`}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={sized(a.cover_photo,640)} width={640} height={480} loading="lazy" alt={`Photograph from ${a.name||a.straypaw_id||"this animal"}’s record`}/><div><small>Actual public record</small><h3>{a.name||a.straypaw_id||"Animal record"}</h3><p>{[a.zone,a.city].filter(Boolean).join(", ")}</p><dl><div><dt>Sightings recorded</dt><dd>{a.sightings.toLocaleString("en-IN")}</dd></div><div><dt>Care entries</dt><dd>{a.care.length}</dd></div></dl><span>Open animal history ↗</span></div></Link><figcaption>Information may include imported history. A profile is a record, not a verified rescue outcome.</figcaption></figure>;
}
