import { notFound } from "next/navigation";
import { cache } from "react";
import { buildLiving } from "@/lib/animal/living";
import { getDogProfile, getDogById } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel } from "@/lib/utils";
import { AnimalRecord } from "@/sp/community/AnimalRecord";
import { State } from "@/sp/ui";

export const dynamic = "force-dynamic";
const readIdentity = cache(getDogById);
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  const name = dog ? dogLabel(dog) : "Animal record";
  /* A shared link carries the safe public projection only: no photo that may
     show an injury, no coordinates, no reporter. */
  return {
    title: `${name}, StrayPaw`,
    description: `Recorded sightings, care, follow-ups and outcomes for ${name}${dog?.city ? ` in ${dog.city}` : ""}, with the source of every line.`,
    alternates: { canonical: `/animal/${id}` },
    openGraph: { title: `${name}, StrayPaw`, type: "article", url: `/animal/${id}`, images: [{ url: "/og.png", width: 1200, height: 630, alt: "StrayPaw" }] },
  };
}

/* One animal, the public depth (decision 019). */
export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  if (dog === undefined) return <div className="page"><State kind="error" title="The record service is unavailable">Nothing has changed. Reload in a moment.</State></div>;
  let living;
  try {
    const [profile, operational, identity] = await Promise.all([getDogProfile(id), getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
    if (!profile) notFound();
    living = await buildLiving(profile, operational, identity);
  } catch {
    return <div className="page"><State kind="error" title="This record could not be read">Nothing has changed. Reload in a moment.</State></div>;
  }
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: living.label, ...(living.straypawId ? { identifier: living.straypawId } : {}), ...(living.lastSeen ? { dateModified: new Date(living.lastSeen).toISOString() } : {}), isPartOf: { "@type": "Dataset", name: "The StrayPaw register" } };
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AnimalRecord r={living} ngoId={dog?.ngo_id ?? null} />
    </>
  );
}
