import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { RegisterFocus } from "@/lib/landing/story";
import { animalTitle, shortPlace } from "@/lib/animal-name";
import { sized } from "@/lib/photo/src";
import { FramedPhoto } from "@/components/landing/FramedPhoto";
import { PageBrief } from "@/sp/ui";

function date(iso: string | null) {
  const value = iso ? new Date(iso) : null;
  return value && Number.isFinite(value.getTime()) && value.getUTCFullYear() > 2000 ? value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Date not recorded";
}
export function PublicAnimal({ animal }: { animal: RegisterFocus | null }) {
  if (!animal) return <div className="lw-unavailable"><b>A history belongs to an animal.</b><p>Public animal records are unavailable right now.</p><Link href="/explore">Browse the public register <ArrowUpRight size={16} aria-hidden /></Link></div>;
  return <article className="lw-animal">
    <div className="lw-photo"><FramedPhoto src={sized(animal.cover_photo, 340)} sid={animal.straypaw_id} alt={`Public record photograph of ${animalTitle(animal)}`} priority /></div>
    <div className="lw-file"><span className="lw-source">Actual public record</span><h3>{animalTitle(animal)}</h3><p>{[...new Set([shortPlace(animal.zone), animal.city].filter(Boolean))].join(", ") || "Place not recorded"}</p>
      <PageBrief items={[["Sterilisation", animal.sterilisation === "sterilised" ? "Recorded sterilised" : animal.sterilisation === "not_sterilised" ? "Recorded not sterilised" : "Not recorded"], ["Vaccination", animal.vaccination === "vaccinated" ? "Recorded vaccinated" : animal.vaccination === "not_vaccinated" ? "Recorded not vaccinated" : "Not recorded"]]} />
      <div className="lw-trail"><span aria-hidden /><div><b>{animal.care[0] ? animal.care[0].kind.replace(/_/g, " ") : "Last recorded observation"}</b><small>{date(animal.care[0]?.at ?? animal.last_seen)}</small></div></div>
      <Link className="lw-record-link" href={`/animal/${animal.id}`}>Open this animal’s history <ArrowUpRight size={16} aria-hidden /></Link>
    </div>
    <p className="lw-animal-note">Public history may include imported records. Dates and care are as recorded, not a statement of current condition.</p>
  </article>;
}
